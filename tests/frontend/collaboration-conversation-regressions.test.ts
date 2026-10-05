import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy, localizeCollaborationDiagnostic } from "../../frontend/interface-language.ts";

const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
function fn(name: string) {
  const rest = source.slice(source.search(new RegExp(`(?:async )?function ${name}\\(`)));
  return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
}
function element() {
  return { textContent: "", dataset: {}, children: [] as any[], addEventListener() {}, setAttribute() {},
    append(...nodes: any[]) { this.children.push(...nodes); }, replaceChildren() { this.children = []; } };
}
function text(node: any): string { return [node.textContent, ...node.children.map(text)].join("\n"); }
test("tool envelopes never appear as the user's message or visible reply outcomes", () => {
  const list = element();
  const request = { id: "user", role: "user", text: "都确认", executionId: "run", messageDate: "2026-10-04", targetDate: "2026-10-04", deliveryState: "completed", externalAppIds: [],
    externalActions: [{ actionId: "read", sourceName: "dida365", sourceId: "dida365", toolId: "get_habit_checkins", status: "completed", resultSummary: '{"content":[{"text":"{\\"checkins\\":[]}"}]}', inputSummary: "{}" }],
    actionResults: [{ id: "read", source: "dida365", status: "completed", messageKind: "sourceText", message: '{"content":[{"text":"{\\"checkins\\":[]}"}]}' },
      { id: "write", source: "Dashboard", status: "applied", messageKind: "diagnostic", message: "Daytime update saved", targetDate: "2026-10-04" }] };
  const session = { id: "session", taskOperations: [], messages: [request,
    { id: "reply", role: "assistant", text: "已记录。", executionId: "run", messageDate: "2026-10-04", targetDate: "2026-10-04" }] };
  const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list, session,
    collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: "zh", localizeCollaborationDiagnostic,
    t: (key: any, values: any) => interfaceCopy(key, "zh", values), collaborationDeliveryStateLabel: (v: string) => v });
  const helpers = ["collaborationVisibleResults", "renderCollaborationOutcomes", "collaborationOutcomeSummary"].filter(name => source.includes(`function ${name}(`)).map(fn).join("\n");
  vm.runInContext(helpers + fn("renderCollaborationMessages") + "\nrenderCollaborationMessages(session)", context);
  assert.equal(list.children[0].children[1].textContent, "都确认");
  assert.ok(!list.children[0].children.some((node: any) => node.className === "collaboration-action-results"), "business effects belong to the reply, not the user's input");
  assert.ok(!text(list).includes('"content"'), "raw MCP envelopes must not be shown in normal conversation");
  const outcomes = list.children[1].children.find((node: any) => node.className === "collaboration-action-results");
  assert.ok(outcomes, "the assistant reply must visibly contain the actual saved outcomes");
  assert.match(text(outcomes), /Daytime update saved/);
});
