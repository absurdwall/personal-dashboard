import {interfaceCopy, setInterfaceCopy, type InterfaceLanguage} from './interface-language.js';

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


/** Feature-owned Today fact copy; the composition root supplies names and routes actions. */
export class SleepFactPresentation {
  private readonly language:()=>InterfaceLanguage;
  private readonly habitName:(key:SleepHabitKey)=>string|undefined;
  constructor(language:()=>InterfaceLanguage,habitName:(key:SleepHabitKey)=>string|undefined){this.language=language;this.habitName=habitName;}
  name(fact:SleepEndpointFact):string{return this.habitName(fact.habitKey)??interfaceCopy(fact.habitKey==='sleep'?'sleep.fact.onset':'sleep.fact.getUp',this.language());}
  value(fact:SleepEndpointFact):string{return formatSleepEndpoint(fact,this.language());}
  appendCopy(target:HTMLElement,fact:SleepEndpointFact):void{
    target.dataset.sleepFactCopy='';
    setInterfaceCopy(target,'sleep.fact.value',this.language(),{habit:this.name(fact),value:this.value(fact)});
  }
  appendTime(target:HTMLElement,fact:SleepEndpointFact):void{target.dataset.sleepFactTime='';target.textContent=this.value(fact);}
  appendProvenance(target:HTMLElement,fact:SleepEndpointFact):void{
    const label=document.createElement('span');setInterfaceCopy(label,'sleep.fact.canonicalRecord',this.language(),{id:fact.recordId});target.append(label);
    const point=(value:SleepPoint):string=>{
      const offset=value.utcOffsetMinutes,hours=String(Math.floor(Math.abs(offset)/60)).padStart(2,'0'),minutes=String(Math.abs(offset)%60).padStart(2,'0');
      return `${value.date} ${value.time} · UTC${offset<0?'−':'+'}${hours}:${minutes}`;
    };
    const endpoint=fact.endpoint;
    const actual=endpoint.kind==='point'?point(endpoint):endpoint.kind==='range'?`${point(endpoint.start)} – ${point(endpoint.end)}`:endpoint.kind==='text'?endpoint.date:null;
    if(actual){const date=document.createElement('span');setInterfaceCopy(date,'sleep.fact.actualDate',this.language(),{value:actual});target.append(date);}
    else if(endpoint.kind==='text'){const date=document.createElement('span');setInterfaceCopy(date,'sleep.fact.actualDateUnknown',this.language());target.append(date);}
    if(fact.livedDate){const context=document.createElement('span');setInterfaceCopy(context,'sleep.fixedContext',this.language(),{date:fact.livedDate});target.append(context);}
  }
  correctionButton(fact:SleepEndpointFact,canCorrect:boolean):HTMLButtonElement{
    const button=document.createElement('button');button.type='button';button.className='secondary-button';
    if(canCorrect&&fact.livedDate)setInterfaceCopy(button,'sleep.correctTimeLabel',this.language(),{habit:this.name(fact),date:fact.livedDate});
    else setInterfaceCopy(button,'sleep.openCollaboration',this.language());
    return button;
  }
  /** Refresh derived labels in place, retaining marker, popup and control nodes. */
  refresh(root:ParentNode,facts:readonly SleepEndpointFact[]):void{
    root.querySelectorAll<HTMLElement>('[data-sleep-record-id][data-sleep-habit-key]').forEach(container=>{
      const fact=facts.find(fact=>fact.recordId===container.dataset.sleepRecordId&&fact.habitKey===container.dataset.sleepHabitKey);if(!fact)return;
      const habit=this.name(fact);
      container.querySelectorAll<HTMLElement>('[data-sleep-fact-copy]').forEach(target=>this.appendCopy(target,fact));
      container.querySelectorAll<HTMLElement>('[data-sleep-fact-time]').forEach(target=>this.appendTime(target,fact));
      container.querySelectorAll<HTMLElement>('[data-sleep-fact-title]').forEach(target=>{target.textContent=habit;});
      const link=container.querySelector<HTMLElement>('.today-axis-marker-link');if(link)link.dataset.axisItemText=habit;
      if(fact.livedDate)container.querySelectorAll<HTMLElement>('[data-i18n="sleep.correctTimeLabel"]').forEach(button=>setInterfaceCopy(button,'sleep.correctTimeLabel',this.language(),{habit,date:fact.livedDate!}));
    });
  }
}
