import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy } from "../../frontend/interface-language.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const start = source.indexOf("function renderCollaborationMessages(");
const rest = source.slice(start);
const end = /^}\n/m.exec(rest)!;
const renderer = stripTypeScriptTypes(rest.slice(0, end.index + 2));
function element() { return { textContent: "", dataset: {}, children: [] as any[], append(...nodes: any[]) { this.children.push(...nodes); }, replaceChildren() { this.children = []; } }; }
for (const language of ["zh", "en"] as const) {
  test(`request results retain independent saved/unknown/retained outcomes after reopen in ${language}`, () => {
    const list = element();
    const session = { id: "same-saved-session", lastHabitRefresh: { publication: "published", display: "ready" }, messages: [
      { id: "first", role: "user", text: "A compound request", messageDate: "2026-10-03", targetDate: "2026-10-03", externalAppIds: [], externalActions: [], actionResults: [
        { id: "task-1", source: "Dashboard", status: "applied", targetDate: "2026-10-09", message: "Future Task saved with its stable ID" },
        { id: "habit-1", source: "Dida", status: "unknown", targetDate: null, message: "Exact source readback required" },
        { id: "refresh-1", source: "Habits page", status: "retainedOrMissing", targetDate: "2026-10-03", message: "Refresh failed; previous reading retained" },
      ] },
      { id: "second", role: "user", text: "A later refresh", messageDate: "2026-10-03", targetDate: "2026-10-03", externalAppIds: [], externalActions: [], actionResults: [
        { id: "refresh-2", source: "Habits page", status: "ready", targetDate: "2026-10-03", message: "Fresh readback confirmed" },
      ] },
    ] };
    const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list,
      collaborationDateLabel: (value: string) => value, t: (key: any, values: any) => interfaceCopy(key, language, values), session });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const first = list.children[0].children.find((node: any) => node.className === "collaboration-action-results");
    assert.equal(first.children.length, 4);
    assert.equal(first.children[1].dataset.actionId, "task-1");
    assert.ok(first.children[1].textContent.includes("2026-10-09"));
    assert.ok(first.children[2].textContent.includes(interfaceCopy("collaboration.taskOperationStatus.unknown", language)));
    assert.ok(first.children[3].textContent.includes(interfaceCopy("collaboration.habitRefreshState.retainedOrMissing", language)));
    const previous = first.children.map((node: any) => node.textContent).join("\n");
    context.session = JSON.parse(JSON.stringify(session));
    vm.runInContext("renderCollaborationMessages(session)", context);
    assert.equal(list.children[0].children.find((node: any) => node.className === "collaboration-action-results").children.map((node: any) => node.textContent).join("\n"), previous);
    assert.ok(!previous.includes("Fresh readback confirmed"));
  });
}
