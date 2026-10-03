import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { stripTypeScriptTypes } from "node:module";
import * as presentation from "../../frontend/task-presentation.ts";

const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
class Element {
  children: any[] = [];
  dataset = {};
  open = false;
  textContent = "";
  listeners = new Map<string, Function>();
  tagName: string;
  constructor(tagName = "div") { this.tagName = tagName; }
  append(...children: any[]) { this.children.push(...children); }
  replaceChildren(...children: any[]) { this.children = children; }
  addEventListener(name: string, listener: Function) { this.listeners.set(name, listener); }
  querySelector() { return null; }
}
function renderer() {
  const context: any = { ...presentation, canMutateTodayTasks: () => true, todayOperationCount: 0,
    todayPresentationFresh: true, document: { createElement: (tag: string) => new Element(tag) },
    CSS: { escape: (value: string) => value }, tasksList: new Element(), tasksCount: new Element(), taskScope: "all", taskStateScope: "all",
    taskOperationCount: 0, taskCreateOpen: false, taskListManagementOpen: false,
    taskFocusRequestId: null, taskReturnToCollaborationSessionId: null,
    taskCreateDrafts: new Map(), taskListCreateDrafts: new Map(),
    setCopy: (element: any, key: string, params: any) => { element.copyKey = key; element.params = params; },
    taskEditor: (task: any) => ({ tagName: "task", id: task.id }),
    taskListForId: () => undefined, renderTaskListScopeButtons: () => {},
    renderTaskListManagement: () => {}, clearTaskEditorDialogs: () => {},
  };
  for (const name of ["taskListScopes", "taskFilter", "tasksStatus", "tasksEmpty", "taskListsManagementPanel",
    "taskListCreateForm", "taskCreateForm", "taskCreateSubmit", "taskReturnToCollaborationButton"]) context[name] = null;
  for (const name of ["todayTaskStatus", "todayTaskEmpty", "todayTaskOverdueSection", "todayTaskOverdueEmpty",
    "todayTaskCreateForm", "todayTaskCreateName", "todayTaskCreateContent", "todayTaskCreateDate", "todayTaskCreateTime", "todayTaskCreateSubmit"]) context[name] = null;
  context.todayTaskScheduled = new Element();
  context.todayTaskOverdue = new Element();
  context.todayTaskCount = new Element();
  context.todayTaskOverdueCount = new Element();
  context.todayTaskCreateDrafts = new Map();
  context.todayTaskCreateDraftKey = () => "synthetic";
  const todayStart = main.indexOf("function renderTodayTasks(");
  const todayEnd = main.indexOf("function renderHistoricalHabitCorrections", todayStart);
  const start = main.indexOf("function renderTasks(");
  const end = main.indexOf("function stableTaskOperationId", start);
  const historyStart = main.indexOf("function taskHistorySection(");
  const historyCode = historyStart < 0 ? "" : main.slice(historyStart, start);
  vm.runInNewContext(stripTypeScriptTypes(historyCode + main.slice(start, end) + main.slice(todayStart, todayEnd)), context);
  return context;
}
const pending = { id: "pending", name: "pending", listId: "inbox", state: "pending", deletedAt: null, date: null };
const completed = { ...pending, id: "done", state: "completed", completion: { completedOn: "2026-10-02" }, modifiedAt: "2026-10-02T12:00:00-04:00" };
const abandoned = { ...completed, id: "abandoned", state: "abandoned", completion: null };
const view = (tasks: any[]) => ({ lists: [], tasks, state: "ready", targetBinding: "synthetic", currentDate: "2026-10-03" });

test("default Tasks rendering removes completed and abandoned rows from the main list immediately", () => {
  const r = renderer();
  r.renderTasks(view([pending]));
  assert.deepEqual(Array.from(r.tasksList.children, (row: any) => row.id), ["pending"]);
  r.renderTasks(view([completed, abandoned]));
  assert.equal(r.tasksList.children.filter((row: any) => row.tagName === "task").length, 0);
  assert.equal(r.tasksCount.params.count, 0);
  const history = r.tasksList.children.find((row: any) => row.tagName === "details");
  assert.ok(history);
  assert.equal(history.open, false);
  assert.equal(history.children[1].children.length, 0, "collapsed history must not instantiate old task editors");
  history.open = true;
  history.listeners.get("toggle")();
  assert.ok(history.children[1].children.length > 0);
});

test("expanded history renders thirty tasks at a time, grouped by actual completion date", () => {
  const r = renderer();
  const tasks = Array.from({ length: 65 }, (_, i) => ({ ...completed, id: `done-${i}`, date: "2030-01-01",
    completion: { completedOn: i < 5 ? "2026-10-03" : "2026-10-02" } }));
  r.renderTasks(view(tasks));
  const section = r.tasksList.children[0];
  section.open = true;
  section.listeners.get("toggle")();
  const rows = section.children[1];
  const count = () => rows.children.filter((child: any) => child.tagName === "section")
    .reduce((total: number, group: any) => total + group.children.length - 1, 0);
  assert.equal(count(), 30);
  assert.equal(rows.children[0].children[0].textContent, "2026-10-03");
  rows.children.at(-1).listeners.get("click")();
  assert.equal(count(), 60);
  rows.children.at(-1).listeners.get("click")();
  assert.equal(count(), 65);
  assert.equal(rows.children.at(-1).tagName, "section");
});

test("reopening a task brings its same identity back into the main list", () => {
  const r = renderer();
  r.renderTasks(view([completed]));
  r.renderTasks(view([{ ...completed, state: "pending", completion: null }]));
  assert.deepEqual(Array.from(r.tasksList.children, (row: any) => row.id), ["done"]);
});

test("history does not use the scheduled date or invent an abandonment date", () => {
  assert.equal(presentation.taskHistoryDate(completed), "2026-10-02");
  assert.equal(presentation.taskHistoryDate(abandoned), null);
  assert.equal(presentation.taskHistoryDate({ ...abandoned, changes: [
    { kind: "abandoned", changedAt: "2026-09-01T12:00:00-04:00" },
    { kind: "restored", changedAt: "2026-09-02T12:00:00-04:00" },
    { kind: "abandoned", changedAt: "2026-10-02T12:00:00-04:00" },
    { kind: "renamed", changedAt: "2026-10-03T12:00:00-04:00" },
  ] }), "2026-10-02");
});

test("Today drops old completed tasks at rollover while keeping overdue pending work", () => {
  const tasks = [
    { ...pending, date: "2026-10-02", overdue: true },
    { ...completed, date: "2026-10-02", overdue: false },
  ];
  const today = presentation.todayTaskGroups(tasks, "2026-10-02", true, new Set());
  assert.equal(presentation.taskDisplaySections(today.scheduled, "all").main.length, 0);
  const tomorrow = presentation.todayTaskGroups(tasks, "2026-10-03", true, new Set());
  assert.equal(tomorrow.scheduled.length, 0);
  assert.deepEqual(tomorrow.overdue.map(task => task.id), ["pending"]);
});

test("saved Task links reveal old completed identities beyond the first history page", () => {
  const r = renderer();
  const tasks = Array.from({ length: 65 }, (_, i) => ({ ...completed, id: `done-${i}` }));
  r.taskFocusRequestId = "done-64";
  r.renderTasks(view(tasks));
  assert.equal(r.taskStateScope, "completed");
  const groups = r.tasksList.children[0].children[1].children.filter((child: any) => child.tagName === "section");
  assert.ok(groups.some((group: any) => group.children.some((row: any) => row.id === "done-64")));
});

test("Today uses the actual renderer to fold completed tasks and count pending only", () => {
  const r = renderer();
  const tasks = [{ ...pending, date: "2026-10-03", overdue: false }, { ...completed, date: "2026-10-03", overdue: false }];
  r.renderTodayTasks({ tasks: view(tasks), date: "2026-10-03", isToday: true });
  assert.equal(r.todayTaskCount.params.count, 1);
  assert.deepEqual(Array.from(r.todayTaskScheduled.children, (row: any) => row.tagName), ["task", "details"]);
  assert.equal(r.todayTaskScheduled.children[1].open, false);
  r.renderTodayTasks({ tasks: view(tasks), date: "2026-10-04", isToday: true });
  assert.equal(r.todayTaskCount.params.count, 0);
  assert.equal(r.todayTaskScheduled.children.length, 0);
});

test("history expansion reads current write availability and pagination keeps editors unique", () => {
  const r = renderer();
  let created = 0;
  const permissions: boolean[] = [];
  r.taskEditor = (task: any, writable: boolean) => { created++; permissions.push(writable); return { tagName: "task", id: task.id }; };
  r.taskOperationCount = 1;
  r.renderTasks(view(Array.from({ length: 35 }, (_, i) => ({ ...completed, id: `done-${i}` }))));
  r.taskOperationCount = 0;
  const history = r.tasksList.children[0];
  history.open = true;
  history.listeners.get("toggle")();
  assert.equal(created, 30);
  assert.ok(permissions.every(Boolean), "opening after the completed write must allow reopening");
  history.children[1].children.at(-1).listeners.get("click")();
  assert.equal(created, 35, "Show more must reuse existing editors and their dialogs");
});
