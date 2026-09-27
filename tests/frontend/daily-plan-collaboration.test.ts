import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");

test("Daily Record plan proposals use the existing approval card and show reviewed and saved snapshots", () => {
  assert.match(main, /operation: "saveDailyPlan"[\s\S]*?transition: DailyPlanTransition[\s\S]*?arrangement: readonly DailyPlanBlockInput\[\][\s\S]*?evidence: readonly DailyPlanEvidenceInput\[\]/);
  assert.match(main, /kind: "dailyRecord"[\s\S]*?morningBaseline: readonly DailyPlanBlockInput\[\][\s\S]*?currentArrangement: readonly DailyPlanBlockInput\[\]/);
  assert.match(main, /collaboration-daily-plan-operation/);
  assert.match(main, /appendDailyRecordSnapshot\(card, operation\.baseline, "collaboration\.dailyPlanBaselineSnapshot"\)/);
  assert.match(main, /appendDailyPlanBlockList\(card, "collaboration\.dailyPlanArrangement", plan\.arrangement\)/);
  assert.match(main, /appendDailyPlanEvidence\(card, "collaboration\.dailyPlanEvidence", plan\.evidence\)/);
  assert.match(main, /appendDailyRecordSnapshot\(card, operation\.resultSnapshot, "collaboration\.dailyPlanSavedSnapshot"\)/);
  assert.match(main, /addAction\("approve", "collaboration\.taskApprove"\)/);
  assert.match(main, /addAction\("reject", "collaboration\.taskDismiss"\)/);
  assert.match(main, /addAction\("refresh", "collaboration\.taskRefreshReview"\)/);
  assert.match(main, /addAction\("reconcile", "collaboration\.taskCheckResult"\)/);
  assert.match(css, /\.collaboration-daily-plan-operation\s*\{/);
});

test("saved plans open the selected day in Today or Calendar and both views return to the session", () => {
  assert.match(html, /id="today-return-to-collaboration"/);
  assert.match(html, /id="calendar-return-to-collaboration"/);
  assert.match(main, /showWorkspaceDestination\("today", true, operation\.targetDate\)/);
  assert.match(main, /selectedCalendarDate = operation\.targetDate;[\s\S]*?showWorkspaceDestination\("calendar", true\)/);
  assert.match(main, /function returnToCollaborationFromDailyRecord\([\s\S]*?collaboration_session[\s\S]*?showWorkspaceDestination\("collaboration"\)/);
  assert.match(main, /todayReturnToCollaborationButton\?\.addEventListener\("click"[\s\S]*?returnToCollaborationFromDailyRecord/);
  assert.match(main, /calendarReturnToCollaborationButton\?\.addEventListener\("click"[\s\S]*?returnToCollaborationFromDailyRecord/);
});

test("Calendar previews the selected day from the same TodayView and legacy chats disclose missing plan support", () => {
  const summary = main.match(/function renderCalendarSummary\(view: TodayView\): void \{[\s\S]*?\n\}/);
  assert.ok(summary, "calendar summary renderer exists");
  assert.match(summary[0], /view\.timeline/);
  assert.match(summary[0], /view\.evidence/);
  assert.doesNotMatch(summary[0], /invoke<[^>]*TodayView>/);
  assert.match(main, /session\.dailyPlanToolAvailable !== true/);
  assert.match(main, /collaboration\.legacyDailyPlanNotice/);
  assert.match(copies, /"collaboration\.legacyDailyPlanNotice":\s*\{[^\n]*zh:[^\n]*en:/);
  assert.match(copies, /"calendar\.dailyPlanPreview":\s*\{[^\n]*zh:[^\n]*en:/);
});

test("a failed shared context refresh marks every pane unavailable instead of leaving stale data ready", () => {
  const refresh = main.match(/async function refreshCollaborationContextAfterOperation\([\s\S]*?\n\}/);
  assert.ok(refresh, "shared context refresh helper exists");
  assert.match(refresh[0], /dailyRecord: \{ state: "error"/);
  assert.match(refresh[0], /tasks: \{ state: "error"/);
  assert.match(refresh[0], /habits: \{ state: "error"/);
  assert.match(refresh[0], /taskRevision: null[\s\S]*?taskRecords: \[\][\s\S]*?taskLists: \[\]/);
});
