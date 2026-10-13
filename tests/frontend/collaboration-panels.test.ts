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

test("restored oversized panels reserve conversation space as the window shrinks", () => {
  const choices = readPanelPreferences('{"history":{"width":640},"context":{"width":640,"expanded":true}}');
  for (const width of [900, 960, 1024, 1200, 1800]) {
    const layout = panelGeometry(width, choices);
    assert.equal(layout.narrow, false);
    assert.ok(width - layout.history - layout.context - 16 >= 360);
    assert.ok(layout.history >= 180 && layout.context === 0);
  }
  assert.equal(panelGeometry(500, choices).narrow, true);
  assert.equal(choices.history.width, 640, "window resize must preserve requested width");
});

test("independently collapsing either panel returns its space to the conversation", () => {
  const choices = readPanelPreferences(null);
  choices.context.expanded = true;
  choices.history.expanded = false;
  const one = panelGeometry(1000, choices);
  assert.equal(one.history, 0);
  assert.equal(one.context, 0);
  choices.context.expanded = false;
  const neither = panelGeometry(1000, choices);
  assert.equal(neither.history + neither.context, 0);
});

test("middle widths keep compact Sessions beside a usable majority conversation", () => {
  for (const width of [556, 600, 680, 800, 899]) {
    const preferences = readPanelPreferences('{"history":{"width":640},"context":{"width":640},"narrow":{"history":false,"context":false}}');
    const layout = panelGeometry(width, preferences);
    assert.equal(layout.mode, "two");
    assert.equal(layout.historyExpanded, true, "old narrow defaults cannot hide Sessions here");
    assert.equal(layout.contextExpanded, false);
    assert.equal(layout.context, 0);
    assert.ok(layout.history >= 180 && layout.history <= 260);
    const conversation = width - layout.history - 16;
    assert.ok(conversation >= 360 && conversation > layout.history);
    assert.equal(preferences.history.width, 640, "automatic resizing keeps the original saved request");
  }
});

test("automatic width sequence restores roomy choices and separates compact context disclosure", () => {
  const preferences = readPanelPreferences(null);
  assert.deepEqual([1100, 750, 500, 1100].map(width => panelGeometry(width, preferences).mode),
    ["three", "two", "single", "three"]);
  preferences.context.expanded = true;
  preferences.compact = { context: true };
  const compact = panelGeometry(750, preferences);
  assert.equal(compact.contextExpanded, true);
  assert.equal(compact.context, 0, "context floats without taking conversation width");
  assert.equal(panelGeometry(1100, preferences).context, 0);
  preferences.history.expanded = false;
  assert.equal(panelGeometry(750, preferences).historyExpanded, false);
  const restored = readPanelPreferences(JSON.stringify(preferences));
  assert.equal(panelGeometry(750, restored).historyExpanded, false);
  assert.equal(panelGeometry(750, restored).contextExpanded, true);
  assert.equal(restored.context.expanded, true);
});


test("shipped panel controls preserve session nodes and focus across resize, disclosure and restart", () => {
  const originals = Object.fromEntries(["document", "localStorage", "ResizeObserver"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const oldRoomyChoice = '{"history":{"width":640},"context":{"width":640,"expanded":true},"narrow":{"history":false,"context":false}}';
  const stored = new Map([["personal-dashboard.collaboration-panels.v1", oldRoomyChoice]]);
  let available = 1100;
  let observer!: (entries: { contentRect: { width: number } }[]) => void;
  let active: any;
  class Node {
    hidden = false;
    isConnected = true;
    dataset: Record<string, string> = {};
    style = { gridTemplateColumns: "" };
    attributes = new Map<string, string>();
    listeners = new Map<string, (event: any) => void>();
    child = {};
    getBoundingClientRect() { return { width: available }; }
    contains(node: unknown) { return node === this.child; }
    querySelector() { return this; }
    setAttribute(key: string, value: string) { this.attributes.set(key, value); }
    addEventListener(key: string, callback: (event: any) => void) { this.listeners.set(key, callback); }
    focus() { active = this; }
    click() { this.listeners.get("click")?.({}); }
  }
  const layout = new Node();
  const primary = new Node();
  primary.querySelector = () => null;
  layout.querySelector = (selector: string) => selector === ".collaboration-primary-layout" ? primary : null;
  const nodes = Object.fromEntries(["history-panel", "work-panel", "toggle-history", "toggle-context", "history-resizer", "context-resizer"].map(id => [`collaboration-${id}`, new Node()]));
  const history = nodes["collaboration-history-panel"];
  const context = nodes["collaboration-work-panel"];
  const historyToggle = nodes["collaboration-toggle-history"];
  const contextToggle = nodes["collaboration-toggle-context"];
  const document = { querySelector: () => layout, getElementById: (id: string) => nodes[id], get activeElement() { return active; } };
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  };
  const ResizeObserver = class { constructor(callback: typeof observer) { observer = callback; } observe() {} };
  const resize = (width: number) => { available = width; observer([{ contentRect: { width } }]); };
  try {
    for (const [key, value] of Object.entries({ document, localStorage, ResizeObserver })) Object.defineProperty(globalThis, key, { value, configurable: true });
    initializeCollaborationPanels();
    assert.equal(layout.dataset.columns, "three");
    assert.equal(primary.dataset.columns, "three");
    assert.equal(layout.style.display, "grid");
    assert.equal(context.hidden, true, "the new default keeps Current Work out of the initial conversation view");
    assert.equal(contextToggle.attributes.get("aria-expanded"), "false");
    assert.equal(stored.get("personal-dashboard.collaboration-panels.v1"), oldRoomyChoice, "the previous preference is preserved but no longer expands Current Work by default");
    contextToggle.click();
    assert.equal(context.hidden, false, "Current Work remains available by explicit disclosure");
    const contextResizer = nodes["collaboration-context-resizer"];
    contextResizer.focus();
    resize(750);
    assert.equal(contextResizer.hidden, true);
    assert.equal(active, contextToggle, "three-to-two must move focus off the hidden sibling separator");
    contextToggle.click();
    assert.equal(context.hidden, false);
    assert.notEqual(active, contextResizer, "compact disclosure must not restore focus to its still-hidden separator");
    contextToggle.click();
    resize(1100);
    contextToggle.click();
    contextToggle.click();
    assert.notEqual(active, contextResizer, "context disclosure never restores its hidden separator");
    active = context.child;
    resize(750);
    assert.equal(layout.dataset.columns, "two");
    assert.equal(layout.style.display, "flex");
    assert.equal(primary.style.flex, "0 0 auto");
    assert.equal(history.hidden, false);
    assert.equal(context.hidden, true);
    assert.equal(active, contextToggle, "auto-hidden focused content returns focus to its disclosure");
    contextToggle.click();
    assert.equal(context.hidden, false);
    assert.equal(contextToggle.attributes.get("aria-expanded"), "true");
    const resizer = nodes["collaboration-history-resizer"];
    resizer.listeners.get("keydown")?.({ key: "End", shiftKey: false, preventDefault() {} });
    assert.equal(resizer.attributes.get("aria-valuenow"), "260");
    resizer.focus();
    resize(500);
    assert.equal(primary.dataset.columns, "single");
    assert.equal(resizer.hidden, true);
    assert.equal(active, historyToggle, "two-to-single must move focus off the hidden history separator");
    historyToggle.click();
    assert.notEqual(active, resizer, "single-column disclosure must not focus its hidden separator");
    historyToggle.click();
    resize(750);
    historyToggle.click();
    assert.equal(history.hidden, true);
    historyToggle.click();
    resize(500);
    assert.equal(history.hidden, true);
    resize(1100);
    assert.equal(history.hidden, false);
    assert.equal(context.hidden, false);
    assert.equal(document.getElementById("collaboration-history-panel"), history, "session DOM is retained");
    resize(750);
    initializeCollaborationPanels();
    assert.equal(history.hidden, false);
    assert.equal(context.hidden, false, "compact disclosure survives restart separately");
    assert.equal(readPanelPreferences(stored.get("personal-dashboard.collaboration-panels.v2") ?? null).context.expanded, true);
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
