import assert from "node:assert/strict";
import test from "node:test";
import {
  appendVoiceTranscript,
  collaborationVoiceControls,
  CollaborationVoiceDraftStore,
  CollaborationVoiceInputController,
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

test("date-bound draft IPC roundtrips through the target captured at recording start", async () => {
  const savedDrafts = new Map<string, string>();
  const requests: Array<{ target: CollaborationVoiceTarget; draft: string }> = [];
  const store = new CollaborationVoiceDraftStore(async (target, draft) => {
    requests.push({ target, draft });
    savedDrafts.set(voiceDraftKey(target), draft);
    const draftsByDate = Object.fromEntries(
      [...savedDrafts].map(([key, value]) => [key.slice(key.indexOf("\u0000") + 1), value]),
    );
    return {
      targetDate: "2026-09-27",
      draft: savedDrafts.get(voiceDraftKey({ sessionId: "session-1", targetDate: "2026-09-27" })) ?? "",
      draftsByDate,
    };
  });
  const recordedFor = { sessionId: "session-1", targetDate: "2026-09-26" };
  const currentlySelected = { sessionId: "session-1", targetDate: "2026-09-27" };

  const saved = await store.save(recordedFor, "earlier date voice draft");
  assert.equal(store.read(recordedFor, saved), "earlier date voice draft");
  assert.equal(store.read(currentlySelected, saved), "");
  const updated = await store.save(currentlySelected, "current date draft");
  assert.equal(store.read(recordedFor, updated), "earlier date voice draft");
  assert.equal(store.read(currentlySelected, updated), "current date draft");
  assert.deepEqual(requests.map(({ target, draft }) => ({
    sessionId: target.sessionId,
    targetDate: target.targetDate,
    draft,
  })), [
    { sessionId: "session-1", targetDate: "2026-09-26", draft: "earlier date voice draft" },
    { sessionId: "session-1", targetDate: "2026-09-27", draft: "current date draft" },
  ]);
});

test("manual send waits for captured voice draft persistence before submit clears it", async () => {
  const events: string[] = [];
  let finishSave: ((snapshot: { targetDate: string; draft: string }) => void) | null = null;
  const target = { sessionId: "session-1", targetDate: "2026-09-26" };
  const store = new CollaborationVoiceDraftStore(async (savedTarget, draft) => {
    assert.deepEqual(savedTarget, target);
    events.push("save-started");
    return new Promise((resolve) => {
      finishSave = (snapshot) => {
        events.push("save-finished");
        resolve(snapshot);
      };
      assert.equal(draft, "spoken words");
    });
  });

  const saved = store.save(target, "spoken words");
  await new Promise((resolve) => setImmediate(resolve));
  const manualSend = (async () => {
    await store.waitForPending(target);
    events.push("submitted");
    events.push("date-draft-cleared");
  })();
  assert.deepEqual(events, ["save-started"]);

  finishSave?.({ targetDate: target.targetDate, draft: "spoken words" });
  await Promise.all([saved, manualSend]);
  assert.deepEqual(events, ["save-started", "save-finished", "submitted", "date-draft-cleared"]);
});

test("legacy draft projection is used only for its matching session target date", () => {
  const store = new CollaborationVoiceDraftStore(async () => ({}));
  const savedTarget = { sessionId: "session-1", targetDate: "2026-09-27" };

  assert.equal(store.read(savedTarget, { targetDate: "2026-09-27", draft: "legacy draft" }), "legacy draft");
  assert.equal(store.read({ ...savedTarget, targetDate: "2026-09-26" }, {
    targetDate: "2026-09-27",
    draft: "legacy draft",
  }), undefined);
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
