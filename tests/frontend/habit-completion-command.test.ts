import assert from "node:assert/strict";
import test from "node:test";

import { reconcileHabitCompletionWrite } from "../../frontend/habit-completion-command.ts";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("a successful write that finishes after leave-and-return clears retry identity and refreshes", async () => {
  const write = deferred<{ revision: string }>();
  let presentationCurrent = true;
  let habitsVisible = true;
  let persisted = false;
  let presentedRevision: string | null = null;
  let refreshCount = 0;
  const completion = reconcileHabitCompletionWrite(write.promise, {
    onPersisted: () => {
      persisted = true;
    },
    isPresentationCurrent: () => presentationCurrent,
    isTargetVisible: () => habitsVisible,
    present: (view) => {
      presentedRevision = view.revision;
    },
    refresh: async () => {
      assert.equal(persisted, true);
      refreshCount += 1;
    },
  });

  presentationCurrent = false;
  habitsVisible = false;
  habitsVisible = true;
  write.resolve({ revision: "persisted-revision" });
  await completion;

  assert.equal(persisted, true);
  assert.equal(presentedRevision, null);
  assert.equal(refreshCount, 1);
});

test("a successful write finishing while Habits is hidden defers presentation but still clears retry identity", async () => {
  let persisted = false;
  let refreshCount = 0;

  await reconcileHabitCompletionWrite(Promise.resolve({ revision: "saved" }), {
    onPersisted: () => {
      persisted = true;
    },
    isPresentationCurrent: () => false,
    isTargetVisible: () => false,
    present: () => assert.fail("a superseded response must not render"),
    refresh: async () => {
      refreshCount += 1;
    },
  });

  assert.equal(persisted, true);
  assert.equal(refreshCount, 0);
});
