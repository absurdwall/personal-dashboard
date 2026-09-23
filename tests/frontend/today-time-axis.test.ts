import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  axisLabelCenterMinute,
  axisMarkerLayout,
  axisGeometry,
  axisTrackPlacements,
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

test('assigns visible time-axis cards to separate tracks when their labels overlap', () => {
  assert.equal(TODAY_AXIS_LABEL_MINIMUM_MINUTES, 48);
  assert.deepEqual(
    axisTrackPlacements([
      { startMinute: 780, endMinute: 840 },
      { startMinute: 780, endMinute: null },
      { startMinute: 815, endMinute: 850 },
      { startMinute: 900, endMinute: 945 },
    ]),
    [
      { track: 1, tracks: 3 },
      { track: 0, tracks: 3 },
      { track: 2, tracks: 3 },
      { track: 0, tracks: 1 },
    ],
  );
  assert.deepEqual(
    axisTrackPlacements([
      { startMinute: 360, endMinute: null },
      { startMinute: 400, endMinute: null },
    ]),
    [
      { track: 0, tracks: 2 },
      { track: 1, tracks: 2 },
    ],
  );
  assert.equal(axisLabelCenterMinute(0), TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(12), TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(1420), 1440 - TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.equal(axisLabelCenterMinute(1440), 1440 - TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2);
  assert.deepEqual(
    axisTrackPlacements([
      { startMinute: 0, endMinute: null },
      { startMinute: 30, endMinute: 50 },
    ]),
    [
      { track: 0, tracks: 2 },
      { track: 1, tracks: 2 },
    ],
  );
  assert.deepEqual(
    axisTrackPlacements([
      { startMinute: 1430, endMinute: 1431 },
      { startMinute: 1416, endMinute: 1440 },
    ]),
    [
      { track: 0, tracks: 2 },
      { track: 1, tracks: 2 },
    ],
  );
});

test('keeps a short range track occupied through its real end when the next label starts later', () => {
  assert.deepEqual(
    axisTrackPlacements([
      { startMinute: 780, endMinute: 815 },
      { startMinute: 805, endMinute: 850 },
    ]),
    [
      { track: 0, tracks: 2 },
      { track: 1, tracks: 2 },
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

test('time axis markup keeps both lanes named and keyboard reachable', () => {
  const nodes = elements();
  const axis = nodes.find((node) => node.attrs.includes('id="today-continuous-axis"'));
  const legend = nodes.find((node) => node.attrs.includes('id="today-axis-lane-legend"'));
  const daytimeLayout = nodes.find((node) => node.attrs.includes('class="today-daytime-layout"'));
  const axisScroller = nodes.find((node) => node.attrs.includes('class="today-axis-scroll-surface"'));
  const unlocatedRegion = nodes.find((node) => node.attrs.includes('id="today-unlocated-time-region"'));
  const unlocatedShortcut = nodes.find((node) => node.attrs.includes('id="today-unlocated-time-shortcut"'));
  const arrangement = nodes.find((node) => node.attrs.includes('id="today-current-arrangement-lane"'));
  const facts = nodes.find((node) => node.attrs.includes('id="today-confirmed-facts-lane"'));
  const unlocatedAside = nodes.find((node) => node.attrs.includes('class="today-side-region"'));
  const arrangementUnlocated = nodes.find((node) => node.attrs.includes('id="today-current-arrangement-unlocated"'));
  const factsUnlocated = nodes.find((node) => node.attrs.includes('id="today-confirmed-facts-unlocated"'));
  assert.ok(axis && legend && daytimeLayout && axisScroller && unlocatedRegion && unlocatedShortcut && arrangement && facts);
  assert.notEqual(legend.parent, daytimeLayout, 'lane labels remain outside the narrow horizontal scroller');
  assert.equal(axis.parent, axisScroller);
  assert.equal(unlocatedRegion.parent, unlocatedAside, 'untimed entries stay beside the Today timeline');
  assert.equal(arrangementUnlocated?.parent?.parent, unlocatedRegion);
  assert.equal(factsUnlocated?.parent?.parent, unlocatedRegion);
  assert.ok(unlocatedShortcut.attrs.includes('href="#today-unlocated-time-region"'));
  assert.equal(arrangement.parent, axis);
  assert.equal(facts.parent, axis);
  assert.ok(arrangement.attrs.includes('aria-labelledby="today-current-arrangement-heading"'));
  assert.ok(facts.attrs.includes('aria-labelledby="today-confirmed-facts-heading"'));
  for (const id of ['today-current-arrangement-heading', 'today-confirmed-facts-heading']) {
    const heading = nodes.find((node) => node.attrs.includes(`id="${id}"`));
    assert.ok(heading?.parent?.attrs.includes('class="today-axis-lane-track"'), `${id} stays with its plotted lane`);
  }
  for (const id of [
    'today-hour-scale',
    'today-hour-ticks',
    'today-current-arrangement-empty',
    'today-confirmed-facts-empty',
    'today-current-arrangement-unlocated',
    'today-confirmed-facts-unlocated',
    'today-unlocated-time-region',
    'today-unlocated-time-shortcut',
    'today-axis-scroll-surface',
    'today-axis-scroll-hint',
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
