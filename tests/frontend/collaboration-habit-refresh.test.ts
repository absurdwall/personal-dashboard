import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy, localizeCollaborationDiagnostic } from "../../frontend/interface-language.ts";
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
      currentInterfaceLanguage: language, localizeCollaborationDiagnostic, t: (key: any, values: any) => interfaceCopy(key, language, values) });
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

for (const language of ["zh", "en"] as const) {
  test(`refresh host diagnostics localize without changing paths and snapshot evidence in ${language}`, () => {
    const container = element();
    const report = { query: "verifiedMappedScope", generation: "validated", publication: "published", display: "ready", message: "Verified 1 explicitly mapped external Habits; unmapped source coverage remains partial/unknown. Rebuilt exact/threshold Daily Record evidence. 已读取按需生成的本地快照；来源覆盖与刷新结果可分别核对。" };
    const context = vm.createContext({ document: { createElement: element }, container, report,
      currentInterfaceLanguage: language, localizeCollaborationDiagnostic, t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nappendHabitRefreshReport(container, report)", context);
    const detail = container.children[0].children.at(-1).textContent;
    assert.ok(detail.includes(language === "zh" ? "已核验 1 个" : "Verified 1"));
    assert.ok(detail.includes(language === "zh" ? "来源覆盖与刷新结果" : "source coverage and refresh outcomes"));
    report.message = "Canonical Daily Record changed during generation: /synthetic Vault/保留原文.md; snapshot publication rejected";
    vm.runInContext("appendHabitRefreshReport(container, report)", context);
    const failed = container.children[1].children.at(-1).textContent;
    assert.ok(failed.includes("/synthetic Vault/保留原文.md"));
    assert.ok(failed.includes(language === "zh" ? "快照发布被拒绝" : "snapshot publication rejected"));
    report.message = "Source query did not prove the full mapped Habit/date coverage; previous snapshot is retained";
    vm.runInContext("appendHabitRefreshReport(container, report)", context);
    assert.equal(container.children[2].children.at(-1).textContent, localizeCollaborationDiagnostic(report.message, language));
  });
}
