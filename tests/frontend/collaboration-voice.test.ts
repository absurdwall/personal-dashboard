import assert from "node:assert/strict";
import test from "node:test";
import {
  appendVoiceTranscript,
  beginVoiceTranscriptSave,
  enqueueCollaborationDraftWrite,
  voiceDraftKey,
  type CollaborationVoiceTarget,
} from "../../frontend/collaboration-voice.ts";

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

test("transcript merges preserve user editing and make empty results a no-op", () => {
  assert.equal(appendVoiceTranscript("typed while dictating", " final words "), "typed while dictating\nfinal words");
  assert.equal(appendVoiceTranscript("typed while dictating", "   "), "typed while dictating");
});

test("failed transcript persistence leaves editable text and does not block the next manual draft save", async () => {
  const target = { sessionId: "original", targetDate: "2026-10-03" };
  const pending = new Map<string, Promise<string>>();
  const update = beginVoiceTranscriptSave(target, "spoken", "existing", (savedTarget) =>
    enqueueCollaborationDraftWrite(pending, savedTarget, async () => { throw new Error("synthetic save failure"); }));
  assert.equal(update.draft, "existing\nspoken");
  const nextSave = enqueueCollaborationDraftWrite(pending, target, async () => update.draft + " edited");
  await assert.rejects(update.saved, /synthetic save failure/);
  assert.equal(await nextSave, "existing\nspoken edited");
});
