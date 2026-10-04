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
