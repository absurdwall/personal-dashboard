import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { appendCollaborationWorkHistory } from "../../frontend/collaboration-work-history.ts";
import { interfaceCopy, localizeCollaborationDiagnostic, localizeWorkHistoryDiagnostic } from "../../frontend/interface-language.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const start = source.indexOf("function renderCollaborationMessages(");
const rest = source.slice(start);
const end = /^}\n/m.exec(rest)!;
const renderer = ["collaborationVisibleResults", "collaborationOutcomeSummary", "renderCollaborationOutcomes", "collaborationWorkHistoryLabels"].map(functionSource).join("\n") + stripTypeScriptTypes(rest.slice(0, end.index + 2));
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
    const context = vm.createContext({ appendCollaborationWorkHistory, localizeWorkHistoryDiagnostic, document: { createElement: element }, collaborationMessageList: list,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic, t: (key: any, values: any) => interfaceCopy(key, language, values), session });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const first = list.children[1].children.find((node: any) => node.className === "collaboration-action-results");
    assert.equal(first.children.length, 4);
    assert.equal(first.children[1].dataset.actionId, "task-1");
    assert.ok(first.children[1].textContent.includes("2026-10-09"));
    assert.ok(first.children[2].textContent.includes(interfaceCopy("collaboration.taskOperationStatus.unknown", language)));
    assert.ok(first.children[3].textContent.includes(interfaceCopy("collaboration.habitRefreshState.retainedOrMissing", language)));
    const previous = first.children.map((node: any) => node.textContent).join("\n");
    context.session = JSON.parse(JSON.stringify(session));
    vm.runInContext("renderCollaborationMessages(session)", context);
    assert.equal(list.children[1].children.find((node: any) => node.className === "collaboration-action-results").children.map((node: any) => node.textContent).join("\n"), previous);
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
    const context = vm.createContext({ appendCollaborationWorkHistory, localizeWorkHistoryDiagnostic, document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      applicationMessage: (value: string) => value, t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(functionSource("collaborationRunStateLabel") + functionSource("collaborationRunProgressLabel") + renderer + "\nrenderCollaborationMessages(session); header = collaborationRunProgressLabel(session);", context);
    assert.equal(context.header, interfaceCopy("collaboration.statusCompleted", language));
    assert.ok(!context.header.includes("unchanged") && !context.header.includes("未更改"));
    const results = list.children[1].children.find((node: any) => node.className === "collaboration-action-results");
    assert.ok(results.children[1].textContent.endsWith(localizeCollaborationDiagnostic(literal, language)));
    assert.ok(results.children[2].textContent.includes(interfaceCopy("collaboration.externalStatusSaved", language)));
    assert.ok(results.children[2].textContent.endsWith(literal), "Source-owned wording remains verbatim even when it matches host grammar");
    assert.ok(results.children[3].textContent.includes(interfaceCopy("collaboration.taskOperationStatus.applied", language)));
    const assistant = list.children[1];
    assert.equal(assistant.children[1].textContent, session.messages[1].text);
    assert.equal(assistant.children[2].className, "collaboration-action-results");
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
    const context = vm.createContext({ appendCollaborationWorkHistory, localizeWorkHistoryDiagnostic, document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const results = list.children[1].children.find((node: any) => node.className === "collaboration-action-results");
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
    const context = vm.createContext({ appendCollaborationWorkHistory, localizeWorkHistoryDiagnostic, document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const results = list.children[1].children.find((node: any) => node.className === "collaboration-action-results");
    const expected = language === "zh" ? "该任务已完成，但完成日期或时间不同。请使用明确的完成记录更正操作。" : literal;
    assert.ok(results.children[1].textContent.endsWith(expected));
    assert.ok(results.children[2].textContent.endsWith(literal), "source wording is retained verbatim");
  });
}


for (const language of ["zh", "en"] as const) {
  test(`native file refusal reaches localized run progress without changing relative paths in ${language}`, () => {
    const path = "life/保留.user-text.md";
    const rawError = "Permission denied /保持原文/OS.file (os error 13)";
    for (const diagnostic of [
      `Native personal-content access refuses a redirected path: ${path}. No model turn was sent.`,
      `Native personal-content access requires a directory: ${path}. No model turn was sent.`,
      "The selected Vault changed before native file access was granted. No model turn was sent.",
      "The native file access root must be a real directory. No model turn was sent.",
      `Could not resolve the selected Vault: ${rawError}`,
      `Could not resolve the selected Vault for native tools: ${rawError}`,
      `Could not inspect personal-content permissions: ${rawError}`,
    ]) {
      for (const runState of ["error", "interrupted"]) {
        for (const progress of [diagnostic, `The request outcome could not be confirmed: ${diagnostic}. Check the saved Codex result before continuing; the request will not be replayed.`]) {
          const context = vm.createContext({ currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
            t: (key: any, values: any) => interfaceCopy(key, language, values), session: { runState, progress } });
          vm.runInContext(functionSource("collaborationRunStateLabel") + functionSource("collaborationRunProgressLabel") + "\nactual = collaborationRunProgressLabel(session)", context);
          const expected = localizeCollaborationDiagnostic(progress, language);
          assert.ok(context.actual.endsWith(expected));
          if (language === "zh") {
            assert.ok(!context.actual.includes("No model turn was sent") && !context.actual.includes("outcome could not be confirmed"));
            assert.ok(!context.actual.includes("Could not resolve") && !context.actual.includes("Could not inspect"));
          }
          else assert.ok(context.actual.endsWith(progress));
          if (diagnostic.includes(path)) assert.ok(context.actual.includes(path));
          if (diagnostic.includes(rawError)) assert.ok(context.actual.includes(rawError));
        }
      }
    }
  });

  test(`expanded external activity shows compact tool status without raw payloads in ${language}`, () => {
    const literal = "Current Dida readback is unavailable. Preserve any confirmed effects, resolve the source state before retrying, and do not repeat creation while unknown.";
    const list = element();
    const action = { sourceName: "Owned source name", sourceId: "dida365", toolId: "upsert_habit_checkins", status: "unknown", targetScope: "2026-09-26", inputSummary: literal, resultSummary: literal };
    const session = { messages: [{ role: "user", text: "My request", messageDate: "2026-09-27", targetDate: "2026-09-26", externalAppIds: [], externalActions: [
      { ...action, actionId: "host", verification: { checks: [] } }, { ...action, actionId: "source", verification: null },
    ] }] };
    const context = vm.createContext({ appendCollaborationWorkHistory, localizeWorkHistoryDiagnostic, document: { createElement: element }, collaborationMessageList: list, session,
      collaborationDateLabel: (value: string) => value, currentInterfaceLanguage: language, localizeCollaborationDiagnostic,
      t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(renderer + "\nrenderCollaborationMessages(session)", context);
    const activity = list.children[1].children.find((node: any) => node.className === "collaboration-external-activity");
    assert.equal(activity.children.length, 3);
    assert.ok(activity.children[1].textContent.includes("upsert_habit_checkins"));
    assert.ok(!activity.children[1].textContent.includes(literal), "activity shows compact status, not source payloads");
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

for (const language of ["zh", "en"] as const) {
  test(`saved Task summary uses observed schedule and completion rather than the session date in ${language}`, () => {
    const receipt = { id: "complete", status: "applied", targetDate: "2026-09-24", operation: { operation: "completeTask", taskId: "stable", completedTime: "15:20" },
      baseline: { kind: "task", name: "Send report", date: "2026-10-02", time: "09:00" },
      resultSnapshot: { kind: "task", name: "Send report", date: "2026-10-02", time: "09:00", completion: { completedOn: "2026-09-24", completedTime: "15:20" } } };
    const result = { id: "complete", status: "applied", message: "Generic save" };
    const context = vm.createContext({ result, session: { taskOperations: [receipt] }, collaborationDateLabel: (date: string) => date,
      currentInterfaceLanguage: language, t: (key: any, values: any) => interfaceCopy(key, language, values) });
    vm.runInContext(functionSource("collaborationOutcomeSummary") + "\nactual = collaborationOutcomeSummary(result, session)", context);
    assert.ok(context.actual.includes("Send report"));
    assert.ok(context.actual.includes("2026-09-24") && context.actual.includes("15:20"));
    assert.ok(context.actual.includes("2026-10-02") && context.actual.includes("09:00"));
  });
}

for (const object of ["task", "list"]) {
  test(`saved ${object} outcome opens its canonical stable identity`, () => {
    const children: any[] = []; const navigation: unknown[] = [];
    const domElement = () => ({ textContent: "", dataset: {}, children: [] as any[], listeners: {} as any,
      append(...nodes: any[]) { this.children.push(...nodes); }, addEventListener(name: string, callback: () => void) { this.listeners[name] = callback; } });
    const receipt = { id: "saved", taskId: object === "task" ? "task-stable" : null, listId: object === "list" ? "list-stable" : null,
      operation: { operation: object === "task" ? "deleteTask" : "archiveList" }, baseline: { kind: object, name: "Actual name" }, resultSnapshot: { kind: object, deletedAt: object === "task" ? "timestamp" : null } };
    const context = vm.createContext({ document: { createElement: domElement }, container: { append(...nodes: any[]) { children.push(...nodes); } },
      session: { id: "source-session", taskOperations: [receipt] }, request: { actionResults: [{ id: "saved", source: "Dashboard", status: "applied", targetDate: "2026-09-24", message: "Saved" }] },
      collaborationDateLabel: (date: string) => date, currentInterfaceLanguage: "en", t: (key: any, values: any) => interfaceCopy(key, "en", values),
      taskReturnToCollaborationSessionId: null, taskFocusRequestId: null, taskScope: "all", taskStateScope: "pending", taskListScopeForId: (id: string) => `list:${id}`,
      showWorkspaceDestination(...args: unknown[]) { navigation.push(args); } });
    vm.runInContext(["collaborationVisibleResults", "collaborationOutcomeSummary", "renderCollaborationOutcomes"].map(functionSource).join("\n") + "\nrenderCollaborationOutcomes(container, session, request)", context);
    const button = children[0].children[1].children[0];
    button.listeners.click();
    assert.deepEqual(navigation, [["tasks", true]]);
    assert.equal(context.taskReturnToCollaborationSessionId, "source-session");
    assert.equal(context.taskFocusRequestId, object === "task" ? "task-stable" : null);
    assert.equal(context.taskScope, object === "list" ? "list:list-stable" : "all");
    assert.equal(context.taskStateScope, object === "task" ? "deleted" : "all");
  });
}
