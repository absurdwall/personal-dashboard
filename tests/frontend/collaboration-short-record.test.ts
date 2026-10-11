import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { LatestRequest } from "../../frontend/latest-request.ts";
import { refreshTodayPresentation } from "../../frontend/today-refresh.ts";
import { interfaceCopy } from "../../frontend/interface-language.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
function production(name: string) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1);
  const rest = source.slice(start);
  const end = /^}\n/m.exec(rest)!;
  return stripTypeScriptTypes(rest.slice(0, end.index + 2));
}
for (const language of ["en", "zh"] as const) {
  test(`new Short records have a ${language} review description and refresh canonical views`, () => {
    const context = vm.createContext({ t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(production("collaborationTaskOperationText") + "\n" + production("isCanonicalDateProjectionOperation"), context);
    for (const category of ["ordinary", "exercise"]) {
      const operation = { operation: "createShortRecord", category, content: "昨天锻炼了25分钟，完成时间未知。" };
      context.operation = operation;
      const description = vm.runInContext("collaborationTaskOperationText(operation, { kind: 'dailyReview' })", context);
      assert.ok(description.includes(operation.content));
      assert.ok(description.includes(language === "zh" ? "新增" : "Add"));
      assert.ok(!description.includes("Habit completion"));
      assert.equal(vm.runInContext("isCanonicalDateProjectionOperation(operation)", context), true);
    }
  });
}

for (const [operation, transition, phase] of [
  ["saveDailyPlan", "initialPlan", "morning"],
  ["saveDailyPlan", "daytimeReplan", "daytime"],
  ["saveEveningReview", null, "evening"],
  ["createShortRecord", null, "daytime"],
  ["correctShortRecord", null, "daytime"],
] as const) {
  test(`saved ${operation}/${transition ?? "record"} card opens its original date and ${phase} phase`, () => {
    const element = () => ({ textContent: "", dataset: {}, children: [] as any[], listeners: {} as any,
      append(...nodes: any[]) { this.children.push(...nodes); }, replaceChildren() { this.children = []; },
      addEventListener(name: string, callback: () => void) { this.listeners[name] = callback; } });
    const list = element(); const destinations: unknown[] = []; const phases: string[] = [];
    const session = { id: "original-session", taskOperations: [{ id: "saved", status: "applied", targetDate: "2026-09-24", baseline: { kind: "none" }, operation: { operation, transition } }] };
    const context = vm.createContext({ document: { createElement: element }, collaborationTaskOperations: list, collaborationTaskToolNotice: null, session,
      t: (key: any, values: any) => interfaceCopy(key, "en", values), setCopy() {}, collaborationDateLabel: (date: string) => date,
      collaborationTaskOperationText: () => "Saved record change", collaborationTaskBaselineText: () => "Original source",
      appendDailyPlanBlockList() {}, appendDailyPlanEvidence() {}, appendDailyPlanMetadata() {},
      collaborationTaskActionErrors: new Map(), collaborationTaskProjectionWarnings: new Map(), pendingCollaborationTaskOperationIds: new Set(),
      rememberDailyPlanReturnTarget() {}, showWorkspaceDestination(...args: unknown[]) { destinations.push(args); }, showTodayPhase(phase: string) { phases.push(phase); } });
    vm.runInContext(production("renderCollaborationTaskOperations") + "\nrenderCollaborationTaskOperations(session)", context);
    list.children[0].children.at(-1).children[0].listeners.click();
    assert.deepEqual(destinations, [["today", true, "2026-09-24"]]);
    assert.deepEqual(phases, [phase]);
  });
}

test("a delayed canonical read preserves the explicitly selected record phase", async () => {
  let resolve: (view: any) => void = () => {};
  const response = new Promise<any>((complete) => { resolve = complete; });
  const shown: string[] = [];
  const rest = source.slice(source.indexOf("async function refreshToday("));
  const refresh = stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
  const context = vm.createContext({ selectedTodayDate: "2026-09-24", currentTodayView: null, currentTodayPhase: "daytime", todayPhaseSelectionRevision: 0,
    todayOperationCount: 0, taskOperationCount: 0, todayPresentationFresh: false, todayStatus: null,
    todayPresentationRequests: new LatestRequest(), refreshTodayPresentation,
    pendingWrites: { async wait() {} }, window: { __TAURI__: { core: { invoke() { return response; } } } },
    updateTodayOperationState() {}, hasTodayEditingTarget: () => false,
    renderToday() { shown.push(context.currentTodayPhase); },
    todayUnlocatedTimeRegion: null, todayUnlocatedTimeShortcut: null, todayUnlocatedOverride: null,
    todayReady: null, todayPhaseButtons: [], todayPhasePanels: [], todayEvidenceRegion: null, workspaceInformation: null,
    document: { querySelector: () => null }, renderTodayEvidence() {} });
  vm.runInContext(refresh + production("updateTodayUnlocatedPresentation") + production("showTodayPhase") + "\npending = refreshToday('2026-09-24', true); showTodayPhase('morning');", context);
  await Promise.resolve();
  resolve({ date: "2026-09-24", defaultPhase: "evening" });
  await context.pending;
  assert.deepEqual(shown, ["morning"]);
  assert.equal(context.currentTodayPhase, "morning");
});
