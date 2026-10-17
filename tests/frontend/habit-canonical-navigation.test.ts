import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy } from "../../frontend/interface-language.ts";
import { LatestRequest } from "../../frontend/latest-request.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
function production(name: string) {
  const start = source.indexOf(`function ${name}(`);
  const begin = source.slice(Math.max(0, start - 6), start).endsWith("async ") ? start - 6 : start;
  const rest = source.slice(begin);
  return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
}
test("canonical Habit arrival reads every exact key/date and discards an older date response", async () => {
  const requests: { date: string; resolve: (view: any) => void }[] = [];
  const context = vm.createContext({ selectedHabitCell: null, currentHabitDateView: null, habitNoteStatus: null,
    habitDateRequests: new LatestRequest(), renderSelectedHabitCell() {},
    window: { __TAURI__: { core: { invoke(command: string, { date }: { date: string }) {
      assert.equal(command, "read_daily_view");
      return new Promise(resolve => requests.push({ date, resolve }));
    } } } } });
  vm.runInContext(production("loadSelectedHabitDate"), context);
  const first = vm.runInContext("loadSelectedHabitDate('reading', '2026-06-02')", context);
  const second = vm.runInContext("loadSelectedHabitDate('reading', '2026-06-03')", context);
  assert.deepEqual(requests.map(item => item.date), ["2026-06-02", "2026-06-03"]);
  requests[1].resolve({ date: "2026-06-03", habitCorrections: { habits: [] } }); await second;
  requests[0].resolve({ date: "2026-06-02", habitCorrections: { habits: [] } }); await first;
  assert.equal(context.currentHabitDateView.date, "2026-06-03");
});

for (const state of ["completed", "withdrawn", "unknown"]) {
  test(`missing-snapshot arrival renders ${state} canonical evidence read-only at the exact selected key/date`, () => {
    const element = (tag: string) => ({ tag, textContent: "", children: [] as any[], append(...nodes: any[]) { this.children.push(...nodes); } });
    const destination = element("destination");
    const context = vm.createContext({ document: { createElement: element }, habitsDestination: destination,
      currentHabitSnapshot: null,
      historicalHabitCorrectionDate: () => null,
      selectedHabitCell: { habitKey: "reading", date: "2026-06-02" }, currentInterfaceLanguage: "en", habitNoteStatus: null,
      currentHabitDateView: { date: "2026-06-02", habitCorrections: { message: "Snapshot missing; local source read", habits: state === "unknown" ? [] : [
        { key: "other", localChanges: [{ state: "completed", changedAt: "other-source" }] },
        { key: "reading", nameKnown: false, cell: { localCompletionState: state }, localChanges: [{ state, changedAt: "2026-09-27T21:00:00-04:00" }] },
      ] } },
      displayHabitName: () => { throw Error("No guessed display identity"); },
      habitCompletionPresentation: (cell: any) => ({ explanation: cell.localCompletionState === "completed" ? "local" : "withdrawn", sourceLabels: [] }),
      habitCompletionExplanationLabels: { local: "habits.completionLocal", withdrawn: "habits.completionWithdrawn" },
      t: (key: string) => key, setCopy: (node: any, key: string, values: any) => { node.textContent = `${key}:${JSON.stringify(values ?? {})}`; },
      setAppMessage: (node: any, message: string) => { node.textContent = message; }, setCopyError() {} });
    vm.runInContext(production("renderCanonicalHabitDetail") + "\nrenderCanonicalHabitDetail()", context);
    const panel = destination.children[0];
    assert.equal(panel.className, "habit-canonical-detail");
    assert.equal(panel.children[0].textContent, "2026-06-02 · reading");
    assert.ok(panel.children[1].textContent.includes(state === "completed" ? "completionLocal" : state === "withdrawn" ? "completionWithdrawn" : "completionUnknown"));
    assert.ok(panel.children[2].textContent.includes("canonicalCoverage"));
    assert.ok(panel.children[3].textContent.includes("goalUnknown"));
    const rendered = JSON.stringify(panel);
    assert.ok(!rendered.includes("other-source"));
    assert.ok(!rendered.includes('"tag":"button"'));
    if (state !== "unknown") assert.ok(rendered.includes("2026-09-27T21:00:00-04:00"));
  });
}

test("Habit source links retain exact key/date through the existing destination", () => {
  const destinations: any[] = [];
  const context = vm.createContext({ selectedHabitCell: null, rememberDailyPlanReturnTarget() {},
    showWorkspaceDestination(...args: any[]) { destinations.push(args); } });
  vm.runInContext(production("navigateCollaborationLink") + "\nnavigateCollaborationLink({id:'saved-session'}, {kind:'habit',key:'reading',date:'2026-06-02'})", context);
  assert.equal(context.selectedHabitCell.habitKey,"reading");
  assert.equal(context.selectedHabitCell.date,"2026-06-02");
  assert.deepEqual(destinations,[["habits",true]]);
});

for (const language of ["en", "zh"] as const) {
  test(`saved canonical revision and snapshot error remain separate in the production ${language} receipt card`, () => {
    const element = () => ({ textContent:"",children:[] as any[],append(...nodes:any[]) { this.children.push(...nodes); } });
    const parent=element();
    const baseline={date:"2026-06-02",key:"reading",name:"Reading",localState:"Completed",externalCompletion:false,
      sourceSnapshotState:"error",sourceSnapshotAt:null,completionRevision:"canonical-saved-revision",sourceSnapshotMessage:"Snapshot read interrupted",sourceEvidence:[]};
    const context=vm.createContext({document:{createElement:element},parent,baseline,collaborationDateLabel:(date:string)=>date,
      t:(key:any,values:any)=>interfaceCopy(key,language,values),setCopy() {},appendTextSnapshotSection() {}});
    vm.runInContext(production("appendHabitCompletionSnapshot")+"\nappendHabitCompletionSnapshot(parent,baseline,'collaboration.habitCompletionSavedSnapshot')",context);
    const snapshot=parent.children[0];
    assert.ok(snapshot.children[1].textContent.includes(interfaceCopy("collaboration.habitLocalState.completed",language)));
    assert.ok(snapshot.children[1].textContent.includes(interfaceCopy("common.unknown",language)));
    assert.ok(snapshot.children[2].textContent.includes("canonical-saved-revision"));
    assert.ok(snapshot.children[3].textContent.includes("Snapshot read interrupted"));
  });
}
