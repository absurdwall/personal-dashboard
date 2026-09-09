import assert from "node:assert/strict";
import test from "node:test";

import { submitDatedNote } from "../../frontend/dated-note-command.ts";

const target = {
  date: "2026-09-06",
  targetBinding: "vault-a:2026-09-06",
  revision: "revision-1",
  records: [{ id: "note-1", category: "exercise" as const }],
};

test("new and corrected notes share one typed dated-note command seam", async () => {
  const calls: { command: string; args: unknown }[] = [];
  const invoke = async <T>(command: string, args: unknown): Promise<T> => {
    calls.push({ command, args });
    return { date: target.date } as T;
  };

  await submitDatedNote(target, {
    content: "跑步 30 分钟",
    category: "exercise",
    correctionId: null,
  }, invoke, (kind) => kind === "note" ? "note-2" : "unused");
  await submitDatedNote(target, {
    content: "跑步 20 分钟",
    category: "ordinary",
    correctionId: "note-1",
  }, invoke, (kind) => kind === "change" ? "change-1" : "unused");

  assert.deepEqual(calls, [
    {
      command: "add_dated_note",
      args: {
        input: {
          date: target.date,
          targetBinding: target.targetBinding,
          expectedRevision: target.revision,
          entryId: "note-2",
          category: "exercise",
          content: "跑步 30 分钟",
        },
      },
    },
    {
      command: "correct_dated_note",
      args: {
        input: {
          date: target.date,
          targetBinding: target.targetBinding,
          expectedRevision: target.revision,
          entryId: "note-1",
          changeId: "change-1",
          content: "跑步 20 分钟",
        },
      },
    },
  ]);
});

test("a correction refuses a missing identity or revision before invoking IPC", async () => {
  let invoked = false;
  const invoke = async <T>(): Promise<T> => {
    invoked = true;
    return {} as T;
  };

  await assert.rejects(
    submitDatedNote(
      { ...target, revision: null },
      {
        content: "跑步 20 分钟",
        category: "exercise",
        correctionId: "note-1",
      },
      invoke,
      () => "change-1",
    ),
    /记录已经变化/,
  );
  assert.equal(invoked, false);
});
