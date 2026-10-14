import assert from "node:assert/strict";
import test from "node:test";
import {
  CALENDAR_HOLIDAYS,
  DEFAULT_CALENDAR_HOLIDAY_PREFERENCES,
  calendarHolidayCoverageIncludes,
  calendarHolidayDataForDate,
  readCalendarHolidayPreferences,
} from "../../frontend/calendar-holidays.ts";

test("verified China 2026 and U.S. 2026–2027 dates are exact and unsupported China 2027 stays absent", () => {
  const all = DEFAULT_CALENDAR_HOLIDAY_PREFERENCES;
  const forDate = (date: string) => calendarHolidayDataForDate(date, all);
  assert.deepEqual(forDate("2026-02-16").filter((item) => item.region === "china").map((item) => item.name.en), [
    "Lunar New Year's Eve",
  ]);
  assert.deepEqual(forDate("2026-02-17").filter((item) => item.region === "china").map((item) => item.name.en), [
    "Spring Festival",
  ]);
  assert.deepEqual(forDate("2026-02-15").filter((item) => item.region === "china").map((item) => item.name.en), [
    "Spring Festival",
  ]);
  assert.ok(forDate("2026-04-05").some((item) => item.name.en === "Qingming Festival"));
  assert.ok(forDate("2026-10-01").some((item) => item.name.en === "National Day"));
  assert.ok(forDate("2026-10-07").some((item) => item.name.en === "National Day"));
  assert.ok(forDate("2026-05-05").some((item) => item.name.en === "Labour Day"));
  assert.equal(CALENDAR_HOLIDAYS.filter((item) => item.region === "china").length, 33);
  for (const workday of ["2026-02-14", "2026-02-28", "2026-09-20", "2026-10-10"]) {
    assert.equal(forDate(workday).some((item) => item.region === "china"), false);
  }
  assert.ok(forDate("2026-07-03").some((item) => item.name.en === "Independence Day (observed)"));
  assert.ok(forDate("2027-06-18").some((item) => item.name.en.includes("Juneteenth")));
  assert.ok(forDate("2027-12-24").some((item) => item.name.en === "Christmas Day (observed)"));
  assert.equal(calendarHolidayCoverageIncludes(2026, "china"), true);
  assert.equal(calendarHolidayCoverageIncludes(2027, "china"), false);
  assert.equal(calendarHolidayCoverageIncludes(2027, "united-states"), true);
  assert.deepEqual(forDate("2027-02-06").filter((item) => item.region === "china"), []);
  assert.deepEqual(forDate("2027-09-15").filter((item) => item.region === "china"), []);
  assert.equal(CALENDAR_HOLIDAYS.some((item) => item.region === "china" && item.date.startsWith("2027-")), false);
  assert.equal(calendarHolidayCoverageIncludes(2028), false);
  assert.deepEqual(forDate("2028-01-01"), []);
});

test("preference parsing defaults on, survives serialization, and gates master and region switches", () => {
  assert.deepEqual(readCalendarHolidayPreferences(null), DEFAULT_CALENDAR_HOLIDAY_PREFERENCES);
  const saved = {
    enabled: true,
    china: false,
    unitedStates: true,
  } as const;
  assert.deepEqual(readCalendarHolidayPreferences(JSON.stringify(saved)), saved);
  assert.deepEqual(readCalendarHolidayPreferences("not-json"), DEFAULT_CALENDAR_HOLIDAY_PREFERENCES);
  assert.deepEqual(
    calendarHolidayDataForDate("2026-02-16", saved).filter((item) => item.region === "china"),
    [],
  );
  assert.ok(calendarHolidayDataForDate("2026-07-03", saved).some((item) => item.region === "united-states"));
  assert.deepEqual(
    calendarHolidayDataForDate("2026-07-03", { ...saved, enabled: false }),
    [],
  );
});
