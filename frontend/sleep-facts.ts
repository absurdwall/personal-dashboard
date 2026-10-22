import {interfaceCopy, type InterfaceLanguage} from './interface-language.js';

export type SleepHabitKey='wake'|'sleep';
export function isSleepHabitKey(value:unknown):value is SleepHabitKey{return value==='wake'||value==='sleep';}

export type SleepPoint = Readonly<{date:string;time:string;utcOffsetMinutes:number;approximate?:boolean}>;
export type SleepEndpoint =
  | (SleepPoint & Readonly<{kind:'point'}>)
  | Readonly<{kind:'range';start:SleepPoint;end:SleepPoint;reportedText:string}>
  | Readonly<{kind:'text';date?:string|null;text:string}>
  | Readonly<{kind:'unknown'}>
  | Readonly<{kind:'unrecorded'}>;
export type SleepEndpointFact = Readonly<{recordId:string;habitKey:SleepHabitKey;livedDate:string|null;dayRelation:'same-day'|'next-day'|'unresolved';endpoint:SleepEndpoint}>;
export type SleepRecord = Readonly<{id:string;wakeDate:string;sleepOnset:SleepEndpoint;getUp:SleepEndpoint;estimatedDurationMinutes:number|null}>;
export type SleepDurationSample=Readonly<{date:string;minutes:number;approximate:boolean;onset:SleepPoint;getUp:SleepPoint}>;
export type SleepOverviewStatistics=Readonly<{metric:'wake'|'sleep'|'duration';period:7|30;count:number;mean:number|null;earliest:number|null;latest:number|null;approximate:boolean;earliestApproximate:boolean;latestApproximate:boolean}>;
export type SleepOverview=Readonly<{date:string;durations:readonly SleepDurationSample[];statistics:readonly SleepOverviewStatistics[]}>;
export type SleepView = Readonly<{targetBinding:string;revision:string|null;records:readonly SleepRecord[];facts:readonly SleepEndpointFact[];overview?:SleepOverview|null}>;

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
