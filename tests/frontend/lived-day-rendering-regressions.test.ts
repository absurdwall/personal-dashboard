import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import * as axis from '../../frontend/today-time-axis.ts';
import { LatestRequest } from '../../frontend/latest-request.ts';

// Run the shipped handlers, with only DOM/IPC boundaries substituted. Compile
// into a temporary directory so a stale dist cannot hide a call-site regression.
const root = fileURLToPath(new URL('../..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dashboard-rendering-tests-'));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(join(root, 'node_modules/.bin/tsc'), ['--outDir', output], { cwd: root });
const main = readFileSync(join(output, 'main.js'), 'utf8');
function handler(start: string, end: string): string {
  const first = main.indexOf(start);
  const last = main.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `compiled handler available: ${start}`);
  return main.slice(first, last);
}

class Element {
  children: Element[] = [];
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  properties = new Map<string, string>();
  style = { setProperty: (key: string, value: string) => this.properties.set(key, value) };
  classes = new Set<string>();
  className = '';
  textContent = '';
  hidden = false;
  open = false;
  focused = false;
  listeners = new Map<string, () => void>();
  classList = {
    add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, value: boolean) => value ? this.classes.add(name) : this.classes.delete(name),
  };
  append(...children: Element[]) { this.children.push(...children); }
  replaceChildren(...children: Element[]) { this.children = children; }
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  toggleAttribute() {}
  closest() { return null; }
  querySelector(selector: string) { return this.children.find(child => `.${child.className}` === selector); }
  addEventListener(name: string, callback: (event: unknown) => void) {
    this.listeners.set(name, () => callback({ preventDefault() {}, stopPropagation() {} }));
  }
  click() { this.listeners.get('click')?.(); }
  focus() { this.focused = true; }
  scrollIntoView() {}
}

function renderTimeline(entries: { startMinute: number; endMinute: number | null }[], early = false, late = false) {
  const context = createContext({
    ...axis, document: { createElement: () => new Element() },
    currentTodayView: { date: '2026-10-01' }, currentInterfaceLanguage: 'en',
    todayAxisFollowState: 'following',
    t: (key: string) => key, setCopy() {}, updateTodayAxisMarkerAccessibleName() {},
    todayTimedEvents: new Element(), todayTimedDurations: new Element(), todayTimedDetails: new Element(),
    todayTimedEmpty: new Element(), todayCurrentArrangementUnlocated: new Element(), todayConfirmedFactsUnlocated: new Element(),
  });
  runInContext(handler('let todayAxisEarlyExpanded', 'function updateTodayTimeAxisClock('), context);
  context.entries = entries.map((entry, index) => ({ ...entry, lane: 'facts', text: `entry ${index}`, sourceDate: '2026-10-01' }));
  runInContext(`todayAxisEarlyExpanded = ${early}; todayAxisLateExpanded = ${late}; renderTodayTimeAxisEntries(entries, [], []);`, context);
  return context;
}

test('folded 06:00 and 06:50 point cards share reveal controls and retain source labels/anchors', () => {
  const context = renderTimeline([{ startMinute: 360, endMinute: null }, { startMinute: 410, endMinute: null }]);
  const [first, second] = context.todayTimedEvents.children;
  assert.equal(first.properties.get('--axis-stack-size'), '2');
  assert.equal(second.properties.get('--axis-stack-size'), '2');
  assert.equal(first.properties.get('--axis-top'), '0%');
  assert.equal(first.children[0].children[0].textContent, '06:00');
  assert.equal(second.children[0].children[0].textContent, '06:50');
  assert.equal(first.classList.contains('is-stack-front'), true);
  first.children[1].click();
  assert.equal(second.classList.contains('is-stack-front'), true);
  assert.equal(second.children[0].focused, true);
  second.children[0].click();
  assert.equal(context.todayTimedDetails.children[1].open, true);
});

test('folded end and clipped short ranges expose collisions without relabeling their times', () => {
  for (const entries of [
    [{ startMinute: 1390, endMinute: null }, { startMinute: 1439, endMinute: null }],
    [{ startMinute: 300, endMinute: 370 }, { startMinute: 410, endMinute: 411 }],
    [{ startMinute: 1390, endMinute: 1391 }, { startMinute: 1430, endMinute: 1500 }],
  ]) {
    const context = renderTimeline(entries);
    assert.deepEqual(context.todayTimedEvents.children.map((marker: Element) => marker.properties.get('--axis-stack-size')), ['2', '2']);
    assert.equal(context.todayTimedDetails.children.length, 2);
  }
  const clipped = renderTimeline([{ startMinute: 300, endMinute: 370 }, { startMinute: 410, endMinute: 411 }]);
  assert.equal(clipped.todayTimedEvents.children[0].children[0].children[0].textContent, '05:00–06:10');
});

test('expanding quiet hours recomputes stacks and exposes next-day entries', () => {
  const entries = [{ startMinute: 360, endMinute: null }, { startMinute: 410, endMinute: null }, { startMinute: 1500, endMinute: null }];
  const full = renderTimeline(entries, true, true);
  assert.deepEqual(full.todayTimedEvents.children.map((marker: Element) => marker.properties.get('--axis-stack-size')), ['1', '1', '1']);
  assert.equal(full.todayTimedEvents.children[2].children[0].children[0].textContent, '01:00 · 2026-10-02');
  assert.equal(renderTimeline(entries).todayTimedEvents.children.length, 2);
});

function clockHarness(state: 'pending' | 'completed', open: boolean, draft = false, surface = 'today') {
  const form = { hidden: !open, dataset: { taskEditor: 'task-1', taskSurface: surface } };
  const context = createContext({
    ...axis, currentWorkspaceDestination: 'today', selectedTodayDate: null,
    currentTodayView: { date: '2026-10-01', targetBinding: 'record-a', tasks: { targetBinding: 'tasks-a', tasks: [{ id: 'task-1', state, date: '2026-10-01' }] } },
    todayClockRequests: new LatestRequest(), todayAxisFollowState: 'manual',
    document: { querySelectorAll: () => [form] },
    datedNoteDrafts: new Map(), eveningReviewDrafts: new Map(), todayTaskCreateDrafts: new Map(),
    taskEditDrafts: new Map(draft ? [['tasks-a:task-1', { name: 'edited draft' }]] : []),
    todayOperationCount: 0, taskOperationCount: 0,
    stashDatedNoteDraft() {}, stashEveningReviewDraft() {}, stashTodayTaskCreateDraft() {},
    todayTaskCreateDraftKey: (binding: string, date: string) => `${binding}:${date}`,
    todayDate: new Element(), setCopy() {}, updateTodayTimeAxisClock() {}, scrollTodayAxisToNow() {},
    window: { __TAURI__: { core: { invoke: async () => ({ livedDate: '2026-10-02', time: '04:00' }) } } },
    reloads: 0, editor: form,
  });
  runInContext(handler('function taskDraftKey(', 'function readTaskDraft(') +
    handler('function taskEditorForms(', 'function clearTaskEditorDialogs(') +
    handler('function hasTodayEditingTarget(', 'function stashDatedNoteDraft(') +
    handler('async function refreshTodayClock(', 'async function selectTodayVault(') +
    // The reload endpoint represents new-day presentation. A completed Task
    // disappears from its groups, exactly as it does in the shipped renderer.
    `async function refreshToday() { reloads++; currentTodayView = { ...currentTodayView, date: selectedTodayDate ?? '2026-10-02' }; editor = null; }`, context);
  return context;
}

for (const state of ['pending', 'completed'] as const) {
  for (const draft of [false, true]) {
    test(`${state} Today Task ${draft ? 'draft' : 'unmodified open editor'} remains on the visible day at 04:00`, async () => {
      const context = clockHarness(state, true, draft);
      const editor = context.editor;
      await runInContext('refreshTodayClock()', context);
      assert.equal(context.currentTodayView.date, '2026-10-01');
      assert.equal(context.selectedTodayDate, '2026-10-01');
      assert.equal(context.editor, editor);
      assert.equal(context.editor.hidden, false);
      assert.equal(context.reloads, 0);
    });
  }
}

test('closed edited Today draft retains its day, while untouched rows and other surfaces do not block rollover', async () => {
  const edited = clockHarness('completed', false, true);
  await runInContext('refreshTodayClock()', edited);
  assert.equal(edited.currentTodayView.date, '2026-10-01');
  for (const context of [clockHarness('pending', false), clockHarness('completed', true, false, 'tasks')]) {
    await runInContext('refreshTodayClock()', context);
    assert.equal(context.currentTodayView.date, '2026-10-02');
    assert.equal(context.reloads, 1);
  }
});

test('explicit history remains selected and a stale clock from the previous Vault cannot pin the new Vault', async () => {
  const historical = clockHarness('completed', false);
  historical.selectedTodayDate = '2026-10-01';
  await runInContext('refreshTodayClock()', historical);
  assert.equal(historical.currentTodayView.date, '2026-10-01');
  const switched = clockHarness('completed', true);
  let release!: (clock: unknown) => void;
  switched.window.__TAURI__.core.invoke = () => new Promise(resolve => { release = resolve; });
  const tick = runInContext('refreshTodayClock()', switched);
  switched.currentTodayView = { ...switched.currentTodayView, targetBinding: 'record-b', tasks: { ...switched.currentTodayView.tasks, targetBinding: 'tasks-b' } };
  release({ livedDate: '2026-10-02', time: '04:00' });
  await tick;
  assert.equal(switched.selectedTodayDate, null);
  assert.equal(switched.reloads, 0);
});

test('focus/resume keeps an active Today editor across rollover and still refreshes when idle', async () => {
  for (const active of [true, false]) {
    const context = clockHarness('completed', active);
    const editor = context.editor;
    context.window.addEventListener = (_name: string, callback: () => void) => { context.onFocus = callback; };
    runInContext(handler('window.addEventListener("focus",', 'void connectToApplication()'), context);
    context.onFocus();
    await new Promise(setImmediate);
    if (active) {
      assert.equal(context.currentTodayView.date, '2026-10-01');
      assert.equal(context.editor, editor);
      assert.equal(context.editor.hidden, false);
    } else {
      assert.equal(context.currentTodayView.date, '2026-10-02');
      assert.ok(context.reloads > 0);
    }
  }
});

test('pending Today and Task writes pin the old day even without an open editor', async () => {
  for (const counter of ['todayOperationCount', 'taskOperationCount']) {
    const context = clockHarness('pending', false);
    context[counter] = 1;
    await runInContext('refreshTodayClock()', context);
    assert.equal(context.selectedTodayDate, '2026-10-01');
    assert.equal(context.reloads, 0);
  }
});
