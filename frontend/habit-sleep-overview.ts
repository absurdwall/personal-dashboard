import {createHabitTimeEntryButton} from './habit-time-entry.js';
import {type HabitLocalCompletionState} from './habit-completion.js';
import {shiftDateOnly} from './date-only.js';
import {formatClockMinutes} from './clock-time.js';
import {habitActualTimeCopy, setInterfaceCopy, setInterfaceAttribute, setInterfaceError, setHabitDetailCopy, type HabitDetail, type InterfaceCopyKey, type InterfaceLanguage,type InterfaceCopyVariables,type InterfaceCopyValue} from './interface-language.js';
import {sleepFactsForLivedDate,sleepEndpointCopy,sleepElapsedCopy,setSleepCopy,setSleepEndpointCopy, type SleepEndpointFact, type SleepView, type SleepHabitKey} from './sleep-facts.js';

type HabitKey=SleepHabitKey;
type Metric=HabitKey|'duration';
type Sample=Readonly<{date:string;value:number|null;approximate:boolean;label:InterfaceCopyValue}>;
type HabitContext=Readonly<{key:HabitKey;name:string;date:string}>;
type SleepHabitRowContext=HabitContext&Readonly<{
  statusCopy:InterfaceCopyKey;actualTimeLabel:string|null;details:readonly HabitDetail[];
}>;
type SleepHabitSelection=HabitContext&Readonly<{
  todayDate:string;
  cell:Readonly<{statusCopy:InterfaceCopyKey;coverage:string;details:readonly HabitDetail[]}>|null;
  localChanges:readonly Readonly<{state:HabitLocalCompletionState;changedAt:string}>[];
  error?:string;
}>;
const svgNamespace='http://www.w3.org/2000/svg';
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);node.className=className;node.textContent=text;return node;
}
function svg(tag:string,attributes:Record<string,string|number>):SVGElement{
  const node=document.createElementNS(svgNamespace,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;
}
function clock(minutes:number):string{return formatClockMinutes(Math.round(minutes));}
type MetricPresentation=Readonly<{
  name:InterfaceCopyKey;domain:readonly [number,number];earliest:InterfaceCopyKey;latest:InterfaceCopyKey;
  dateHabit:HabitKey;caption:InterfaceCopyKey;
  value:(minutes:number,approximate:boolean)=>InterfaceCopyValue;
  axis:(minutes:number,language:InterfaceLanguage)=>InterfaceCopyValue;
}>;
const clockPresentation={
  earliest:'sleep.overview.earliest',latest:'sleep.overview.latest',caption:'sleep.overview.pointNote',
  value:(minutes:number,approximate:boolean):InterfaceCopyValue=>approximate?{copy:'sleep.aboutTime',variables:{time:clock(minutes)}}:clock(minutes),
  axis:(minutes:number):InterfaceCopyValue=>clock(minutes),
} as const;
const metrics:Record<Metric,MetricPresentation>={
  wake:{...clockPresentation,name:'sleep.overview.wake',domain:[360,600],dateHabit:'wake'},
  sleep:{...clockPresentation,name:'sleep.overview.onset',domain:[-60,180],dateHabit:'sleep'},
  duration:{name:'sleep.overview.duration',domain:[180,660],earliest:'sleep.overview.shortest',latest:'sleep.overview.longest',dateHabit:'wake',caption:'sleep.overview.durationNote',
    value:(minutes,approximate)=>sleepElapsedCopy(minutes,approximate,'statistic'),
    axis:(minutes,language)=>({copy:'sleep.overview.axisHours',variables:{hours:new Intl.NumberFormat(language,{maximumFractionDigits:1}).format(minutes/60)}}),
  },
};
/** Render only adjacent exact samples; nulls end a segment instead of bridging gaps. */
function appendGapSeries(drawing:SVGElement,samples:readonly {value:number|null}[],x:(index:number)=>number,y:(value:number)=>number,strokeWidth:number):void{
  let segment:string[]=[];
  const flush=()=>{if(segment.length>1)drawing.append(svg('polyline',{points:segment.join(' '),fill:'none',stroke:'var(--parity-accent)','stroke-width':strokeWidth,'vector-effect':'non-scaling-stroke'}));segment=[];};
  for(const [index,sample]of samples.entries()){
    if(sample.value===null)flush();else segment.push(`${x(index)},${y(sample.value)}`);
  }
  flush();
}

type PlotSample=Readonly<{value:number|null;approximate:boolean}>;
const plotFrames={
  mini:{width:210,height:44,left:0,top:3,bottom:3,lineWidth:1.6,pointRadius:2.3},
  detail:{width:600,height:190,left:40,top:17,bottom:28,lineWidth:2,pointRadius:3},
} as const;
/** The two Habit plots share clock domains, gaps and approximate-point semantics. */
function createSleepPlot(metric:Metric,samples:readonly PlotSample[],size:keyof typeof plotFrames){
  const frame=plotFrames[size],{width,height,left,top,bottom}=frame;
  const plotted=samples;
  const values=plotted.flatMap(sample=>sample.value===null?[]:[sample.value]);
  const base=metrics[metric].domain;
  const low=Math.floor(Math.min(base[0],...values)/60)*60,high=Math.ceil(Math.max(base[1],...values)/60)*60;
  const x=(index:number)=>left+(index+.5)*(width-left)/samples.length;
  const y=(value:number)=>top+(high-value)/(high-low)*(height-top-bottom);
  const ticks=[high,(high+low)/2,low].map(value=>({value,y:y(value)}));
  const drawing=svg('svg',{viewBox:`0 0 ${width} ${height}`,preserveAspectRatio:'none','aria-hidden':'true'});
  for(const tick of ticks)drawing.append(svg('line',{x1:left,x2:width,y1:tick.y,y2:tick.y,stroke:'var(--parity-border)','stroke-width':.7}));
  appendGapSeries(drawing,plotted,x,y,frame.lineWidth);
  for(const [index,sample]of plotted.entries())if(sample.value!==null)drawing.append(svg('circle',{
    cx:x(index),cy:y(sample.value),r:frame.pointRadius,
    fill:sample.approximate?'var(--parity-surface)':'var(--parity-accent)',stroke:'var(--parity-accent)','stroke-width':1.3,
  }));
  return {drawing,frame,x,ticks,hasPoints:values.length>0};
}

/** Read-only presentation of the same canonical endpoint view used by the editor. */
export class HabitSleepOverview {
  private view:SleepView|null=null;
  private error:string|null=null;
  private metric:Metric='wake';
  private period:7|30=7;
  private selected:{metric:Metric;date:string}|null=null;
  constructor(private readonly language:()=>InterfaceLanguage,private readonly reveal:()=>void=()=>{}){}
  clear():void{this.view=null;this.error=null;this.selected=null;this.metric='wake';this.period=7;}
  open(key:HabitKey):void{this.metric=key;this.period=7;this.selected=null;}
  accept(view:SleepView):void{this.view=view;this.error=null;}
  unavailable(error:string):void{this.view=null;this.error=error;}
  private copyElement<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,key:InterfaceCopyKey,values:InterfaceCopyVariables={}):HTMLElementTagNameMap[K]{
    const node=element(tag,className);setInterfaceCopy(node,key,this.language(),values);return node;
  }
  private copyAttribute(node:HTMLElement,attribute:'aria-label'|'title'|'placeholder',key:InterfaceCopyKey,values:InterfaceCopyVariables={}):void{
    setInterfaceAttribute(node,attribute,key,this.language(),values);
  }
  private errorElement():HTMLElement{const node=element('p','habit-sleep-read-error');setInterfaceError(node,'sleep.loadFailed',this.error!,this.language());return node;}
  private facts(key:HabitKey,date:string):readonly SleepEndpointFact[]{return sleepFactsForLivedDate(this.view?.facts,key,date);}
  private valueCopy(key:HabitKey,date:string,fallback?:InterfaceCopyValue):InterfaceCopyValue {
    if(this.error)return {copy:'sleep.unavailableValue'};
    const matches=this.facts(key,date);
    if(matches.length>1)return {copy:'sleep.conflictValue'};
    if(!matches.length&&fallback)return fallback;
    return sleepEndpointCopy(matches[0]);
  }
  setValue(target:HTMLElement,key:HabitKey,date:string,fallback?:InterfaceCopyValue):void{setSleepCopy(target,this.valueCopy(key,date,fallback),this.language());}
  private sample(metric:Metric,date:string):Sample{
    if(metric!=='duration'){
      const matches=this.facts(metric,date),endpoint=matches.length===1?matches[0].endpoint:null;
      return {date,value:endpoint?.kind==='point'?matches[0].clockPlotMinutes??null:null,approximate:endpoint?.kind==='point'&&Boolean(endpoint.approximate),label:this.valueCopy(metric,date)};
    }
    const sample=this.view?.overview?.durations.find(sample=>sample.date===date);
    const value=sample?.minutes??null,approximate=sample?.approximate??false;
    return {date,value,approximate,label:value===null?{copy:'sleep.overview.noPair'}:sleepElapsedCopy(value,approximate,'sample')};
  }

  private metricName(metric:Metric):InterfaceCopyValue{return {copy:metrics[metric].name};}
  private statistics(samples:readonly Sample[],date:string):HTMLElement{
    const root=element('div','habit-detail-stats habit-sleep-statistics');
    const overview=this.view?.overview;
    const stats=overview?.date===date?overview.statistics.find(stats=>stats.metric===this.metric&&stats.period===this.period):undefined;
    const fields:[string,InterfaceCopyKey,number|null|undefined,boolean][]=[
      ['count','sleep.overview.count',stats?.count,false],
      ['mean','sleep.overview.mean',stats?.mean,stats?.approximate??false],
      ['earliest',metrics[this.metric].earliest,stats?.earliest,stats?.earliestApproximate??false],
      ['latest',metrics[this.metric].latest,stats?.latest,stats?.latestApproximate??false],
    ];
    for(const [name,key,value,approximate]of fields){
      const item=element('div','habit-detail-stat');item.dataset.sleepStat=name;
      const output=element('strong');
      if(name==='count')output.textContent=`${this.error||!stats?'—':value??0} / ${samples.length}`;
      else if(value==null)output.textContent='—';
      else setSleepCopy(output,metrics[this.metric].value(value,approximate),this.language());
      item.append(this.copyElement('span','',key),output);root.append(item);
    }
    if(stats?.count&&stats.mean===null)root.append(this.copyElement('p','habit-sleep-mean-note','sleep.overview.noMean'));
    return root;
  }
  private detailChart(context:HabitContext,samples:readonly Sample[]):HTMLElement{
    const root=element('div','habit-sleep-detail-chart');root.dataset.sleepChart='detail';
    const {drawing,frame,x,ticks,hasPoints}=createSleepPlot(this.metric,samples,'detail');
    for(const tick of ticks){
      const text=svg('text',{x:frame.left-8,y:tick.y+3,'text-anchor':'end',fill:'var(--parity-muted)','font-size':10});
      setSleepCopy(text,metrics[this.metric].axis(tick.value,this.language()),this.language());
      drawing.append(text);
    }
    for(const [index,sample]of samples.entries())if(samples.length===7||index%5===0||index===samples.length-1){
      const label=svg('text',{x:x(index),y:frame.height-7,'text-anchor':'middle',fill:'var(--parity-muted)','font-size':10});label.textContent=sample.date.slice(5).replace('-','/');drawing.append(label);
    }
    root.append(drawing);
    const targets=element('div','habit-sleep-date-targets');targets.style.setProperty('--sleep-date-count',String(samples.length));
    const tooltip=this.copyElement('p','habit-sleep-detail-readout','sleep.overview.inspect');tooltip.setAttribute('role','status');
    for(const sample of samples){const button=element('button');button.type='button';button.dataset.habitDate=sample.date;
      button.dataset.habitDetailDate=sample.date;button.dataset.habitDetailDateKey=metrics[this.metric].dateHabit;
      const values={date:sample.date,metric:this.metricName(this.metric),value:sample.label};this.copyAttribute(button,'title','sleep.overview.dateReadout',values);this.copyAttribute(button,'aria-label','sleep.overview.dateReadout',values);
      const show=()=>setInterfaceCopy(tooltip,'sleep.overview.dateReadout',this.language(),values);button.addEventListener('focus',show);button.addEventListener('mouseenter',show);
      button.addEventListener('click',()=>this.selected={metric:this.metric,date:sample.date});targets.append(button);}
    root.append(targets);
    if(!hasPoints)root.append(this.copyElement('span','habit-sleep-detail-empty',this.error?'sleep.unavailableValue':'sleep.overview.empty'));
    const group=element('div');group.append(root,tooltip);return group;
  }
  detail(context:HabitContext):HTMLElement{
    const root=element('section','habit-sleep-overview');this.copyAttribute(root,'aria-label','sleep.overview.label');root.dataset.sleepOverview='';root.dataset.sleepMetric=this.metric;
    const tabs=element('div','habit-sleep-metric-tabs');tabs.setAttribute('role','tablist');this.copyAttribute(tabs,'aria-label','sleep.overview.metrics');
    const replace=(selector:string)=>{const next=this.detail(context);root.replaceWith(next);next.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});this.reveal();};
    for(const metric of ['wake','sleep','duration'] as const){const button=this.copyElement('button','secondary-button',metrics[metric].name);button.type='button';button.dataset.sleepMetric=metric;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(this.metric===metric));button.addEventListener('click',()=>{this.metric=metric;replace(`[data-sleep-metric="${metric}"]`)});tabs.append(button);}
    const ranges=element('div','habit-sleep-period-tabs');this.copyAttribute(ranges,'aria-label','sleep.overview.period');
    for(const period of [7,30] as const){const button=this.copyElement('button','secondary-button','sleep.overview.days',{count:period});button.type='button';button.dataset.sleepPeriod=String(period);button.setAttribute('aria-pressed',String(this.period===period));button.addEventListener('click',()=>{this.period=period;replace(`[data-sleep-period="${period}"]`)});ranges.append(button);}
    const samples=Array.from({length:this.period},(_,i)=>this.sample(this.metric,shiftDateOnly(context.date,i-this.period+1)));
    root.append(tabs,ranges,this.statistics(samples,context.date),this.detailChart(context,samples),this.copyElement('p','habit-sleep-caption',metrics[this.metric].caption));
    if(this.error)root.append(this.errorElement());
    const history=element('details','habit-sleep-history');history.append(this.copyElement('summary','','sleep.overview.earlier'));
    const form=element('form');const label=element('label');label.append(this.copyElement('span','','sleep.overview.historyDate'));const date=element('input');date.type='date';date.required=true;date.max=context.date;date.value=context.date;date.dataset.sleepHistoryDate='';this.copyAttribute(date,'aria-label','sleep.overview.historyDate');label.append(date);
    const open=this.copyElement('button','secondary-button','sleep.overview.historyOpen');open.type='submit';form.append(label,open);
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const button=element('button');button.type='button';button.dataset.habitDetailDate=date.value;button.dataset.habitDetailDateKey=metrics[this.metric].dateHabit;root.append(button);this.selected={metric:this.metric,date:date.value};button.click();button.remove();});history.append(form);root.append(history);return root;
  }
  composeRow(article:HTMLElement,context:SleepHabitRowContext,parts:Readonly<{identity:HTMLElement;completion:HTMLElement;expand:HTMLElement;history:HTMLElement;detail:HTMLElement}>):void{
    const value=document.createElement('div');value.className='habit-snapshot-value';
    const progress=document.createElement('strong'),todayState=document.createElement('small');
    this.setValue(progress,context.key,context.date,context.actualTimeLabel?habitActualTimeCopy(context.actualTimeLabel,context.details):undefined);
    progress.classList.toggle('habit-sleep-described-value',!/^\d{2}:\d{2}$/.test(progress.textContent));
    setInterfaceCopy(todayState,'habits.todayStatus',this.language(),{status:{copy:context.statusCopy}});
    value.append(progress,todayState);
    const recent=document.createElement('div');recent.className='habit-recent';
    const recentLabel=document.createElement('span');setInterfaceCopy(recentLabel,'sleep.overview.recent',this.language());
    recent.append(recentLabel,this.mini(context));
    parts.detail.classList.add('habit-sleep-day-evidence');parts.detail.hidden=true;
    article.append(parts.identity,value,parts.completion,recent,parts.expand,parts.history,parts.detail);
  }
  renderSelection(destination:HTMLElement|null,context:SleepHabitSelection):boolean{
    const row=[...(destination?.querySelectorAll<HTMLElement>('.habit-snapshot-row')??[])]
      .find(item=>item.dataset.habitKey===context.key);
    const detail=row?.querySelector<HTMLElement>('.habit-sleep-day-evidence');
    if(!detail)return false;
    destination?.querySelectorAll<HTMLElement>('.habit-sleep-day-evidence').forEach(item=>item.hidden=item!==detail);
    detail.hidden=false;
    const heading=document.createElement('strong');
    setInterfaceCopy(heading,'sleep.overview.dayHeading',this.language(),{date:context.date,habit:context.name});
    detail.replaceChildren(heading,this.dayEvidence(context.key,context.date));
    const cell=context.cell;
    if(cell){
      const state=document.createElement('span');
      setInterfaceCopy(state,'habits.statusCoverage',this.language(),{status:{copy:cell.statusCopy},coverage:cell.coverage});
      const sources=document.createElement('ul');
      for(const line of cell.details){
        const item=document.createElement('li');
        setHabitDetailCopy(item,line,this.language());
        sources.append(item);
      }
      for(const change of context.localChanges){
        const item=document.createElement('li');
        setInterfaceCopy(item,change.state==='completed'?'history.localCompletedAt':'history.localWithdrawnAt',this.language(),{changedAt:change.changedAt});
        sources.append(item);
      }
      detail.append(state,sources);
    }else{
      const coverage=document.createElement('span');
      setInterfaceCopy(coverage,'habits.canonicalCoverage',this.language());detail.append(coverage);
    }
    if(context.date<=context.todayDate){
      detail.append(createHabitTimeEntryButton({habitKey:context.key,date:context.date,habitName:context.name},this.language()));
    }
    if(context.error){
      const error=document.createElement('p');setInterfaceError(error,'habits.loadDateFailed',context.error,this.language());detail.append(error);
    }
    const close=this.copyElement('button','secondary-button','habits.collapse');close.type='button';close.dataset.habitDateClose=context.key;
    this.copyAttribute(close,'aria-label','habits.collapseDateFor',{date:context.date,habit:context.name});detail.append(close);
    return true;
  }
  dayEvidence(key:HabitKey,date:string):HTMLElement{
    const root=element('div','habit-sleep-day-values');
    root.append(this.copyElement('p','','sleep.actualValue',{value:this.valueCopy(key,date)}));
    const matches=this.facts(key,date);
    for(const fact of matches){
      if(matches.length>1){const value=element('p');setSleepEndpointCopy(value,fact,this.language());root.append(value);}
      if(fact.endpoint.kind==='point')root.append(this.copyElement('p','habit-sleep-calendar-date','sleep.overview.actualDate',{date:fact.endpoint.date,time:fact.endpoint.time}));
      else if(fact.endpoint.kind==='text')root.append(this.copyElement('p','habit-sleep-calendar-date',fact.endpoint.date?'sleep.fact.actualDate':'sleep.fact.actualDateUnknown',{value:fact.endpoint.date??''}));
    }
    if(this.selected?.metric==='duration'&&this.selected.date===date){
      const value=element('p');setSleepCopy(value,this.sample('duration',date).label,this.language());root.append(value);
      const sample=this.view?.overview?.durations.find(sample=>sample.date===date);
      if(sample)root.append(this.copyElement('p','habit-sleep-pair','sleep.overview.pair',{onsetDate:sample.onset.date,onsetTime:sample.onset.time,wakeDate:sample.getUp.date,wakeTime:sample.getUp.time}));
    }
    if(this.error)root.append(this.errorElement());
    return root;
  }
  mini(context:HabitContext):HTMLElement{
    const root=element('div','habit-sleep-mini');root.setAttribute('role','group');this.copyAttribute(root,'aria-label','sleep.overview.recentLabel',{habit:context.name});root.dataset.sleepChart='mini';
    const dates=Array.from({length:7},(_,i)=>shiftDateOnly(context.date,i-6));
    const samples=dates.map(date=>{const matches=this.facts(context.key,date),fact=matches.length===1?matches[0]:null,endpoint=fact?.endpoint;return {date,fact,value:endpoint?.kind==='point'?fact?.clockPlotMinutes??null:null,approximate:endpoint?.kind==='point'&&Boolean(endpoint.approximate)};});
    const {drawing,frame,ticks,hasPoints}=createSleepPlot(context.key,samples,'mini');
    const scale=element('div','habit-sleep-scale');scale.setAttribute('aria-hidden','true');
    const plot=element('div','habit-sleep-plot');
    for(const tick of ticks){const text=element('span','habit-sleep-tick',clock(tick.value));text.style.top=`${tick.y/frame.height*100}%`;scale.append(text);}
    if(hasPoints&&!this.error)plot.append(drawing);else plot.append(this.copyElement('span','habit-sleep-empty',this.error?'sleep.unavailableValue':'sleep.overview.empty'));
    const tooltip=element('span','habit-sleep-tooltip');tooltip.hidden=true;tooltip.setAttribute('role','status');
    for(const [index,sample]of samples.entries()){
      const button=element('button','habit-sleep-day');button.type='button';button.dataset.habitKey=context.key;button.dataset.habitDate=sample.date;
      button.style.gridColumn=String(index+2);
      button.textContent=new Intl.DateTimeFormat(this.language()==='zh'?'zh-CN':'en-US',{weekday:'narrow',timeZone:'UTC'}).format(new Date(sample.date+'T12:00:00Z')).replace('周','');
      const values={date:sample.date,metric:context.name,value:this.valueCopy(context.key,sample.date)};
      this.copyAttribute(button,'aria-label','sleep.overview.dateReadout',values);this.copyAttribute(button,'title','sleep.overview.dateReadout',values);
      button.classList.toggle('is-missing',sample.value===null);
      button.addEventListener('click',()=>this.selected={metric:context.key,date:sample.date});
      const show=()=>{setInterfaceCopy(tooltip,'sleep.overview.dateReadout',this.language(),values);tooltip.hidden=false;};
      button.addEventListener('focus',show);button.addEventListener('mouseenter',show);
      button.addEventListener('blur',()=>tooltip.hidden=true);button.addEventListener('mouseleave',()=>tooltip.hidden=true);
      const mark=element('span','habit-sleep-gap');mark.style.gridColumn=String(index+2);mark.setAttribute('aria-hidden','true');
      if(sample.value===null&&!this.error){const matches=this.facts(context.key,sample.date);const kind=sample.fact?.endpoint.kind;
        setInterfaceCopy(mark,matches.length>1?'sleep.overview.conflict':kind==='range'?'sleep.overview.range':kind==='text'?'sleep.overview.wording':kind==='unknown'?'sleep.overview.unknown':'sleep.overview.missing',this.language());}
      root.append(button,mark);
    }
    root.append(scale,plot,tooltip);return root;
  }
}
