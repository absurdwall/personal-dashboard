import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { taskHistoryGroups } from "../../frontend/task-presentation.ts";

const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");

class DomNode {
  children: DomNode[] = [];
  parent: DomNode | null = null;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  listeners = new Map<string, (event: any) => void>();
  style = { values: new Map<string, string>(), setProperty: (key: string, value: string) => this.style.values.set(key, value) };
  className = "";
  textContent = "";
  hidden = false;
  disabled = false;
  title = "";
  focused = false;
  tagName: string;
  private ownerDocument?: { activeElement: DomNode | null };

  constructor(tagName = "div", ownerDocument?: { activeElement: DomNode | null }) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
  }

  append(...children: DomNode[]) {
    for (const child of children) {
      child.remove();
      child.parent = this;
      this.children.push(child);
    }
  }
  prepend(...children: DomNode[]) {
    for (const child of children) {
      child.remove();
      child.parent = this;
    }
    this.children.unshift(...children);
  }
  replaceChildren(...children: DomNode[]) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.append(...children);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  addEventListener(name: string, listener: (event: any) => void) { this.listeners.set(name, listener); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }

  querySelector(selector: string): DomNode | null {
    const match = selector.match(/^\[data-([\w-]+)(?:="([^"]+)")?\]$/);
    const key = match?.[1].replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const visit = (node: DomNode): DomNode | null => {
      for (const child of node.children) {
        if (selector.startsWith(".") && child.className.split(/\s+/).includes(selector.slice(1))) return child;
        if (key && child.dataset[key] !== undefined && (match?.[2] === undefined || child.dataset[key] === match[2])) return child;
        const nested = visit(child);
        if (nested) return nested;
      }
      return null;
    };
    return visit(this);
  }
}

class DetailsNode extends DomNode {
  open = false;
}

function taskTreeRenderer() {
  const document = {
    activeElement: null as DomNode | null,
    createElement(tag: string) { return tag === "details" ? new DetailsNode(tag, document) : new DomNode(tag, document); },
  };
  const context: any = {
    document,
    HTMLDetailsElement: DetailsNode,
    CSS: { escape: (value: string) => value },
    tasksList: new DomNode("div", document),
    taskHistoryGroups,
    taskOperationCount: 0,
    collapsedTaskTreeNodesByBinding: new Map<string, Set<string>>(),
    taskHistoryFocusDisclosureRequest: null,
    selectedTaskDetailId: null,
    selectedTaskDetailBinding: null,
    taskFocusRequestId: null,
    taskCreateOpen: false,
    taskCreateDrafts: new Map<string, any>(),
    setCopy: (node: DomNode, key: string, params?: Record<string, unknown>) => {
      node.dataset.copyKey = key;
      node.dataset.copyParams = JSON.stringify(params ?? {});
    },
    t: (key: string, params?: Record<string, unknown>) => `${key} ${JSON.stringify(params ?? {})}`,
    taskEditor: (task: any) => {
      const row = new DomNode("article", document);
      row.id = task.id;
      row.dataset.taskEditorRow = task.id;
      row.dataset.taskSurface = "tasks";
      const summary = new DomNode("div", document);
      summary.className = "task-row-summary";
      const main = new DomNode("div", document);
      main.className = "task-row-main";
      const titleLine = new DomNode("div", document);
      titleLine.className = "task-row-title-line";
      const editorButton = new DomNode("button", document);
      editorButton.type = "button";
      editorButton.dataset.taskEditorOpen = task.id;
      titleLine.append(editorButton);
      main.append(titleLine);
      summary.append(main);
      row.append(summary);
      return row;
    },
  };
  const productionFunction = (name: string) => {
    const start = main.indexOf(`function ${name}(`);
    const rest = main.slice(start);
    const next = /\n(?:async )?function /.exec(rest);
    return next ? rest.slice(0, next.index) : rest;
  };
  vm.runInNewContext(stripTypeScriptTypes(
    `${productionFunction("taskHistorySection")}\n${productionFunction("taskTreeProjection")}\n${productionFunction("taskTreeFocusDisclosureId")}\n${productionFunction("taskHistoryFocusRequestForClose")}\n${productionFunction("taskTreeRows")}`,
  ), context);
  context.inputTasks = [];
  context.inputOptions = {};
  context.renderTasks = (view: any) => {
    const rows = context.taskTreeRows(context.inputTasks, view, true, context.inputOptions);
    context.tasksList.replaceChildren(...rows);
  };
  context.renderTaskHistory = (
    tasks: any[],
    currentView: any,
    folded: boolean,
    openEditors = new Set<string>(),
    historyScopeKey = "global",
  ) => context.taskHistorySection(tasks, currentView, "tasks", folded, openEditors, historyScopeKey);
  return context;
}

const task = (id: string, parentTaskId: string | null = null) => ({
  id,
  parentTaskId,
  name: id,
  listId: "inbox",
  state: "pending",
  deletedAt: null,
  date: null,
});

const completedTask = (id: string, parentTaskId: string | null, completedOn: string) => ({
  ...task(id, parentTaskId),
  state: "completed",
  completion: { completedOn },
  changes: [],
  source: { kind: "manual" },
});

const view = (targetBinding: string, tasks: any[]) => ({
  targetBinding,
  tasks,
  lists: [],
  state: "ready",
  currentDate: "2026-10-14",
});

function render(r: any, tasks: any[], currentView: any, options = {}) {
  r.inputTasks = tasks;
  r.inputOptions = options;
  r.renderTasks(currentView);
}

function rows(r: any): string[] {
  return r.tasksList.children.map((row: any) => row.id);
}

function toggle(r: any, id: string): DomNode {
  const row = r.tasksList.children.find((candidate: any) => candidate.dataset.taskEditorRow === id);
  const button = row?.querySelector(`[data-task-tree-toggle="${id}"]`);
  assert.ok(button, `expected a subtask disclosure for ${id}`);
  button.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  return button;
}

test("Task lists collapse and expand a recursive subtree while retaining neighboring Tasks", () => {
  const r = taskTreeRenderer();
  const tasks = [task("parent"), task("child", "parent"), task("grandchild", "child"), task("sibling", "parent"), task("other")];
  const recordsBeforeToggle = structuredClone(tasks);
  const currentView = view("vault-a", tasks);
  render(r, tasks, currentView);

  assert.deepEqual(rows(r), ["parent", "child", "grandchild", "sibling", "other"]);
  toggle(r, "parent");
  assert.deepEqual(rows(r), ["parent", "other"]);
  assert.equal(r.tasksList.children[0].querySelector(`[data-task-tree-toggle="parent"]`)?.getAttribute("aria-expanded"), "false");
  assert.equal(r.document.activeElement?.dataset.taskTreeToggle, "parent", "keyboard focus returns to the disclosure after rerender");

  toggle(r, "parent");
  assert.deepEqual(rows(r), ["parent", "child", "grandchild", "sibling", "other"]);
  toggle(r, "child");
  assert.deepEqual(rows(r), ["parent", "child", "sibling", "other"]);
  assert.deepEqual(tasks, recordsBeforeToggle, "tree folding only changes view state, not Task records");
});

test("Task tree expansion state is isolated by selected Vault binding", () => {
  const r = taskTreeRenderer();
  const tasks = [task("parent"), task("child", "parent")];
  render(r, tasks, view("vault-a", tasks));
  toggle(r, "parent");
  assert.deepEqual(rows(r), ["parent"]);

  render(r, tasks, view("vault-b", tasks));
  assert.deepEqual(rows(r), ["parent", "child"]);
  render(r, tasks, view("vault-a", tasks));
  assert.deepEqual(rows(r), ["parent"]);

  render(r, [tasks[1]], view("vault-a", tasks));
  assert.deepEqual(rows(r), ["child"], "a parent outside the current list scope does not hide its child");
});

test("subtask disclosure is a compact keyboard-operable control in the wrapping title row", () => {
  const r = taskTreeRenderer();
  const tasks = [task("parent"), task("child", "parent")];
  render(r, tasks, view("vault-a", tasks));
  const disclosure = r.tasksList.children[0].querySelector(`[data-task-tree-toggle="parent"]`);
  assert.ok(disclosure);
  assert.equal(disclosure.type, "button");
  assert.equal(disclosure.getAttribute("aria-expanded"), "true");
  assert.match(disclosure.getAttribute("aria-label") ?? "", /habits\.collapse|habits\.expand/);
  disclosure.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  assert.equal(r.tasksList.children[0].querySelector(`[data-task-tree-toggle="parent"]`)?.getAttribute("aria-expanded"), "false");
  assert.match(css, /\.task-row-title-line\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.task-row\[data-task-surface="tasks"\] \.task-tree-toggle\s*\{[^}]*flex:\s*0 0 16px;[^}]*min-width:\s*16px/);
});

test("collapsed ancestors stay open for matching filtered descendants, selected editors, and child creation", () => {
  const r = taskTreeRenderer();
  const tasks = [task("parent"), task("child", "parent"), task("grandchild", "child")];
  const currentView = view("vault-a", tasks);
  r.collapsedTaskTreeNodesByBinding.set("vault-a", new Set(["parent", "child"]));
  render(r, tasks, currentView);
  assert.deepEqual(rows(r), ["parent"], "stored collapsed state applies to the active Vault");

  const filtered = r.taskTreeProjection([tasks[2]], tasks, true);
  render(r, filtered.tasks, currentView, { matchingTaskIds: filtered.matchingTaskIds });
  assert.deepEqual(rows(r), ["parent", "child", "grandchild"], "filter matches retain their ancestor path");
  assert.equal(r.tasksList.children[0].dataset.taskTreeContext, "true");

  r.selectedTaskDetailId = "grandchild";
  r.selectedTaskDetailBinding = "vault-a";
  render(r, tasks, currentView);
  assert.deepEqual(rows(r), ["parent", "child", "grandchild"], "the selected editor remains reachable");

  r.selectedTaskDetailId = null;
  r.selectedTaskDetailBinding = null;
  r.taskCreateOpen = true;
  r.taskCreateDrafts.set("vault-a", { parentTaskId: "grandchild" });
  render(r, tasks, currentView);
  assert.deepEqual(rows(r), ["parent", "child", "grandchild"], "the active new-child target remains visible");
});

test("closing a temporarily revealed editor can return focus to its visible collapsed ancestor", () => {
  const r = taskTreeRenderer();
  const tasks = [task("parent"), task("child", "parent"), task("grandchild", "child")];
  const currentView = view("vault-a", tasks);
  r.collapsedTaskTreeNodesByBinding.set("vault-a", new Set(["parent", "child"]));
  assert.equal(r.taskTreeFocusDisclosureId("grandchild", currentView, "vault-a"), "parent");
  assert.equal(r.taskTreeFocusDisclosureId("grandchild", currentView, "vault-b"), null);
  assert.equal(r.taskTreeFocusDisclosureId("parent", currentView, "vault-a"), null);
});

test("history subtree folding hides descendants across date groups and preserves pagination", () => {
  const r = taskTreeRenderer();
  const parent = completedTask("history-parent", null, "2026-10-13");
  const child = completedTask("history-child", "history-parent", "2026-10-14");
  const unrelated = Array.from({ length: 30 }, (_, index) =>
    completedTask(`history-unrelated-${index}`, null, "2026-10-12"),
  );
  const tasks = [parent, child, ...unrelated];
  const recordsBeforeToggle = structuredClone(tasks);
  const section = r.renderTaskHistory(tasks, view("vault-a", tasks), false);

  const groups = section.children[1];
  assert.deepEqual(groups.children.slice(0, 3).map((group: any) => group.children[0].textContent), ["2026-10-14", "2026-10-13", "2026-10-12"]);
  const moreBefore = groups.children.at(-1);
  assert.equal(moreBefore.dataset.copyKey, "tasks.historyMore");
  assert.equal(moreBefore.dataset.copyParams, JSON.stringify({ count: 2 }));
  const parentButton = groups.querySelector('[data-task-tree-toggle="history-parent"]');
  assert.ok(parentButton, "history parents with visible descendants have a disclosure");
  assert.equal(parentButton.getAttribute("aria-expanded"), "true");
  parentButton.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });

  assert.deepEqual(groups.children.slice(0, 2).map((group: any) => group.children[0].textContent), ["2026-10-13", "2026-10-12"]);
  const visibleTaskIds = groups.children.flatMap((group: any) =>
    group.children.slice(1).filter((row: any) => row.dataset.taskEditorRow).map((row: any) => row.dataset.taskEditorRow),
  );
  assert.deepEqual(visibleTaskIds, ["history-parent", ...unrelated.slice(0, 28).map((item) => item.id)]);
  assert.equal(groups.querySelector('[data-task-tree-toggle="history-parent"]')?.getAttribute("aria-expanded"), "false");
  const moreAfter = groups.children.at(-1);
  assert.equal(moreAfter.dataset.copyKey, "tasks.historyMore");
  assert.equal(moreAfter.dataset.copyParams, moreBefore.dataset.copyParams, "folding does not change page accounting");
  assert.equal(r.document.activeElement?.dataset.taskTreeToggle, "history-parent");
  assert.equal(r.collapsedTaskTreeNodesByBinding.get("vault-a")?.has("history-parent"), true);
  const otherVaultSection = r.renderTaskHistory(tasks, view("vault-b", tasks), false);
  assert.ok(otherVaultSection.children[1].querySelector('[data-task-editor-row="history-child"]'));
  assert.deepEqual(tasks, recordsBeforeToggle, "history folding only changes view state, not Task records");

  parentButton.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(groups.children.slice(0, 3).map((group: any) => group.children[0].textContent), ["2026-10-14", "2026-10-13", "2026-10-12"]);
});

test("history folding retains selected descendants and shares behavior in folded and open history sections", () => {
  const r = taskTreeRenderer();
  const parent = completedTask("history-parent", null, "2026-10-12");
  const child = completedTask("history-child", "history-parent", "2026-10-14");
  const tasks = [parent, child];
  const currentView = view("vault-a", tasks);
  r.collapsedTaskTreeNodesByBinding.set("vault-a", new Set(["history-parent"]));
  r.selectedTaskDetailId = "history-child";
  r.selectedTaskDetailBinding = "vault-a";

  const unfoldedSection = r.renderTaskHistory(tasks, currentView, false);
  let rows = unfoldedSection.children[1];
  assert.ok(rows.querySelector('[data-task-editor-row="history-child"]'), "selected child remains visible in an open history section");
  assert.equal(rows.querySelector('[data-task-tree-toggle="history-parent"]')?.disabled, true);

  r.selectedTaskDetailId = null;
  r.selectedTaskDetailBinding = null;
  const foldedSection = r.renderTaskHistory(tasks, currentView, true, new Set(["history-child"]));
  assert.equal(foldedSection.open, true, "an open editor keeps the folded history section open");
  rows = foldedSection.children[1];
  assert.ok(rows.querySelector('[data-task-editor-row="history-child"]'), "open child editor keeps its ancestor path visible");
  assert.equal(rows.querySelector('[data-task-tree-toggle="history-parent"]')?.disabled, true);

  r.taskHistoryFocusDisclosureRequest = {
    editedTaskId: "history-child",
    disclosureId: "history-parent",
    binding: "vault-a",
    historyScopeKey: "global",
  };
  const otherVaultSection = r.renderTaskHistory(tasks, view("vault-b", tasks), true);
  assert.equal(otherVaultSection.open, false, "a pending focus return does not open the same IDs in another Vault");
  const focusSection = r.renderTaskHistory(tasks, currentView, true);
  assert.equal(focusSection.open, true, "a pending focus return keeps the folded history section open");
  const focusRows = focusSection.children[1];
  const focusDisclosure = focusRows.querySelector('[data-task-tree-toggle="history-parent"]');
  assert.ok(focusDisclosure);
  assert.equal(focusDisclosure.disabled, false, "the collapsed target remains focusable");
  assert.equal(focusDisclosure.getAttribute("aria-expanded"), "false");
  assert.equal(focusRows.querySelector('[data-task-editor-row="history-child"]'), null, "the collapsed child stays hidden");
});

test("folder and non-folder Task history paths use the shared collapsible renderer", () => {
  const start = main.indexOf("function renderTasks(");
  const remaining = main.slice(start);
  const nextFunction = /\n(?:async )?function /.exec(remaining);
  const renderTasks = nextFunction ? remaining.slice(0, nextFunction.index) : remaining;
  assert.match(renderTasks, /if \(historyFilter\) \{\s*const ended = taskHistorySection\(\s*listVisibleTasks,/);
  assert.match(renderTasks, /const history = taskHistorySection\(\s*historyFilter \? visibleTasks : historyTasks,/);
});

test("editor-close focus requests are limited to visible historical subtrees", () => {
  const r = taskTreeRenderer();
  const historicalChild = completedTask("history-child", "history-parent", "2026-10-14");
  const request = r.taskHistoryFocusRequestForClose(
    historicalChild,
    "history-parent",
    "vault-a",
    true,
    "global",
  );
  assert.equal(request?.editedTaskId, "history-child");
  assert.equal(request?.disclosureId, "history-parent");
  assert.equal(request?.binding, "vault-a");
  assert.equal(request?.historyScopeKey, "global");
  assert.equal(r.taskHistoryFocusRequestForClose(task("active-child", "history-parent"), "history-parent", "vault-a", true, "global"), null);
  assert.equal(r.taskHistoryFocusRequestForClose(historicalChild, "history-parent", "vault-a", false, "global"), null);
  assert.equal(r.taskHistoryFocusRequestForClose(historicalChild, "history-parent", "vault-a", true, null), null);
});

test("history focus return cannot reopen a different rendered history section", () => {
  const r = taskTreeRenderer();
  const parent = completedTask("history-parent", null, "2026-10-12");
  const child = completedTask("history-child", "history-parent", "2026-10-14");
  const tasks = [parent, child];
  const currentView = view("vault-a", tasks);
  r.taskHistoryFocusDisclosureRequest = {
    editedTaskId: child.id,
    disclosureId: parent.id,
    binding: "vault-a",
    historyScopeKey: "folder-list:list-b",
  };

  const otherSection = r.renderTaskHistory(tasks, currentView, true, new Set(), "folder-list:list-a");
  assert.equal(otherSection.open, false, "a different list section ignores the pending request");
  const requestedSection = r.renderTaskHistory(tasks, currentView, true, new Set(), "folder-list:list-b");
  assert.equal(requestedSection.open, true, "the matching list section consumes the request");
  assert.ok(requestedSection.children[1].querySelector('[data-task-tree-toggle="history-parent"]'));
});

test("history focus return includes a collapsed ancestor beyond the page limit", () => {
  const r = taskTreeRenderer();
  const parent = completedTask("history-parent", null, "2026-10-01");
  const child = completedTask("history-child", "history-parent", "2026-10-02");
  const unrelated = Array.from({ length: 60 }, (_, index) =>
    completedTask(`history-unrelated-${index}`, null, "2026-10-14"),
  );
  const tasks = [...unrelated, parent, child];
  const currentView = view("vault-a", tasks);
  r.collapsedTaskTreeNodesByBinding.set("vault-a", new Set([parent.id]));
  r.taskHistoryFocusDisclosureRequest = r.taskHistoryFocusRequestForClose(
    child,
    parent.id,
    "vault-a",
    true,
    "global",
  );

  const section = r.renderTaskHistory(tasks, currentView, true);
  const rows = section.children[1];
  assert.equal(section.open, true, "focus return opens the matching history section");
  const disclosure = rows.querySelector(`[data-task-tree-toggle="${parent.id}"]`);
  assert.ok(disclosure, "the out-of-page ancestor disclosure is included for focus return");
  assert.equal(disclosure.disabled, false);
  assert.equal(disclosure.getAttribute("aria-expanded"), "false");
  assert.equal(rows.querySelector(`[data-task-editor-row="${child.id}"]`), null, "the child remains hidden under its collapsed ancestor");
  const more = rows.children.at(-1);
  assert.equal(more.dataset.copyKey, "tasks.historyMore");
  assert.equal(more.dataset.copyParams, JSON.stringify({ count: 30 }));
});

test("a reused history row drops disclosure controls when its visible child leaves the history set", () => {
  const r = taskTreeRenderer();
  const parent = completedTask("history-parent", null, "2026-10-12");
  const child = completedTask("history-child", "history-parent", "2026-10-14");
  const tasks = [parent, child];
  const section = r.renderTaskHistory(tasks, view("vault-a", tasks), false);
  const historyRows = section.children[1];
  const originalButton = historyRows.querySelector('[data-task-tree-toggle="history-parent"]');
  assert.ok(originalButton);

  tasks.splice(1, 1);
  originalButton.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  assert.equal(historyRows.querySelector('[data-task-tree-toggle="history-parent"]'), null);

  tasks.push(child);
  originalButton.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  const refreshedButton = historyRows.querySelector('[data-task-tree-toggle="history-parent"]');
  assert.ok(refreshedButton);
  assert.notEqual(refreshedButton, originalButton);
  assert.equal(refreshedButton.getAttribute("aria-expanded"), "true");
});
