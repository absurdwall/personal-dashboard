import assert from "node:assert/strict";
import test from "node:test";
import {
  appendVoiceTranscript,
  beginVoiceTranscriptSave,
  BrowserCollaborationVoiceRuntime,
  collaborationVoiceControls,
  CollaborationVoiceInputController,
  enqueueCollaborationDraftWrite,
  voiceDraftKey,
  type CollaborationVoiceFailure,
  type CollaborationVoiceRecording,
  type CollaborationVoiceRuntime,
  type CollaborationVoiceState,
  type CollaborationVoiceTarget,
} from "../../frontend/collaboration-voice.ts";

const syntheticAudio = () => new Blob(["synthetic fixture bytes"], { type: "audio/mp4" });

class FakeRecording implements CollaborationVoiceRecording {
  onComplete: ((audio: Blob) => void) | null = null;
  onFailure: ((error: unknown) => void) | null = null;
  stopped = false;
  cancelled = false;

  start(onComplete: (audio: Blob) => void, onFailure: (error: unknown) => void): void {
    this.onComplete = onComplete;
    this.onFailure = onFailure;
  }

  stop(): void {
    this.stopped = true;
    this.onComplete?.(syntheticAudio());
  }

  cancel(): void {
    this.cancelled = true;
  }
}

class FakeRuntime implements CollaborationVoiceRuntime {
  recording = new FakeRecording();
  transcription: (audio: Blob, locale: string) => Promise<string> = async () => "spoken draft";
  requestError: unknown = null;
  transcriptionCalls: Array<{ size: number; locale: string }> = [];

  async requestRecording(): Promise<CollaborationVoiceRecording> {
    if (this.requestError) throw this.requestError;
    return this.recording;
  }

  transcribe(audio: Blob, locale: string): Promise<string> {
    this.transcriptionCalls.push({ size: audio.size, locale });
    return this.transcription(audio, locale);
  }
}

function harness(runtime = new FakeRuntime()) {
  const states: CollaborationVoiceState[] = [];
  const transcripts: Array<{ target: CollaborationVoiceTarget; text: string }> = [];
  const failures: Array<{ target: CollaborationVoiceTarget; failure: CollaborationVoiceFailure }> = [];
  const cancellations: CollaborationVoiceTarget[] = [];
  const controller = new CollaborationVoiceInputController(runtime, {
    onState: (state) => states.push(state),
    onTranscript: (target, text) => transcripts.push({ target, text }),
    onFailure: (target, failure) => failures.push({ target, failure }),
    onCancel: (target) => cancellations.push(target),
  });
  return { runtime, controller, states, transcripts, failures, cancellations };
}

test("voice transcription returns text into an editable draft callback without sending", async () => {
  const { runtime, controller, states, transcripts } = harness();
  const target = { sessionId: "session-1", targetDate: "2026-09-27" };
  let draft = "existing draft";

  await controller.start(target, "en-US");
  assert.equal(controller.state, "recording");
  controller.stop();
  await new Promise((resolve) => setImmediate(resolve));
  if (transcripts[0]) draft = appendVoiceTranscript(draft, transcripts[0].text);

  assert.deepEqual(runtime.transcriptionCalls, [{ size: syntheticAudio().size, locale: "en-US" }]);
  assert.equal(draft, "existing draft\nspoken draft");
  assert.deepEqual(transcripts, [{ target, text: "spoken draft" }]);
  assert.deepEqual(states, ["requesting", "recording", "transcribing", "transcribing", "idle"]);
  assert.equal(controller.state, "idle");
});

test("permission denial leaves the current draft untouched and reports a recoverable failure", async () => {
  const runtime = new FakeRuntime();
  runtime.requestError = new DOMException("denied by test", "NotAllowedError");
  const { controller, failures, transcripts } = harness(runtime);
  let draft = "keep this text";

  await controller.start({ sessionId: "session-1", targetDate: "2026-09-27" }, "en-US");
  if (transcripts[0]) draft = appendVoiceTranscript(draft, transcripts[0].text);

  assert.equal(draft, "keep this text");
  assert.equal(controller.state, "idle");
  assert.deepEqual(failures.map(({ failure }) => failure), ["permission-denied"]);
  assert.equal(runtime.transcriptionCalls.length, 0);
});

test("recognition failures and empty recordings leave the draft untouched", async () => {
  const runtime = new FakeRuntime();
  runtime.transcription = async () => { throw new Error("synthetic recognition error"); };
  const { controller, failures, transcripts } = harness(runtime);
  const target = { sessionId: "session-1", targetDate: "2026-09-27" };
  const draft = "keep this text";

  await controller.start(target, "en-US");
  controller.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(draft, "keep this text");
  assert.deepEqual(failures.map(({ failure }) => failure), ["recognition-failed"]);
  assert.deepEqual(transcripts, []);

  await controller.start(target, "en-US");
  runtime.recording.onComplete?.(new Blob([], { type: "audio/mp4" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(failures.map(({ failure }) => failure), ["recognition-failed", "empty-recording"]);
  assert.deepEqual(transcripts, []);
});

test("cancelled recording never reaches transcription, including a late recorder callback", async () => {
  const { runtime, controller, cancellations, transcripts } = harness();
  const target = { sessionId: "session-1", targetDate: "2026-09-27" };

  await controller.start(target, "en-US");
  const lateComplete = runtime.recording.onComplete;
  controller.cancel();
  lateComplete?.(syntheticAudio());
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runtime.recording.cancelled, true);
  assert.deepEqual(cancellations, [target]);
  assert.equal(runtime.transcriptionCalls.length, 0);
  assert.deepEqual(transcripts, []);
});

test("a transcription finishing after navigation keeps its original session and date", async () => {
  const runtime = new FakeRuntime();
  let finishTranscription: ((text: string) => void) | null = null;
  runtime.transcription = () => new Promise((resolve) => { finishTranscription = resolve; });
  const { controller, transcripts } = harness(runtime);
  const targetAtStart = { sessionId: "session-1", targetDate: "2026-09-26" };

  await controller.start(targetAtStart, "en-US");
  controller.stop();
  const targetAfterNavigation = { sessionId: "session-2", targetDate: "2026-09-27" };
  targetAtStart.sessionId = targetAfterNavigation.sessionId;
  targetAtStart.targetDate = targetAfterNavigation.targetDate;
  finishTranscription?.("original context words");
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(transcripts, [{
    target: { sessionId: "session-1", targetDate: "2026-09-26" },
    text: "original context words",
  }]);
});

test("voice draft identity is isolated by both session and target date", () => {
  const first = { sessionId: "session-1", targetDate: "2026-09-26" };
  const secondDate = { sessionId: "session-1", targetDate: "2026-09-27" };
  const secondSession = { sessionId: "session-2", targetDate: "2026-09-26" };

  assert.notEqual(voiceDraftKey(first), voiceDraftKey(secondDate));
  assert.notEqual(voiceDraftKey(first), voiceDraftKey(secondSession));
});

test("transcript save and manual send share one per-session/date write queue", async () => {
  const events: string[] = [];
  let finishVoiceSave: (() => void) | null = null;
  const target = { sessionId: "session-1", targetDate: "2026-09-26" };
  const writes = new Map<string, Promise<string>>();
  const saveCollaborationDraft = (savedTarget: CollaborationVoiceTarget, draft: string) =>
    enqueueCollaborationDraftWrite(writes, savedTarget, () => {
      events.push(`save-started:${draft}`);
      if (draft === "spoken words") {
        return new Promise<string>((resolve) => {
          finishVoiceSave = () => {
            events.push(`save-finished:${draft}`);
            resolve(draft);
          };
        });
      }
      events.push(`save-finished:${draft}`);
      return Promise.resolve(draft);
    });
  const voiceSave = beginVoiceTranscriptSave(
    target,
    "spoken words",
    "",
    saveCollaborationDraft,
  );
  assert.equal(voiceSave.draft, "spoken words");
  await new Promise((resolve) => setImmediate(resolve));
  const manualSend = (async () => {
    await saveCollaborationDraft(target, "spoken words edited");
    events.push("submitted");
  })();
  assert.deepEqual(events, ["save-started:spoken words"]);

  finishVoiceSave?.();
  await Promise.all([voiceSave.saved, manualSend]);
  assert.deepEqual(events, [
    "save-started:spoken words",
    "save-finished:spoken words",
    "save-started:spoken words edited",
    "save-finished:spoken words edited",
    "submitted",
  ]);
});

test("late transcript saves to its captured draftsByDate entry without changing the next target", async () => {
  const runtime = new FakeRuntime();
  let finishTranscription: ((text: string) => void) | null = null;
  runtime.transcription = () => new Promise((resolve) => { finishTranscription = resolve; });
  const capturedTarget = { sessionId: "session-1", targetDate: "2026-09-26" };
  let currentTarget = capturedTarget;
  let visibleDraft = "old date draft";
  const draftsBySessionDate = new Map<string, string>([
    [voiceDraftKey(capturedTarget), "old date draft"],
  ]);
  const writes = new Map<string, Promise<string>>();
  const persist = (target: CollaborationVoiceTarget, draft: string) =>
    enqueueCollaborationDraftWrite(writes, target, async () => {
      draftsBySessionDate.set(voiceDraftKey(target), draft);
      return draft;
    });
  let saved: Promise<string> | null = null;
  const routedController = new CollaborationVoiceInputController(runtime, {
    onState: () => undefined,
    onTranscript: (target, transcript) => {
      const priorDraft = draftsBySessionDate.get(voiceDraftKey(target)) ?? "";
      const update = beginVoiceTranscriptSave(target, transcript, priorDraft, persist);
      draftsBySessionDate.set(voiceDraftKey(target), update.draft);
      saved = update.saved;
      if (voiceDraftKey(target) === voiceDraftKey(currentTarget)) visibleDraft = update.draft;
    },
    onFailure: () => undefined,
    onCancel: () => undefined,
  });

  await routedController.start(capturedTarget, "en-US");
  routedController.stop();
  currentTarget = { sessionId: "session-2", targetDate: "2026-09-27" };
  visibleDraft = "next session draft";
  draftsBySessionDate.set(voiceDraftKey(currentTarget), visibleDraft);
  finishTranscription?.("late voice words");
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(saved);
  await saved;

  assert.equal(draftsBySessionDate.get(voiceDraftKey(capturedTarget)), "old date draft\nlate voice words");
  assert.equal(draftsBySessionDate.get(voiceDraftKey(currentTarget)), "next session draft");
  assert.equal(visibleDraft, "next session draft");
});

test("voice controls require an installed selected locale and freeze locale while active", () => {
  assert.deepEqual(collaborationVoiceControls({
    state: "idle",
    hasTarget: true,
    composerDisabled: false,
    capabilityLoading: false,
    hasInstalledLocale: false,
    hasInstalledLocales: true,
  }), {
    startAction: "start",
    startDisabled: true,
    cancelVisible: false,
    localeDisabled: false,
  });
  assert.deepEqual(collaborationVoiceControls({
    state: "recording",
    hasTarget: true,
    composerDisabled: false,
    capabilityLoading: false,
    hasInstalledLocale: true,
    hasInstalledLocales: true,
  }), {
    startAction: "stop",
    startDisabled: false,
    cancelVisible: true,
    localeDisabled: true,
  });
  assert.equal(collaborationVoiceControls({
    state: "idle",
    hasTarget: true,
    composerDisabled: false,
    capabilityLoading: false,
    hasInstalledLocale: false,
    hasInstalledLocales: false,
  }).startDisabled, true);
});

test("browser recording keeps its input track alive until the final encoded chunk is delivered", async () => {
  let trackStopped = false;
  const stream = {
    getTracks: () => [{ stop: () => { trackStopped = true; } }],
  } as unknown as MediaStream;
  let recorder: DeferredMediaRecorder | null = null;

  class DeferredMediaRecorder {
    static isTypeSupported(mimeType: string): boolean {
      return mimeType === "audio/mp4";
    }

    state: RecordingState = "inactive";
    mimeType = "audio/mp4; codecs=mp4a.40.2";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onstop: ((event: Event) => void) | null = null;

    constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
      recorder = this;
    }

    start(): void {
      this.state = "recording";
    }

    stop(): void {
      this.state = "inactive";
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(["final encoded audio"], { type: this.mimeType }) } as BlobEvent);
        this.onstop?.(new Event("stop"));
      });
    }
  }

  const runtime = new BrowserCollaborationVoiceRuntime(
    async () => "synthetic transcript",
    { getUserMedia: async () => stream },
    DeferredMediaRecorder as unknown as typeof MediaRecorder,
  );
  const recording = await runtime.requestRecording();
  let audio: Blob | null = null;
  recording.start((completedAudio) => { audio = completedAudio; }, () => assert.fail("recording should complete"));

  recording.stop();
  assert.equal(trackStopped, false, "stop() must leave the stream available while MediaRecorder flushes");
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(recorder);
  assert.ok(audio);
  assert.ok(audio.size > 0, "the final dataavailable chunk must be included");
  assert.equal(audio.type, "audio/mp4; codecs=mp4a.40.2");
  assert.equal(trackStopped, true, "onstop releases the microphone tracks after flush");
});
