import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");
const skill = readFileSync(new URL("../../.agents/skills/personal-dashboard-collaboration/SKILL.md", import.meta.url), "utf8");

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

test("Daily Record and Habit proposals have typed, distinct review cards with exact evidence", () => {
  assert.match(main, /operation: "saveEveningReview"; mode: "addition" \| "correction"; content: string/);
  assert.match(main, /operation: "correctShortRecord"; recordId: string; content: string/);
  assert.match(main, /operation: "setLocalHabitCompletion"; habitKey: string; completed: boolean/);
  assert.match(main, /kind: "dailyReview"[\s\S]*?account: readonly string\[\][\s\S]*?corrections: readonly string\[\]/);
  assert.match(main, /kind: "shortRecord"[\s\S]*?id: string[\s\S]*?category: "ordinary" \| "exercise"[\s\S]*?changeCount: number/);
  assert.match(main, /kind: "habitCompletion"[\s\S]*?sourceEvidence: readonly string\[\][\s\S]*?sourceSnapshotState:[\s\S]*?sourceSnapshotMessage: string \| null/);
  assert.match(main, /collaboration-daily-record-operation/);
  assert.match(main, /collaboration-habit-operation/);
  assert.match(main, /appendDailyReviewSnapshot\(card, operation\.baseline, "collaboration\.dailyReviewBaselineSnapshot"\)/);
  assert.match(main, /appendShortRecordSnapshot\(card, operation\.baseline, "collaboration\.shortRecordBaselineSnapshot"\)/);
  assert.match(main, /appendHabitCompletionSnapshot\(card, operation\.baseline, "collaboration\.habitCompletionBaselineSnapshot"\)/);
  assert.match(main, /sourceSnapshotMessage\)[\s\S]*?collaboration\.habitSnapshotWarning/);
  assert.match(main, /collaboration\.legacyDailyRecordNotice/);
  assert.match(main, /session\.dailyRecordToolAvailable !== true/);
  assert.match(css, /\.collaboration-daily-record-operation\s*\{/);
  assert.match(css, /\.collaboration-habit-operation\s*\{/);
  assert.match(copies, /"collaboration\.habitSnapshotWarning":\s*\{[^\n]*zh:[^\n]*en:/);
  assert.match(copies, /"collaboration\.habitLocalState\.unknown":\s*\{[^\n]*zh: "状态未知"[^\n]*en: "unknown"/);
  assert.match(main, /collaboration\.habitLocalState\.\$\{baseline\.localState\.toLowerCase\(\)\}/);
  assert.match(copies, /"collaboration\.readOnlyBoundary":\s*\{[^\n]*selected Vault[^\n]*External Habit sources[^\n]*settings/);
  assert.match(html, /data-i18n="collaboration\.readOnlyBoundary">[^<]*Only the exact approved content is written to the selected Vault/);
  assert.match(main, /case "saveEveningReview":[\s\S]*?collaboration\.dailyRecordAction\.reviewAddition/);
  assert.match(main, /case "correctShortRecord"[\s\S]*?collaboration\.dailyRecordAction\.shortRecordCorrection/);
  assert.match(main, /case "setLocalHabitCompletion"[\s\S]*?collaboration\.habitCompletionAction\.add/);
  assert.match(main, /appendDailyReviewSnapshot[\s\S]*?record\.account[\s\S]*?record\.additions[\s\S]*?record\.corrections[\s\S]*?record\.shortRecords/);
  assert.match(main, /appendShortRecordSnapshot[\s\S]*?record\.id[\s\S]*?record\.category[\s\S]*?record\.text/);
  assert.match(main, /appendHabitCompletionSnapshot[\s\S]*?sourceSnapshotState[\s\S]*?sourceSnapshotMessage[\s\S]*?sourceEvidence/);
  assert.match(main, /operation\.status === "applied"[\s\S]*?dailyReview \|\| habitCompletion[\s\S]*?operation\.resultMessage/);
});

test("saved date operations refresh Today, Calendar, and Habits before the proposal card reports success", () => {
  const action = main.match(/async function runCollaborationTaskOperationAction\([\s\S]*?\n\}/);
  assert.ok(action, "shared operation action handler exists");
  assert.match(action[0], /savedOperation\?\.status === "applied"[\s\S]*?await refreshCanonicalDateProjections\(savedOperation\.targetDate\)/);
  assert.match(action[0], /await refreshCollaborationContextAfterOperation[\s\S]*?renderCollaborationWorkspace\(\)/);

  const refresh = main.match(/async function refreshCanonicalDateProjections\([\s\S]*?\n\}/);
  assert.ok(refresh, "date projection refresh helper exists");
  assert.match(refresh[0], /invoke<TodayView>\("read_daily_view", \{ date: targetDate \}\)/);
  assert.match(refresh[0], /invoke<CalendarMonthView>\("calendar_month", \{ year, month \}\)/);
  assert.match(refresh[0], /invoke<HabitSnapshotView>\("habit_snapshot"\)/);
  assert.match(refresh[0], /currentCalendarSummaryView\?\.date === targetDate/);
  assert.match(refresh[0], /selectedHabitCell\?\.date === targetDate/);
  assert.match(refresh[0], /currentHabitDateView = today\.value/);
  assert.match(refresh[0], /todayPresentationRequests\.invalidate\(\)[\s\S]*?renderToday\(today\.value\)/);
  assert.match(refresh[0], /calendarSelectionRequests\.invalidate\(\)[\s\S]*?renderCalendarSummary\(today\.value\)/);
  assert.match(refresh[0], /habitDateRequests\.invalidate\(\)[\s\S]*?currentHabitDateView = today\.value/);
  assert.match(refresh[0], /habitSnapshotRequests\.invalidate\(\)[\s\S]*?renderHabitSnapshot\(habits\.value\)/);
  assert.match(refresh[0], /unavailable\.push\(t\("destination\.habits"\)\);\s*habitSnapshotRequests\.invalidate\(\);\s*renderHabitSnapshot\(\{/);
  assert.match(refresh[0], /unavailable\.push\(t\("destination\.today"\)\)/);
  assert.match(refresh[0], /if \(calendarTargetVisible\) unavailable\.push\(t\("destination\.calendar"\)\)/);
  assert.match(refresh[0], /if \(habitTargetVisible\) unavailable\.push\(t\("destination\.habits"\)\)/);
  assert.match(main, /collaborationTaskProjectionWarnings\.set\(operationId, warning\)/);
  assert.match(main, /collaborationTaskProjectionWarnings\.get\(operation\.id\)[\s\S]*?collaboration\.operationProjectionRefreshWarning/);
  assert.match(main, /showWorkspaceDestination\("today", true, operation\.targetDate\)/);
  assert.match(main, /selectedCalendarDate = operation\.targetDate;[\s\S]*?showWorkspaceDestination\("calendar", true\)/);
  assert.match(main, /selectedHabitCell = \{ habitKey: operation\.operation\.habitKey, date: operation\.targetDate \}/);
  assert.match(main, /selectedHabitCell = \{ habitKey: "exercise", date: operation\.targetDate \}/);
  assert.match(refresh[0], /const targetMonthIsVisible = currentWorkspaceDestination === "calendar"[\s\S]*?if \(targetMonthIsVisible\) \{[\s\S]*?renderCalendarReadError\(calendar\.error, false, false\)/);
});

test("automatic morning planning has an explicit local schedule and external-task handoff boundary", () => {
  assert.match(html, /id="collaboration-automatic-plan-enabled"/);
  assert.match(html, /id="collaboration-automatic-plan-time"/);
  assert.match(html, /id="collaboration-external-handoff-confirmed"/);
  assert.match(html, /id="collaboration-external-schedule-boundary"/);
  assert.match(html, /id="collaboration-automatic-plan-status"/);
  assert.match(main, /"collaboration_daily_plan_automation"/);
  assert.match(main, /"collaboration_update_daily_plan_automation"[\s\S]*?\{ settings \}/);
  assert.match(main, /function openDailyPlanAutomationRun\([\s\S]*?selectCollaborationSession\(session\)/);
  assert.match(main, /collaboration-automatic-plan-operation/);
  assert.match(main, /message\.automaticPlan[\s\S]*?automaticPlanMessageRole/);
  assert.match(main, /operation\.automaticPlan[\s\S]*?automaticPlanCardTitle/);
  assert.match(main, /operation\.resultMessage \?\? t\("collaboration\.automaticPlanResultLabel"\)/);
  assert.match(css, /\.collaboration-automatic-plan-operation\s*\{/);
  assert.match(copies, /"collaboration\.externalScheduleHandoffPending":\s*\{[^\n]*zh:[^\n]*Dashboard[^\n]*scheduled task[^\n]*en:[^\n]*does not inspect or change external scheduled tasks/);
  assert.match(copies, /"collaboration\.externalScheduleHandoffComplete":\s*\{[^\n]*zh:[^\n]*仍未修改外部 scheduled task[^\n]*en:[^\n]*has not changed the external scheduled task/);
  assert.match(skill, /explicitly marked as an \*\*automatic morning plan\*\*/);
  assert.match(skill, /only one `initialPlan`/);
  assert.match(skill, /never inspect or modify an external scheduled task/);
});
