import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { appendCollaborationMarkdown, appendCollaborationWorkHistory, parseCollaborationLink } from "../../frontend/collaboration-work-history.ts";

class Element {
  textContent = ""; className = ""; dataset: Record<string, string> = {}; children: Element[] = [];
  tagName: string; open = false; type = ""; checked = false; disabled = false;
  listeners: Record<string, () => void> = {}; scrollTop = 0; scrollHeight = 300; clientHeight = 100;
  constructor(tag: string) { this.tagName = tag; }
  append(...nodes: Element[]) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
  setAttribute() {}
  addEventListener(name: string, callback: () => void) { this.listeners[name] = callback; }
  querySelectorAll(selector: string): Element[] {
    return this.children.flatMap(node => [...(selector === "details[data-work-key]" && node.tagName === "details" && node.dataset.workKey ? [node] : []), ...node.querySelectorAll(selector)]);
  }
}
const document = { createElement: (tag: string) => new Element(tag) } as unknown as Document;
function content(node: any): string { return [node.textContent, ...node.children.map(content)].join("\n"); }
function descendants(node: Element): Element[] { return [node, ...node.children.flatMap(descendants)]; }

test("final reply renders checklists and only validated Dashboard links without HTML execution", () => {
  const body = new Element("div"); const navigated: unknown[] = [];
  appendCollaborationMarkdown(body as unknown as HTMLElement, "- [x] Saved [record](dashboard://record/2026-10-09?phase=daytime)\n- [ ] Pending [unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>", document, target => navigated.push(target));
  const inputs = descendants(body).filter(node => node.tagName === "input");
  assert.deepEqual(inputs.map(node => [node.checked, node.disabled]), [[true, true], [false, true]]);
  const links = descendants(body).filter(node => node.tagName === "button");
  assert.equal(links.length, 1);
  links[0].listeners.click();
  assert.deepEqual(navigated, [{ kind: "record", date: "2026-10-09", phase: "daytime" }]);
  assert.match(content(body), /<img src=x onerror=alert\(1\)>/);
  for (const uri of ["https://evil.example", "dashboard://task/../secret", "dashboard://record/2026-02-30", "dashboard://record/2026-10-09?phase=delete", "dashboard://habit/walk?date=wrong"]) assert.equal(parseCollaborationLink(uri), null);
});

const history = { evidenceVersion: 1, executionId: "run", threadId: "thread", turnId: "turn", status: "completed", sequence: 8,
  items: [
    { itemId: "progress", kind: "agentMessage", phase: "commentary", text: "Reading the record.", summary: [], status: "completed", firstSequence: 1 },
    { itemId: "empty", kind: "reasoning", text: "", summary: [], status: "completed", firstSequence: 2 },
    { itemId: "thought", kind: "reasoning", text: "", summary: ["Compare the saved record."], status: "completed", firstSequence: 3 },
    { itemId: "failed", callId: "attempt-1", kind: "dynamicToolCall", tool: "dashboard_task_operation", text: "", summary: [], status: "failed", firstSequence: 4, parameters: [{ name: "operation", value: "createTask" }, { name: "name", value: "Groceries" }, { name: "targetDate", value: "2026-10-09" }], diagnostic: "Invalid execution mode." },
    { itemId: "retry", callId: "attempt-2", kind: "dynamicToolCall", tool: "dashboard_task_operation", text: "", summary: [], status: "completed", firstSequence: 5 },
    { itemId: "final", kind: "agentMessage", phase: "final_answer", text: "Saved.", summary: [], status: "completed", firstSequence: 6 },
  ] };
const labels = { title: "Work history", summary: "Reasoning summary", commentary: "Codex progress", message: "Codex message", tool: "Action", failed: "Failed", completed: "Tool completed; see saved outcomes", running: "Working", details: "Details", actions: { createTask: "Create Task" } };

test("completed work is collapsed, retains failed attempt and recovery, and does not invent missing summaries", () => {
  const body = new Element("article");
  appendCollaborationWorkHistory(body as unknown as HTMLElement, history as any, document, labels, () => {});
  const details = body.children[0];
  assert.equal(details.open, false);
  assert.match(content(body), /Reading the record/);
  assert.match(content(body), /Compare the saved record/);
  assert.equal(content(body).split("Reasoning summary").length - 1, 1);
  assert.match(content(body), /Create Task · Groceries · 2026-10-09 · Failed/);
  assert.match(content(body), /Invalid execution mode/);
  assert.match(content(body), /Tool completed; see saved outcomes/);
  assert.ok(!content(body).includes("Saved."), "final reply appears once in its own message");
});

const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
function fn(name: string) { const rest = source.slice(source.indexOf(`function ${name}(`)); return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2)); }
test("session polling preserves the reader's scroll and manually expanded work history", () => {
  const list = new Element("section");
  const session = { id: "session", runState: "completed", workHistory: [history], messages: [
    { id: "request", role: "user", text: "Save", executionId: "run", messageDate: "2026-10-09", targetDate: "2026-10-09", deliveryState: "completed" },
    { id: "reply", role: "assistant", text: "Saved.", executionId: "run", messageDate: "2026-10-09", targetDate: "2026-10-09" },
  ] };
  const context = vm.createContext({ document, collaborationMessageList: list, session,
    appendCollaborationWorkHistory, appendCollaborationMarkdown,
    collaborationDateLabel: (value: string) => value, t: (key: string) => key,
    collaborationDeliveryStateLabel: (value: string) => value,
    renderCollaborationOutcomes() {}, navigateCollaborationLink() {},
  });
  vm.runInContext(fn("collaborationWorkHistoryLabels") + fn("renderCollaborationMessages") + "\nrenderCollaborationMessages(session)", context);
  const detail = list.querySelectorAll("details[data-work-key]")[0];
  detail.open = true; detail.dataset.manual = "true";
  list.scrollTop = 25;
  vm.runInContext("renderCollaborationMessages(session)", context);
  assert.equal(list.scrollTop, 25);
  assert.equal(list.querySelectorAll("details[data-work-key]")[0].open, true);
});

test("document history shows the actual bounded diff and unavailable before-state as inert text", () => {
  const body = new Element("div");
  const documentHistory = { ...history, items: [{ itemId: "file", kind: "fileChange", status: "completed", firstSequence: 1,
    changes: [{ id: "file:ordinary", path: "life/ordinary.md", source: "nativeFileChange", operation: "update",
      verification: "sourceObserved", beforeRevision: null, afterRevision: "observed-v2", diff: "-Old fact\n+<script>inert</script>",
      gaps: ["Before revision unavailable"], receiptId: null, targetDate: "2026-10-09" }],
  }] };
  appendCollaborationWorkHistory(body as unknown as HTMLElement, documentHistory as any, document, labels, () => {});
  const shown = content(body);
  assert.match(shown, /life\/ordinary.md/);
  assert.match(shown, /-Old fact\n\+<script>inert<\/script>/);
  assert.match(shown, /Before revision unavailable/);
  assert.equal(descendants(body).some(node => node.tagName === "script"), false);
});
