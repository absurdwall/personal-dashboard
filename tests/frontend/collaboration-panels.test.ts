import assert from "node:assert/strict";
import test from "node:test";
import { panelGeometry, readPanelPreferences } from "../../frontend/collaboration-panels.ts";

test("layout selections survive restart and corrupt storage cannot remove access", () => {
  const choices = { history: { expanded: false, width: 260 }, context: { expanded: true, width: 480 } };
  assert.deepEqual(readPanelPreferences(JSON.stringify(choices)), choices);
  assert.deepEqual(readPanelPreferences("broken"), readPanelPreferences(null));
  assert.deepEqual(readPanelPreferences(JSON.stringify({ ...choices, narrow: { history: true, context: false } })).narrow,
    { history: true, context: false });
  assert.deepEqual(readPanelPreferences('{"history":{"width":-200},"context":{"width":99999}}'), {
    history: { expanded: true, width: 180 }, context: { expanded: true, width: 640 },
  });
});

test("restored oversized panels reserve conversation space as the window shrinks", () => {
  const choices = readPanelPreferences('{"history":{"width":640},"context":{"width":640}}');
  for (const width of [900, 960, 1024, 1200, 1800]) {
    const layout = panelGeometry(width, choices);
    assert.equal(layout.narrow, false);
    assert.ok(width - layout.history - layout.context - 32 >= 360);
    assert.ok(layout.history >= 180 && layout.context >= 240);
  }
  assert.equal(panelGeometry(500, choices).narrow, true);
  assert.equal(choices.history.width, 640, "window resize must preserve requested width");
});

test("independently collapsing either panel returns its space to the conversation", () => {
  const choices = readPanelPreferences(null);
  choices.history.expanded = false;
  const one = panelGeometry(1000, choices);
  assert.equal(one.history, 0);
  assert.equal(one.context, 304);
  choices.context.expanded = false;
  const neither = panelGeometry(1000, choices);
  assert.equal(neither.history + neither.context, 0);
});
