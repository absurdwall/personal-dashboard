import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarHolidayLabel,
  calendarHolidaysForDate,
  defaultCalendarHolidayPreferences,
} from '../../frontend/calendar-holidays.ts';

test('calendar holiday labels honor global and per-region preferences', () => {
  assert.deepEqual(
    calendarHolidaysForDate('2026-01-01', defaultCalendarHolidayPreferences).map((holiday) => holiday.region),
    ['china', 'unitedStates'],
  );
  assert.deepEqual(
    calendarHolidaysForDate('2026-01-01', { enabled: true, china: false, unitedStates: true }).map((holiday) => holiday.region),
    ['unitedStates'],
  );
  assert.deepEqual(
    calendarHolidaysForDate('2026-01-01', { enabled: false, china: true, unitedStates: true }),
    [],
  );
});

test('holiday source coverage is explicit and localized', () => {
  const springFestival = calendarHolidaysForDate('2027-02-06', defaultCalendarHolidayPreferences)
    .find((holiday) => holiday.region === 'china');
  assert.ok(springFestival);
  assert.equal(calendarHolidayLabel(springFestival, 'zh'), '春节');
  assert.equal(calendarHolidayLabel(springFestival, 'en'), 'Lunar New Year');
  assert.deepEqual(calendarHolidaysForDate('2028-02-26', defaultCalendarHolidayPreferences), []);
});
