import { CodexDictationTranscript } from "./collaboration-dictation-transcript.js";
import type {
  CollaborationVoiceTarget, CollaborationVoiceState,
  CollaborationVoiceFailure, CollaborationVoiceHandlers,
} from "./collaboration-voice.js";
import type {
  CodexDictationRuntime, CodexDictationCapture, CodexDictationEvent,
} from "./collaboration-dictation-runtime.js";

// Return only a bounded product category; raw provider messages never enter UI.
export function codexDictationFailure(error: unknown): CollaborationVoiceFailure {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "permission-denied";
    if (["NotFoundError", "NotReadableError", "OverconstrainedError"].includes(error.name)) return "capture-unavailable";
  }
  const code = String(error).toLowerCase();
  if (/login-required|unauthorized|authentication|invalid_api_key|session_expired/.test(code)) return "login-required";
  if (/quota|rate.limit|usage.limit|too_many_requests|429/.test(code)) return "quota-exceeded";
  if (code.includes("capture-unavailable")) return "capture-unavailable";
  if (/connection|network|timeout/.test(code)) return "connection-failed";
  if (/service|runtime-unavailable/.test(code)) return "service-failed";
  return "recognition-failed";
}

type ActiveInput = {
  id: string;
  target: CollaborationVoiceTarget;
  state: Exclude<CollaborationVoiceState, "idle">;
  abort: AbortController;
  capture?: CodexDictationCapture;
  transcript: CodexDictationTranscript;
  ended: boolean;
};

type DictationHandlers = CollaborationVoiceHandlers & {
  onPreview?(target: CollaborationVoiceTarget, text: string): void;
  onIncomplete?(target: CollaborationVoiceTarget): void;
  unconfirmedPreviewLabel?(): string;
};

export class CodexCollaborationVoiceInputController {
  #active: ActiveInput | null = null;
  private readonly runtime: CodexDictationRuntime;
  private readonly handlers: DictationHandlers;

  constructor(runtime: CodexDictationRuntime, handlers: DictationHandlers) {
    this.runtime = runtime;
    this.handlers = handlers;
  }

  get state(): CollaborationVoiceState { return this.#active?.state ?? "idle"; }

  async start(target: CollaborationVoiceTarget): Promise<void> {
    if (this.#active || !target.sessionId || !target.targetDate) return;
    const active: ActiveInput = {
      id: crypto.randomUUID(), target: { ...target }, state: "requesting",
      abort: new AbortController(), transcript: new CodexDictationTranscript(),
      ended: false,
    };
    this.#active = active;
    this.handlers.onState("requesting", active.target);
    try {
      const capture = await this.runtime.start(active.id, event => this.#event(active, event), active.abort.signal);
      if (this.#active !== active) { await capture.cancel(); return; }
      active.capture = capture;
      active.state = "recording";
      this.handlers.onState("recording", active.target);
    } catch (error) {
      if (this.#active !== active) return;
      const failure = codexDictationFailure(error);
      this.#finish(active, true, failure);
    }
  }

  stop(): void {
    const active = this.#active;
    if (!active || active.state !== "recording" || !active.capture) return;
    active.capture.stopCapture();
    active.state = "transcribing";
    this.handlers.onState("transcribing", active.target);
    void active.capture.finalize().then(
      result => this.#finish(active, result.incomplete),
      error => this.#finish(active, true, codexDictationFailure(error)),
    );
  }

  // Navigation never waits for the remote tail. Ownership stays on the
  // copied start target while another session/date/page is already visible.
  navigate(): void {
    if (this.state === "requesting" || this.state === "connecting") this.cancel();
    else this.stop();
  }

  // App/window close has no dependable tail-drain opportunity: preserve only
  // received text now and release capture before any asynchronous draft save.
  close(): void {
    const active = this.#active;
    if (!active) return;
    if ((active.state === "requesting" || active.state === "connecting") && !this.#text(active,true)) this.cancel();
    else this.#finish(active, true);
  }

  cancel(): void {
    const active = this.#active;
    if (!active) return;
    this.#active = null;
    active.ended = true;
    active.abort.abort();
    void active.capture?.cancel().catch(() => undefined);
    this.handlers.onPreview?.(active.target, "");
    this.handlers.onCancel(active.target);
    this.handlers.onState("idle", active.target);
  }

  #event(active: ActiveInput, event: CodexDictationEvent): void {
    if (this.#active !== active || active.ended || event.inputId !== active.id) return;
    if (event.kind === "failed") { this.#finish(active, true, codexDictationFailure(event.failure)); return; }
    if (event.kind === "phase") {
      if (active.state === "requesting" && event.phase === "connecting") {
        active.state = "connecting";
        this.handlers.onState("connecting", active.target);
      }
      return;
    }
    active.transcript.update(event);
    this.handlers.onPreview?.(active.target, this.#text(active, true));
  }

  #text(active: ActiveInput, includePreview: boolean): string {
    const snapshot = active.transcript.snapshot();
    return includePreview ? snapshot.displayText : snapshot.finalText;
  }

  #finish(active: ActiveInput, incomplete: boolean, failure?: CollaborationVoiceFailure): void {
    if (this.#active !== active || active.ended) return;
    const snapshot = active.transcript.snapshot();
    incomplete ||= snapshot.unresolved;
    active.ended = true;
    this.#active = null;
    active.abort.abort();
    void active.capture?.cancel().catch(() => undefined);
    const finalText = snapshot.finalText;
    const previewText = snapshot.unconfirmedPreviewText;
    // Keep ambiguous received text in the same persisted editable draft, clearly
    // separated from finals. Never infer matching by arrival order or equal text.
    const recoveredPreview = previewText
      ? `${this.handlers.unconfirmedPreviewLabel?.() ?? "[Unconfirmed preview — may overlap the final transcript; review before sending]"}\n${previewText}`
      : "";
    const text = [finalText, recoveredPreview].filter(Boolean).join("\n");
    this.handlers.onPreview?.(active.target, "");
    if (text) this.handlers.onTranscript(active.target, text);
    else this.handlers.onFailure(active.target, failure ?? "empty-recording");
    if (incomplete && text) this.handlers.onIncomplete?.(active.target);
    if (failure && text) this.handlers.onFailure(active.target, failure);
    this.handlers.onState("idle", active.target);
  }
}
