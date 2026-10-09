import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { appendCollaborationMarkdown, appendCollaborationWorkHistory, parseCollaborationLink } from "../../frontend/collaboration-work-history.ts";
import { interfaceCopy, localizeCollaborationDiagnostic, localizeWorkHistoryDiagnostic } from "../../frontend/interface-language.ts";

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

function renderSession(session: any, language: "zh" | "en" = "en") {
  const list = new Element("section");
  const context = vm.createContext({ document, collaborationMessageList: list, session,
    appendCollaborationWorkHistory, appendCollaborationMarkdown, localizeWorkHistoryDiagnostic, localizeCollaborationDiagnostic, currentInterfaceLanguage:language,
    collaborationDateLabel: (value: string) => value, t: (key: any) => interfaceCopy(key, language),
    collaborationDeliveryStateLabel: (value: string) => value, pendingCollaborationRunChecks: new Set(),
    renderCollaborationOutcomes(container: Element, _session: any, request: any) {
      if (request.actionResults?.length) { const saved = new Element("p"); saved.textContent = "Existing saved receipt"; container.append(saved); }
    }, navigateCollaborationLink() {},
    window: {__TAURI__: {core: {invoke() {assert.fail("rendering legacy messages must not reexecute a request");}}}},
  });
  vm.runInContext(fn("collaborationWorkHistoryLabels") + fn("renderCollaborationMessages") + "\nrenderCollaborationMessages(session)", context);
  return list;
}

for (const language of ["zh", "en"] as const) {
  test(`production legacy renderer preserves original messages and marks absent execution evidence in ${language}`, () => {
    const session = {id:"legacy",runState:"completed",messages:[
      {id:"old-user",role:"user",text:"Original user text",executionId:null,deliveryState:"completed",messageDate:"2026-10-09",targetDate:"2026-10-09",actionResults:[{id:"saved",status:"applied"}]},
      {id:"old-reply",role:"assistant",text:"Original reply\n- Preserved Markdown",executionId:null,messageDate:"2026-10-09",targetDate:"2026-10-09"},
    ]};
    const before=JSON.stringify(session);const list=renderSession(session,language);
    const gaps=descendants(list).filter(node=>node.className==="collaboration-history-unavailable");
    assert.equal(gaps.length,1,"the missing history marker belongs to the saved assistant work");
    assert.match(content(list),/Original user text/);assert.match(content(list),/Original reply/);
    assert.match(content(list),/Preserved Markdown/);assert.match(content(list),/Existing saved receipt/);
    assert.match(content(gaps[0]),/usage/);assert.match(content(gaps[0]),language==="zh"?/变更证据/:/change evidence/);
    assert.equal(descendants(list).some(node=>node.className==="collaboration-work-item"),false);
    assert.equal(JSON.stringify(session),before,"no synthetic history, usage or message mutation");
  });
}

test("a historical terminated request without reply still labels missing history", () => {
  const list=renderSession({id:"legacy",runState:"error",messages:[{id:"old-user",role:"user",text:"Original failed request",executionId:"old-run",deliveryState:"error",messageDate:"2026-10-09",targetDate:"2026-10-09"}]});
  assert.equal(descendants(list).filter(node=>node.className==="collaboration-history-unavailable").length,1);
  assert.match(content(list),/Original failed request/);
});

for (const deliveryState of ["queued","not-started","paused","in-progress"]) {
  test(`${deliveryState} request without history is pending rather than missing historical execution`, () => {
    const list=renderSession({id:"live",runState:"thinking",messages:[{id:"pending",role:"user",text:"Pending original input",executionId:"pending-run",deliveryState,messageDate:"2026-10-09",targetDate:"2026-10-09"}]});
    assert.equal(descendants(list).some(node=>node.className==="collaboration-history-unavailable"),false);
    assert.match(content(list),/Pending original input/);
  });
}
test("session polling preserves the reader's scroll and manually expanded work history", () => {
  const list = new Element("section");
  const session = { id: "session", runState: "completed", workHistory: [history], messages: [
    { id: "request", role: "user", text: "Save", executionId: "run", messageDate: "2026-10-09", targetDate: "2026-10-09", deliveryState: "completed" },
    { id: "reply", role: "assistant", text: "Saved.", executionId: "run", messageDate: "2026-10-09", targetDate: "2026-10-09" },
  ] };
  const context = vm.createContext({ document, collaborationMessageList: list, session,
    appendCollaborationWorkHistory, appendCollaborationMarkdown, localizeWorkHistoryDiagnostic, localizeCollaborationDiagnostic, currentInterfaceLanguage:"en",
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

for (const language of ["zh", "en"] as const) {
  test(`work history localizes host grammar and tags while preserving runtime/user bytes in ${language}`, () => {
    const runtimeText = "Invalid execution mode.";
    const context = vm.createContext({t:(key:any)=>interfaceCopy(key,language),currentInterfaceLanguage:language,localizeCollaborationDiagnostic,localizeWorkHistoryDiagnostic});
    vm.runInContext(fn("collaborationWorkHistoryLabels")+"\nlabels = collaborationWorkHistoryLabels()",context);
    const body = new Element("article");
    const fixture = {...history,items:[
      {...history.items[3],tool:"dashboard_task_operation",diagnostic:runtimeText,diagnosticGap:"Tool diagnostic withheld by the credential/payload filter.",changeGap:"Native file-change snapshot did not provide actual changes/diff.",
        parameters:[{name:"operation",value:"createTask"},{name:"name",value:"User English 名称"}],
        changes:[{id:"change",path:"life/English 用户.md",operation:"update",verification:"unobserved",diff:"-Original English\n+用户内容",gaps:["Before bytes/revision were not observed; item start may occur after the write."]}]},
      {...history.items[3],itemId:"runtime-failure",kind:"mcpToolCall",tool:"external_tool",diagnostic:runtimeText},
    ]};
    appendCollaborationWorkHistory(body as any,fixture as any,document,context.labels,()=>{});
    const rows=descendants(body).filter(node=>node.className==="collaboration-work-item");
    assert.match(content(rows[0]),language==="zh"?/无效|不支持/:/Invalid execution mode/);
    assert.ok(!content(rows[0]).includes(language==="zh"?"Before bytes/revision were not observed":"未观察到修改前"));
    assert.match(content(rows[0]),language==="zh"?/操作: 新增 Task/:/Operation: Create Task/);
    assert.match(content(rows[0]),language==="zh"?/external_tool|失败/:/Failed/);
    assert.match(content(rows[0]),/life\/English 用户.md/);assert.match(content(rows[0]),/-Original English\n\+用户内容/);assert.match(content(rows[0]),/User English 名称/);
    assert.match(content(rows[1]),/Invalid execution mode\./,"runtime-owned diagnostics remain verbatim even when they match fixed host grammar");
    if(language==="zh") assert.ok(!content(rows[0]).includes("Native file-change snapshot"));
  });
}

for(const language of ["zh","en"] as const) {
  test(`omitted empty reasoning and final payload show qualified capacity evidence in ${language}`,()=>{
    const context=vm.createContext({t:(key:any,values:any)=>interfaceCopy(key,language,values),currentInterfaceLanguage:language,localizeCollaborationDiagnostic,localizeWorkHistoryDiagnostic});
    vm.runInContext(fn("collaborationWorkHistoryLabels")+"\nlabels=collaborationWorkHistoryLabels()",context);
    const body=new Element("article");
    const omissions=[{field:"summary",originalBytes:90000,retainedBytes:100,retainedFromPriorObservation:true,inputFingerprint:"actual-fingerprint",reasonCode:"itemByteBound"}];
    const fixture={...history,gaps:["Optional visible payload omitted by evidence capacity bounds; original messages, failures and outcome metadata are retained."],items:[
      {...history.items[1],payloadOmissions:omissions},
      {...history.items[5],payloadOmissions:[{...omissions,field:"text",reasonCode:"aggregateByteBound"}]},
    ]};
    appendCollaborationWorkHistory(body as any,fixture as any,document,context.labels,()=>{});
    assert.equal(descendants(body).filter(node=>node.className==="collaboration-payload-omission").length,2);
    assert.match(content(body),/90000/);assert.match(content(body),/actual-fingerprint/);
    assert.match(content(body),language==="zh"?/64 KiB/:/64 KiB/);
    assert.match(content(body),/8 MiB/);
    assert.match(content(body),language==="zh"?/之前保留的副本/:/earlier retained copy/);
    assert.ok(!content(body).includes("Saved."),"duplicate final reply is not reconstructed from bounded work evidence");
    if(language==="zh") assert.ok(!content(body).includes("Optional visible payload omitted"));
  });
}
