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
function element() { return { textContent: "", dataset: {}, addEventListener() {}, setAttribute() {}, children: [] as any[], append(...nodes: any[]) { this.children.push(...nodes); }, replaceChildren() { this.children = []; } }; }
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

for (const language of ["zh", "en"] as const) {
  test(`native Dida result suffix is localized only for host diagnostics in ${language}`, () => {
    const native = "Current Dida source readback confirms the requested outcome for the recorded stable object identity. No write was replayed; source confirmation does not reconstruct a lost original receipt. Source object IDs: source-id-a, source-id-b.";
    const list = element();
    const session = { messages: [{ role: "user", text: "Current native request", messageDate: "2026-10-03", targetDate: "2026-10-03", externalAppIds: [], externalActions: [], actionResults: [
      { id: "host", source: "Dida", status: "saved", messageKind: "diagnostic", message: native },
      { id: "literal", source: "Dida", status: "saved", messageKind: "sourceText", message: native },
    ] }] };
    const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const results = list.children[0].children.find((node: any) => node.className === "collaboration-action-results");
    assert.ok(results.children[1].textContent.endsWith(localizeCollaborationDiagnostic(native, language)));
    assert.ok(results.children[2].textContent.endsWith(native));
  });
}


for (const language of ["zh", "en"] as const) {
  test(`completion conflict is translated only as a host diagnostic in ${language}`, () => {
    const literal = "This Task is already complete with a different completion date/time. Use the explicit completion correction operation.";
    const list = element();
    const session = { messages: [{ role: "user", text: "My completion correction", messageDate: "2026-10-03", targetDate: "2026-10-03", externalAppIds: [], externalActions: [], actionResults: [
      { id: "host", source: "Dashboard", status: "failed", messageKind: "diagnostic", message: literal },
      { id: "literal", source: "Dida", status: "unknown", messageKind: "sourceText", message: literal },
    ] }] };
    const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const results = list.children[0].children.find((node: any) => node.className === "collaboration-action-results");
    const expected = language === "zh" ? "该任务已完成，但完成日期或时间不同。请使用明确的完成记录更正操作。" : literal;
    assert.ok(results.children[1].textContent.endsWith(expected));
    assert.ok(results.children[2].textContent.endsWith(literal), "source wording is retained verbatim");
  });
}


for (const language of ["zh", "en"] as const) {
  test(`native file refusal reaches localized run progress without changing relative paths in ${language}`, () => {
    const path = "life/保留.user-text.md";
    for (const diagnostic of [
      `Native personal-content access refuses a redirected path: ${path}. No model turn was sent.`,
      `Native personal-content access requires a directory: ${path}. No model turn was sent.`,
      "The selected Vault changed before native file access was granted. No model turn was sent.",
    ]) {
      for (const progress of [diagnostic, `The request outcome could not be confirmed: ${diagnostic}. Check the saved Codex result before continuing; the request will not be replayed.`]) {
        const context = vm.createContext({ currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
          t: (key: any, values: any) => interfaceCopy(key, language, values), session: { runState: "interrupted", progress } });
        vm.runInContext(functionSource("collaborationRunStateLabel") + functionSource("collaborationRunProgressLabel") + "\nactual = collaborationRunProgressLabel(session)", context);
        const expected = localizeCollaborationDiagnostic(progress, language);
        assert.ok(context.actual.endsWith(expected));
        if (language === "zh") assert.ok(!context.actual.includes("No model turn was sent") && !context.actual.includes("outcome could not be confirmed"));
        else assert.ok(context.actual.endsWith(progress));
        if (diagnostic.includes(path)) assert.ok(context.actual.includes(path));
      }
    }
  });

  test(`expanded external activity localizes verified host summaries and preserves source/input text in ${language}`, () => {
    const literal = "Current Dida readback is unavailable. Preserve any confirmed effects, resolve the source state before retrying, and do not repeat creation while unknown.";
    const list = element();
    const action = { sourceName: "Owned source name", sourceId: "dida365", toolId: "upsert_habit_checkins", status: "unknown", targetScope: "2026-09-26", inputSummary: literal, resultSummary: literal };
    const session = { messages: [{ role: "user", text: "My request", messageDate: "2026-09-27", targetDate: "2026-09-26", externalAppIds: [], externalActions: [
      { ...action, actionId: "host", verification: { checks: [] } }, { ...action, actionId: "source", verification: null },
    ] }] };
    const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const activity = list.children[0].children.find((node: any) => node.className === "collaboration-external-activity");
    assert.ok(activity.children[1].children[2].textContent.endsWith(literal));
    assert.ok(activity.children[1].children[3].textContent.endsWith(localizeCollaborationDiagnostic(literal, language)));
    assert.ok(activity.children[2].children[3].textContent.endsWith(literal));
  });

  test(`operation cards localize host failures and Short/local Habit saved diagnostics in ${language}`, () => {
    const list = element();
    const messages = [
      "This Task is already complete with a different completion date/time. Use the explicit completion correction operation.",
      "Saved ordinary Short Record retained-record-id for 2026-09-27. This is record context, not Habit or Task completion. Today and Calendar read the same canonical Daily Record (revision retained-revision).",
      "Local Habit completion added for 保留 Habit 名称 on 2026-09-27 (completion revision completion-revision). Today refreshed to Daily Record revision daily-revision; external Habit sources were not changed by this local operation.",
    ];
    const session = { taskOperations: messages.map((resultMessage, index) => ({
      id: `op-${index}`, targetDate: "2026-09-27", status: index === 0 ? "failed" : "applied", executionAttempted: true,
      operation: { operation: ["completeTask", "createShortRecord", "setLocalHabitCompletion"][index] },
      baseline: { kind: "task" }, resultMessage,
    })) };
    const context = vm.createContext({ document: { createElement: element }, collaborationTaskToolNotice: null, collaborationTaskOperations: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      collaborationTaskOperationText: () => "用户操作原文", collaborationTaskBaselineText: () => "保留用户内容",
      collaborationTaskActionErrors: new Map(), collaborationTaskProjectionWarnings: new Map(), pendingCollaborationTaskOperationIds: new Set(),
      setCopy: (node: any, key: any) => { node.textContent = interfaceCopy(key, language); },
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(functionSource("renderCollaborationTaskOperations") + "\nrenderCollaborationTaskOperations(session)", context);
    for (const [index, card] of list.children.entries()) {
      const result = card.children.find((node: any) => node.className === "collaboration-task-operation-result");
      assert.equal(result.textContent, localizeCollaborationDiagnostic(messages[index], language));
      if (language === "zh") assert.notEqual(result.textContent, messages[index]);
      assert.ok(card.children.some((node: any) => node.textContent === "保留用户内容"));
    }
  });

  test(`unconfirmed memory card translates its host result while preserving authorization and preference in ${language}`, () => {
    const list = element();
    const literal = "Background save is unconfirmed; read the existing Self document before retrying.";
    const proposal = { id: "memory-id", status: "awaitingApproval", executionAttempted: true, createdAt: "2026-09-27T12:00Z", basis: "explicitUserInstruction", authorizationQuote: "请保留我的授权原文", change: "用户长期偏好原文", resultMessage: literal };
    const context = vm.createContext({ document: { createElement: element }, collaborationMemoryProposals: list,
      session: { memoryProposals: [proposal] }, collaborationMemoryProposalErrors: new Map(),
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(functionSource("renderCollaborationMemoryProposals") + "\nrenderCollaborationMemoryProposals(session)", context);
    const text = list.children[0].children.map((node: any) => node.textContent);
    assert.ok(text.includes(localizeCollaborationDiagnostic(literal, language)));
    assert.ok(text.includes(proposal.authorizationQuote) && text.includes(proposal.change));
  });
}
