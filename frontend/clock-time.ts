/** Clock text only; callers choose rounding and signed legacy axis wrapping. */
export function formatClockMinutes(minutes:number,wrap:'positive'|'signed'='positive'):string {
  const value=wrap==='positive'?(minutes%1440+1440)%1440:minutes%1440;
  return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
}
