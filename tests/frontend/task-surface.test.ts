import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");

test("Tasks is a real destination between Today and Calendar with Inbox and All editing", () => {
  const destinations = Array.from(
    html.matchAll(/class="destination-button"[\s\S]*?data-workspace-destination="([^"]+)"/g),
    (match) => match[1],
  );
  assert.deepEqual(destinations, ["today", "tasks", "calendar", "habits"]);
  assert.match(html, /id="workspace-destination-tasks"/);
  assert.match(html, /data-task-scope="all"/);
  assert.match(html, /data-task-scope="today"/);
  assert.match(html, /data-task-scope="inbox"/);
  assert.match(html, /data-task-scope="archived"/);
  assert.match(html, /id="task-list-create-form"/);
  assert.match(html, /id="tasks-lists-management"/);
  for (const field of ["task-create-name", "task-create-content", "task-create-list", "task-create-date", "task-create-time"]) {
    assert.match(html, new RegExp(`id="${field}"`));
  }
  assert.match(main, /core\.invoke<TasksView>\("tasks_view"\)/);
  assert.match(main, /core\.invoke<TasksView>\("create_task"/);
  assert.match(main, /core\.invoke<TasksView>\("update_task"/);
});

test("Tasks fixed copy has Chinese and English counterparts", () => {
  for (const key of [
    "destination.tasks",
    "workspace.tasksDescription",
    "tasks.introduction",
    "tasks.scopeAll",
    "tasks.scopeToday",
    "tasks.scopeInbox",
    "tasks.scopeArchived",
    "tasks.createList",
    "tasks.archiveList",
    "tasks.restoreList",
    "tasks.listBoundary",
    "tasks.namePlaceholder",
    "tasks.timeNeedsDate",
    "tasks.savedToVault",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});

test("task writes serialize refresh reconciliation and retain retry identity", () => {
  const refresh = main.slice(
    main.indexOf("async function refreshTasks"),
    main.indexOf("async function createTask"),
  );
  assert.match(refresh, /if \(taskOperationCount > 0\)/);
  assert.match(main, /taskRefreshQueued/);
  assert.match(main, /const operationKey = JSON\.stringify\(\[binding, "create"\]\)/);
  assert.match(main, /taskMutationConfirmed\(/);
  assert.match(main, /Boolean\(savedTask\)/);
  assert.match(main, /tasks\.confirmationFailed/);
});

test("Tasks exposes explicit state, deletion recovery, and completion correction controls", () => {
  for (const scope of ["all", "pending", "completed", "abandoned", "deleted"]) {
    assert.match(html, new RegExp(`data-task-state="${scope}"`));
  }
  for (const marker of [
    "data-task-state-action",
    "data-task-delete",
    "data-task-restore",
    "data-task-correct-completion",
    "data-task-completion-date",
    "data-task-completion-time",
  ]) {
    assert.match(main, new RegExp(marker));
  }
  for (const command of [
    "set_task_state",
    "delete_task",
    "restore_task",
    "correct_task_completion",
  ]) {
    assert.match(main, new RegExp(`"${command}"`));
  }
  assert.match(main, /core\.invoke<TasksView>\(command/);
  for (const key of [
    "tasks.statePending",
    "tasks.stateCompleted",
    "tasks.stateAbandoned",
    "tasks.stateDeleted",
    "tasks.complete",
    "tasks.reopen",
    "tasks.abandon",
    "tasks.restore",
    "tasks.delete",
    "tasks.undoDelete",
    "tasks.correctCompletion",
    "tasks.completionDetails",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});

test("Tasks exposes stable list management commands and cross-list move controls", () => {
  for (const command of [
    "create_task_list",
    "rename_task_list",
    "archive_task_list",
    "restore_task_list",
  ]) {
    assert.match(main, new RegExp(`"${command}"`));
  }
  for (const marker of [
    "data-task-list-editor",
    "data-task-list-name",
    "data-task-list-archive",
    "data-task-list-restore",
    "taskListMutationConfirmed",
    "listId",
  ]) {
    assert.match(main, new RegExp(marker));
  }
  for (const key of [
    "tasks.listsHeading",
    "tasks.newListName",
    "tasks.createList",
    "tasks.saveList",
    "tasks.renameListLabel",
    "tasks.listCount",
    "tasks.permanentList",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});

test("Today presents the shared task view with a date default and read-only legacy history", () => {
  for (const marker of [
    'id="today-task-scheduled"',
    'id="today-task-overdue-section"',
    'id="today-task-create-form"',
    'id="today-task-create-list"',
    'id="today-task-create-date"',
    'id="today-legacy-task-history"',
    'data-i18n="today.legacyTasksReadOnly"',
  ]) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(main, /todayTaskGroups\(/);
  assert.match(main, /currentDate/);
  assert.match(main, /taskScope === "today"/);
  assert.match(main, /async function createTodayTask/);
  assert.match(main, /updateTask\(taskId, form, "today"\)/);
  assert.match(main, /setTaskState\(taskId, state, "today"\)/);
  assert.match(main, /deleteTask\(remove\.dataset\.taskDelete, "today"\)/);
  assert.match(main, /restoreTask\(restore\.dataset\.taskRestore, "today"\)/);
  assert.match(main, /correctTaskCompletion\(correct\.dataset\.taskCorrectCompletion, form, "today"\)/);
  assert.doesNotMatch(main, /core\.invoke(?:<[^>]+>)?\("add_day_task"/);
  assert.doesNotMatch(main, /core\.invoke(?:<[^>]+>)?\("rename_day_task"/);
  assert.doesNotMatch(main, /core\.invoke(?:<[^>]+>)?\("set_day_task_completion"/);
  assert.doesNotMatch(main, /core\.invoke(?:<[^>]+>)?\("delete_day_task"/);
  assert.doesNotMatch(html, /id="day-task-add-form"/);
});

test("Today shared task copy has Chinese and English counterparts", () => {
  for (const key of [
    "today.tasksSection",
    "today.tasksHeading",
    "today.tasksReady",
    "today.tasksEmpty",
    "today.overdueHeading",
    "today.noOverdue",
    "today.taskCreateDefault",
    "today.tasksBoundary",
    "today.legacyTasksSection",
    "today.legacyTasksHeading",
    "today.legacyTasksPresent",
    "today.legacyTasksReadOnly",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});

test("Calendar shows task previews and an editable shared task panel", () => {
  for (const marker of [
    'id="calendar-task-panel"',
    'id="calendar-task-list"',
    'id="calendar-task-create-form"',
    'id="calendar-task-create-date"',
    'id="calendar-task-create-list"',
  ]) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(main, /calendarTaskSummary/);
  assert.match(main, /calendarTaskOverflow/);
  assert.match(main, /dataset\.taskState = task\.state/);
  assert.match(main, /calendarTasksForDate\(/);
  assert.match(main, /taskEditor\(task, writable, shared, "calendar"\)/);
  assert.match(main, /async function createCalendarTask/);
  assert.match(main, /updateTask\(taskId, form, "calendar"\)/);
  assert.match(main, /setTaskState\(taskId, state, "calendar"\)/);
  assert.match(main, /deleteTask\(remove\.dataset\.taskDelete, "calendar"\)/);
  assert.match(main, /correctTaskCompletion\(correct\.dataset\.taskCorrectCompletion, form, "calendar"\)/);
});

test("Calendar isolates task selection changes and keeps state styles distinguishable", () => {
  assert.match(main, /calendarTaskRequests\.invalidate\(\)/);
  assert.match(main, /selectedCalendarDate !== date/);
  assert.match(main, /currentCalendarSummaryView\?\.date === expectedDate/);
  assert.match(css, /calendar-day-task-summary\[data-task-state="completed"\]/);
  assert.match(css, /calendar-day-task-summary\[data-task-state="abandoned"\]/);
});

test("Calendar keeps the Daily Record entry and fixed copy bilingual", () => {
  assert.match(html, /id="calendar-open-day"/);
  for (const key of [
    "calendar.taskSection",
    "calendar.taskCount",
    "calendar.taskEmpty",
    "calendar.taskCreateDefault",
    "calendar.taskOverflow",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});
