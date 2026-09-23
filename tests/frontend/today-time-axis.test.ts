import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  axisLabelCenterMinute,
  axisMarkerLayout,
  axisGeometry,
  axisOverlapPlacements,
  clockResultMatchesSession,
  clockTickDecision,
  hourTickIsClearFromNow,
  hourTickMinutes,
  locateNow,
  minuteOfDay,
  minutePosition,
  onManualScroll,
  stripLeadingAxisTimeLabel,
  TODAY_AXIS_LABEL_MINIMUM_MINUTES,
  TODAY_AXIS_SHORT_RANGE_MAXIMUM_MINUTES,
} from '../../frontend/today-time-axis.ts';
import { LatestRequest } from '../../frontend/latest-request.ts';

type ElementNode = { tag: string; parent?: ElementNode; attrs: string };

function elements(): ElementNode[] {
  const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
  const stack: ElementNode[] = [];
  const nodes: ElementNode[] = [];
  for (const token of html.matchAll(/<!--[^]*?-->|<\/?([\w-]+)\b[^>]*>/g)) {
    if (!token[1]) continue;
    const tag = token[1];
    if (token[0].startsWith('</')) {
      stack.pop();
      continue;
    }
    const node: ElementNode = { tag, parent: stack.at(-1), attrs: token[0] };
    nodes.push(node);
    if (!['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag)) {
      stack.push(node);
    }
  }
  return nodes;
}

test('maps points, ranges, and overlaps without changing time anchors', () => {
  assert.equal(minutePosition(0), 0);
  assert.equal(minuteOfDay('00:00'), 0);
  assert.equal(minuteOfDay('12:30'), 750);
  assert.equal(minuteOfDay('23:59'), 1439);
  assert.equal(minuteOfDay('24:00'), null);
  assert.equal(minuteOfDay('7:30'), null);
  assert.equal(minuteOfDay('24:01'), null);
  assert.equal(minutePosition(750), 750 / 1440);
  assert.equal(minutePosition(1440), 1);
  assert.deepEqual(hourTickMinutes(), Array.from({ length: 25 }, (_, hour) => hour * 60));
  assert.deepEqual(axisGeometry({ startMinute: 750, endMinute: null }), {
    top: 750 / 1440,
    height: 0,
  });
  assert.deepEqual(axisGeometry({ startMinute: 570, endMinute: 645 }), {
    top: 570 / 1440,
    height: 75 / 1440,
  });
  assert.equal(
    axisGeometry({ startMinute: 600, endMinute: 660 }).top,
    axisGeometry({ startMinute: 600, endMinute: 720 }).top,
  );
});

test('keeps the now label clear of the nearest hourly tick at exact and adjacent minutes', () => {
  assert.equal(hourTickIsClearFromNow(780, 780), false);
  assert.equal(hourTickIsClearFromNow(780, 781), false);
  assert.equal(hourTickIsClearFromNow(840, 839), false);
  assert.equal(hourTickIsClearFromNow(1440, 1439), false);
  assert.equal(hourTickIsClearFromNow(720, 780), true);
  assert.equal(hourTickIsClearFromNow(840, null), true);
});

test('groups overlapping time-axis cards into one readable stack instead of horizontal tracks', () => {
  assert.equal(TODAY_AXIS_LABEL_MINIMUM_MINUTES, 48);
  assert.deepEqual(
    axisOverlapPlacements([
      { startMinute: 780, endMinute: 840 },
      { startMinute: 780, endMinute: null },
      { startMinute: 815, endMinute: 850 },
      { startMinute: 900, endMinute: 945 },
    ]),
    [
      { stackId: 0, stackIndex: 1, stackSize: 3 },
      { stackId: 0, stackIndex: 0, stackSize: 3 },
      { stackId: 0, stackIndex: 2, stackSize: 3 },
      { stackId: 1, stackIndex: 0, stackSize: 1 },
    ],
  );
  assert.deepEqual(
    axisOverlapPlacements([
      { startMinute: 360, endMinute: null },
      { startMinute: 400, endMinute: null },
    ]),
    [
      { stackId: 0, stackIndex: 0, stackSize: 2 },
      { stackId: 0, stackIndex: 1, stackSize: 2 },
    ],
  );
  assert.equal(axisLabelCenterMinute(0), TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(12), TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(1420), 1440 - TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(1440), 1440 - TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.deepEqual(
    axisOverlapPlacements([
      { startMinute: 0, endMinute: null },
      { startMinute: 30, endMinute: 50 },
    ]),
    [
      { stackId: 0, stackIndex: 0, stackSize: 2 },
      { stackId: 0, stackIndex: 1, stackSize: 2 },
    ],
  );
  assert.deepEqual(
    axisOverlapPlacements([
      { startMinute: 1430, endMinute: 1431 },
      { startMinute: 1416, endMinute: 1440 },
    ]),
    [
      { stackId: 0, stackIndex: 0, stackSize: 2 },
      { stackId: 0, stackIndex: 1, stackSize: 2 },
    ],
  );
});

test('stacks partially overlapping real time ranges without moving their source anchors', () => {
  assert.deepEqual(
    axisOverlapPlacements([
      { startMinute: 780, endMinute: 815 },
      { startMinute: 805, endMinute: 850 },
    ]),
    [
      { stackId: 0, stackIndex: 0, stackSize: 2 },
      { stackId: 0, stackIndex: 1, stackSize: 2 },
    ],
  );
});

test('keeps ordinary 45-minute cards on their real range and short labels on their anchor', () => {
  assert.equal(TODAY_AXIS_LABEL_MINIMUM_MINUTES, 48);
  assert.equal(TODAY_AXIS_SHORT_RANGE_MAXIMUM_MINUTES, 36);
  assert.deepEqual(axisMarkerLayout({ startMinute: 720, endMinute: 765 }), {
    isCenteredLabel: false,
    heightMinutes: 45,
    centerMinute: 720,
  });
  assert.deepEqual(axisMarkerLayout({ startMinute: 655, endMinute: 656 }), {
    isCenteredLabel: true,
    heightMinutes: 48,
    centerMinute: 655,
  });
});

test('removes a repeated leading time from the visible card title', () => {
  assert.equal(
    stripLeadingAxisTimeLabel('10:55–10:56 保存一行短摘要。', '10:55', '10:56'),
    '保存一行短摘要。',
  );
  assert.equal(
    stripLeadingAxisTimeLabel('14:20 完成了明确记录的工作。', '14:20', null),
    '完成了明确记录的工作。',
  );
  assert.equal(
    stripLeadingAxisTimeLabel('14:20', '14:20', null),
    '14:20',
  );
  assert.equal(
    stripLeadingAxisTimeLabel('安排从 14:20 开始', '14:20', null),
    '安排从 14:20 开始',
  );
});

test('clock refresh preserves historical selection and manual browsing', () => {
  assert.equal(clockTickDecision(null, '2026-08-10', '2026-08-10'), 'update-marker');
  assert.equal(clockTickDecision(null, '2026-08-10', '2026-08-11'), 'reload-today');
  assert.equal(clockTickDecision('2026-08-09', '2026-08-09', '2026-08-10'), 'preserve-history');
  assert.equal(clockTickDecision('2026-08-10', '2026-08-10', '2026-08-11'), 'preserve-history');
  assert.equal(onManualScroll('following'), 'manual');
  assert.equal(locateNow('manual'), 'following');
  assert.equal(
    clockResultMatchesSession(
      { date: '2026-08-10', targetBinding: 'vault-a' },
      { date: '2026-08-10', targetBinding: 'vault-a' },
    ),
    true,
  );
  assert.equal(
    clockResultMatchesSession(
      { date: '2026-08-10', targetBinding: 'vault-a' },
      { date: '2026-08-10', targetBinding: 'vault-b' },
    ),
    false,
  );
  const requests = new LatestRequest();
  const stale = requests.begin();
  requests.invalidate();
  assert.equal(requests.isCurrent(stale), false);
});

test('time axis markup uses one full-width lane for arrangement and fact cards', () => {
  const nodes = elements();
  const axis = nodes.find((node) => node.attrs.includes('id="today-continuous-axis"'));
  const legend = nodes.find((node) => node.attrs.includes('id="today-axis-lane-legend"'));
  const daytimeLayout = nodes.find((node) => node.attrs.includes('class="today-daytime-layout"'));
  const axisScroller = nodes.find((node) => node.attrs.includes('class="today-axis-scroll-surface"'));
  const unlocatedRegion = nodes.find((node) => node.attrs.includes('id="today-unlocated-time-region"'));
  const unlocatedShortcut = nodes.find((node) => node.attrs.includes('id="today-unlocated-time-shortcut"'));
  const lane = nodes.find((node) => node.attrs.includes('id="today-timeline-lane"'));
  const markers = nodes.find((node) => node.attrs.includes('id="today-timed-events"'));
  const unlocatedAside = nodes.find((node) => node.attrs.includes('class="today-side-region"'));
  const arrangementUnlocated = nodes.find((node) => node.attrs.includes('id="today-current-arrangement-unlocated"'));
  const factsUnlocated = nodes.find((node) => node.attrs.includes('id="today-confirmed-facts-unlocated"'));
  assert.ok(axis && legend && daytimeLayout && axisScroller && unlocatedRegion && unlocatedShortcut && lane && markers);
  assert.notEqual(legend.parent, daytimeLayout, 'type legend remains outside the timeline lane');
  assert.equal(axis.parent, axisScroller);
  assert.equal(unlocatedRegion.parent, unlocatedAside, 'untimed entries stay beside the Today timeline');
  assert.equal(arrangementUnlocated?.parent?.parent, unlocatedRegion);
  assert.equal(factsUnlocated?.parent?.parent, unlocatedRegion);
  assert.ok(unlocatedShortcut.attrs.includes('href="#today-unlocated-time-region"'));
  assert.equal(lane.parent, axis);
  assert.equal(markers.parent?.parent?.parent, lane);
  assert.ok(lane.attrs.includes('aria-labelledby="today-timeline-lane-heading"'));
  assert.equal(nodes.some((node) => node.attrs.includes('id="today-current-arrangement-lane"')), false);
  assert.equal(nodes.some((node) => node.attrs.includes('id="today-confirmed-facts-lane"')), false);
  for (const id of [
    'today-hour-scale',
    'today-hour-ticks',
    'today-timeline-lane-heading',
    'today-timed-events',
    'today-timed-duration',
    'today-timed-empty',
    'today-timed-details',
    'today-current-arrangement-unlocated',
    'today-confirmed-facts-unlocated',
    'today-unlocated-time-region',
    'today-unlocated-time-shortcut',
    'today-axis-scroll-surface',
    'today-current-time',
    'today-daytime-short-records',
    'today-daytime-updates',
    'today-future-directions',
    'today-daytime-form',
  ]) {
    assert.ok(nodes.some((node) => node.attrs.includes(`id="${id}"`)), `${id} remains available`);
  }
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-locate-now"') && node.tag === 'button'));
  const scrollSurface = nodes.find((node) => node.attrs.includes('id="today-axis-scroll-surface"'));
  assert.ok(scrollSurface?.attrs.includes('role="region"'));
  assert.ok(scrollSurface?.attrs.includes('tabindex="0"'));
  assert.ok(axis.attrs.includes('aria-labelledby="today-daytime-heading"'));
});

test('clock ticks update the locator without rebuilding readable timeline entries', () => {
  const source = readFileSync(new URL('../../frontend/main.ts', import.meta.url), 'utf8');
  const refreshStart = source.indexOf('async function refreshTodayClock(): Promise<void>');
  const refreshEnd = source.indexOf('\nasync function selectTodayVault()', refreshStart);
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart);
  const refresh = source.slice(refreshStart, refreshEnd);
  assert.equal(refresh.includes('renderTodayTimeAxis('), false);
  assert.ok(refresh.includes('updateTodayTimeAxisClock(updated, clock.time)'));
  assert.ok(refresh.includes('updateTodayTimeAxisClock(historical, null)'));
  const helperStart = source.indexOf('function updateTodayTimeAxisClock(');
  const helperEnd = source.indexOf('\nfunction renderTodayTimeAxis(', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.equal(source.slice(helperStart, helperEnd).includes('replaceChildren('), false);
});
