export type CalendarHolidayRegion = "china" | "unitedStates";

export type CalendarHolidayPreferences = Readonly<{
  enabled: boolean;
  china: boolean;
  unitedStates: boolean;
}>;

export type CalendarHoliday = Readonly<{
  date: string;
  region: CalendarHolidayRegion;
  name: Readonly<{ zh: string; en: string }>;
}>;

export const defaultCalendarHolidayPreferences: CalendarHolidayPreferences = {
  enabled: true,
  china: true,
  unitedStates: true,
};

const calendarHolidays: readonly CalendarHoliday[] = [
  { date: "2026-01-01", region: "china", name: { zh: "元旦", en: "New Year's Day" } },
  { date: "2026-02-17", region: "china", name: { zh: "春节", en: "Lunar New Year" } },
  { date: "2026-04-05", region: "china", name: { zh: "清明", en: "Qingming Festival" } },
  { date: "2026-05-01", region: "china", name: { zh: "劳动节", en: "Labour Day" } },
  { date: "2026-06-19", region: "china", name: { zh: "端午", en: "Dragon Boat Festival" } },
  { date: "2026-09-25", region: "china", name: { zh: "中秋", en: "Mid-Autumn Festival" } },
  { date: "2026-10-01", region: "china", name: { zh: "国庆", en: "National Day" } },
  { date: "2027-01-01", region: "china", name: { zh: "元旦", en: "New Year's Day" } },
  { date: "2027-02-06", region: "china", name: { zh: "春节", en: "Lunar New Year" } },
  { date: "2027-04-05", region: "china", name: { zh: "清明", en: "Qingming Festival" } },
  { date: "2027-05-01", region: "china", name: { zh: "劳动节", en: "Labour Day" } },
  { date: "2027-06-09", region: "china", name: { zh: "端午", en: "Dragon Boat Festival" } },
  { date: "2027-09-15", region: "china", name: { zh: "中秋", en: "Mid-Autumn Festival" } },
  { date: "2027-10-01", region: "china", name: { zh: "国庆", en: "National Day" } },
  { date: "2026-01-01", region: "unitedStates", name: { zh: "新年", en: "New Year's Day" } },
  { date: "2026-01-19", region: "unitedStates", name: { zh: "马丁·路德·金纪念日", en: "Martin Luther King Jr. Day" } },
  { date: "2026-02-16", region: "unitedStates", name: { zh: "华盛顿诞辰日", en: "Washington's Birthday" } },
  { date: "2026-05-25", region: "unitedStates", name: { zh: "阵亡将士纪念日", en: "Memorial Day" } },
  { date: "2026-06-19", region: "unitedStates", name: { zh: "六月节", en: "Juneteenth" } },
  { date: "2026-07-03", region: "unitedStates", name: { zh: "独立日（补休日）", en: "Independence Day (observed)" } },
  { date: "2026-09-07", region: "unitedStates", name: { zh: "劳动节", en: "Labor Day" } },
  { date: "2026-10-12", region: "unitedStates", name: { zh: "哥伦布日", en: "Columbus Day" } },
  { date: "2026-11-11", region: "unitedStates", name: { zh: "退伍军人节", en: "Veterans Day" } },
  { date: "2026-11-26", region: "unitedStates", name: { zh: "感恩节", en: "Thanksgiving Day" } },
  { date: "2026-12-25", region: "unitedStates", name: { zh: "圣诞节", en: "Christmas Day" } },
  { date: "2027-01-01", region: "unitedStates", name: { zh: "新年", en: "New Year's Day" } },
  { date: "2027-01-18", region: "unitedStates", name: { zh: "马丁·路德·金纪念日", en: "Martin Luther King Jr. Day" } },
  { date: "2027-02-15", region: "unitedStates", name: { zh: "华盛顿诞辰日", en: "Washington's Birthday" } },
  { date: "2027-05-31", region: "unitedStates", name: { zh: "阵亡将士纪念日", en: "Memorial Day" } },
  { date: "2027-06-18", region: "unitedStates", name: { zh: "六月节（补休日）", en: "Juneteenth (observed)" } },
  { date: "2027-07-05", region: "unitedStates", name: { zh: "独立日（补休日）", en: "Independence Day (observed)" } },
  { date: "2027-09-06", region: "unitedStates", name: { zh: "劳动节", en: "Labor Day" } },
  { date: "2027-10-11", region: "unitedStates", name: { zh: "哥伦布日", en: "Columbus Day" } },
  { date: "2027-11-11", region: "unitedStates", name: { zh: "退伍军人节", en: "Veterans Day" } },
  { date: "2027-11-25", region: "unitedStates", name: { zh: "感恩节", en: "Thanksgiving Day" } },
  { date: "2027-12-24", region: "unitedStates", name: { zh: "圣诞节（补休日）", en: "Christmas Day (observed)" } },
];

export function calendarHolidaysForDate(
  date: string,
  preferences: CalendarHolidayPreferences,
): readonly CalendarHoliday[] {
  if (!preferences.enabled) return [];
  return calendarHolidays.filter((holiday) =>
    holiday.date === date &&
    (holiday.region === "china" ? preferences.china : preferences.unitedStates),
  );
}

export function calendarHolidayLabel(
  holiday: CalendarHoliday,
  language: "zh" | "en",
): string {
  return holiday.name[language];
}
