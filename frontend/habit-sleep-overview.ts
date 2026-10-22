import {interfaceCopy, localizeApplicationError, type InterfaceCopyKey, type InterfaceLanguage} from './interface-language.js';
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
// A chart phase is independent of the04:00 ownership boundary. In particular,
//03:50 and04:10 remain neighbors, just as23:50 and00:10 do.
function phase(value:number,key:HabitKey):number{
  const center=key==='wake'?480:60;return center+((value-center+2160)%1440)-720;
}

/** Read-only presentation of the same canonical endpoint view used by the editor. */
export class HabitSleepOverview {
  private view:SleepView|null=null;
  private error:string|null=null;
  private metric:Metric='wake';
  private period:7|30=7;
  private selected:{metric:Metric;date:string}|null=null;
  constructor(private readonly language:()=>InterfaceLanguage){}
  clear():void{this.view=null;this.error=null;this.selected=null;this.metric='wake';this.period=7;}
  open(key:HabitKey):void{this.metric=key;this.period=7;this.selected=null;}
  accept(view:SleepView):void{this.view=view;this.error=null;}
  unavailable(error:string):void{this.view=null;this.error=error;}
  private t(key:InterfaceCopyKey,values:Record<string,string|number>={}):string{return interfaceCopy(key,this.language(),values);}
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
    const wakes=this.facts('wake',date),wake=wakes.length===1?wakes[0]:null;
    const records=this.view?.records.filter(record=>record.id===wake?.recordId)??[];
    const record=records.length===1?records[0]:null;
    const available=record?.sleepOnset.kind==='point'&&record.getUp.kind==='point'&&record.estimatedDurationMinutes!==null&&Number.isFinite(record.estimatedDurationMinutes);
    const approximate=Boolean(available&&record&&((record.sleepOnset.kind==='point'&&record.sleepOnset.approximate)||(record.getUp.kind==='point'&&record.getUp.approximate)));
    const value=available?record!.estimatedDurationMinutes:null;
    const display=value===null?this.t('sleep.overview.noPair'):this.elapsed(value);
    return {date,value,approximate,label:approximate?this.t('sleep.aboutTime',{time:display}):display};
  }
  private metricName(metric:Metric):string{return this.t(metric==='wake'?'sleep.overview.wake':metric==='sleep'?'sleep.overview.onset':'sleep.overview.duration');}
  private statistics(samples:readonly Sample[]):HTMLElement{
    const root=element('div','habit-detail-stats habit-sleep-statistics');
    const valid=samples.filter(sample=>sample.value!==null),values=valid.map(sample=>sample.value!);
    let average:number|null=null;
    if(values.length){
      if(this.metric==='duration')average=values.reduce((sum,value)=>sum+value,0)/values.length;
      else{
        const sin=values.reduce((sum,value)=>sum+Math.sin(value/1440*2*Math.PI),0),cos=values.reduce((sum,value)=>sum+Math.cos(value/1440*2*Math.PI),0);
        if(Math.hypot(sin,cos)/values.length>1e-6)average=((Math.atan2(sin,cos)/(2*Math.PI)*1440)%1440+1440)%1440;
      }
    }
    const display=(value:number|null)=>value===null?'—':this.metric==='duration'?this.elapsed(value):clock(value);
    const ordered=this.metric==='duration'?values:values.map(value=>phase(value,this.metric as HabitKey));
    const fields:[string,InterfaceCopyKey,string][]=[
      ['count','sleep.overview.count',`${this.error?'—':values.length} / ${samples.length}`],
      ['mean','sleep.overview.mean',average===null?'—':valid.some(sample=>sample.approximate)?this.t('sleep.aboutTime',{time:display(average)}):display(average)],
      ['earliest',this.metric==='duration'?'sleep.overview.shortest':'sleep.overview.earliest',display(ordered.length>1?Math.min(...ordered):null)],
      ['latest',this.metric==='duration'?'sleep.overview.longest':'sleep.overview.latest',display(ordered.length>1?Math.max(...ordered):null)],
    ];
    for(const [name,key,value]of fields){const item=element('div','habit-detail-stat');item.dataset.sleepStat=name;item.append(element('span','',this.t(key)),element('strong','',value));root.append(item);}
    if(values.length&&average===null){const note=element('p','habit-sleep-mean-note',this.t('sleep.overview.noMean'));root.append(note);}
    return root;
  }
  private detailChart(context:HabitContext,samples:readonly Sample[]):HTMLElement{
    const root=element('div','habit-sleep-detail-chart');root.dataset.sleepChart='detail';
    const width=600,height=190,left=40,top=17,bottom=28,plotWidth=width-left;
    const numbers=samples.flatMap(sample=>sample.value===null?[]:[this.metric==='duration'?sample.value:phase(sample.value,this.metric)]);
    const base=this.metric==='duration'?[180,660]:this.metric==='wake'?[360,600]:[-60,180];
    const low=Math.floor(Math.min(base[0],...numbers)/60)*60,high=Math.ceil(Math.max(base[1],...numbers)/60)*60;
    const x=(index:number)=>left+(index+.5)*plotWidth/samples.length,y=(value:number)=>top+(high-value)/(high-low)*(height-top-bottom);
    const drawing=svg('svg',{viewBox:`0 0 ${width} ${height}`,preserveAspectRatio:'none','aria-hidden':'true'});
    for(const tick of [high,(high+low)/2,low]){
      drawing.append(svg('line',{x1:left,x2:width,y1:y(tick),y2:y(tick),stroke:'var(--parity-border)','stroke-width':.7}));
      const text=svg('text',{x:32,y:y(tick)+3,'text-anchor':'end',fill:'var(--parity-muted)','font-size':10});text.textContent=this.metric==='duration'?`${new Intl.NumberFormat(this.language(),{maximumFractionDigits:1}).format(tick/60)}h`:clock(tick);drawing.append(text);
    }
    let segment:string[]=[];const flush=()=>{if(segment.length>1)drawing.append(svg('polyline',{points:segment.join(' '),fill:'none',stroke:'var(--parity-accent)','stroke-width':2,'vector-effect':'non-scaling-stroke'}));segment=[];};
    for(const [index,sample]of samples.entries()){
      if(sample.value===null){flush();continue;}
      const numeric=this.metric==='duration'?sample.value:phase(sample.value,this.metric);segment.push(`${x(index)},${y(numeric)}`);
    }flush();
    for(const [index,sample]of samples.entries()){
      if(sample.value!==null){const numeric=this.metric==='duration'?sample.value:phase(sample.value,this.metric);drawing.append(svg('circle',{cx:x(index),cy:y(numeric),r:3,fill:sample.approximate?'var(--parity-surface)':'var(--parity-accent)',stroke:'var(--parity-accent)','stroke-width':1.3}));}
      if(samples.length===7||index%5===0||index===samples.length-1){const label=svg('text',{x:x(index),y:height-7,'text-anchor':'middle',fill:'var(--parity-muted)','font-size':10});label.textContent=sample.date.slice(5).replace('-','/');drawing.append(label);}
    }
    root.append(drawing);
    const targets=element('div','habit-sleep-date-targets');targets.style.setProperty('--sleep-date-count',String(samples.length));
    const tooltip=element('p','habit-sleep-detail-readout',this.t('sleep.overview.inspect'));tooltip.setAttribute('role','status');
    for(const sample of samples){const button=element('button');button.type='button';button.dataset.habitDate=sample.date;
      button.dataset.habitDetailDate=sample.date;button.dataset.habitDetailDateKey=this.metric==='duration'?'wake':this.metric;
      const full=`${sample.date} · ${this.metricName(this.metric)} · ${sample.label}`;button.title=full;button.setAttribute('aria-label',full);
      button.addEventListener('focus',()=>tooltip.textContent=full);button.addEventListener('mouseenter',()=>tooltip.textContent=full);
      button.addEventListener('click',()=>this.selected={metric:this.metric,date:sample.date});targets.append(button);}
    root.append(targets);
    if(!numbers.length)root.append(element('span','habit-sleep-detail-empty',this.t(this.error?'sleep.unavailableValue':'sleep.overview.empty')));
    const group=element('div');group.append(root,tooltip);return group;
  }
  detail(context:HabitContext):HTMLElement{
    const root=element('section','habit-sleep-overview');root.setAttribute('aria-label',this.t('sleep.overview.label'));root.dataset.sleepOverview='';root.dataset.sleepMetric=this.metric;
    const tabs=element('div','habit-sleep-metric-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',this.t('sleep.overview.metrics'));
    const replace=(selector:string)=>{const next=this.detail(context);root.replaceWith(next);next.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});};
    for(const metric of ['wake','sleep','duration'] as const){const button=element('button','secondary-button',this.metricName(metric));button.type='button';button.dataset.sleepMetric=metric;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(this.metric===metric));button.addEventListener('click',()=>{this.metric=metric;replace(`[data-sleep-metric="${metric}"]`)});tabs.append(button);}
    const ranges=element('div','habit-sleep-period-tabs');ranges.setAttribute('aria-label',this.t('sleep.overview.period'));
    for(const period of [7,30] as const){const button=element('button','secondary-button',this.t('sleep.overview.days',{count:period}));button.type='button';button.dataset.sleepPeriod=String(period);button.setAttribute('aria-pressed',String(this.period===period));button.addEventListener('click',()=>{this.period=period;replace(`[data-sleep-period="${period}"]`)});ranges.append(button);}
    const samples=Array.from({length:this.period},(_,i)=>this.sample(this.metric,shifted(context.date,i-this.period+1)));
    root.append(tabs,ranges,this.statistics(samples),this.detailChart(context,samples),element('p','habit-sleep-caption',this.t(this.metric==='duration'?'sleep.overview.durationNote':'sleep.overview.pointNote')));
    if(this.error)root.append(element('p','habit-sleep-read-error',this.t('sleep.loadFailed',{error:localizeApplicationError(this.error,this.language())})));
    const history=element('details','habit-sleep-history');history.append(element('summary','',this.t('sleep.overview.earlier')));
    const form=element('form');const label=element('label','',this.t('sleep.overview.historyDate'));const date=element('input');date.type='date';date.required=true;date.max=context.date;date.value=context.date;date.dataset.sleepHistoryDate='';date.setAttribute('aria-label',this.t('sleep.overview.historyDate'));label.append(date);
    const open=element('button','secondary-button',this.t('sleep.overview.historyOpen'));open.type='submit';form.append(label,open);
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const button=element('button');button.type='button';button.dataset.habitDetailDate=date.value;button.dataset.habitDetailDateKey=this.metric==='duration'?'wake':this.metric;root.append(button);this.selected={metric:this.metric,date:date.value};button.click();button.remove();});history.append(form);root.append(history);return root;
  }
  dayEvidence(key:HabitKey,date:string):HTMLElement{
    const root=element('div','habit-sleep-day-values');
    root.append(element('p','',this.t('sleep.actualValue',{value:this.value(key,date)})));
    const matches=this.facts(key,date);
    for(const fact of matches){
      if(matches.length>1)root.append(element('p','',formatSleepEndpoint(fact,this.language())));
      if(fact.endpoint.kind==='point')root.append(element('p','habit-sleep-calendar-date',this.t('sleep.overview.actualDate',{date:fact.endpoint.date,time:fact.endpoint.time})));
    }
    if(this.selected?.metric==='duration'&&this.selected.date===date){
      root.append(element('p','',this.sample('duration',date).label));
      const wake=matches.length===1?matches[0]:null,record=this.view?.records.find(record=>record.id===wake?.recordId);
      if(record?.sleepOnset.kind==='point'&&record.getUp.kind==='point'){
        root.append(element('p','habit-sleep-pair',this.t('sleep.overview.pair',{onsetDate:record.sleepOnset.date,onsetTime:record.sleepOnset.time,wakeDate:record.getUp.date,wakeTime:record.getUp.time})));
      }
    }
    if(this.error)root.append(element('p','habit-sleep-read-error',this.t('sleep.loadFailed',{error:localizeApplicationError(this.error,this.language())})));
    return root;
  }
  mini(context:HabitContext):HTMLElement{
    const root=element('div','habit-sleep-mini');root.setAttribute('role','group');root.setAttribute('aria-label',this.t('sleep.overview.recentLabel',{habit:context.name}));root.dataset.sleepChart='mini';
    const dates=Array.from({length:7},(_,i)=>shifted(context.date,i-6));
    const samples=dates.map(date=>{const matches=this.facts(context.key,date),fact=matches.length===1?matches[0]:null;return {date,fact,value:fact?.endpoint.kind==='point'?phase(minute(fact.endpoint.time),context.key):null};});
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
    let segment:string[]=[];
    const flush=()=>{if(segment.length>1)drawing.append(svg('polyline',{points:segment.join(' '),fill:'none',stroke:'var(--parity-accent)','stroke-width':1.6,'vector-effect':'non-scaling-stroke'}));segment=[];};
    for(const [index,sample]of samples.entries()){
      if(sample.value===null){flush();continue;}
      segment.push(`${x(index)},${y(sample.value)}`);
    }
    flush();
    for(const [index,sample]of samples.entries())if(sample.value!==null){
      drawing.append(svg('circle',{cx:x(index),cy:y(sample.value),r:2.3,fill:sample.fact?.endpoint.kind==='point'&&sample.fact.endpoint.approximate?'var(--parity-surface)':'var(--parity-accent)',stroke:'var(--parity-accent)','stroke-width':1.3}));
    }
    if(values.length&&!this.error)plot.append(drawing);else plot.append(element('span','habit-sleep-empty',this.t(this.error?'sleep.unavailableValue':'sleep.overview.empty')));
    const tooltip=element('span','habit-sleep-tooltip');tooltip.hidden=true;tooltip.setAttribute('role','status');
    for(const [index,sample]of samples.entries()){
      const button=element('button','habit-sleep-day');button.type='button';button.dataset.habitKey=context.key;button.dataset.habitDate=sample.date;
      button.style.gridColumn=String(index+2);
      button.textContent=new Intl.DateTimeFormat(this.language()==='zh'?'zh-CN':'en-US',{weekday:'narrow',timeZone:'UTC'}).format(new Date(sample.date+'T12:00:00Z')).replace('周','');
      const full=`${sample.date} · ${context.name} · ${this.value(context.key,sample.date)}`;
      button.setAttribute('aria-label',full);button.title=full;
      button.classList.toggle('is-missing',sample.value===null);
      button.addEventListener('click',()=>this.selected={metric:context.key,date:sample.date});
      const show=()=>{tooltip.textContent=full;tooltip.hidden=false;};
      button.addEventListener('focus',show);button.addEventListener('mouseenter',show);
      button.addEventListener('blur',()=>tooltip.hidden=true);button.addEventListener('mouseleave',()=>tooltip.hidden=true);
      const mark=element('span','habit-sleep-gap');mark.style.gridColumn=String(index+2);mark.setAttribute('aria-hidden','true');
      if(sample.value===null&&!this.error){const matches=this.facts(context.key,sample.date);const kind=sample.fact?.endpoint.kind;
        mark.textContent=this.t(matches.length>1?'sleep.overview.conflict':kind==='range'?'sleep.overview.range':kind==='text'?'sleep.overview.wording':kind==='unknown'?'sleep.overview.unknown':'sleep.overview.missing');}
      root.append(button,mark);
    }
    root.append(scale,plot,tooltip);return root;
  }
}
