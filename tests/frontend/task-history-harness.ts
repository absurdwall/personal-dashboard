import { readFileSync } from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import * as presentation from "../../frontend/task-presentation.ts";
import { submitDatedNote, DatedNoteTargetChangedError } from "../../frontend/dated-note-command.ts";
import { LatestRequest } from "../../frontend/latest-request.ts";
import { clockResultMatchesSession, clockTickDecision } from "../../frontend/today-time-axis.ts";

const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
export class Element {
  children: any[] = [];
  dataset: Record<string, string> = {};
  hidden = false;
  value = "";
  open = false;
  textContent = "";
  listeners = new Map<string, Function>();
  tagName: string;
  constructor(tagName = "div") { this.tagName = tagName; }
  append(...children: any[]) { this.children.push(...children); }
  replaceChildren(...children: any[]) { this.children = children; }
  addEventListener(name: string, listener: Function) { this.listeners.set(name, listener); }
  querySelector(selector: string): Element | null {
    const attribute = /\[data-([\w-]+)(?:="([^"]+)")?\]/.exec(selector);
    if (!attribute) return null;
    const key = attribute[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return descendants(this).find(element => element.dataset?.[key] !== undefined &&
      (attribute[2] === undefined || element.dataset[key] === attribute[2])) ?? null;
  }
}
export function renderer() {
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

function descendants(element: Element): Element[] {
  return element.children.flatMap(child => child instanceof Element ? [child, ...descendants(child)] : []);
}
function sourceFunction(name: string): string {
  const start = main.search(new RegExp(`(?:async )?function ${name}\\(`));
  if (start < 0) throw new Error(`Missing production function ${name}`);
  const rest = main.slice(start);
  const next = /\n(?:async )?function /.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** Real note-save -> Today render -> history render -> clock guard, with synthetic IPC and UI nodes. */
export function editingRenderer() {
  const r = renderer();
  const functions = ["selectedShortRecordCategory", "stashEveningReviewDraft", "stashDatedNoteDraft",
    "stashTodayTaskCreateDraft", "renderDatedNoteComposer", "taskDraftKey", "readTaskDraft",
    "captureTodayTaskEditors", "hasTodayEditingTarget", "eveningViewHasContent", "renderToday",
    "saveDatedNote", "refreshTodayClock"].map(sourceFunction).join("\n");
  for (const name of functions.match(/\btoday[A-Z]\w*/g) ?? []) if (!(name in r)) r[name] = null;
  for (const name of ["renderWorkspaceRailContext", "renderVaultSettings", "renderLegacyDayTasks",
    "renderHistoricalHabitCorrections", "renderTodayTimeAxis", "showTodayPhase", "renderReadingList",
    "renderReadingParagraphs", "scheduleTodayAxisFollowScroll", "updateTodayTimeAxisClock"]) r[name] = () => {};
  Object.assign(r, {
    submitDatedNote, DatedNoteTargetChangedError, clockResultMatchesSession, clockTickDecision,
    todayDaytimeContent: new Element("input"), todayDaytimeKind: new Element("select"),
    taskEditDrafts: new Map(), datedNoteDrafts: new Map(), eveningReviewDrafts: new Map(),
    saveDaytimeUpdateButton: null, cancelNoteCorrectionButton: null, selectTodayVaultButton: null,
    correctingShortRecordId: null, currentTodayView: null, currentWorkspaceDestination: "today",
    currentTodayPhase: "daytime", selectedTodayDate: null,
    todayPresentationRequests: new LatestRequest(), todayClockRequests: new LatestRequest(),
    preserveTodayDayTaskPlanError: (_previous: any, view: any) => view,
    localOperationId: () => "synthetic-note", daytimeHasArrangementChange: () => false,
    historicalHabitArrival: { forDate: () => null },
    showTodayMutationCopy: () => {}, showTodayMutationError: (_key: string, error: any) => { r.lastError = error; },
    updateTodayOperationState: (delta: number) => { r.todayOperationCount += delta; },
    refreshToday: async () => { r.clockReloaded = true; },
  });
  r.taskEditorForms = () => [...descendants(r.todayTaskScheduled), ...descendants(r.todayTaskOverdue)]
    .filter(element => element.tagName === "form");
  r.taskEditor = (task: any, _writable: boolean, view: any, _surface: any, expanded = false) => {
    const row = new Element("task");
    row.dataset.taskEditorRow = task.id;
    const form = new Element("form");
    form.dataset = { taskEditor: task.id, taskSurface: "today" };
    form.hidden = !expanded;
    const draft = r.taskEditDrafts.get(r.taskDraftKey(view.targetBinding, task.id));
    for (const [field, value] of Object.entries({ name: task.name, content: task.content ?? "", date: task.date ?? "",
      time: task.time ?? "", list: task.listId, completionDate: task.completion?.completedOn ?? "",
      completionTime: task.completion?.completedTime ?? "" })) {
      const input = new Element("input");
      input.dataset[`task${field[0].toUpperCase()}${field.slice(1)}`] = "";
      input.value = draft?.[field === "list" ? "listId" : field] ?? value;
      form.append(input);
    }
    row.append(form);
    return row;
  };
  vm.runInNewContext(stripTypeScriptTypes(functions), r);
  return r;
}
