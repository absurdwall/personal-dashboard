import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";

const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const body = source.slice(source.indexOf("async function refreshCanonicalDateProjections("));
const production = stripTypeScriptTypes(body.slice(0, /^}\n/m.exec(body)!.index + 2));

function fixture(failReads = false) {
  let release: () => void = () => {};
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const rendered: string[] = [];
  const observations: unknown[] = [];
  const commands: string[] = [];
  const request = { invalidate() { rendered.push("invalidate"); } };
  const context = vm.createContext({ Promise, currentWorkspaceDestination: "today",
    selectedTodayDate: "2026-10-09", currentTodayView: {date: "2026-10-09", vault: "vault-a"},
    selectedCalendarDate: null, currentCalendarSummaryView: null, selectedHabitCell: {date: "2026-10-09"},
    currentHabitDateView: null, currentHabitSnapshot: {vault: "vault-a"}, currentCalendarMonth: null,
    collaborationVaultSelectionRevision: 1, vaultSelectionInProgress: false,
    todayStatus: {dataset: {}}, todayPresentationFresh: true,
    window: {__TAURI__: {core: {async invoke(command: string, args: unknown) {
      commands.push(command);
      if (command === "collaboration_record_refresh") { observations.push(args); return; }
      await barrier;
      if (failReads) throw new Error("Vault A read failed");
      return command === "read_daily_view" ? {date: "2026-10-09", vault: "vault-a", state: "ready"}
        : command === "calendar_month" ? {year: 2026, month: 10, taskState: "ready"}
          : {vault: "vault-a", state: "stale"};
    }}}},
    refreshSleepSurfaces() {},
    todayPresentationRequests: request, todayClockRequests: request, calendarSelectionRequests: request,
    calendarMonthRequests: request, habitDateRequests: request, habitSnapshotRequests: request,
    renderToday(view: unknown) {context.currentTodayView = view; rendered.push("today");},
    renderCalendarSummary() {rendered.push("summary");}, renderCalendarGrid() {rendered.push("calendar");},
    renderSelectedHabitCell() {rendered.push("habit-cell");},
    renderHabitSnapshot(view: unknown) {context.currentHabitSnapshot = view; rendered.push("habits");},
    renderCalendarReadError() {rendered.push("calendar-error");}, setCopyError() {rendered.push("today-error");}, t: (key: string) => key,
  });
  vm.runInContext(production, context);
  return {context, release, rendered, observations, commands,
    run() { return vm.runInContext("refreshCanonicalDateProjections('2026-10-09', {sessionId:'session-a',executionId:'run-a',trigger:'confirmedEffect'})", context); }};
}

for (const failed of [false, true]) {
  test(`delayed ${failed ? "failed" : "successful"} Vault A refresh cannot mutate Vault B projections or observations`, async () => {
    const f = fixture(failed); const pending = f.run();
    f.context.collaborationVaultSelectionRevision = 2;
    f.context.currentTodayView = {date: "2026-10-09", vault: "vault-b"};
    f.context.currentHabitSnapshot = {vault: "vault-b"};
    f.context.currentHabitDateView = {vault: "vault-b"};
    f.release(); await pending;
    assert.deepEqual(f.rendered, []);
    assert.deepEqual(f.observations, []);
    assert.equal(f.context.currentTodayView.vault, "vault-b");
    assert.equal(f.context.currentHabitSnapshot.vault, "vault-b");
    assert.equal(f.context.currentHabitDateView.vault, "vault-b");
    assert.equal(f.context.todayPresentationFresh, true);
  });
}

test("a refresh started during a Vault switch does not issue selected-source reads", async () => {
  const f = fixture(); f.context.vaultSelectionInProgress = true;
  const pending = f.run(); f.release(); await pending;
  assert.deepEqual(f.commands, []);
});

test("same-Vault refresh retains stale source state separately from applied rendering", async () => {
  const f = fixture(); const pending = f.run(); f.release(); await pending;
  assert.ok(f.rendered.includes("today") && f.rendered.includes("habits"));
  const observation = f.observations[0] as any;
  assert.equal(observation.executionId, "run-a");
  assert.equal(observation.observations.find((entry: any) => entry.target === "habits").sourceState, "stale");
  assert.equal(observation.observations.find((entry: any) => entry.target === "habits").pageState, "cached");
});
