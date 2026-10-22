import {interfaceCopy, setInterfaceCopy, type InterfaceLanguage,type InterfaceCopyValue} from './interface-language.js';

export type SleepHabitKey='wake'|'sleep';
export function isSleepHabitKey(value:unknown):value is SleepHabitKey{return value==='wake'||value==='sleep';}

export type SleepPoint = Readonly<{date:string;time:string;utcOffsetMinutes:number;approximate?:boolean}>;
export type SleepEndpoint =
  | (SleepPoint & Readonly<{kind:'point'}>)
  | Readonly<{kind:'range';start:SleepPoint;end:SleepPoint;reportedText:string}>
  | Readonly<{kind:'text';date?:string|null;text:string}>
  | Readonly<{kind:'unknown'}>
  | Readonly<{kind:'unrecorded'}>;
export type SleepEndpointFact = Readonly<{recordId:string;habitKey:SleepHabitKey;livedDate:string|null;dayRelation:'same-day'|'next-day'|'unresolved';clockPlotMinutes:number|null;endpoint:SleepEndpoint}>;
export type SleepRecord = Readonly<{id:string;wakeDate:string;sleepOnset:SleepEndpoint;getUp:SleepEndpoint;estimatedDurationMinutes:number|null}>;
export type SleepDurationSample=Readonly<{date:string;minutes:number;approximate:boolean;onset:SleepPoint;getUp:SleepPoint}>;
export type SleepOverviewStatistics=Readonly<{metric:'wake'|'sleep'|'duration';period:7|30;count:number;mean:number|null;earliest:number|null;latest:number|null;approximate:boolean;earliestApproximate:boolean;latestApproximate:boolean}>;
export type SleepOverview=Readonly<{date:string;durations:readonly SleepDurationSample[];statistics:readonly SleepOverviewStatistics[]}>;
export type SleepView = Readonly<{targetBinding:string;revision:string|null;records:readonly SleepRecord[];facts:readonly SleepEndpointFact[];overview?:SleepOverview|null}>;

/** Keep every canonical match; multiple records remain an explicit conflict. */
export function sleepFactsForLivedDate(facts:readonly SleepEndpointFact[]|undefined,key:SleepHabitKey,date:string|undefined):readonly SleepEndpointFact[]{
  return facts?.filter(fact=>fact.habitKey===key&&fact.livedDate===date)??[];
}

/** Endpoint grammar retains semantic catalog values until the active language is known. */
export function sleepEndpointCopy(fact:SleepEndpointFact|null|undefined):InterfaceCopyValue {
  const endpoint=fact?.endpoint;
  if(!endpoint||endpoint.kind==='unrecorded')return {copy:'sleep.unrecorded'};
  if(endpoint.kind==='unknown')return {copy:'sleep.explicitUnknown'};
  if(endpoint.kind==='text')return {copy:'sleep.originalValue',variables:{text:endpoint.text}};
  const point=(value:SleepPoint):InterfaceCopyValue=>{
    if(!fact?.livedDate)return value.approximate?{copy:'sleep.datedAboutTime',variables:{date:value.date,time:value.time}}:`${value.date} ${value.time}`;
    const clock:InterfaceCopyValue=value.approximate?{copy:'sleep.aboutTime',variables:{time:value.time}}:value.time;
    return value.date===fact.livedDate?clock:{copy:'sleep.nextDayTime',variables:{time:clock}};
  };
  return endpoint.kind==='point'?point(endpoint):{copy:'sleep.rangeValue',variables:{start:point(endpoint.start),end:point(endpoint.end),text:endpoint.reportedText}};
}
export function formatSleepCopy(value:InterfaceCopyValue,language:InterfaceLanguage):string {
  return typeof value==='object'?interfaceCopy(value.copy,language,value.variables):String(value);
}
export function formatSleepEndpoint(fact:SleepEndpointFact|null|undefined,language:InterfaceLanguage):string {return formatSleepCopy(sleepEndpointCopy(fact),language);}
/** Raw clock/date/source values stay raw; every fixed grammar branch uses the catalog setter. */
export function setSleepCopy(target:HTMLElement|SVGElement,value:InterfaceCopyValue,language:InterfaceLanguage):void {
  if(typeof value==='object')setInterfaceCopy(target,value.copy,language,value.variables);
  else {delete target.dataset.i18n;delete target.dataset.i18nVariables;delete target.dataset.i18nError;delete target.dataset.applicationMessage;target.textContent=String(value);}
}
export function setSleepEndpointCopy(target:HTMLElement|SVGElement,fact:SleepEndpointFact|null|undefined,language:InterfaceLanguage):void {setSleepCopy(target,sleepEndpointCopy(fact),language);}

/** Feature-owned Today fact copy; the composition root supplies names and routes actions. */
export class SleepFactPresentation {
  private readonly language:()=>InterfaceLanguage;
  private readonly habitName:(key:SleepHabitKey)=>string|undefined;
  constructor(language:()=>InterfaceLanguage,habitName:(key:SleepHabitKey)=>string|undefined){this.language=language;this.habitName=habitName;}
  private nameCopy(fact:SleepEndpointFact):InterfaceCopyValue{return this.habitName(fact.habitKey)??{copy:fact.habitKey==='sleep'?'sleep.fact.onset':'sleep.fact.getUp'};}
  name(fact:SleepEndpointFact):string{return formatSleepCopy(this.nameCopy(fact),this.language());}
  appendName(target:HTMLElement,fact:SleepEndpointFact):void{setSleepCopy(target,this.nameCopy(fact),this.language());}
  value(fact:SleepEndpointFact):string{return formatSleepEndpoint(fact,this.language());}
  appendCopy(target:HTMLElement,fact:SleepEndpointFact):void{
    target.dataset.sleepFactCopy='';
    setInterfaceCopy(target,'sleep.fact.value',this.language(),{habit:this.nameCopy(fact),value:sleepEndpointCopy(fact)});
  }
  appendTime(target:HTMLElement,fact:SleepEndpointFact):void{target.dataset.sleepFactTime='';setSleepEndpointCopy(target,fact,this.language());}
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
    else {const context=document.createElement('span');setInterfaceCopy(context,'sleep.fact.livedDateUnknown',this.language());target.append(context);}
  }
  correctionButton(fact:SleepEndpointFact,canCorrect:boolean):HTMLButtonElement{
    const button=document.createElement('button');button.type='button';button.className='secondary-button';
    if(canCorrect&&fact.livedDate)setInterfaceCopy(button,'sleep.correctTimeLabel',this.language(),{habit:this.nameCopy(fact),date:fact.livedDate});
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
      container.querySelectorAll<HTMLElement>('[data-sleep-fact-title]').forEach(target=>{this.appendName(target,fact);});
      const link=container.querySelector<HTMLElement>('.today-axis-marker-link');if(link)link.dataset.axisItemText=habit;
      if(fact.livedDate)container.querySelectorAll<HTMLElement>('[data-i18n="sleep.correctTimeLabel"]').forEach(button=>setInterfaceCopy(button,'sleep.correctTimeLabel',this.language(),{habit:this.nameCopy(fact),date:fact.livedDate!}));
    });
  }
}
