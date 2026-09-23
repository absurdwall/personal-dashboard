export const TODAY_AXIS_MINUTES = 24 * 60;
export const TODAY_AXIS_LABEL_MINIMUM_MINUTES = 48;

export type TimeAxisEntry = Readonly<{ startMinute: number; endMinute: number | null }>;
export type AxisTrackPlacement = Readonly<{ track: number; tracks: number }>;
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

export function axisGeometry(entry: TimeAxisEntry): Readonly<{ top: number; height: number }> {
  const top = minutePosition(entry.startMinute);
  if (entry.endMinute === null) return { top, height: 0 };
  if (entry.endMinute < entry.startMinute) {
    throw new RangeError('Today axis range ends must not precede their start.');
  }
  minutePosition(entry.endMinute);
  return { top, height: (entry.endMinute - entry.startMinute) / TODAY_AXIS_MINUTES };
}

export function axisTrackPlacements(entries: readonly TimeAxisEntry[]): readonly AxisTrackPlacement[] {
  const placements = entries.map(() => ({ track: 0, tracks: 1 }));
  const ordered = entries
    .map((entry, index) => {
      const duration = entry.endMinute === null ? 0 : entry.endMinute - entry.startMinute;
      const centered = entry.endMinute === null || duration < TODAY_AXIS_LABEL_MINIMUM_MINUTES;
      const halfLabel = TODAY_AXIS_LABEL_MINIMUM_MINUTES / 2;
      const labelCenter = axisLabelCenterMinute(entry.startMinute);
      return {
        index,
        start: centered ? labelCenter - halfLabel : entry.startMinute,
        end: centered ? labelCenter + halfLabel : entry.endMinute!,
      };
    })
    .sort((left, right) => left.start - right.start || left.index - right.index);

  for (let groupStart = 0; groupStart < ordered.length;) {
    let groupEnd = groupStart;
    let componentEnd = ordered[groupStart].end;
    while (groupEnd + 1 < ordered.length && ordered[groupEnd + 1].start < componentEnd) {
      groupEnd += 1;
      componentEnd = Math.max(componentEnd, ordered[groupEnd].end);
    }

    const trackEnds: number[] = [];
    const groupPlacements: Array<{ index: number; track: number }> = [];
    for (let index = groupStart; index <= groupEnd; index += 1) {
      const entry = ordered[index];
      let track = trackEnds.findIndex((end) => end <= entry.start);
      if (track === -1) {
        track = trackEnds.length;
        trackEnds.push(entry.end);
      } else {
        trackEnds[track] = entry.end;
      }
      groupPlacements.push({ index: entry.index, track });
    }

    for (const placement of groupPlacements) {
      placements[placement.index] = { track: placement.track, tracks: trackEnds.length };
    }
    groupStart = groupEnd + 1;
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
