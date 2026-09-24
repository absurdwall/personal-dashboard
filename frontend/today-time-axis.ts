export const TODAY_AXIS_MINUTES = 24 * 60;
export const TODAY_AXIS_LABEL_MINIMUM_MINUTES = 48;
export const TODAY_AXIS_SHORT_RANGE_MAXIMUM_MINUTES = 36;
export const TODAY_AXIS_NOW_LABEL_CLEARANCE_MINUTES = 12;

export type TimeAxisEntry = Readonly<{ startMinute: number; endMinute: number | null }>;
export type AxisOverlapPlacement = Readonly<{ stackId: number; stackIndex: number; stackSize: number }>;
export type AxisMarkerLayout = Readonly<{
  isCenteredLabel: boolean;
  heightMinutes: number;
  centerMinute: number;
}>;
export type TodayAxisFollowState = 'following' | 'manual';
export type TodayAxisSession = Readonly<{ date: string; targetBinding: string | null }>;
export type ClockTickDecision = 'update-marker' | 'reload-today' | 'preserve-history';

export function stripLeadingAxisTimeLabel(
  text: string,
  startLabel: string,
  endLabel: string | null,
): string {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const range = endLabel ? `(?:\\s*(?:–|—|-)\\s*${escape(endLabel)})?` : '';
  const prefix = new RegExp(`^\\s*${escape(startLabel)}${range}(?=\\s|$)`).exec(text)?.[0];
  const remainder = prefix ? text.slice(prefix.length).trimStart() : text;
  return remainder || text;
}

export function minutePosition(minute: number): number {
  if (!Number.isInteger(minute) || minute < 0 || minute > TODAY_AXIS_MINUTES) {
    throw new RangeError('Today axis positions must be whole minutes from 0 through 1440.');
  }
  return minute / TODAY_AXIS_MINUTES;
}

export function axisLabelCenterMinute(anchorMinute: number): number {
  const halfLabel = TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2;
  return Math.min(Math.max(anchorMinute, halfLabel), TODAY_AXIS_MINUTES - halfLabel);
}

export function axisMarkerLayout(entry: TimeAxisEntry): AxisMarkerLayout {
  const duration = entry.endMinute === null ? null : entry.endMinute - entry.startMinute;
  if (duration !== null && duration < 0) {
    throw new RangeError('Today axis range ends must not precede their start.');
  }
  const isCenteredLabel = duration === null || duration < TODAY_AXIS_SHORT_RANGE_MAXIMUM_MINUTES;
  return {
    isCenteredLabel,
    heightMinutes: isCenteredLabel ? TODAY_AXIS_LABEL_MINIMUM_MINUTES : duration!,
    centerMinute: axisLabelCenterMinute(entry.startMinute),
  };
}

export function minuteOfDay(label: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(label);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function hourTickMinutes(): readonly number[] {
  return Array.from({ length: 25 }, (_, hour) => hour * 60);
}

export function hourTickIsClearFromNow(tickMinute: number, currentMinute: number | null): boolean {
  return currentMinute === null ||
    Math.abs(tickMinute - currentMinute) > TODAY_AXIS_NOW_LABEL_CLEARANCE_MINUTES;
}

export function axisGeometry(entry: TimeAxisEntry): Readonly<{ top: number; height: number }> {
  const top = minutePosition(entry.startMinute);
  if (entry.endMinute === null) return { top, height: 0 };
  if (entry.endMinute < entry.startMinute) {
    throw new RangeError('Today axis range ends must not precede their start.');
  }
  minutePosition(entry.endMinute);
  return { top, height: (entry.endMinute - entry.startMinute) / TODAY_AXIS_MINUTES };
}

export function axisOverlapPlacements(entries: readonly TimeAxisEntry[]): readonly AxisOverlapPlacement[] {
  const placements = entries.map(() => ({ stackId: 0, stackIndex: 0, stackSize: 1 }));
  const ordered = entries
    .map((entry, index) => {
      const duration = entry.endMinute === null ? 0 : entry.endMinute - entry.startMinute;
      if (duration < 0) {
        throw new RangeError('Today axis range ends must not precede their start.');
      }
      const marker = axisMarkerLayout(entry);
      const labelStart = marker.centerMinute - marker.heightMinutes / 2;
      const labelEnd = marker.centerMinute + marker.heightMinutes / 2;
      return {
        index,
        start: marker.isCenteredLabel ? Math.min(entry.startMinute, labelStart) : entry.startMinute,
        end: marker.isCenteredLabel
          ? Math.max(entry.endMinute ?? entry.startMinute, labelEnd)
          : entry.endMinute!,
      };
    })
    .sort((left, right) => left.start - right.start || left.index - right.index);

  let stackId = 0;
  for (let groupStart = 0; groupStart < ordered.length;) {
    let groupEnd = groupStart;
    let componentEnd = ordered[groupStart].end;
    while (groupEnd + 1 < ordered.length && ordered[groupEnd + 1].start < componentEnd) {
      groupEnd += 1;
      componentEnd = Math.max(componentEnd, ordered[groupEnd].end);
    }

    const groupSize = groupEnd - groupStart + 1;
    for (let index = groupStart; index <= groupEnd; index += 1) {
      placements[ordered[index].index] = {
        stackId,
        stackIndex: index - groupStart,
        stackSize: groupSize,
      };
    }
    groupStart = groupEnd + 1;
    stackId += 1;
  }

  return placements;
}

export function onManualScroll(_state: TodayAxisFollowState): TodayAxisFollowState {
  return 'manual';
}

export function locateNow(_state: TodayAxisFollowState): TodayAxisFollowState {
  return 'following';
}

export function clockTickDecision(
  selectedDate: string | null,
  viewDate: string,
  clockDate: string,
): ClockTickDecision {
  if (viewDate === clockDate) return 'update-marker';
  return selectedDate === null ? 'reload-today' : 'preserve-history';
}

export function clockResultMatchesSession(
  requested: TodayAxisSession,
  current: TodayAxisSession,
): boolean {
  return requested.date === current.date && requested.targetBinding === current.targetBinding;
}
