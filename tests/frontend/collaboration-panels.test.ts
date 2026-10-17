import assert from "node:assert/strict";
import test from "node:test";
import { initializeCollaborationPanels, panelGeometry, readPanelPreferences } from "../../frontend/collaboration-panels.ts";

test("layout selections survive restart and corrupt storage cannot remove access", () => {
  const choices = { history: { expanded: false, width: 260 }, context: { expanded: true, width: 480 } };
  assert.deepEqual(readPanelPreferences(JSON.stringify(choices)), choices);
  assert.deepEqual(readPanelPreferences("broken"), readPanelPreferences(null));
  assert.equal(readPanelPreferences(null).context.expanded, false, "Current Work starts collapsed");
  assert.deepEqual(readPanelPreferences(JSON.stringify({ ...choices, narrow: { history: true, context: false } })).narrow,
    { history: true, context: false });
  assert.deepEqual(readPanelPreferences('{"history":{"width":-200},"context":{"width":99999}}'), {
    history: { expanded: true, width: 180 }, context: { expanded: false, width: 640 },
  });
});

test("restored session widths always leave room for chat while context stays an overlay", () => {
  const choices = readPanelPreferences('{"history":{"width":640},"context":{"width":640,"expanded":true}}');
  for (const width of [900, 960, 1024, 1200, 1800]) {
    const layout = panelGeometry(width, choices);
    assert.equal(layout.narrow, false);
    assert.equal(layout.context, 0);
    assert.equal(layout.contextExpanded, true);
    assert.ok(width - layout.history - (layout.history ? 16 : 0) >= 360);
    assert.ok(layout.history >= 180);
  }
  assert.equal(panelGeometry(500, choices).narrow, true);
  assert.equal(choices.history.width, 640, "window resize must preserve requested history width");
});

test("opening or closing context never changes session or conversation geometry", () => {
  const preferences = readPanelPreferences(null);
  const closed = panelGeometry(1000, preferences);
  preferences.context.expanded = true;
  const open = panelGeometry(1000, preferences);
  assert.equal(open.history, closed.history);
  assert.equal(open.context, 0);
  assert.equal(open.contextExpanded, true);
  preferences.context.expanded = false;
  assert.equal(panelGeometry(1000, preferences).contextExpanded, false);
});

test("middle widths keep compact Sessions beside a usable conversation", () => {
  for (const width of [556, 600, 680, 800, 899]) {
    const preferences = readPanelPreferences('{"history":{"width":640},"context":{"width":640},"narrow":{"history":false,"context":false}}');
    const layout = panelGeometry(width, preferences);
    assert.equal(layout.mode, "two");
    assert.equal(layout.historyExpanded, true, "old narrow defaults cannot hide Sessions here");
    assert.equal(layout.contextExpanded, false);
    assert.equal(layout.context, 0);
    assert.ok(layout.history >= 180 && layout.history <= 260);
    assert.ok(width - layout.history - 16 >= 360);
    assert.equal(preferences.history.width, 640, "automatic resizing keeps the original saved request");
  }
});

test("one context disclosure remains open when the window crosses layout widths", () => {
  const preferences = readPanelPreferences(null);
  preferences.context.expanded = true;
  assert.deepEqual([1100, 750, 500, 1100].map(width => panelGeometry(width, preferences).mode),
    ["three", "two", "single", "three"]);
  for (const width of [1100, 750, 500]) {
    const layout = panelGeometry(width, preferences);
    assert.equal(layout.contextExpanded, true);
    assert.equal(layout.context, 0);
  }
});

test("chat context opens and closes in place while session controls retain their width behavior", () => {
  const originals = Object.fromEntries(["document", "localStorage", "ResizeObserver"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const oldRoomyChoice = '{"history":{"width":640},"context":{"width":640,"expanded":true},"narrow":{"history":false,"context":false}}';
  const stored = new Map([["personal-dashboard.collaboration-panels.v1", oldRoomyChoice]]);
  let available = 1100;
  let observer!: (entries: { contentRect: { width: number } }[]) => void;
  let active: any;
  class Node {
    hidden = false;
    isConnected = true;
    parentElement: Node | null = null;
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    attributes = new Map<string, string>();
    listeners = new Map<string, (event: any) => void>();
    child: unknown = {};
    clientTop = 1;
    id = "";
    getBoundingClientRect() {
      if (this.id === "collaboration-layout") return { width: available, top: 100, bottom: 500 };
      if (this.id === "collaboration-primary-layout") return { width: available, top: 110, bottom: 490 };
      if (this.id === "collaboration-chat-pane") return { width: available - 232, top: 110, bottom: 490 };
      if (this.id === "collaboration-composer") return { width: 500, height: 80, top: 400, bottom: 480 };
      if (this.id === "collaboration-chat-heading") return { width: 500, top: 115, bottom: 145 };
      return { width: available };
    }
    contains(node: unknown) { return node === this || node === this.child; }
    querySelector(selector: string) {
      if (this.id === "collaboration-layout" && selector === ".collaboration-primary-layout") return primary;
      if (this.id === "collaboration-layout" && selector === ".collaboration-chat-pane") return chat;
      if (this.id === "collaboration-chat-pane" && selector === ".collaboration-chat-heading") return chatHeading;
      return this;
    }
    append(node: Node) { node.parentElement = this; }
    setAttribute(key: string, value: string) { this.attributes.set(key, value); }
    addEventListener(key: string, callback: (event: any) => void) { this.listeners.set(key, callback); }
    focus() { active = this; }
    click() { this.listeners.get("click")?.({}); }
    setPointerCapture() {}
    removeEventListener() {}
  }
  const layout = new Node(); layout.id = "collaboration-layout";
  const primary = new Node(); primary.id = "collaboration-primary-layout";
  const chat = new Node(); chat.id = "collaboration-chat-pane";
  const chatHeading = new Node(); chatHeading.id = "collaboration-chat-heading";
  const composer = new Node(); composer.id = "collaboration-composer";
  const nodes = Object.fromEntries(["history-panel", "work-panel", "toggle-history", "toggle-context", "history-resizer", "close-context"].map(id => [`collaboration-${id}`, new Node()]));
  const history = nodes["collaboration-history-panel"];
  const context = nodes["collaboration-work-panel"];
  const historyToggle = nodes["collaboration-toggle-history"];
  const contextToggle = nodes["collaboration-toggle-context"];
  const closeContext = nodes["collaboration-close-context"];
  const historyResizer = nodes["collaboration-history-resizer"];
  const document = {
    querySelector: () => layout,
    getElementById: (id: string) => id === "collaboration-composer" ? composer : nodes[id],
    get activeElement() { return active; },
  };
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  };
  const ResizeObserver = class { constructor(callback: typeof observer) { observer = callback; } observe() {} };
  const resize = (width: number) => { available = width; observer([{ contentRect: { width } }]); };
  try {
    context.child = closeContext;
    for (const [key, value] of Object.entries({ document, localStorage, ResizeObserver })) Object.defineProperty(globalThis, key, { value, configurable: true });
    initializeCollaborationPanels();
    assert.equal(layout.dataset.columns, "three");
    assert.equal(layout.style.display, "flex");
    assert.equal(primary.style.flex, "1 1 0");
    assert.equal(context.parentElement, chat, "the overlay is attached to the chat surface");
    assert.equal(context.hidden, true, "migration keeps Current Work collapsed in the initial conversation view");
    assert.equal(contextToggle.attributes.get("aria-expanded"), "false");
    assert.equal(stored.get("personal-dashboard.collaboration-panels.v1"), oldRoomyChoice, "migration preserves the legacy preference record");
    assert.equal(parseFloat(context.style.top) + 110 + chat.clientTop, 145 + 4, "context starts below the chat heading");
    assert.ok(parseFloat(context.style.paddingBottom) >= 80 + 16, "context content reserves the composer height plus breathing room");
    contextToggle.click();
    assert.equal(context.hidden, false, "Current Work remains available by explicit disclosure");
    contextToggle.click();
    assert.equal(context.hidden, true);
    contextToggle.click();
    closeContext.click();
    assert.equal(context.hidden, true);
    assert.equal(active, contextToggle, "in-place close returns focus to its opener");
    contextToggle.click();
    assert.equal(context.hidden, false);
    resize(750);
    assert.equal(layout.dataset.columns, "two");
    assert.equal(context.hidden, false, "context remains open through a width change");
    assert.equal(primary.style.flex, "1 1 0");
    historyResizer.listeners.get("keydown")?.({ key: "End", shiftKey: false, preventDefault() {} });
    assert.equal(historyResizer.attributes.get("aria-valuenow"), "260", "the existing session separator stays keyboard operable");
    assert.equal(stored.get("personal-dashboard.collaboration-panels.v2") !== undefined, true);
    historyResizer.focus();
    resize(500);
    assert.equal(layout.dataset.columns, "single");
    assert.equal(context.hidden, false);
    assert.equal(historyResizer.hidden, true);
    assert.equal(history.hidden, true);
    assert.equal(active, historyToggle, "narrowing returns focus off the hidden session separator");
    historyToggle.click();
    assert.equal(history.hidden, false, "Sessions can still be disclosed in the single-column layout");
    historyToggle.click();
    assert.equal(history.hidden, true);
    resize(1100);
    assert.equal(history.hidden, false);
    assert.equal(context.hidden, false);
    assert.match(primary.style.gridTemplateColumns, /^260px 16px /, "keyboard resizing keeps the chosen session width on return to a roomy window");
    const persisted = readPanelPreferences(stored.get("personal-dashboard.collaboration-panels.v2") ?? null);
    assert.equal(persisted.history.width, 260);
    assert.equal(panelGeometry(750, persisted).contextExpanded, true, "the context disclosure survives a restored middle-width layout");
    assert.equal(document.getElementById("collaboration-history-panel"), history, "session DOM is retained");
    initializeCollaborationPanels();
    assert.equal(history.hidden, false, "the saved session choice is restored after reinitialization");
    assert.equal(context.hidden, false, "the saved context disclosure is restored after reinitialization");
    assert.equal(historyToggle.attributes.get("aria-expanded"), "true");
    assert.equal(contextToggle.attributes.get("aria-expanded"), "true");
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, { value: descriptor.value, configurable: true });
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
