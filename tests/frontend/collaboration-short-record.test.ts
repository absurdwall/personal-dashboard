import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
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
