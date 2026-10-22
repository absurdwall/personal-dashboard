/** Shift a calendar date without applying the machine's local time zone or DST. */
export function shiftDateOnly(date:string,days:number,invalidDate:'preserve'|'throw'='preserve'):string {
  const value=new Date(`${date}T12:00:00Z`);
  if(invalidDate==='preserve'&&Number.isNaN(value.getTime()))return date;
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
