import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  axisGeometry,
  clockResultMatchesSession,
  clockTickDecision,
  hourTickMinutes,
  locateNow,
  minuteOfDay,
  minutePosition,
  onManualScroll,
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
  const arrangement = nodes.find((node) => node.attrs.includes('id="today-current-arrangement-lane"'));
  const facts = nodes.find((node) => node.attrs.includes('id="today-confirmed-facts-lane"'));
  assert.ok(axis && legend && daytimeLayout && arrangement && facts);
  assert.notEqual(legend.parent, daytimeLayout, 'lane labels remain outside the narrow horizontal scroller');
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
    'today-current-time',
    'today-daytime-short-records',
    'today-daytime-updates',
    'today-future-directions',
    'today-daytime-form',
  ]) {
    assert.ok(nodes.some((node) => node.attrs.includes(`id="${id}"`)), `${id} remains available`);
  }
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-locate-now"') && node.tag === 'button'));
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
