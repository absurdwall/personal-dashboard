import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  querySelectorAll() { return this.children; }
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

// Endpoint controls are read from the shipped markup and click handlers from
// compiled main. Geometry models the constant hour height of the rendered plot.
test('quiet-hour disclosures sit at opposite timeline endpoints and Locate now is a named icon', () => {
  const html = readFileSync(join(root, 'frontend/index.html'), 'utf8');
  const early = html.indexOf('id="today-expand-early"');
  const late = html.indexOf('id="today-expand-late"');
  const plot = html.indexOf('class="today-axis-plot"');
  const details = html.indexOf('id="today-timed-details"');
  assert.ok(early < plot && late > plot && late < details, 'late disclosure follows the plotted hours, before entry details');
  const locate = html.match(/<button id="today-locate-now"[^>]*>([\s\S]*?)<\/button>/)!;
  assert.match(locate[0], /data-i18n-aria-label="today.locateNow"/);
  assert.match(locate[0], /data-i18n-title="today.locateNow"/);
  assert.match(locate[1], /<svg/);
  assert.ok(html.indexOf('id="today-locate-now"') < early, 'locator lives beside the heading');
});

function expansionHarness() {
  const controls = new Map(['early', 'late'].map(segment => [`today-expand-${segment}`, new Element()]));
  const viewport = { scrollTop: 300, getBoundingClientRect: () => ({ top: 0, bottom: 600, height: 600 }),
    scrollTo({ top }: { top: number }) { this.scrollTop = top; } };
  const plot = { getBoundingClientRect: () => ({ top: -viewport.scrollTop, bottom: 1080 - viewport.scrollTop, height: 1080 }) };
  const context = createContext({ ...axis, document: { getElementById: (id: string) => controls.get(id) },
    currentTodayView: { date: '2026-10-01' }, workspaceInformation: viewport,
    todayAxisEarlyExpanded: false, todayAxisLateExpanded: false, todayAxisFollowState: 'following',
    todayContinuousAxis: { querySelector: () => plot },
    todayTimedDetails: new Element(), todayTimedEvents: new Element(),
    renderTodayTimeAxis() {}, controls, viewport, plot,
    requestAnimationFrame: (callback: () => void) => callback(),
  });
  // Coordinate locations must reflect current bounds and scroll position.
  runInContext(handler('function axisBounds(', 'function nextAxisDate('), context);
  runInContext(`plot.getBoundingClientRect = () => ({
    top: -viewport.scrollTop,
    height: (axisBounds()[1] - axisBounds()[0]),
    bottom: (axisBounds()[1] - axisBounds()[0]) - viewport.scrollTop,
  });`, context);
  if (main.includes('function toggleTodayAxisSegment(')) {
    runInContext(handler('function toggleTodayAxisSegment(', 'function todayEvidenceGroup('), context);
  }
  runInContext(main.slice(main.lastIndexOf('for (const id of ["today-expand-early", "today-expand-late"])')), context);
  return { context, viewport, controls };
}

test('quiet-hour clicks keep the visible reading minute through independent expansion and collapse', () => {
  const { context, controls, viewport } = expansionHarness();
  const readingMinute = () => runInContext('axisBounds()[0] + viewport.scrollTop', context);
  assert.equal(readingMinute(), 660);
  controls.get('today-expand-early')!.click();
  assert.equal(readingMinute(), 660, 'expanding early must compensate added hours above the reading anchor');
  assert.equal(viewport.scrollTop, 420);
  controls.get('today-expand-late')!.click();
  assert.equal(readingMinute(), 660);
  controls.get('today-expand-early')!.click();
  assert.equal(readingMinute(), 660);
  assert.equal(runInContext('todayAxisLateExpanded', context), true);
  controls.get('today-expand-late')!.click();
  assert.equal(readingMinute(), 660);
  assert.equal(context.todayAxisFollowState, 'manual');
});

test('shipped WebKit timeline keeps endpoint placement, reading anchors, reveal and detail state',
  { skip: process.platform !== 'darwin' }, () => {
    const probe = join(output, 'timeline-webkit');
    execFileSync('swiftc', [join(root, 'tests/frontend/helpers/rendered-today-layout.swift'), '-o', probe], { timeout: 60_000 });
    writeFileSync(join(output, 'index.html'), readFileSync(join(root, 'frontend/index.html'), 'utf8').replace(/<script[^]*?<\/script>/g, ''));
    copyFileSync(join(root, 'frontend/styles.css'), join(output, 'styles.css'));
    const pure = readFileSync(join(output, 'today-time-axis.js'), 'utf8').replaceAll('export ', '');
    const bindings = ['todayContinuousAxis:today-continuous-axis', 'todayHourTicks:today-hour-ticks',
      'todayTimedEvents:today-timed-events', 'todayTimedDurations:today-timed-duration', 'todayTimedDetails:today-timed-details',
      'todayTimedEmpty:today-timed-empty', 'todayCurrentArrangementUnlocated:today-current-arrangement-unlocated',
      'todayConfirmedFactsUnlocated:today-confirmed-facts-unlocated', 'todayCurrentTime:today-current-time',
      'todayLocateNowButton:today-locate-now', 'todayUnlocatedTimeRegion:today-unlocated-time-region',
      'todayUnlocatedTimeShortcut:today-unlocated-time-shortcut'].map(binding => {
        const [name, id] = binding.split(':'); return `const ${name} = document.getElementById('${id}');`;
      }).join('\n');
    const script = `(() => {
      document.getElementById('workspace-destination-today').hidden = false;
      document.getElementById('today-ready').hidden = false;
      document.getElementById('today-handoff').hidden = true;
      document.getElementById('today-phase-daytime').hidden = false;
      document.getElementById('today-phase-morning').hidden = true;
      ${pure}
      ${bindings}
      const workspaceInformation = document.querySelector('.workspace-information');
      let todayAxisFollowState = 'following';
      let currentInterfaceLanguage = 'en';
      let currentWorkspaceDestination = 'today';
      let programmaticTodayAxisScrollUntil = 0;
      const t = key => key;
      const setCopy = (node, key) => { node.textContent = key; node.dataset.i18n = key; };
      const updateTodayAxisMarkerAccessibleName = () => {};
      const todayTaskTimeAxisEntries = () => [];
      let currentTodayView = { date: '2026-10-01', isToday: true, currentTime: '12:00', tasks: { tasks: [], lists: [] },
        timeAxis: { currentArrangement: [360, 410, 720, 1390, 1439, 1500].map((startMinute, i) => ({
          startMinute, endMinute: null, text: 'Rendered item ' + i, sourceDate: '2026-10-01'
        })), confirmedFacts: [], unlocatedCurrentArrangement: [], unlocatedConfirmedFacts: [] } };
      ${handler('let todayAxisEarlyExpanded', 'function todayEvidenceGroup(')}
      ${handler('function scrollTodayAxisToNow(', 'function scheduleTodayAxisFollowScroll(')}
      ${main.slice(main.lastIndexOf('for (const id of ["today-expand-early", "today-expand-late"])'))}
      renderTodayTimeAxis(currentTodayView);
      const early = document.getElementById('today-expand-early');
      const late = document.getElementById('today-expand-late');
      const plot = document.querySelector('.today-axis-plot');
      const placement = { earlyBottom: early.getBoundingClientRect().bottom, plotTop: plot.getBoundingClientRect().top,
        lateTop: late.getBoundingClientRect().top, plotBottom: plot.getBoundingClientRect().bottom,
        locateWidth: todayLocateNowButton.getBoundingClientRect().width, locateHeight: todayLocateNowButton.getBoundingClientRect().height };
      todayTimedEvents.querySelector('.today-axis-stack-reveal').click();
      const revealed = todayTimedEvents.querySelector('.is-stack-front').dataset.axisEntryId;
      const openDetail = todayTimedDetails.querySelector('details'); openDetail.open = true;
      const openId = openDetail.id;
      const middle = () => todayTimedEvents.querySelector('[data-axis-entry-id="today-axis-arrangement-entry-2"]');
      workspaceInformation.scrollTop += middle().getBoundingClientRect().top - workspaceInformation.getBoundingClientRect().top - 80;
      const initialY = middle().getBoundingClientRect().top;
      const observations = [];
      for (const button of [early, late, early, late]) {
        button.click();
        observations.push({ y: middle().getBoundingClientRect().top, bounds: axisBounds(),
          early: early.getAttribute('aria-expanded'), late: late.getAttribute('aria-expanded'),
          earlyCopy: early.dataset.i18n, lateCopy: late.dataset.i18n,
          revealed: todayTimedEvents.querySelector('[data-axis-entry-id="' + revealed + '"]').classList.contains('is-stack-front'),
          detailOpen: document.getElementById(openId).open, follow: todayAxisFollowState });
      }
      currentTodayView = { ...currentTodayView, date: '2026-10-02', currentTime: '01:00' };
      renderTodayTimeAxis(currentTodayView);
      const initialLate = { bounds: axisBounds(), label: todayCurrentTime.textContent };
      late.click();
      scrollTodayAxisToNow();
      const locatedLate = { bounds: axisBounds(), follow: todayAxisFollowState };
      currentTodayView = { ...currentTodayView, date: '2026-10-03', currentTime: '04:30' };
      renderTodayTimeAxis(currentTodayView);
      const initialEarly = { bounds: axisBounds(), label: todayCurrentTime.textContent };
      early.click(); scrollTodayAxisToNow();
      return JSON.stringify({ placement, initialY, observations, initialLate, locatedLate, initialEarly,
        locatedEarly: { bounds: axisBounds(), follow: todayAxisFollowState } });
    })()`;
    const scriptPath = join(output, 'timeline-geometry.js');
    writeFileSync(scriptPath, script);
    for (const width of [1440, 1100, 680]) {
      const result = JSON.parse(execFileSync(probe, [join(output, 'index.html'), scriptPath, String(width)], { encoding: 'utf8', timeout: 30_000 }));
      const { placement } = result;
      assert.ok(placement.earlyBottom <= placement.plotTop && placement.lateTop >= placement.plotBottom, 'actual controls occupy opposite plot endpoints');
      assert.ok(placement.locateWidth >= 32 && placement.locateWidth <= 48 && placement.locateHeight >= 32, 'icon has an accessible target');
      const bounds = [[240, 1440], [240, 1680], [360, 1680], [360, 1440]];
      result.observations.forEach((observation: any, index: number) => {
        assert.ok(Math.abs(observation.y - result.initialY) < 1.1, `viewport ${width} toggle ${index} preserves actual rendered reading y: ${JSON.stringify(result)}`);
        assert.deepEqual(observation.bounds, bounds[index]);
        assert.equal(observation.follow, 'manual');
        assert.equal(observation.detailOpen, true);
        if (index !== 0) assert.equal(observation.revealed, true);
        assert.equal(observation.earlyCopy, observation.early === 'true' ? 'today.expandEarlyExpanded' : 'today.expandEarlyCollapsed');
        assert.equal(observation.lateCopy, observation.late === 'true' ? 'today.expandLateExpanded' : 'today.expandLateCollapsed');
      });
      assert.deepEqual(result.initialLate.bounds, [360, 1680]);
      assert.equal(result.initialLate.label, '2026-10-03 01:00');
      assert.deepEqual(result.locatedLate, { bounds: [360, 1680], follow: 'following' });
      assert.deepEqual(result.initialEarly, { bounds: [240, 1440], label: '04:30' });
      assert.deepEqual(result.locatedEarly, { bounds: [240, 1440], follow: 'following' });
    }
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

function noteRefreshHarness(state: 'pending' | 'completed', nextBinding = 'tasks-a', edited = true) {
  const task = { id: 'task-1', name: 'original', content: null, date: '2026-10-01', time: null,
    listId: 'inbox', state, source: { kind: 'manual' }, deletedAt: null,
    completion: state === 'completed' ? { completedOn: '2026-10-01', completedTime: '22:00' } : null };
  const draft = { name: edited ? 'unsaved edit' : task.name, content: '', date: task.date, time: '',
    listId: 'inbox', completionDate: task.completion?.completedOn ?? '', completionTime: task.completion?.completedTime ?? '' };
  const fields: Record<string, string> = { 'task-name': draft.name, 'task-content': draft.content,
    'task-date': draft.date, 'task-time': draft.time, 'task-list': draft.listId,
    'task-completion-date': draft.completionDate, 'task-completion-time': draft.completionTime };
  const form = { hidden: false, dataset: { taskEditor: task.id, taskSurface: 'today' },
    querySelector: (selector: string) => ({ value: fields[selector.slice(6, -1)] ?? '' }) };
  const view = { date: task.date, targetBinding: 'record-a', isToday: false,
    tasks: { targetBinding: 'tasks-a', tasks: [task] } };
  const next = { ...view, tasks: { ...view.tasks, targetBinding: nextBinding } };
  const text = (value: string) => { const node = new Element(); node.textContent = value; return node; };
  const context = createContext({ currentTodayView: view, next, currentWorkspaceDestination: 'today',
    taskEditDrafts: new Map(), document: { querySelectorAll: () => [form], createElement: () => new Element(), createTextNode: text },
    currentTasksView: null, taskEditorDialogRoot: null, rows: [] as Element[], todayDate: null,
    stashEveningReviewDraft() {}, stashDatedNoteDraft() {}, stashTodayTaskCreateDraft() {},
    renderWorkspaceRailContext() {}, renderVaultSettings() {}, renderDatedNoteComposer() {},
    renderLegacyDayTasks() {}, renderHistoricalHabitCorrections() {},
    taskStateCopyKey: (value: string) => value, taskScheduleText: () => '', taskChangeHistory: () => null,
    taskCompletionMoment: () => '', taskCompletionSourceText: () => '', calendarDateLabel: (value: string) => value,
    taskListForId: () => ({ id: 'inbox', name: 'Inbox' }), taskListDisplayName: () => 'Inbox',
    renderTaskListSelect() {}, normalizeTaskDateTimeFields() {}, t: (key: string) => key,
    setCopy: (node: Element, key: string) => { node.textContent = key; },
  });
  const capture = main.includes('function captureTodayTaskEditors(')
    ? handler('function captureTodayTaskEditors(', 'function renderToday(') : '';
  runInContext(handler('function taskDraftKey(', 'function readTaskDraft(') +
    handler('function readTaskDraft(', 'function isBlankTaskDraft(') +
    handler('function taskEditorForms(', 'function clearTaskEditorDialogs(') +
    handler('function taskEditor(', 'function renderTasks(') + capture +
    handler('function renderToday(', 'if (todayVault)') + '}\n' +
    `function renderTodayTasks(view, openIds) {
      rows = view.tasks.tasks.map(task => taskEditor(task, true, view.tasks, 'today', openIds?.has(task.id) ?? false));
    }`, context);
  runInContext('renderToday(next, true)', context);
  const editor = context.rows[0].children.find((node: Element) => node.dataset.taskEditor === task.id)!;
  const name = editor.children[0].children[0].children[0].children[0] as Element & { value: string };
  return { context, editor, name };
}

for (const state of ['pending', 'completed'] as const) {
  test(`saving a note keeps the open ${state} Today Task editor and its actual field values`, () => {
    const { context, editor, name } = noteRefreshHarness(state);
    assert.equal(editor.hidden, false);
    assert.equal(name.value, 'unsaved edit');
    assert.equal(context.taskEditDrafts.get('tasks-a:task-1')?.name, 'unsaved edit');
  });
}

test('note refresh keeps an untouched open editor without creating a false dirty draft; new Vault binding stays closed', () => {
  const unchanged = noteRefreshHarness('pending', 'tasks-a', false);
  assert.equal(unchanged.editor.hidden, false);
  assert.equal(unchanged.context.taskEditDrafts.size, 0);
  const switched = noteRefreshHarness('pending', 'tasks-b');
  assert.equal(switched.editor.hidden, true);
  assert.equal(switched.name.value, 'original');
  assert.equal(switched.context.taskEditDrafts.size, 0);
});

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
