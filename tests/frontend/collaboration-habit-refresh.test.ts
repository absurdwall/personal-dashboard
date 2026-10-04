import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy } from "../../frontend/interface-language.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const start = source.indexOf("function appendHabitRefreshReport(");
const rest = source.slice(start);
const end = /^}\n/m.exec(rest)!;
const renderer = stripTypeScriptTypes(rest.slice(0, end.index + 2));
function element() { return { textContent: "", children: [] as any[], append(...nodes: any[]) { this.children.push(...nodes); } }; }
for (const language of ["zh", "en"] as const) {
  test(`Habit refresh independently displays query/generation/publication/readback in ${language}`, () => {
    const container = element();
    const report = { query: "verifiedMappedScope", generation: "validated", publication: "published", display: "ready",
      generatedAt: "2026-09-28T01:00:00-04:00", rangeFrom: "2026-07-13", rangeTo: "2026-09-27", message: "Only exercise source scope verified; other coverage unknown." };
    const context = vm.createContext({ document: { createElement: element }, container, report,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nappendHabitRefreshReport(container, report)", context);
    const card = container.children[0];
    assert.equal(card.children.length, 7);
    for (const [index, stage] of ["query", "generation", "publication", "display"].entries()) {
      assert.ok(card.children[index + 1].textContent.startsWith(interfaceCopy(`collaboration.habitRefreshStage.${stage}` as any, language)));
      assert.ok(card.children[index + 1].textContent.includes(interfaceCopy(`collaboration.habitRefreshState.${report[stage as keyof typeof report]}` as any, language)));
    }
    assert.ok(card.children[5].textContent.includes(report.rangeTo));
    assert.ok(card.children[5].textContent.includes(report.generatedAt));
    report.publication = "notPublished"; report.display = "retainedOrMissing";
    vm.runInContext("appendHabitRefreshReport(container, report)", context);
    assert.ok(container.children[1].children[3].textContent.includes(interfaceCopy("collaboration.habitRefreshState.notPublished", language)));
    assert.ok(container.children[1].children[4].textContent.includes(interfaceCopy("collaboration.habitRefreshState.retainedOrMissing", language)));
  });
}
