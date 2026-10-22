import {interfaceCopy, setInterfaceCopy, setInterfaceAttribute, setInterfaceError, type InterfaceCopyKey, type InterfaceLanguage} from './interface-language.js';
import {formatSleepEndpoint, type SleepEndpointFact, type SleepView} from './sleep-facts.js';

type HabitKey='wake'|'sleep';
type Metric=HabitKey|'duration';
type Sample=Readonly<{date:string;value:number|null;approximate:boolean;label:string}>;
type HabitContext=Readonly<{key:HabitKey;name:string;date:string}>;
const svgNamespace='http://www.w3.org/2000/svg';
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);node.className=className;node.textContent=text;return node;
}
function svg(tag:string,attributes:Record<string,string|number>):SVGElement{
  const node=document.createElementNS(svgNamespace,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;
}
function shifted(date:string,amount:number):string{return new Date(Date.parse(date+'T12:00:00Z')+amount*86400000).toISOString().slice(0,10);}
function clock(minutes:number):string{
  const value=(Math.round(minutes)%1440+1440)%1440;
  return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
}
function minute(time:string):number{const [hour,minutes]=time.split(':').map(Number);return hour*60+minutes;}
/** Render only adjacent exact samples; nulls end a segment instead of bridging gaps. */
function appendGapSeries(drawing:SVGElement,samples:readonly {value:number|null}[],x:(index:number)=>number,y:(value:number)=>number,strokeWidth:number):void{
  let segment:string[]=[];
  const flush=()=>{if(segment.length>1)drawing.append(svg('polyline',{points:segment.join(' '),fill:'none',stroke:'var(--parity-accent)','stroke-width':strokeWidth,'vector-effect':'non-scaling-stroke'}));segment=[];};
  for(const [index,sample]of samples.entries()){
    if(sample.value===null)flush();else segment.push(`${x(index)},${y(sample.value)}`);
  }
  flush();
}
// A chart phase is independent of the04:00 ownership boundary. In particular,
//03:50 and04:10 remain neighbors, just as23:50 and00:10 do.
function clockMinutesAroundAnchor(value:number,key:HabitKey):number{
  const center=key==='wake'?480:60;return center+((value-center+2160)%1440)-720;
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
  private t(key:InterfaceCopyKey,values:Record<string,string|number>={}):string{return interfaceCopy(key,this.language(),values);}
  private copyElement<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,key:InterfaceCopyKey,values:Record<string,string|number>={}):HTMLElementTagNameMap[K]{
    const node=element(tag,className);setInterfaceCopy(node,key,this.language(),values);return node;
  }
  private copyAttribute(node:HTMLElement,attribute:'aria-label'|'title'|'placeholder',key:InterfaceCopyKey,values:Record<string,string|number>={}):void{
    setInterfaceAttribute(node,attribute,key,this.language(),values);
  }
  private errorElement():HTMLElement{const node=element('p','habit-sleep-read-error');setInterfaceError(node,'sleep.loadFailed',this.error!,this.language());return node;}
  private facts(key:HabitKey,date:string):readonly SleepEndpointFact[]{return this.view?.facts.filter(f=>f.habitKey===key&&f.livedDate===date)??[];}
  value(key:HabitKey,date:string,fallback?:string):string{
    if(this.error)return this.t('sleep.unavailableValue');
    const matches=this.facts(key,date);return matches.length>1?this.t('sleep.conflictValue'):!matches.length&&fallback?fallback:formatSleepEndpoint(matches[0],this.language());
  }
  private elapsed(value:number):string{
    const rounded=Math.round(value),hours=Math.floor(rounded/60),minutes=rounded%60;
    return this.t('sleep.overview.elapsedValue',{hours,minutes});
  }
  private sample(metric:Metric,date:string):Sample{
    if(metric!=='duration'){
      const matches=this.facts(metric,date),endpoint=matches.length===1?matches[0].endpoint:null;
      return {date,value:endpoint?.kind==='point'?minute(endpoint.time):null,approximate:endpoint?.kind==='point'&&Boolean(endpoint.approximate),label:this.value(metric,date)};
    }
    const sample=this.view?.overview?.durations.find(sample=>sample.date===date);
    const value=sample?.minutes??null,approximate=sample?.approximate??false;
    const display=value===null?this.t('sleep.overview.noPair'):this.elapsed(value);
    return {date,value,approximate,label:approximate?this.t('sleep.aboutTime',{time:display}):display};
  }

  private metricName(metric:Metric):string{return this.t(metric==='wake'?'sleep.overview.wake':metric==='sleep'?'sleep.overview.onset':'sleep.overview.duration');}
  private statistics(samples:readonly Sample[],date:string):HTMLElement{
    const root=element('div','habit-detail-stats habit-sleep-statistics');
    const overview=this.view?.overview;
    const stats=overview?.date===date?overview.statistics.find(stats=>stats.metric===this.metric&&stats.period===this.period):undefined;
    const fields:[string,InterfaceCopyKey,number|null|undefined,boolean][]=[
      ['count','sleep.overview.count',stats?.count,false],
      ['mean','sleep.overview.mean',stats?.mean,stats?.approximate??false],
      ['earliest',this.metric==='duration'?'sleep.overview.shortest':'sleep.overview.earliest',stats?.earliest,stats?.earliestApproximate??false],
      ['latest',this.metric==='duration'?'sleep.overview.longest':'sleep.overview.latest',stats?.latest,stats?.latestApproximate??false],
    ];
    for(const [name,key,value,approximate]of fields){
      const item=element('div','habit-detail-stat');item.dataset.sleepStat=name;
      const output=element('strong');
      if(name==='count')output.textContent=`${this.error||!stats?'—':value??0} / ${samples.length}`;
      else if(value==null)output.textContent='—';
      else if(this.metric==='duration'){
        const rounded=Math.round(value);setInterfaceCopy(output,approximate?'sleep.overview.aboutElapsedValue':'sleep.overview.elapsedValue',this.language(),{hours:Math.floor(rounded/60),minutes:rounded%60});
      }else if(approximate)setInterfaceCopy(output,'sleep.aboutTime',this.language(),{time:clock(value)});
      else output.textContent=clock(value);
      item.append(this.copyElement('span','',key),output);root.append(item);
    }
    if(stats?.count&&stats.mean===null)root.append(this.copyElement('p','habit-sleep-mean-note','sleep.overview.noMean'));
    return root;
  }
  private detailChart(context:HabitContext,samples:readonly Sample[]):HTMLElement{
    const root=element('div','habit-sleep-detail-chart');root.dataset.sleepChart='detail';
    const width=600,height=190,left=40,top=17,bottom=28,plotWidth=width-left;
    const numbers=samples.flatMap(sample=>sample.value===null?[]:[this.metric==='duration'?sample.value:clockMinutesAroundAnchor(sample.value,this.metric)]);
    const base=this.metric==='duration'?[180,660]:this.metric==='wake'?[360,600]:[-60,180];
    const low=Math.floor(Math.min(base[0],...numbers)/60)*60,high=Math.ceil(Math.max(base[1],...numbers)/60)*60;
    const x=(index:number)=>left+(index+.5)*plotWidth/samples.length,y=(value:number)=>top+(high-value)/(high-low)*(height-top-bottom);
    const drawing=svg('svg',{viewBox:`0 0 ${width} ${height}`,preserveAspectRatio:'none','aria-hidden':'true'});
    for(const tick of [high,(high+low)/2,low]){
      drawing.append(svg('line',{x1:left,x2:width,y1:y(tick),y2:y(tick),stroke:'var(--parity-border)','stroke-width':.7}));
      const text=svg('text',{x:32,y:y(tick)+3,'text-anchor':'end',fill:'var(--parity-muted)','font-size':10});if(this.metric==='duration')setInterfaceCopy(text,'sleep.overview.axisHours',this.language(),{hours:new Intl.NumberFormat(this.language(),{maximumFractionDigits:1}).format(tick/60)});else text.textContent=clock(tick);drawing.append(text);
    }
    appendGapSeries(drawing,samples.map(sample=>({value:sample.value===null?null:this.metric==='duration'?sample.value:clockMinutesAroundAnchor(sample.value,this.metric)})),x,y,2);
    for(const [index,sample]of samples.entries()){
      if(sample.value!==null){const numeric=this.metric==='duration'?sample.value:clockMinutesAroundAnchor(sample.value,this.metric);drawing.append(svg('circle',{cx:x(index),cy:y(numeric),r:3,fill:sample.approximate?'var(--parity-surface)':'var(--parity-accent)',stroke:'var(--parity-accent)','stroke-width':1.3}));}
      if(samples.length===7||index%5===0||index===samples.length-1){const label=svg('text',{x:x(index),y:height-7,'text-anchor':'middle',fill:'var(--parity-muted)','font-size':10});label.textContent=sample.date.slice(5).replace('-','/');drawing.append(label);}
    }
    root.append(drawing);
    const targets=element('div','habit-sleep-date-targets');targets.style.setProperty('--sleep-date-count',String(samples.length));
    const tooltip=this.copyElement('p','habit-sleep-detail-readout','sleep.overview.inspect');tooltip.setAttribute('role','status');
    for(const sample of samples){const button=element('button');button.type='button';button.dataset.habitDate=sample.date;
      button.dataset.habitDetailDate=sample.date;button.dataset.habitDetailDateKey=this.metric==='duration'?'wake':this.metric;
      const values={date:sample.date,metric:this.metricName(this.metric),value:sample.label};this.copyAttribute(button,'title','sleep.overview.dateReadout',values);this.copyAttribute(button,'aria-label','sleep.overview.dateReadout',values);
      const show=()=>setInterfaceCopy(tooltip,'sleep.overview.dateReadout',this.language(),values);button.addEventListener('focus',show);button.addEventListener('mouseenter',show);
      button.addEventListener('click',()=>this.selected={metric:this.metric,date:sample.date});targets.append(button);}
    root.append(targets);
    if(!numbers.length)root.append(this.copyElement('span','habit-sleep-detail-empty',this.error?'sleep.unavailableValue':'sleep.overview.empty'));
    const group=element('div');group.append(root,tooltip);return group;
  }
  detail(context:HabitContext):HTMLElement{
    const root=element('section','habit-sleep-overview');this.copyAttribute(root,'aria-label','sleep.overview.label');root.dataset.sleepOverview='';root.dataset.sleepMetric=this.metric;
    const tabs=element('div','habit-sleep-metric-tabs');tabs.setAttribute('role','tablist');this.copyAttribute(tabs,'aria-label','sleep.overview.metrics');
    const replace=(selector:string)=>{const next=this.detail(context);root.replaceWith(next);next.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});this.reveal();};
    for(const metric of ['wake','sleep','duration'] as const){const button=this.copyElement('button','secondary-button',metric==='wake'?'sleep.overview.wake':metric==='sleep'?'sleep.overview.onset':'sleep.overview.duration');button.type='button';button.dataset.sleepMetric=metric;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(this.metric===metric));button.addEventListener('click',()=>{this.metric=metric;replace(`[data-sleep-metric="${metric}"]`)});tabs.append(button);}
    const ranges=element('div','habit-sleep-period-tabs');this.copyAttribute(ranges,'aria-label','sleep.overview.period');
    for(const period of [7,30] as const){const button=this.copyElement('button','secondary-button','sleep.overview.days',{count:period});button.type='button';button.dataset.sleepPeriod=String(period);button.setAttribute('aria-pressed',String(this.period===period));button.addEventListener('click',()=>{this.period=period;replace(`[data-sleep-period="${period}"]`)});ranges.append(button);}
    const samples=Array.from({length:this.period},(_,i)=>this.sample(this.metric,shifted(context.date,i-this.period+1)));
    root.append(tabs,ranges,this.statistics(samples,context.date),this.detailChart(context,samples),this.copyElement('p','habit-sleep-caption',this.metric==='duration'?'sleep.overview.durationNote':'sleep.overview.pointNote'));
    if(this.error)root.append(this.errorElement());
    const history=element('details','habit-sleep-history');history.append(this.copyElement('summary','','sleep.overview.earlier'));
    const form=element('form');const label=element('label');label.append(this.copyElement('span','','sleep.overview.historyDate'));const date=element('input');date.type='date';date.required=true;date.max=context.date;date.value=context.date;date.dataset.sleepHistoryDate='';this.copyAttribute(date,'aria-label','sleep.overview.historyDate');label.append(date);
    const open=this.copyElement('button','secondary-button','sleep.overview.historyOpen');open.type='submit';form.append(label,open);
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const button=element('button');button.type='button';button.dataset.habitDetailDate=date.value;button.dataset.habitDetailDateKey=this.metric==='duration'?'wake':this.metric;root.append(button);this.selected={metric:this.metric,date:date.value};button.click();button.remove();});history.append(form);root.append(history);return root;
  }
  dayEvidence(key:HabitKey,date:string):HTMLElement{
    const root=element('div','habit-sleep-day-values');
    root.append(this.copyElement('p','','sleep.actualValue',{value:this.value(key,date)}));
    const matches=this.facts(key,date);
    for(const fact of matches){
      if(matches.length>1)root.append(element('p','',formatSleepEndpoint(fact,this.language())));
      if(fact.endpoint.kind==='point')root.append(this.copyElement('p','habit-sleep-calendar-date','sleep.overview.actualDate',{date:fact.endpoint.date,time:fact.endpoint.time}));
    }
    if(this.selected?.metric==='duration'&&this.selected.date===date){
      root.append(element('p','',this.sample('duration',date).label));
      const sample=this.view?.overview?.durations.find(sample=>sample.date===date);
      if(sample)root.append(this.copyElement('p','habit-sleep-pair','sleep.overview.pair',{onsetDate:sample.onset.date,onsetTime:sample.onset.time,wakeDate:sample.getUp.date,wakeTime:sample.getUp.time}));
    }
    if(this.error)root.append(this.errorElement());
    return root;
  }
  mini(context:HabitContext):HTMLElement{
    const root=element('div','habit-sleep-mini');root.setAttribute('role','group');this.copyAttribute(root,'aria-label','sleep.overview.recentLabel',{habit:context.name});root.dataset.sleepChart='mini';
    const dates=Array.from({length:7},(_,i)=>shifted(context.date,i-6));
    const samples=dates.map(date=>{const matches=this.facts(context.key,date),fact=matches.length===1?matches[0]:null;return {date,fact,value:fact?.endpoint.kind==='point'?clockMinutesAroundAnchor(minute(fact.endpoint.time),context.key):null};});
    const base=context.key==='wake'?[360,600]:[-60,180];
    const values=samples.flatMap(sample=>sample.value===null?[]:[sample.value]);
    const low=Math.floor(Math.min(base[0],...values)/60)*60,high=Math.ceil(Math.max(base[1],...values)/60)*60;
    const width=210,height=44,x=(index:number)=>(index+.5)*width/7,y=(value:number)=>3+(high-value)/(high-low)*38;
    const scale=element('div','habit-sleep-scale');scale.setAttribute('aria-hidden','true');
    const plot=element('div','habit-sleep-plot');
    const drawing=svg('svg',{viewBox:`0 0 ${width} ${height}`,preserveAspectRatio:'none','aria-hidden':'true'});
    for(const tick of [high,(high+low)/2,low]){
      const text=element('span','habit-sleep-tick',clock(tick));text.style.top=`${y(tick)/height*100}%`;scale.append(text);
      drawing.append(svg('line',{x1:0,x2:width,y1:y(tick),y2:y(tick),stroke:'var(--parity-border)','stroke-width':.7}));
    }
    appendGapSeries(drawing,samples,x,y,1.6);
    for(const [index,sample]of samples.entries())if(sample.value!==null){
      drawing.append(svg('circle',{cx:x(index),cy:y(sample.value),r:2.3,fill:sample.fact?.endpoint.kind==='point'&&sample.fact.endpoint.approximate?'var(--parity-surface)':'var(--parity-accent)',stroke:'var(--parity-accent)','stroke-width':1.3}));
    }
    if(values.length&&!this.error)plot.append(drawing);else plot.append(this.copyElement('span','habit-sleep-empty',this.error?'sleep.unavailableValue':'sleep.overview.empty'));
    const tooltip=element('span','habit-sleep-tooltip');tooltip.hidden=true;tooltip.setAttribute('role','status');
    for(const [index,sample]of samples.entries()){
      const button=element('button','habit-sleep-day');button.type='button';button.dataset.habitKey=context.key;button.dataset.habitDate=sample.date;
      button.style.gridColumn=String(index+2);
      button.textContent=new Intl.DateTimeFormat(this.language()==='zh'?'zh-CN':'en-US',{weekday:'narrow',timeZone:'UTC'}).format(new Date(sample.date+'T12:00:00Z')).replace('周','');
      const values={date:sample.date,metric:context.name,value:this.value(context.key,sample.date)};
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
