import type {
  CollaborationVoiceTarget, CollaborationVoiceState,
  CollaborationVoiceFailure, CollaborationVoiceHandlers,
} from "./collaboration-voice.js";
import type {
  CodexDictationRuntime, CodexDictationCapture, CodexDictationEvent,
} from "./collaboration-dictation-runtime.js";

type ActiveInput = {
  id: string;
  target: CollaborationVoiceTarget;
  state: Exclude<CollaborationVoiceState, "idle">;
  abort: AbortController;
  capture?: CodexDictationCapture;
  finals: Map<string, string>;
  previews: Map<string, string>;
  sealedPreviews: Set<string>;
  ended: boolean;
};

type DictationHandlers = CollaborationVoiceHandlers & {
  onPreview?(target: CollaborationVoiceTarget, text: string): void;
  onIncomplete?(target: CollaborationVoiceTarget): void;
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
      sealedPreviews: new Set(), ended: false,
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
      const failure: CollaborationVoiceFailure = error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError")
        ? "permission-denied"
        : String(error).includes("dictation-login-required") ? "login-required"
        : String(error).includes("capture-unavailable") ? "capture-unavailable" : "connection-failed";
      this.#finish(active, false, failure);
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
      () => this.#finish(active, true, "recognition-failed"),
    );
  }

  cancel(): void {
    const active = this.#active;
    if (!active) return;
    this.#active = null;
    active.ended = true;
    active.abort.abort();
    void active.capture?.cancel();
    this.handlers.onPreview?.(active.target, "");
    this.handlers.onCancel(active.target);
    this.handlers.onState("idle", active.target);
  }

  #event(active: ActiveInput, event: CodexDictationEvent): void {
    if (this.#active !== active || active.ended || event.inputId !== active.id) return;
    if (event.kind === "failed") { this.#finish(active, true, "recognition-failed"); return; }
    if (event.kind === "phase") {
      if (active.state === "requesting" && event.phase === "connecting") {
        active.state = "connecting";
        this.handlers.onState("connecting", active.target);
      }
      return;
    }
    if (event.role !== "user" || !event.itemId) return;
    if (event.kind === "preview") {
      if (active.sealedPreviews.has(event.itemId)) return;
      // Raw input_transcript.added is one identified text fragment, not a
      // cumulative final. Re-delivery replaces that fragment, preserving
      // equal words carried by distinct IDs.
      active.previews.set(event.itemId, event.text ?? "");
    }
    if (event.kind === "final") {
      const newTurn = !active.finals.has(event.itemId);
      active.finals.set(event.itemId, event.text ?? "");
      // V3 preview IDs and turn IDs inhabit different namespaces. Only a
      // newly completed user turn seals the current ordered preview batch;
      // duplicate/corrected old finals must never erase a newer preview.
      if (newTurn) {
        for (const id of active.previews.keys()) active.sealedPreviews.add(id);
        active.previews.clear();
      }
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
    void active.capture?.cancel();
    const text = this.#text(active, incomplete);
    this.handlers.onPreview?.(active.target, "");
    if (text) this.handlers.onTranscript(active.target, text);
    else this.handlers.onFailure(active.target, failure ?? "empty-recording");
    if (incomplete && text) this.handlers.onIncomplete?.(active.target);
    this.handlers.onState("idle", active.target);
  }
}
