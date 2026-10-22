import {interfaceCopy, type InterfaceLanguage} from './interface-language.js';

export type SleepPoint = Readonly<{date:string;time:string;utcOffsetMinutes:number;approximate?:boolean}>;
export type SleepEndpoint =
  | (SleepPoint & Readonly<{kind:'point'}>)
  | Readonly<{kind:'range';start:SleepPoint;end:SleepPoint;reportedText:string}>
  | Readonly<{kind:'text';date:string;text:string}>
  | Readonly<{kind:'unknown'}>
  | Readonly<{kind:'unrecorded'}>;
export type SleepEndpointFact = Readonly<{recordId:string;habitKey:string;livedDate:string|null;dayRelation:'same-day'|'next-day'|'unresolved';endpoint:SleepEndpoint}>;
export type SleepRecord = Readonly<{id:string;wakeDate:string;sleepOnset:SleepEndpoint;getUp:SleepEndpoint;estimatedDurationMinutes:number|null}>;
export type SleepView = Readonly<{targetBinding:string;revision:string|null;records:readonly SleepRecord[];facts:readonly SleepEndpointFact[]}>;

export function formatSleepEndpoint(fact:SleepEndpointFact|null|undefined, language:InterfaceLanguage):string {
  const t=(key:Parameters<typeof interfaceCopy>[0],values:Record<string,string>={})=>interfaceCopy(key,language,values);
  const endpoint=fact?.endpoint;
  if(!endpoint||endpoint.kind==='unrecorded')return t('sleep.unrecorded');
  if(endpoint.kind==='unknown')return t('sleep.explicitUnknown');
  if(endpoint.kind==='text')return t('sleep.originalValue',{text:endpoint.text});
  const point=(value:SleepPoint):string=>{
    const clock=value.approximate?t('sleep.aboutTime',{time:value.time}):value.time;
    if(!fact?.livedDate)return `${value.date} ${clock}`;
    return value.date===fact.livedDate?clock:t('sleep.nextDayTime',{time:clock});
  };
  if(endpoint.kind==='point')return point(endpoint);
  return t('sleep.rangeValue',{start:point(endpoint.start),end:point(endpoint.end),text:endpoint.reportedText});
}

/** Fixed lived-day context resolves the actual calendar date without changing the event. */
export function sleepPointForLivedDay(livedDate:string,time:string,approximate:boolean):SleepPoint {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(livedDate)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('需要 HH:MM 单点时间及实际日期。');
  const [year,month,day]=livedDate.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const calendar=new Date(year,month-1,day,12);
  if(time<'04:00')calendar.setDate(calendar.getDate()+1);
  const date=[calendar.getFullYear(),String(calendar.getMonth()+1).padStart(2,'0'),String(calendar.getDate()).padStart(2,'0')].join('-');
  const instant=new Date(calendar.getFullYear(),calendar.getMonth(),calendar.getDate(),hour,minute);
  if(instant.getHours()!==hour||instant.getMinutes()!==minute)throw new Error('请检查实际日期与时间；夏令时切换中不存在的时间不能保存。');
  for(const delta of [-120,-60,60,120]){
    const alternate=new Date(instant.getTime()+delta*60_000);
    if(alternate.getFullYear()===instant.getFullYear()&&alternate.getMonth()===instant.getMonth()&&alternate.getDate()===instant.getDate()&&alternate.getHours()===hour&&alternate.getMinutes()===minute)throw new Error('本地时刻重复出现；请保留原话或在 Collaboration 中明确实际发生的那一次。');
  }
  return {date,time,utcOffsetMinutes:-instant.getTimezoneOffset(),approximate};
}
