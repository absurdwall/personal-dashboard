export type CalendarHolidayRegion = "china" | "united-states";

export type CalendarHoliday = Readonly<{
  date: string;
  region: CalendarHolidayRegion;
  name: Readonly<{ zh: string; en: string }>;
}>;

export type CalendarHolidayPreferences = Readonly<{
  enabled: boolean;
  china: boolean;
  unitedStates: boolean;
}>;

export const CALENDAR_HOLIDAY_PREFERENCE_KEY = "personal-dashboard.calendar-holidays.v1";
export const DEFAULT_CALENDAR_HOLIDAY_PREFERENCES: CalendarHolidayPreferences = Object.freeze({
  enabled: true,
  china: true,
  unitedStates: true,
});

export const CALENDAR_HOLIDAY_COVERAGE = Object.freeze({
  china: Object.freeze({ from: 2026, through: 2026 }),
  unitedStates: Object.freeze({ from: 2026, through: 2027 }),
});

// Official sources: China 2026 annual schedule at
// https://big5.www.gov.cn/gate/big5/www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
// and the U.S. federal holiday schedule at
// https://piv.opm.gov/policy-data-oversight/pay-leave/federal-holidays/ .
// No official China 2027 annual schedule is available in the verified source set.
// China entries cover the official 2026 leave ranges (including adjacent
// weekends). The notice's make-up workdays are deliberately not marked.
// These are calendar observances only, not working-day determinations.
function officialHolidayRange(
  start: string,
  end: string,
  region: CalendarHolidayRegion,
  name: Readonly<{ zh: string; en: string }>,
): CalendarHoliday[] {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const endTime = Date.UTC(endYear, endMonth - 1, endDay);
  const dates: CalendarHoliday[] = [];
  for (
    let time = Date.UTC(startYear, startMonth - 1, startDay);
    time <= endTime;
    time += 24 * 60 * 60 * 1000
  ) {
    dates.push({ date: new Date(time).toISOString().slice(0, 10), region, name });
  }
  return dates;
}

export const CALENDAR_HOLIDAYS: readonly CalendarHoliday[] = Object.freeze([
  ...officialHolidayRange("2026-01-01", "2026-01-03", "china", { zh: "元旦", en: "New Year's Day" }),
  ...officialHolidayRange("2026-02-15", "2026-02-23", "china", { zh: "春节", en: "Spring Festival" })
    .map((holiday) => holiday.date === "2026-02-16"
      ? { ...holiday, name: { zh: "除夕", en: "Lunar New Year's Eve" } }
      : holiday),
  ...officialHolidayRange("2026-04-04", "2026-04-06", "china", { zh: "清明节", en: "Qingming Festival" }),
  ...officialHolidayRange("2026-05-01", "2026-05-05", "china", { zh: "劳动节", en: "Labour Day" }),
  ...officialHolidayRange("2026-06-19", "2026-06-21", "china", { zh: "端午节", en: "Dragon Boat Festival" }),
  ...officialHolidayRange("2026-09-25", "2026-09-27", "china", { zh: "中秋节", en: "Mid-Autumn Festival" }),
  ...officialHolidayRange("2026-10-01", "2026-10-07", "china", { zh: "国庆节", en: "National Day" }),
  { date: "2026-01-01", region: "united-states", name: { zh: "元旦", en: "New Year's Day" } },
  { date: "2026-01-19", region: "united-states", name: { zh: "马丁·路德·金纪念日", en: "Birthday of Martin Luther King, Jr." } },
  { date: "2026-02-16", region: "united-states", name: { zh: "华盛顿诞辰", en: "Washington's Birthday" } },
  { date: "2026-05-25", region: "united-states", name: { zh: "阵亡将士纪念日", en: "Memorial Day" } },
  { date: "2026-06-19", region: "united-states", name: { zh: "六月节", en: "Juneteenth National Independence Day" } },
  { date: "2026-07-03", region: "united-states", name: { zh: "独立日（联邦假日）", en: "Independence Day (observed)" } },
  { date: "2026-09-07", region: "united-states", name: { zh: "劳动节", en: "Labor Day" } },
  { date: "2026-10-12", region: "united-states", name: { zh: "哥伦布日", en: "Columbus Day" } },
  { date: "2026-11-11", region: "united-states", name: { zh: "退伍军人节", en: "Veterans Day" } },
  { date: "2026-11-26", region: "united-states", name: { zh: "感恩节", en: "Thanksgiving Day" } },
  { date: "2026-12-25", region: "united-states", name: { zh: "圣诞节", en: "Christmas Day" } },
  { date: "2027-01-01", region: "united-states", name: { zh: "元旦", en: "New Year's Day" } },
  { date: "2027-01-18", region: "united-states", name: { zh: "马丁·路德·金纪念日", en: "Birthday of Martin Luther King, Jr." } },
  { date: "2027-02-15", region: "united-states", name: { zh: "华盛顿诞辰", en: "Washington's Birthday" } },
  { date: "2027-05-31", region: "united-states", name: { zh: "阵亡将士纪念日", en: "Memorial Day" } },
  { date: "2027-06-18", region: "united-states", name: { zh: "六月节（联邦假日）", en: "Juneteenth National Independence Day (observed)" } },
  { date: "2027-07-05", region: "united-states", name: { zh: "独立日（联邦假日）", en: "Independence Day (observed)" } },
  { date: "2027-09-06", region: "united-states", name: { zh: "劳动节", en: "Labor Day" } },
  { date: "2027-10-11", region: "united-states", name: { zh: "哥伦布日", en: "Columbus Day" } },
  { date: "2027-11-11", region: "united-states", name: { zh: "退伍军人节", en: "Veterans Day" } },
  { date: "2027-11-25", region: "united-states", name: { zh: "感恩节", en: "Thanksgiving Day" } },
  { date: "2027-12-24", region: "united-states", name: { zh: "圣诞节（联邦假日）", en: "Christmas Day (observed)" } },
]);

export function readCalendarHolidayPreferences(serialized: string | null): CalendarHolidayPreferences {
  if (!serialized) return { ...DEFAULT_CALENDAR_HOLIDAY_PREFERENCES };
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object") return { ...DEFAULT_CALENDAR_HOLIDAY_PREFERENCES };
    const record = value as Record<string, unknown>;
    return {
      enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      china: typeof record.china === "boolean" ? record.china : true,
      unitedStates: typeof record.unitedStates === "boolean" ? record.unitedStates : true,
    };
  } catch {
    return { ...DEFAULT_CALENDAR_HOLIDAY_PREFERENCES };
  }
}

export function calendarHolidayDataForDate(
  date: string,
  preferences: CalendarHolidayPreferences,
): readonly CalendarHoliday[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!preferences.enabled || !match) {
    return [];
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const verifiedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    verifiedDate.getUTCFullYear() !== year ||
    verifiedDate.getUTCMonth() !== month - 1 ||
    verifiedDate.getUTCDate() !== day
  ) return [];
  return CALENDAR_HOLIDAYS.filter((holiday) =>
    holiday.date === date &&
    ((holiday.region === "china" && preferences.china) ||
      (holiday.region === "united-states" && preferences.unitedStates)),
  );
}

export function calendarHolidayCoverageIncludes(
  year: number,
  region?: CalendarHolidayRegion,
): boolean {
  if (!Number.isInteger(year)) return false;
  if (region === "china") {
    return year >= CALENDAR_HOLIDAY_COVERAGE.china.from && year <= CALENDAR_HOLIDAY_COVERAGE.china.through;
  }
  if (region === "united-states") {
    return year >= CALENDAR_HOLIDAY_COVERAGE.unitedStates.from && year <= CALENDAR_HOLIDAY_COVERAGE.unitedStates.through;
  }
  return calendarHolidayCoverageIncludes(year, "china") || calendarHolidayCoverageIncludes(year, "united-states");
}
