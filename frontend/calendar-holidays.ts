/** Verified festival dates and US federal holiday/observed dates. This bounded
 * catalogue never infers vacation ranges, adjusted workdays, or Task state.
 * Official sources were checked on 2026-10-13; no runtime service is used.
 */
export type CalendarHolidayPreferences = Readonly<{ enabled: boolean; china: boolean; unitedStates: boolean }>;
export const defaultCalendarHolidays: CalendarHolidayPreferences = { enabled: true, china: true, unitedStates: true };
export type CalendarHoliday = Readonly<{
  date: string; region: 'china' | 'unitedStates'; name: Readonly<{zh: string; en: string}>;
  observed: boolean; sources: readonly string[];
}>;
export const calendarHolidaySources = {
  china: 'https://app.www.gov.cn/govdata/gov/202411/12/521605/article.html',
  calendar2026: 'https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2026e.pdf',
  calendar2027: 'https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf',
  unitedStates: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/',
} as const;

const chinaDates: Record<number, readonly (readonly [string,string,string])[]> = {
  2026: [['01-01','元旦','New Year'],['02-16','除夕','Lunar New Year Eve'],['02-17','春节','Lunar New Year'],['04-05','清明节','Qingming Festival'],['05-01','劳动节','Labour Day'],['06-19','端午节','Dragon Boat Festival'],['09-25','中秋节','Mid-Autumn Festival'],['10-01','国庆节','National Day']],
  2027: [['01-01','元旦','New Year'],['02-05','除夕','Lunar New Year Eve'],['02-06','春节','Lunar New Year'],['04-05','清明节','Qingming Festival'],['05-01','劳动节','Labour Day'],['06-09','端午节','Dragon Boat Festival'],['09-15','中秋节','Mid-Autumn Festival'],['10-01','国庆节','National Day']],
};
const usNames = [
  ['元旦','New Year’s Day'],['马丁·路德·金纪念日','Birthday of Martin Luther King, Jr.'],['华盛顿诞辰','Washington’s Birthday'],['阵亡将士纪念日','Memorial Day'],['六月节','Juneteenth National Independence Day'],['独立日','Independence Day'],['劳动节','Labor Day'],['哥伦布日','Columbus Day'],['退伍军人节','Veterans Day'],['感恩节','Thanksgiving Day'],['圣诞节','Christmas Day'],
] as const;
// The first list is the calendar date; the second adds explicitly named OPM
// observed dates when they differ. Both are date annotations, never leave rules.
const usDates: Record<number, readonly string[]> = {
  2026: ['01-01','01-19','02-16','05-25','06-19','07-04','09-07','10-12','11-11','11-26','12-25'],
  2027: ['01-01','01-18','02-15','05-31','06-19','07-04','09-06','10-11','11-11','11-25','12-25'],
};
const usObserved: Record<number, readonly (readonly [string,number])[]> = {2026:[['07-03',5]],2027:[['06-18',4],['07-05',5],['12-24',10]]};
const catalogue: readonly CalendarHoliday[] = [...[2026,2027].flatMap(year=>[
  ...chinaDates[year].map(([date,zh,en])=>({date:`${year}-${date}`,region:'china' as const,name:{zh,en},observed:false,sources:[calendarHolidaySources.china,year===2026?calendarHolidaySources.calendar2026:calendarHolidaySources.calendar2027]})),
  ...usDates[year].map((date,index)=>({date:`${year}-${date}`,region:'unitedStates' as const,name:{zh:usNames[index][0],en:usNames[index][1]},observed:false,sources:[calendarHolidaySources.unitedStates]})),
  ...usObserved[year].map(([date,index])=>({date:`${year}-${date}`,region:'unitedStates' as const,name:{zh:`${usNames[index][0]}（补休）`,en:`${usNames[index][1]} (observed)`},observed:true,sources:[calendarHolidaySources.unitedStates]})),
]),
  // OPM's 2028 schedule observes Jan 1 on Fri Dec 31, 2027: this annotation
  // belongs inside Gregorian 2027 coverage without claiming a 2028 catalogue.
  {date:'2027-12-31',region:'unitedStates',name:{zh:'2028 元旦（补休）',en:'New Year 2028 (observed)'},observed:true,sources:[calendarHolidaySources.unitedStates]},
];
export function isHolidayYearCovered(year: number): boolean { return year===2026 || year===2027; }
export function calendarHolidaysForDate(date: string, preferences: CalendarHolidayPreferences=defaultCalendarHolidays): readonly CalendarHoliday[] {
  if (!preferences.enabled || !isHolidayYearCovered(Number(date.slice(0,4)))) return [];
  return catalogue.filter(holiday=>holiday.date===date && preferences[holiday.region]);
}
