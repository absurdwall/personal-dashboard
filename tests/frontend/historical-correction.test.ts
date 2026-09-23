import assert from "node:assert/strict";
import test from "node:test";

import {
  historicalHabitCorrectionDate,
  historicalHabitCorrectionPresentation,
} from "../../frontend/habit-completion.ts";
import { reconcileHabitCompletionWrite } from "../../frontend/habit-completion-command.ts";

test("historical habit correction accepts only real dates before today", () => {
  assert.equal(historicalHabitCorrectionDate("2026-09-08", "2026-09-09"), "2026-09-08");
  assert.equal(historicalHabitCorrectionDate("2026-09-07", "2026-09-09"), "2026-09-07");
  assert.equal(historicalHabitCorrectionDate("2026-08-31", "2026-09-09"), "2026-08-31");
  assert.equal(historicalHabitCorrectionDate("2026-09-09", "2026-09-09"), null);
  assert.equal(historicalHabitCorrectionDate("2026-09-10", "2026-09-09"), null);
  assert.equal(historicalHabitCorrectionDate("2026-02-30", "2026-09-09"), null);
  assert.equal(historicalHabitCorrectionDate("2026/09/08", "2026-09-09"), null);
});

test("historical habit correction separates the local checkbox trace from merged completion", () => {
  const presentation = historicalHabitCorrectionPresentation({
    canRecordCompletion: true,
    goalLabel: null,
    localChangeCount: 2,
    cell: {
      countsAsCompletion: true,
      localCompletionState: "withdrawn",
      hasExternalCompletion: true,
      completionSourceLabels: ["Dida365 打卡"],
    },
  });

  assert.equal(presentation.checked, true);
  assert.equal(presentation.localState, "withdrawn");
  assert.equal(presentation.explanation, "withdrawn-external");
  assert.equal(presentation.goalKnown, false);
  assert.equal(presentation.localChangeCount, 2);
});

test("a local-only historical completion is complete without inventing a goal", () => {
  const presentation = historicalHabitCorrectionPresentation({
    canRecordCompletion: true,
    goalLabel: null,
    localChangeCount: 1,
    cell: {
      countsAsCompletion: true,
      localCompletionState: "completed",
      hasExternalCompletion: false,
      completionSourceLabels: ["Personal Dashboard local"],
    },
  });

  assert.equal(presentation.checked, true);
  assert.equal(presentation.explanation, "local");
  assert.equal(presentation.goalKnown, false);
});

test("a late historical save refreshes only when its original date is visible again", async () => {
  let resolveWrite!: (value: { date: string }) => void;
  const write = new Promise<{ date: string }>((resolve) => {
    resolveWrite = resolve;
  });
  let presentationCurrent = true;
  let originalDateVisible = true;
  let presented = false;
  let refreshCount = 0;
  const saving = reconcileHabitCompletionWrite(write, {
    onPersisted: () => undefined,
    isPresentationCurrent: () => presentationCurrent,
    isTargetVisible: () => originalDateVisible,
    present: () => {
      presented = true;
    },
    refresh: async () => {
      refreshCount += 1;
    },
  });

  presentationCurrent = false;
  originalDateVisible = false;
  originalDateVisible = true;
  resolveWrite({ date: "2026-09-05" });
  await saving;

  assert.equal(presented, false);
  assert.equal(refreshCount, 1);
});
