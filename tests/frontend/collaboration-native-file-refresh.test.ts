import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";

const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const start = source.indexOf("function watchCollaborationSession(");
const body = source.slice(start);
const end = /^}\n/m.exec(body)!;
const production = stripTypeScriptTypes(body.slice(0, end.index + 2));
const tick = () => new Promise((resolve) => setImmediate(resolve));

for (const state of ["completed", "error", "stopped"]) {
  test(`native file changes are re-read after a ${state} turn without losing the captured date or composer`, async () => {
    let poll: () => void = () => {};
    const disk = { record: "Original user paragraph\nOctober plan saved", displayName: "Exercise", task: "completed" };
    const shown: Record<string, string> = {};
    const draft = { value: "Unsaved next message" };
    const initial = { id: "session", runId: "request", runState: "thinking", targetDate: "2026-10-02" };
    const finished = { ...initial, runState: state, targetDate: "2026-10-04", messages: [
      { role: "user", executionId: "request", targetDate: "2026-10-02" },
    ] };
    const context = vm.createContext({
      Promise,
      currentWorkspaceDestination: "collaboration", currentCollaborationSession: initial,
      collaborationStatusTimer: null, collaborationMessageDraft: draft,
      window: { setInterval(callback: () => void) { poll = callback; return 1; }, clearInterval() {},
        __TAURI__: { core: { async invoke(command: string) {
          assert.equal(command, "collaboration_session"); return finished;
        } } },
      },
      refreshCollaborationRunOwner() {}, renderCollaborationWorkspace() {},
      async refreshCanonicalDateProjections(date: string) {
        shown.date = date; shown.today = disk.record; shown.calendar = disk.record; shown.habit = disk.displayName;
      },
      async refreshTasks() { shown.task = disk.task; },
      async refreshCollaborationWorkspace() { shown.context = disk.record; },
    });
    vm.runInContext(production + "\nwatchCollaborationSession(currentCollaborationSession);", context);
    poll(); await tick();
    assert.deepEqual(shown, { date: "2026-10-02", today: disk.record, calendar: disk.record,
      habit: "Exercise", task: "completed", context: disk.record });
    assert.equal(draft.value, "Unsaved next message");
  });
}

test("a confirmed canonical receipt refreshes its captured date once before the turn finishes", async () => {
  let poll: () => void = () => {}; const dates: string[] = []; let taskRefreshes = 0;
  const initial = { id: "session", runId: "run", runState: "thinking", targetDate: "2026-10-08" };
  const saved = { ...initial, targetDate: "2026-10-09", messages: [], taskOperations: [
    { id: "record", status: "applied", targetDate: "2026-10-08", resultRevision: "record-v2", taskId: null, listId: null },
    { id: "task", status: "applied", targetDate: "2026-10-09", resultRevision: "task-v2", taskId: "task-1", listId: "inbox" },
    { id: "unknown", status: "unknown", targetDate: "2026-10-07", taskId: null, listId: null },
  ] };
  const context = vm.createContext({ Promise, currentWorkspaceDestination: "collaboration", currentCollaborationSession: initial,
    collaborationStatusTimer: null, window: { setInterval(callback: () => void) { poll = callback; return 1; }, clearInterval() {},
      __TAURI__: { core: { async invoke() { return saved; } } } },
    refreshCollaborationRunOwner() {}, renderCollaborationWorkspace() {},
    async refreshCanonicalDateProjections(date: string) { dates.push(date); },
    async refreshTasks() { taskRefreshes++; }, async refreshCollaborationContext() {},
  });
  vm.runInContext(production + "\nwatchCollaborationSession(currentCollaborationSession)", context);
  poll(); await tick(); poll(); await tick();
  assert.deepEqual(dates, ["2026-10-08"]);
  assert.equal(taskRefreshes, 1);
  assert.equal(context.currentCollaborationSession.runState, "thinking", "saved effects are visible while the final reply is still pending");
});

for (const destination of ["today", "calendar"]) {
  test(`confirmed Task effects refresh the visible ${destination} date while the reply remains pending`, async () => {
    let poll: () => void = () => {}; const dates: string[] = [];
    const initial = { id: "session", runId: "run", runState: "thinking", targetDate: "2026-10-09" };
    const updated = { ...initial, taskOperations: [{ id: "task", taskId: "stable", listId: "inbox", status: "applied", resultRevision: "v2", targetDate: "2026-10-08" }], messages: [] };
    const context = vm.createContext({ Promise, currentWorkspaceDestination: destination, currentCollaborationSession: initial,
      selectedTodayDate: "2026-10-02", currentTodayView: { date: "2026-10-02" }, selectedCalendarDate: "2026-10-03", currentCalendarSummaryView: { date: "2026-10-03" },
      collaborationStatusTimer: null, window: { setInterval(callback: () => void) { poll = callback; return 1; }, clearInterval() {}, __TAURI__: { core: { async invoke() { return updated; } } } },
      refreshCollaborationRunOwner() {}, renderCollaborationWorkspace() {}, async refreshCanonicalDateProjections(date: string) { dates.push(date); },
      async refreshTasks() {}, async refreshCollaborationContext() {} });
    vm.runInContext(production + "\nwatchCollaborationSession(currentCollaborationSession)", context);
    poll(); await tick(); poll(); await tick();
    assert.deepEqual(dates, [destination === "today" ? "2026-10-02" : "2026-10-03"]);
    assert.equal(context.currentCollaborationSession.runState, "thinking");
  });
}

test("opening Tasks during a Collaboration turn keeps the source watch and request target", async () => {
  let cleared = false; let refreshed = false;
  const rest = source.slice(source.indexOf("function showWorkspaceDestination("));
  const navigation = stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
  const context = vm.createContext({ currentWorkspaceDestination: "collaboration", selectedTodayDate: null,
    currentCollaborationSession: { id: "session", targetDate: "2026-10-08", runState: "thinking" }, collaborationStatusTimer: 17,
    cancelCollaborationVoiceCaptureForSelectionChange() {}, stashCollaborationDraft() {},
    renderDailyPlanReturnNavigation() {}, renderWorkspaceNavigationLanguage() {}, renderWorkspaceContextStatus() {}, renderWorkspaceFeatureArea() {}, renderWorkspaceRailContext() {},
    workspaceDestinationDetails: { tasks: { title: "Tasks", description: "Existing Tasks" } },
    appShell: null, workspaceDestinationPanels: [], workspaceInformation: null, workspaceDestinationSelect: null, workspaceTitle: null, workspaceDescription: null,
    setCopy() {}, window: { clearInterval() { cleared = true; } }, async refreshTasks() { refreshed = true; } });
  vm.runInContext(navigation + "\nshowWorkspaceDestination('tasks', true)", context);
  await tick();
  assert.equal(cleared, false);
  assert.equal(context.collaborationStatusTimer, 17);
  assert.equal(context.currentWorkspaceDestination, "tasks");
  assert.equal(context.currentCollaborationSession.targetDate, "2026-10-08");
  assert.equal(refreshed, true);
});
