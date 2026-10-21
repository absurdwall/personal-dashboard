/** Shared display of reported elapsed minutes and rounded statistical means. */
export function formatSleepDuration(minutes: number | null, copy: (zh: string, en: string) => string): string {
  if (minutes === null) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60), rest = rounded % 60;
  return copy(`${hours} 小时 ${rest} 分`, `${hours}h ${rest}m`);
}
