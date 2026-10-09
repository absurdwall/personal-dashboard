import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { interfaceCopy } from "../../frontend/interface-language.ts";
const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
function fn(name: string) {
  const rest = source.slice(source.search(new RegExp(`(?:async )?function ${name}\\(`)));
  return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
}
function element(tag = "div") {
  const listeners = new Map<string, () => void>();
  return { tag, textContent: "", dataset: {}, children: [] as any[], disabled: false,
    addEventListener(name: string, callback: () => void) { listeners.set(name, callback); },
    click() { listeners.get("click")?.(); }, setAttribute() {},
    append(...nodes: any[]) { this.children.push(...nodes); }, replaceChildren() { this.children = []; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test("paused pending messages expose explicit continue and remove through production handlers", async () => {
  const list = element(); const calls: any[] = []; const draft = { value: "Fresh correction draft" };
  const session = { id: "s", runState: "stopped", taskOperations: [], draftsByDate: {}, messages: [
    { id: "pending", role: "user", executionId: "older", text: "Older pending message", deliveryState: "paused", messageDate: "2026-10-09", targetDate: "2026-10-08" } ] };
  const context = vm.createContext({ document: { createElement: element }, collaborationMessageList: list,
    currentCollaborationSession: session, collaborationMessageDraft: draft, collaborationVaultSelectionRevision: 3,
    vaultSelectionInProgress: false, pendingCollaborationRunChecks: new Set(), collaborationRunStatus: null,
    window: { __TAURI__: { core: { async invoke(command: string, args: any) { calls.push({ command, args }); return session; } } } },
    t: (key: any, values: any) => interfaceCopy(key, "zh", values), collaborationDateLabel: (date: string) => date,
    renderCollaborationWorkspace() {}, refreshCollaborationWorkspace: async () => {}, watchCollaborationSession() {}, setCopyError() {},
  });
  vm.runInContext(["collaborationDeliveryStateLabel", "resumeCollaborationRequest", "removeCollaborationRequest", "changeCollaborationPendingRequest", "renderCollaborationMessages"].filter(name => source.includes(`function ${name}(`)).map(fn).join("\n") + "\nrenderCollaborationMessages(currentCollaborationSession)", context);
  const buttons = list.children[0].children.filter((node: any) => node.tag === "button");
  assert.equal(buttons.length, 2, "paused messages need both controls");
  buttons[0].click(); await tick(); buttons[1].click(); await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { command: "collaboration_resume_not_started", args: { sessionId: "s", executionId: "older" } },
    { command: "collaboration_remove_pending", args: { sessionId: "s", executionId: "older" } },
  ]);
  assert.equal(draft.value, "Fresh correction draft");
});

test("late pending and recovery responses cannot replace a new Vault or newer execution", async () => {
  for (const action of ["changeCollaborationPendingRequest", "reconcileCollaborationRun"]) {
    for (const changed of ["vault", "execution"]) {
      let release!: (session: any) => void;
      let refreshes = 0;
      const original = { id: "s", runId: "old", runState: "interrupted" };
      const context: any = vm.createContext({ currentCollaborationSession: original,
        collaborationVaultSelectionRevision: 1, vaultSelectionInProgress: false,
        pendingCollaborationRunChecks: new Set(), collaborationRunStatus: null,
        renderCollaborationWorkspace() {}, watchCollaborationSession() {},
        async refreshCollaborationWorkspace() { refreshes++; },
        window: { __TAURI__: { core: { invoke: () => new Promise(resolve => { release = resolve; }) } } },
      });
      vm.runInContext(fn(action), context);
      const pending = context[action]("s", "old", "collaboration_remove_pending");
      const newer = { id: "s", runId: "new", runState: "thinking" };
      if (changed === "vault") context.collaborationVaultSelectionRevision++;
      context.currentCollaborationSession = newer;
      release(original); await pending;
      assert.equal(context.currentCollaborationSession, newer, `${action} / ${changed}`);
      if (changed === "vault") assert.equal(refreshes, 0);
    }
  }
});
