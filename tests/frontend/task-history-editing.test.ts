import assert from "node:assert/strict";
import test from "node:test";
import { editingRenderer } from "./task-history-harness.ts";

for (const category of ["ordinary", "exercise"]) {
  test(`saving a ${category} Today note preserves a paged completed-task correction and its rollover guard`, async () => {
    const r = editingRenderer();
    const tasks = Array.from({ length: 65 }, (_, i) => ({
      id: `completed-${i}`, name: `Completed ${i}`, content: null, date: "2026-10-03", time: null,
      listId: "inbox", state: "completed", deletedAt: null, overdue: false,
      completion: { completedOn: "2026-10-03", completedTime: null }, changes: [],
    }));
    const view = {
      state: "ready", date: "2026-10-03", isToday: true, canRecord: true, targetBinding: "daily-binding", revision: "r1",
      tasks: { state: "ready", targetBinding: "task-binding", lists: [], tasks },
      baseline: { timeline: [] }, daytime: { updates: [], shortRecords: [] },
      evening: Object.fromEntries(["account", "comparison", "summary", "questions", "additions", "corrections", "other", "recordSupplements"].map(key => [key, []])),
    };
    r.renderToday(view);
    const history = r.todayTaskScheduled.children[0];
    history.open = true;
    history.listeners.get("toggle")();
    history.children[1].children.at(-1).listeners.get("click")();
    const form = r.taskEditorForms().find((form: any) => form.dataset.taskEditor === "completed-34");
    assert.ok(form, "the edited Task is beyond the first page");
    form.hidden = false;
    form.querySelector("[data-task-completion-date]").value = "2026-10-02";
    assert.equal(r.hasTodayEditingTarget(view), true);
    r.todayDaytimeContent.value = category === "exercise" ? "Ran 20 minutes" : "Saved an ordinary note";
    r.todayDaytimeKind.value = category;
    const ipcCalls: any[] = [];
    r.window = { __TAURI__: { core: { invoke: async (command: string, args: any) => {
      ipcCalls.push({ command, args });
      if (command === "today_clock") return { livedDate: "2026-10-04", time: "04:00" };
      return { ...view, revision: "r2", daytime: { updates: [], shortRecords: [{ id: "note", category }] } };
    } } } };
    assert.equal(await r.saveDatedNote(), true, String(r.lastError));
    assert.equal(ipcCalls[0].command, "add_dated_note");
    assert.equal(ipcCalls[0].args.input.category, category);
    assert.equal(r.todayDaytimeContent.value, "", "the saved note must not mask the Task guard");
    assert.equal(r.todayOperationCount, 0, "an in-flight write must not mask the Task guard");
    assert.equal(r.todayTaskScheduled.children[0].open, true, "the containing history must remain open");
    const preserved = r.taskEditorForms().find((form: any) => form.dataset.taskEditor === "completed-34");
    assert.ok(preserved, "the paged Task editor must still be instantiated");
    assert.equal(preserved.hidden, false);
    assert.equal(preserved.querySelector("[data-task-completion-date]").value, "2026-10-02");
    assert.equal(r.hasTodayEditingTarget(r.currentTodayView), true);
    const restoredForms = r.taskEditorForms();
    assert.equal(restoredForms.length, 31, "restore only the first page plus the active off-page editor");
    const more = r.todayTaskScheduled.children[0].children[1].children.at(-1);
    assert.equal(more.params.count, 29, "Show more excludes the editor already restored beyond the page");
    more.listeners.get("click")();
    assert.equal(r.taskEditorForms().length, 60);
    assert.equal(r.taskEditorForms().find((form: any) => form.dataset.taskEditor === "completed-34"), preserved,
      "pagination must keep the same open correction form");
    assert.equal(preserved.hidden, false);
    assert.equal(preserved.querySelector("[data-task-completion-date]").value, "2026-10-02");
    await r.refreshTodayClock();
    assert.equal(r.clockReloaded, undefined, "04:00 must not automatically replace the edited day");
    assert.equal(r.selectedTodayDate, "2026-10-03");
    assert.equal(r.currentTodayView.date, "2026-10-03");
    assert.equal(r.currentTodayView.isToday, false);
  });
}
