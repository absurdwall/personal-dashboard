export type CollaborationVoiceTarget = Readonly<{
  sessionId: string;
  targetDate: string;
}>;

export type CollaborationVoiceState = "idle" | "requesting" | "recording" | "transcribing";

export type CollaborationVoiceControls = Readonly<{
  startAction: "start" | "stop";
  startDisabled: boolean;
  cancelVisible: boolean;
  localeDisabled: boolean;
}>;

export function collaborationVoiceControls(input: Readonly<{
  state: CollaborationVoiceState;
  hasTarget: boolean;
  composerDisabled: boolean;
  capabilityLoading: boolean;
  hasInstalledLocale: boolean;
  hasInstalledLocales: boolean;
}>): CollaborationVoiceControls {
  return {
    startAction: input.state === "recording" ? "stop" : "start",
    startDisabled: input.state === "requesting" || input.state === "transcribing" ||
      (input.state === "idle" && (!input.hasTarget || input.composerDisabled ||
        input.capabilityLoading || !input.hasInstalledLocale)),
    cancelVisible: input.state !== "idle",
    localeDisabled: input.capabilityLoading || input.state !== "idle" || !input.hasInstalledLocales,
  };
}

export type CollaborationVoiceFailure =
  | "permission-denied"
  | "capture-unavailable"
  | "recording-failed"
  | "empty-recording"
  | "recognition-failed";

export interface CollaborationVoiceRecording {
  start(onComplete: (audio: Blob) => void, onFailure: (error: unknown) => void): void;
  stop(): void;
  cancel(): void;
}

export interface CollaborationVoiceRuntime {
  requestRecording(): Promise<CollaborationVoiceRecording>;
  transcribe(audio: Blob, locale: string): Promise<string>;
}

export type CollaborationDraftSnapshot = Readonly<{
  targetDate?: string;
  draft?: string;
  draftsByDate?: Readonly<Record<string, string>>;
}>;

export type CollaborationDraftSave = (
  target: CollaborationVoiceTarget,
  draft: string,
) => Promise<CollaborationDraftSnapshot>;

export class CollaborationVoiceDraftStore {
  private readonly saveDraft: CollaborationDraftSave;
  private readonly pendingWrites = new Map<string, Promise<CollaborationDraftSnapshot>>();

  constructor(saveDraft: CollaborationDraftSave) {
    this.saveDraft = saveDraft;
  }

  read(
    target: CollaborationVoiceTarget,
    snapshot: CollaborationDraftSnapshot,
  ): string | undefined {
    const dateDraft = snapshot.draftsByDate?.[target.targetDate];
    if (dateDraft !== undefined) return dateDraft;
    if (snapshot.targetDate === target.targetDate) return snapshot.draft;
    return undefined;
  }

  save(target: CollaborationVoiceTarget, draft: string): Promise<CollaborationDraftSnapshot> {
    const key = voiceDraftKey(target);
    const previous = this.pendingWrites.get(key) ?? Promise.resolve(undefined);
    const capturedTarget = { ...target };
    const write = previous.catch(() => undefined).then(() =>
      this.saveDraft(capturedTarget, draft),
    );
    this.pendingWrites.set(key, write);
    void write.then(
      () => {
        if (this.pendingWrites.get(key) === write) this.pendingWrites.delete(key);
      },
      () => {
        if (this.pendingWrites.get(key) === write) this.pendingWrites.delete(key);
      },
    );
    return write;
  }

  async waitForPending(target: CollaborationVoiceTarget): Promise<void> {
    await this.pendingWrites.get(voiceDraftKey(target))?.catch(() => undefined);
  }
}

export type CollaborationVoiceHandlers = Readonly<{
  onState(state: CollaborationVoiceState, target: CollaborationVoiceTarget): void;
  onTranscript(target: CollaborationVoiceTarget, text: string): void;
  onFailure(target: CollaborationVoiceTarget, failure: CollaborationVoiceFailure): void;
  onCancel(target: CollaborationVoiceTarget): void;
}>;

type ActiveVoiceInput = {
  target: CollaborationVoiceTarget;
  locale: string;
  state: Exclude<CollaborationVoiceState, "idle">;
  recording?: CollaborationVoiceRecording;
  timeout?: ReturnType<typeof setTimeout>;
};

const MAX_RECORDING_MILLISECONDS = 60_000;
const AUDIO_MIME_TYPE = "audio/mp4";

export class CollaborationVoiceInputController {
  #active: ActiveVoiceInput | null = null;
  private readonly runtime: CollaborationVoiceRuntime;
  private readonly handlers: CollaborationVoiceHandlers;

  constructor(
    runtime: CollaborationVoiceRuntime,
    handlers: CollaborationVoiceHandlers,
  ) {
    this.runtime = runtime;
    this.handlers = handlers;
  }

  get state(): CollaborationVoiceState {
    return this.#active?.state ?? "idle";
  }

  async start(target: CollaborationVoiceTarget, locale: string): Promise<void> {
    if (this.#active || !target.sessionId || !target.targetDate || !locale) return;

    const active: ActiveVoiceInput = {
      target: { ...target },
      locale,
      state: "requesting",
    };
    this.#active = active;
    this.handlers.onState("requesting", active.target);

    try {
      const recording = await this.runtime.requestRecording();
      if (this.#active !== active) {
        recording.cancel();
        return;
      }

      active.recording = recording;
      active.state = "recording";
      this.handlers.onState("recording", active.target);
      active.timeout = setTimeout(() => this.stop(), MAX_RECORDING_MILLISECONDS);
      recording.start(
        (audio) => { void this.#transcribe(active, audio); },
        () => this.#fail(active, "recording-failed"),
      );
    } catch (error) {
      if (this.#active !== active) return;
      const name = error instanceof DOMException ? error.name : "";
      this.#fail(
        active,
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission-denied"
          : "capture-unavailable",
      );
    }
  }

  stop(): void {
    const active = this.#active;
    if (!active || active.state !== "recording" || !active.recording) return;
    if (active.timeout) clearTimeout(active.timeout);
    active.timeout = undefined;
    active.state = "transcribing";
    this.handlers.onState("transcribing", active.target);
    active.recording.stop();
  }

  cancel(): void {
    const active = this.#active;
    if (!active) return;
    if (active.timeout) clearTimeout(active.timeout);
    active.timeout = undefined;
    this.#active = null;
    active.recording?.cancel();
    this.handlers.onCancel(active.target);
    this.handlers.onState("idle", active.target);
  }

  #fail(active: ActiveVoiceInput, failure: CollaborationVoiceFailure): void {
    if (this.#active !== active) return;
    if (active.timeout) clearTimeout(active.timeout);
    active.timeout = undefined;
    this.#active = null;
    active.recording?.cancel();
    this.handlers.onFailure(active.target, failure);
    this.handlers.onState("idle", active.target);
  }

  async #transcribe(active: ActiveVoiceInput, audio: Blob): Promise<void> {
    if (this.#active !== active) return;
    if (!audio.size) {
      this.#fail(active, "empty-recording");
      return;
    }
    active.state = "transcribing";
    this.handlers.onState("transcribing", active.target);
    try {
      const text = await this.runtime.transcribe(audio, active.locale);
      if (this.#active !== active) return;
      const transcript = text.trim();
      if (!transcript) {
        this.#fail(active, "recognition-failed");
        return;
      }
      this.#active = null;
      this.handlers.onTranscript(active.target, transcript);
      this.handlers.onState("idle", active.target);
    } catch {
      this.#fail(active, "recognition-failed");
    }
  }
}

class BrowserVoiceRecording implements CollaborationVoiceRecording {
  #chunks: Blob[] = [];
  #cancelled = false;
  #finished = false;
  private readonly stream: MediaStream;
  private readonly recorder: MediaRecorder;

  constructor(
    stream: MediaStream,
    recorder: MediaRecorder,
  ) {
    this.stream = stream;
    this.recorder = recorder;
  }

  start(onComplete: (audio: Blob) => void, onFailure: (error: unknown) => void): void {
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.#chunks.push(event.data);
    };
    this.recorder.onerror = (event) => {
      onFailure((event as Event & { error?: DOMException }).error ?? event);
    };
    this.recorder.onstop = () => {
      this.#stopTracks();
      if (this.#cancelled || this.#finished) return;
      this.#finished = true;
      onComplete(new Blob(this.#chunks, { type: this.recorder.mimeType || AUDIO_MIME_TYPE }));
      this.#chunks = [];
    };
    this.recorder.start();
  }

  stop(): void {
    if (this.recorder.state === "inactive") return;
    this.recorder.stop();
    this.#stopTracks();
  }

  cancel(): void {
    this.#cancelled = true;
    this.#chunks = [];
    this.#stopTracks();
    if (this.recorder.state !== "inactive") this.recorder.stop();
  }

  #stopTracks(): void {
    for (const track of this.stream.getTracks()) track.stop();
  }
}

export class BrowserCollaborationVoiceRuntime implements CollaborationVoiceRuntime {
  private readonly transcribeAudio: (audio: Blob, locale: string) => Promise<string>;
  private readonly mediaDevices: Pick<MediaDevices, "getUserMedia"> | undefined;
  private readonly recorderConstructor: typeof MediaRecorder | undefined;

  constructor(
    transcribeAudio: (audio: Blob, locale: string) => Promise<string>,
    mediaDevices: Pick<MediaDevices, "getUserMedia"> | undefined = globalThis.navigator?.mediaDevices,
    recorderConstructor: typeof MediaRecorder | undefined = globalThis.MediaRecorder,
  ) {
    this.transcribeAudio = transcribeAudio;
    this.mediaDevices = mediaDevices;
    this.recorderConstructor = recorderConstructor;
  }

  async requestRecording(): Promise<CollaborationVoiceRecording> {
    if (!this.mediaDevices || !this.recorderConstructor) {
      throw new Error("capture-unavailable");
    }
    if (
      typeof this.recorderConstructor.isTypeSupported === "function" &&
      !this.recorderConstructor.isTypeSupported(AUDIO_MIME_TYPE)
    ) {
      throw new Error("capture-unavailable");
    }

    const stream = await this.mediaDevices.getUserMedia({ audio: true, video: false });
    try {
      return new BrowserVoiceRecording(
        stream,
        new this.recorderConstructor(stream, { mimeType: AUDIO_MIME_TYPE }),
      );
    } catch (error) {
      for (const track of stream.getTracks()) track.stop();
      throw error;
    }
  }

  transcribe(audio: Blob, locale: string): Promise<string> {
    return this.transcribeAudio(audio, locale);
  }
}

export function voiceDraftKey(target: CollaborationVoiceTarget): string {
  return `${target.sessionId}\u0000${target.targetDate}`;
}

export function appendVoiceTranscript(draft: string, transcript: string): string {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return draft;
  if (!draft) return cleanTranscript;
  return `${draft}${draft.endsWith("\n") ? "" : "\n"}${cleanTranscript}`;
}
