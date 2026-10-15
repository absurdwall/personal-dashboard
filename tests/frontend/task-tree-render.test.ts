import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";

const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");

class DomNode {
  children: DomNode[] = [];
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

  append(...children: DomNode[]) { this.children.push(...children); }
  prepend(...children: DomNode[]) { this.children.unshift(...children); }
  replaceChildren(...children: DomNode[]) { this.children = children; }
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

function taskTreeRenderer() {
  const document = {
    activeElement: null as DomNode | null,
    createElement(tag: string) { return new DomNode(tag, document); },
  };
  const context: any = {
    document,
    CSS: { escape: (value: string) => value },
    tasksList: new DomNode("div", document),
    collapsedTaskTreeNodesByBinding: new Map<string, Set<string>>(),
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
    `${productionFunction("taskTreeProjection")}\n${productionFunction("taskTreeFocusDisclosureId")}\n${productionFunction("taskTreeRows")}`,
  ), context);
  context.inputTasks = [];
  context.inputOptions = {};
  context.renderTasks = (view: any) => {
    const rows = context.taskTreeRows(context.inputTasks, view, true, context.inputOptions);
    context.tasksList.replaceChildren(...rows);
  };
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
