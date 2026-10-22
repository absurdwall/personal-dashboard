import {interfaceCopy,setInterfaceCopy,setInterfaceError,type InterfaceLanguage,type InterfaceCopyKey} from './interface-language.js';
import {formatSleepEndpoint,sleepPointForLivedDay,type SleepEndpoint,type SleepEndpointFact,type SleepView} from './sleep-facts.js';

type Context=Readonly<{date:string;vaultPath:string;canRecord:boolean;habits:readonly Readonly<{key:string;name:string}>[]}>;
type Draft={habitKey:string;kind:SleepEndpoint['kind'];time:string;endTime:string;approximate:boolean;text:string;expanded:boolean;recordId?:string;targetBinding:string;expectedRevision:string|null;changeId:string};
type Options=Readonly<{
  language:()=>InterfaceLanguage;
  invoke:<T>(command:string,args?:Record<string,unknown>)=>Promise<T>;
  track:(operation:Promise<boolean>)=>void;
  saved:()=>void;
  openCollaboration:()=>void;
}>;

/** One selected Habit/date editor over the same canonical application workflow as Collaboration. */
export class HabitTimeEntry {
  private context:Context|null=null;
  private data:SleepView|null=null;
  private draft:Draft|null=null;
  private request=0;
  private generation=0;
  private saving=false;
  private status:Readonly<{key:InterfaceCopyKey;error?:string}>|null=null;
  private pendingFocus:string|null=null;
  constructor(private readonly root:HTMLElement,private readonly options:Options){}
  private identity(context:Context|null):string{return context?`${context.vaultPath}\n${context.date}`:'';}
  clear():void{
    this.generation+=1;this.request+=1;this.context=null;this.data=null;this.draft=null;this.saving=false;this.pendingFocus=null;this.status=null;this.root.replaceChildren();
  }
  present(context:Context):void{
    if(this.identity(context)!==this.identity(this.context))this.clear();
    this.context=context;
    this.render();
    if(context.habits.length>0)void this.read();
  }
  focus(habitKey:string):void{
    if(!this.context?.habits.some(habit=>habit.key===habitKey))return;
    this.pendingFocus=habitKey;
    if(this.data)this.open(habitKey,true);
  }
  private t(key:InterfaceCopyKey,values:Record<string,string>={}):string{return interfaceCopy(key,this.options.language(),values);}
  private copy(element:HTMLElement,key:InterfaceCopyKey,values:Record<string,string>={}):void{setInterfaceCopy(element,key,this.options.language(),values);}
  private async read():Promise<void>{
    const context=this.context,token=++this.request;
    try{
      const data=await this.options.invoke<SleepView>('sleep_records');
      if(token!==this.request||this.identity(context)!==this.identity(this.context))return;
      this.data=data;this.render();
      if(this.pendingFocus)this.open(this.pendingFocus,true);
    }catch(error){
      if(token!==this.request||this.identity(context)!==this.identity(this.context))return;
      this.status={key:'sleep.loadFailed',error:String(error)};this.render();
    }
  }
  private facts(key:string):readonly SleepEndpointFact[]{return this.data?.facts.filter(f=>f.habitKey===key&&f.livedDate===this.context?.date)??[];}
  private fact(key:string):SleepEndpointFact|null{const matches=this.facts(key);return matches.length===1?matches[0]:null;}
  private open(key:string,focus=false):void{
    if(!this.data||!this.context?.canRecord||this.saving)return;
    if(this.facts(key).length>1){this.pendingFocus=null;this.status={key:'sleep.conflictHelp'};this.render();return;}
    const fact=this.fact(key),endpoint=fact?.endpoint;
    this.draft={habitKey:key,kind:endpoint?.kind??'point',time:endpoint?.kind==='point'?endpoint.time:endpoint?.kind==='range'?endpoint.start.time:'',endTime:endpoint?.kind==='range'?endpoint.end.time:'',approximate:endpoint?.kind==='point'?Boolean(endpoint.approximate):false,text:endpoint?.kind==='text'?endpoint.text:endpoint?.kind==='range'?endpoint.reportedText:'',expanded:Boolean(endpoint&&endpoint.kind!=='point'),recordId:fact?.recordId,targetBinding:this.data.targetBinding,expectedRevision:this.data.revision,changeId:`habit-time-${globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`}`};
    this.pendingFocus=null;this.status=null;this.render();
    if(focus){const target=this.root.querySelector<HTMLInputElement>(`[data-habit-time-form="${key}"] [data-habit-time-point]`);this.root.scrollIntoView({block:'nearest'});target?.focus({preventScroll:true});}
  }
  private render():void{
    const active=document.activeElement as HTMLElement|null;
    const focusKey=active&&this.root.contains(active)?['point','approximate','kind','end','original'].find(key=>active.hasAttribute('data-habit-time-'+key)):undefined;
    const focusHabit=active?.closest<HTMLFormElement>('[data-habit-time-form]')?.dataset.habitTimeForm;
    this.root.replaceChildren();
    const context=this.context;if(!context)return;
    for(const habit of context.habits){
      const row=document.createElement('section');row.className='habit-time-row';row.dataset.habitTimeRow=habit.key;
      const header=document.createElement('header'),name=document.createElement('strong'),edit=document.createElement('button');
      name.textContent=habit.name;edit.type='button';edit.className='secondary-button';edit.dataset.habitTimeEdit=habit.key;
      const matches=this.facts(habit.key),conflict=matches.length>1;
      const fact=this.fact(habit.key),values={habit:habit.name,date:context.date};
      this.copy(edit,fact?'sleep.correctTime':'sleep.recordTime');
      edit.setAttribute('aria-label',this.t(fact?'sleep.correctTimeLabel':'sleep.recordTimeLabel',values));
      edit.disabled=this.saving||!context.canRecord||!this.data||conflict;
      edit.addEventListener('click',()=>this.open(habit.key,true));header.append(name,edit);
      const value=document.createElement('p');value.className='day-task-meta';value.dataset.habitTimeValue=habit.key;
      if(conflict)this.copy(value,'sleep.conflictValue');else if(!this.data)this.copy(value,this.status?.error?'sleep.unavailableValue':'sleep.readingValue');else this.copy(value,'sleep.actualValue',{value:formatSleepEndpoint(fact,this.options.language())});
      row.append(header,value);
      if(conflict){
        const help=document.createElement('p');help.className='day-task-meta';this.copy(help,'sleep.conflictHelp');
        const provenance=document.createElement('ul');provenance.dataset.habitTimeConflicts=habit.key;
        for(const item of matches){const line=document.createElement('li');line.textContent=formatSleepEndpoint(item,this.options.language());provenance.append(line);}
        const resolve=document.createElement('button');resolve.type='button';resolve.className='secondary-button';this.copy(resolve,'sleep.openCollaboration');resolve.addEventListener('click',()=>this.options.openCollaboration());
        row.append(help,provenance,resolve);
      }
      if(this.draft?.habitKey===habit.key&&!conflict)row.append(this.form(habit.name));
      this.root.append(row);
    }
    if(this.status){
      const status=document.createElement('p');status.className='day-task-status';status.role='status';status.dataset.habitTimeStatus='';
      if(this.status.error)setInterfaceError(status,this.status.key,this.status.error,this.options.language());else this.copy(status,this.status.key);
      status.dataset.state=this.status.error?'error':'ready';this.root.append(status);
    }
    if(focusKey&&focusHabit)this.root.querySelector<HTMLElement>(`[data-habit-time-form="${focusHabit}"] [data-habit-time-${focusKey}]`)?.focus({preventScroll:true});
  }
  private form(habitName:string):HTMLFormElement{
    const draft=this.draft!,context=this.context!,values={habit:habitName,date:context.date};
    const form=document.createElement('form');form.dataset.habitTimeForm=draft.habitKey;
    const fields=document.createElement('div');fields.className='habit-time-fields';
    const time=document.createElement('input');time.type='time';time.name='time';time.value=draft.time;time.dataset.habitTimePoint='';time.setAttribute('aria-label',this.t('sleep.actualTimeLabel',values));time.required=draft.kind==='point'||draft.kind==='range';time.hidden=draft.kind==='text'||draft.kind==='unknown'||draft.kind==='unrecorded';
    const approximate=document.createElement('label'),check=document.createElement('input'),checkCopy=document.createElement('span');
    check.type='checkbox';check.name='approximate';check.checked=draft.approximate;check.dataset.habitTimeApproximate='';check.setAttribute('aria-label',this.t('sleep.approximateLabel',values));this.copy(checkCopy,'sleep.approximate');approximate.append(check,checkCopy);approximate.hidden=draft.kind!=='point';
    const save=document.createElement('button');save.type='submit';this.copy(save,this.saving?'sleep.saving':'sleep.saveTime');save.setAttribute('aria-label',this.t('sleep.saveTimeLabel',values));
    const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary-button';this.copy(cancel,'sleep.cancel');cancel.setAttribute('aria-label',this.t('sleep.cancelTimeLabel',values));cancel.addEventListener('click',()=>{this.draft=null;this.status=null;this.render();});fields.append(time,approximate,save,cancel);
    const preview=document.createElement('p');preview.className='day-task-meta habit-time-preview';preview.dataset.habitTimePreview='';
    const updatePreview=()=>{
      if(draft.kind!=='point'&&draft.kind!=='range'){this.copy(preview,'sleep.fixedContext',{date:context.date});return;}
      try{const point=sleepPointForLivedDay(context.date,draft.time,draft.approximate);this.copy(preview,'sleep.calendarPreview',{date:point.date,time:point.time});}catch{this.copy(preview,'sleep.previewEmpty');}
    };
    const details=document.createElement('details');details.className='habit-time-precision';details.open=draft.expanded;
    const summary=document.createElement('summary');this.copy(summary,'sleep.morePrecision');
    const kind=document.createElement('select');kind.name='precision';kind.dataset.habitTimeKind='';kind.setAttribute('aria-label',this.t('sleep.precisionLabel',values));
    const kinds:readonly [SleepEndpoint['kind'],InterfaceCopyKey][]=[['point','sleep.pointOption'],['range','sleep.rangeOption'],['text','sleep.textOption'],['unknown','sleep.unknownOption'],['unrecorded','sleep.unrecordedOption']];
    for(const [value,key]of kinds){const option=document.createElement('option');option.value=value;option.textContent=this.t(key);kind.append(option);}kind.value=draft.kind;
    const end=document.createElement('input');end.type='time';end.name='endTime';end.value=draft.endTime;end.dataset.habitTimeEnd='';end.hidden=draft.kind!=='range';end.required=draft.kind==='range';end.setAttribute('aria-label',this.t('sleep.rangeEndLabel',values));
    const text=document.createElement('input');text.type='text';text.name='original';text.value=draft.text;text.dataset.habitTimeOriginal='';text.hidden=draft.kind!=='text'&&draft.kind!=='range';text.required=draft.kind==='text'||draft.kind==='range';text.maxLength=2000;text.setAttribute('aria-label',this.t('sleep.originalLabel',values));text.placeholder=this.t('sleep.originalPlaceholder');
    details.append(summary,kind,end,text);details.addEventListener('toggle',()=>{if(this.draft===draft)draft.expanded=details.open;});
    const edited=()=>{draft.time=time.value;draft.endTime=end.value;draft.approximate=check.checked;draft.text=text.value;updatePreview();};
    [time,end,text].forEach(input=>input.addEventListener('input',edited));check.addEventListener('change',edited);
    kind.addEventListener('change',()=>{edited();draft.kind=kind.value as SleepEndpoint['kind'];draft.expanded=true;this.render();});
    form.append(fields,preview,details);updatePreview();
    form.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement>('input,button,select').forEach(control=>control.disabled=this.saving||!context.canRecord||Boolean(control.hidden));
    form.addEventListener('submit',event=>{event.preventDefault();edited();this.options.track(this.save(draft,context));});
    return form;
  }
  private async save(draft:Draft,context:Context):Promise<boolean>{
    if(this.saving||this.draft!==draft||this.identity(context)!==this.identity(this.context))return false;
    if(this.facts(draft.habitKey).length>1){this.status={key:'sleep.conflictHelp'};this.render();return false;}
    let endpoint:SleepEndpoint;
    try{
      if(draft.kind==='point')endpoint={kind:'point',...sleepPointForLivedDay(context.date,draft.time,draft.approximate)};
      else if(draft.kind==='range')endpoint={kind:'range',start:sleepPointForLivedDay(context.date,draft.time,false),end:sleepPointForLivedDay(context.date,draft.endTime,false),reportedText:draft.text};
      else if(draft.kind==='text')endpoint={kind:'text',date:context.date,text:draft.text};
      else endpoint={kind:draft.kind};
    }catch(error){this.status={key:'sleep.saveFailed',error:String(error)};this.render();return false;}
    const generation=this.generation;
    this.saving=true;this.status=null;this.request+=1;this.render();
    try{
      const input={habitKey:draft.habitKey,livedDate:context.date,endpoint,recordId:draft.recordId,changeId:draft.changeId,targetBinding:draft.targetBinding,expectedRevision:draft.expectedRevision};
      const saved=await this.options.invoke<SleepView>('save_habit_sleep_time',{input});
      if(saved.targetBinding!==draft.targetBinding)throw new Error('尚未确认保存读回。');
      if(generation!==this.generation||this.identity(context)!==this.identity(this.context)||this.draft!==draft)return true;
      this.data=saved;this.draft=null;this.status={key:'sleep.savedReadback'};this.options.saved();return true;
    }catch(error){
      if(generation===this.generation&&this.identity(context)===this.identity(this.context)&&this.draft===draft)this.status={key:'sleep.saveFailed',error:String(error)};
      return false;
    }finally{
      if(generation===this.generation&&this.identity(context)===this.identity(this.context)){this.saving=false;this.render();}
    }
  }
}
