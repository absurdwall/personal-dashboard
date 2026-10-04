import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy, localizeCollaborationDiagnostic } from "../../frontend/interface-language.ts";
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
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic, t: (key: any, values: any) => interfaceCopy(key, language, values), session });
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

function functionSource(name: string) {
  const rest = source.slice(source.indexOf(`function ${name}(`));
  return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
}
for (const language of ["zh", "en"] as const) {
  test(`completed reply and saved source outcomes remain separate and truthful in ${language}`, () => {
    const list = element();
    const literal = "Prepared for review; not saved to the source.";
    const session = { runState: "completed", progress: "Dashboard data unchanged", messages: [
      { role: "user", text: "Keep my source text", messageDate: "2026-10-03", targetDate: "2026-10-03", externalAppIds: [], externalActions: [], actionResults: [
        { id: "review", source: "Dashboard", status: "awaitingApproval", messageKind: "diagnostic", message: literal },
        { id: "native", source: "My Dida source", status: "saved", messageKind: "sourceText", message: literal },
        { id: "memory", source: "Long-term background", status: "applied", messageKind: "diagnostic", message: "Saved the approved durable update in the existing life/Self.md document." },
      ] },
      { role: "assistant", text: "My factual reply · 请保留原文", messageDate: "2026-10-03", targetDate: "2026-10-03" },
    ] };
    const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      applicationMessage: (value: string) => value, t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(functionSource("collaborationRunStateLabel") + functionSource("collaborationRunProgressLabel") + renderer + "\nrenderCollaborationMessages(session); header = collaborationRunProgressLabel(session);", context);
    assert.equal(context.header, interfaceCopy("collaboration.statusCompleted", language));
    assert.ok(!context.header.includes("unchanged") && !context.header.includes("未更改"));
    const results = list.children[0].children.find((node: any) => node.className === "collaboration-action-results");
    assert.ok(results.children[1].textContent.endsWith(localizeCollaborationDiagnostic(literal, language)));
    assert.ok(results.children[2].textContent.includes(interfaceCopy("collaboration.externalStatusSaved", language)));
    assert.ok(results.children[2].textContent.endsWith(literal), "Source-owned wording remains verbatim even when it matches host grammar");
    assert.ok(results.children[3].textContent.includes(interfaceCopy("collaboration.taskOperationStatus.applied", language)));
    const assistant = list.children[1];
    assert.equal(assistant.children[1].textContent, session.messages[1].text);
    assert.equal(assistant.children[2].textContent, interfaceCopy("collaboration.messageSavedBoundary", language));
    assert.ok(!assistant.children[2].textContent.includes("not a saved business change") && !assistant.children[2].textContent.includes("不是已保存"));
  });
}
