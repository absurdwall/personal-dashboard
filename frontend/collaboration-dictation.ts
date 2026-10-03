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
  finals: Map<string, string>;
  previews: Map<string, string>;
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
      abort: new AbortController(), finals: new Map(), previews: new Map(),
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
    if (event.role !== "user" || !event.itemId) return;
    if (event.kind === "preview") {
      // Raw input_transcript.added is one identified text fragment, not a
      // cumulative final. Re-delivery replaces that fragment, preserving
      // equal words carried by distinct IDs.
      active.previews.set(event.itemId, event.text ?? "");
    }
    if (event.kind === "final") {
      // Only raw turn identity can replace an authoritative final. Preview IDs
      // are unrelated; preserve them until a verified association is available.
      active.finals.set(event.itemId, event.text ?? "");
    }
    this.handlers.onPreview?.(active.target, this.#text(active, true));
  }

  #text(active: ActiveInput, includePreview: boolean): string {
    const preview = [...active.previews.values()].join("");
    return [...active.finals.values(), ...(includePreview ? [preview] : [])]
      .filter(Boolean).join("\n").trim();
  }

  #finish(active: ActiveInput, incomplete: boolean, failure?: CollaborationVoiceFailure): void {
    if (this.#active !== active || active.ended) return;
    incomplete ||= active.previews.size > 0;
    active.ended = true;
    this.#active = null;
    active.abort.abort();
    void active.capture?.cancel().catch(() => undefined);
    const finalText = this.#text(active, false);
    const previewText = [...active.previews.values()].join("").trim();
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
