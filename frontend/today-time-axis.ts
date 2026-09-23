export const TODAY_AXIS_MINUTES = 24 * 60;

export type TimeAxisEntry = Readonly<{ startMinute: number; endMinute: number | null }>;
export type TodayAxisFollowState = 'following' | 'manual';
export type TodayAxisSession = Readonly<{ date: string; targetBinding: string | null }>;
export type ClockTickDecision = 'update-marker' | 'reload-today' | 'preserve-history';

export function minutePosition(minute: number): number {
  if (!Number.isInteger(minute) || minute < 0 || minute > TODAY_AXIS_MINUTES) {
    throw new RangeError('Today axis positions must be whole minutes from 0 through 1440.');
  }
  return minute / TODAY_AXIS_MINUTES;
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
