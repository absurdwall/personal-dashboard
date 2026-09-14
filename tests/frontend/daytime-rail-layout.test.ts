import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Read the actual shipped markup; check semantic containment, not a CSS string.
function elements() {
  const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
  type Element = { tag: string; parent?: Element; attrs: string };
  const stack: Element[] = [];
  const nodes: Element[] = [];
  for (const token of html.matchAll(/<!--[^]*?-->|<\/?([\w-]+)\b[^>]*>/g)) {
    if (!token[1]) continue;
    const tag = token[1];
    if (token[0].startsWith('</')) { stack.pop(); continue; }
    const node = { tag, parent: stack.at(-1), attrs: token[0] };
    nodes.push(node);
    if (!['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(tag)) stack.push(node);
  }
  return nodes;
}
test('Daytime notes share the right rail below tasks, leaving the timeline in the reading column', () => {
  const nodes = elements();
  const tasks = nodes.find(n => n.attrs.includes('class="day-task-panel"'));
  const notes = nodes.find(n => n.attrs.includes('class="today-update-rail"'));
  assert.ok(tasks && notes);
  assert.equal(notes.parent, tasks.parent, 'Daily note and Day tasks must share the same right column');
  assert.ok(nodes.indexOf(notes) > nodes.indexOf(tasks), 'Notes must follow tasks');
  const timeline = nodes.find(n => n.attrs.includes('id="today-current-timeline"'));
  assert.ok(timeline);
  let ancestor = timeline.parent;
  while (ancestor) {
    assert.notEqual(ancestor, tasks.parent, "Timeline must remain outside the right rail");
    ancestor = ancestor.parent;
  }
});
