import {habitSettingsGoalLabel, type HabitGoal, type HabitSettings} from './habit-settings.js';
import {localizeHabitDetail, type HabitDetail} from './interface-language.js';
import type {HabitLocalCompletionState} from './habit-completion.js';
import type {HabitLocalizedNames} from './habit-presentation.js';

type Language='zh'|'en';
type GoalRevision=Readonly<{effectiveDate:string;validThrough:string|null;goal:HabitGoal}>;
type DetailCell=Readonly<{date:string;coverage:string;status:string;countsAsCompletion:boolean;localCompletionState:HabitLocalCompletionState;hasExternalCompletion:boolean;completionSourceLabels:readonly string[];details:readonly HabitDetail[]}>;
export type DetailHabit=Readonly<{key:string;name:string;localizedNames:HabitLocalizedNames;active:boolean;canRecordCompletion:boolean;goalKind:string;settings:HabitSettings|null;currentGoal:HabitGoal|null;pendingGoal:Readonly<{effectiveDate:string;goal:HabitGoal}>|null;partialCycle:boolean;today:Readonly<{date:string;localCompletionState:HabitLocalCompletionState}>;sourceLabels:readonly string[];completedCount?:number|null;weeklyTarget?:number|null}>;
type Snapshot=Readonly<{catalogTargetBinding:string|null;catalogRevision:string|null;habits:readonly DetailHabit[]}>;
type Streak=Readonly<{unit:string;current:number;currentConfirmed:boolean;highestKnown:number;highestConfirmed:boolean}>;
export type HabitDetailsView=Readonly<{
 habit:DetailHabit;catalogRevision:string|null;catalogTargetBinding:string|null;completionRevision:string|null;completionTargetBinding:string|null;
 statistics:Readonly<{totalAttainedDays:number;monthAttainedDays:number;totalExact:boolean;monthExact:boolean;currentStreak:number;currentConfirmed:boolean;highestKnownStreak:number;highestConfirmed:boolean;unit:string;streaks:readonly Streak[];coverageFrom:string;coverageTo:string;unknownDays:number}>;
 sourceState:string;sourceGeneratedAt:string|null;sourceMessage:string;
 sources:readonly Readonly<{generatedAt:string;rangeFrom:string;rangeTo:string;producerLabel:string}>[];sourceWarnings:readonly string[];
 records:readonly Readonly<{cell:DetailCell;canCorrect:boolean;localChanges:readonly Readonly<{state:HabitLocalCompletionState;changedAt:string}>[]}>[];
 recordCount:number;offset:number;nextOffset:number|null;goalRevisions:readonly GoalRevision[];activityChanges:readonly Readonly<{active:boolean;livedDate:string;changedAt:string}>[];
}>;
type Ports=Readonly<{
 selection:HTMLElement;defaultPane:HTMLElement;detailPane:HTMLElement;
 language:()=>Language;name:(habit:DetailHabit)=>string;
 invoke:<T>(command:string,args:Record<string,unknown>)=>Promise<T>;
 edit:(key:string)=>void;completeToday:(key:string,date:string,completed:boolean)=>Promise<boolean>;
 onChanged:()=>Promise<void>;track:(operation:Promise<boolean>)=>unknown;
}>;

/** Owns selected-detail navigation and revision-bound operations; default DOM stays mounted. */
export class HabitDetailsController {
 private snapshot:Snapshot|null=null;
 private selected:string|null=null;
 private detail:HabitDetailsView|null=null;
 private generation=0;
 private showInactive=false;
 private busy=false;
 private message='';
 private operationIds=new Map<string,string>();
 constructor(private ports:Ports){this.ports.detailPane.classList.add('habit-selected-detail');}
 private copy(zh:string,en:string){return this.ports.language()==='zh'?zh:en;}
 update(snapshot:Snapshot){
  const changedTarget=this.snapshot && this.snapshot.catalogTargetBinding!==snapshot.catalogTargetBinding;
  this.snapshot=snapshot;
  if(changedTarget || (this.selected && !snapshot.habits.some(habit=>habit.key===this.selected))){this.back();this.showInactive=false;}
  this.renderSelection();
  if(this.selected)void this.load();
 }
 clear(){this.snapshot=null;this.showInactive=false;this.back();this.renderSelection();}
 select(key:string){if(!this.snapshot?.habits.some(habit=>habit.key===key))return;this.selected=key;this.detail=null;this.message='';this.renderSelection();this.ports.defaultPane.hidden=true;this.ports.detailPane.hidden=false;void this.load();}
 back(){this.generation++;this.selected=null;this.detail=null;this.message='';this.ports.defaultPane.hidden=false;this.ports.detailPane.hidden=true;this.ports.detailPane.replaceChildren();this.renderSelection();}
 private button(label:string,action:()=>void){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);return button;}
 private line(text:string,tag='p'){const element=document.createElement(tag);element.textContent=text;return element;}
 private renderSelection(){
  const rows=(this.snapshot?.habits??[]).filter(habit=>habit.active);
  const list=document.createDocumentFragment();
  for(const habit of rows)list.append(this.selectionRow(habit));
  const toggle=this.button(this.showInactive?this.copy('收起停用','Hide inactive'):this.copy('查看停用','View inactive'),()=>{this.showInactive=!this.showInactive;this.renderSelection();});
  toggle.className='habit-inactive-toggle';toggle.setAttribute('aria-expanded',String(this.showInactive));list.append(toggle);
  if(this.showInactive){const inactive=(this.snapshot?.habits??[]).filter(habit=>!habit.active);for(const habit of inactive)list.append(this.selectionRow(habit));if(!inactive.length)list.append(this.line(this.copy('没有停用的习惯','No inactive habits'),'small'));}
  this.ports.selection.replaceChildren(list);
 }
 private selectionRow(habit:DetailHabit){
  const row=this.button(this.ports.name(habit),()=>this.select(habit.key));row.className='habits-summary-row habit-detail-selector';row.dataset.habitKey=habit.key;row.setAttribute('aria-label',this.ports.name(habit));row.setAttribute('aria-pressed',String(this.selected===habit.key));
  const label=document.createElement('span');label.textContent=this.ports.name(habit);const goal=document.createElement('small');goal.textContent=habit.active?habitSettingsGoalLabel(habit.currentGoal??{kind:'unconfigured'},this.ports.language()):this.copy('已停用','Inactive');const value=document.createElement('strong');value.textContent=habit.active&&habit.goalKind==='weekly-count'&&habit.completedCount!==undefined&&habit.completedCount!==null?`${habit.completedCount}${habit.weeklyTarget!==null&&habit.weeklyTarget!==undefined?` / ${habit.weeklyTarget}`:''}`:'';row.replaceChildren(label,value,goal);return row;
 }
 private async load(offset=0){
  const key=this.selected,target=this.snapshot?.catalogTargetBinding;if(!key||!target)return;
  const request=++this.generation;
  this.renderDetail();
  try{
   const view=await this.ports.invoke<HabitDetailsView>('habit_details',{habitKey:key,offset,limit:30});
   if(request!==this.generation||this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return;
   if(view.habit.key!==key||view.catalogTargetBinding!==target)throw Error(this.copy('详情目标已变化，请重新读取。','The detail target changed. Read again.'));
   if(offset && this.detail && (this.detail.catalogRevision!==view.catalogRevision||this.detail.completionRevision!==view.completionRevision||this.detail.sourceGeneratedAt!==view.sourceGeneratedAt)){this.message=this.copy('记录已变化，已重新读取第一页。','Records changed. Reading the first page again.');void this.load();return;}
   this.detail=offset&&this.detail?{...view,records:[...this.detail.records,...view.records]}:view;this.renderDetail();
  }catch(error){if(request!==this.generation)return;this.message=String(error);this.renderDetail();}
 }
 private operationId(signature:string){let id=this.operationIds.get(signature);if(!id){id=crypto.randomUUID();this.operationIds.set(signature,id);}return id;}
 private mutate(action:()=>Promise<boolean>){if(this.busy)return;const key=this.selected,target=this.snapshot?.catalogTargetBinding;this.busy=true;this.message='';this.renderDetail();const operation=action().catch(error=>{if(this.selected===key&&this.snapshot?.catalogTargetBinding===target)this.message=String(error);return false;}).finally(()=>{this.busy=false;this.renderDetail();});this.ports.track(operation);}
 private async lifecycle(){
  const detail=this.detail,key=this.selected,target=this.snapshot?.catalogTargetBinding;if(!detail||!key||!target)return false;
  const active=!detail.habit.active;const signature=`${target}:${key}:active:${active}`;
  const saved=await this.ports.invoke<Snapshot>('set_habit_active',{input:{habitKey:key,active,changeId:this.operationId(signature),targetBinding:target,expectedRevision:detail.catalogRevision}});
  if(saved.catalogTargetBinding!==target||saved.habits.find(habit=>habit.key===key)?.active!==active)throw Error(this.copy('保存读回未确认；可以安全重试。','Saved readback was not confirmed. Retry safely.'));
  this.operationIds.delete(signature);
  if(this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return true;
  await this.ports.onChanged();await this.load();return true;
 }
 private async correction(cell:DetailCell){
  const detail=this.detail,key=this.selected,target=this.snapshot?.catalogTargetBinding;if(!detail||!key||!target||!detail.completionTargetBinding)return false;
  const completed=cell.localCompletionState!=='completed';const signature=`${detail.completionTargetBinding}:${key}:${cell.date}:${completed}`;
  await this.ports.invoke('set_historical_habit_completion',{input:{habitKey:key,livedDate:cell.date,completed,changeId:this.operationId(signature),targetBinding:detail.completionTargetBinding,expectedRevision:detail.completionRevision}});
  const reread=await this.ports.invoke<HabitDetailsView>('habit_details',{habitKey:key,offset:0,limit:30});
  if(reread.catalogTargetBinding!==target)throw Error(this.copy('Vault 已变化；请重新读取。','The Vault changed. Read again.'));
  // Historical dates may be on later pages; the command itself verifies persisted canonical bytes.
  this.operationIds.delete(signature);
  if(this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return true;
  this.detail=reread;await this.ports.onChanged();await this.load();return true;
 }
 private renderDetail(){
  if(!this.selected)return;
  const pane=this.ports.detailPane;pane.hidden=false;pane.dataset.habitKey=this.selected;
  const back=this.button(this.copy('返回今日列表','Back to today list'),()=>this.back());back.className='habit-detail-back';
  const status=this.line(this.message||(!this.detail?this.copy('正在读取详情…','Reading details…'):''));status.setAttribute('role','status');status.className='habit-detail-status';
  const elements:Node[]=[back,status];
  if(this.message)elements.push(this.button(this.copy('重新读取','Read again'),()=>{this.message='';void this.load();}));
  const detail=this.detail;if(!detail){pane.replaceChildren(...elements);return;}
  const habit=detail.habit,language=this.ports.language();const heading=this.line(`${habit.settings?.emoji?habit.settings.emoji+' ':''}${this.ports.name(habit)}`,'h3');
  const identity=document.createElement('header');identity.className='habit-detail-identity';identity.append(heading,this.line(`${this.copy('开始日期','Start date')}: ${habit.settings?.startDate??this.copy('来源未提供','Not supplied by source')}`),this.line(`${this.copy('当前目标','Current goal')}: ${habitSettingsGoalLabel(habit.currentGoal??{kind:'unconfigured'},language)}`));
  if(habit.pendingGoal)identity.append(this.line(`${this.copy('待生效','Pending')} ${habit.pendingGoal.effectiveDate}: ${habitSettingsGoalLabel(habit.pendingGoal.goal,language)}`));
  if(habit.partialCycle)identity.append(this.line(this.copy('部分周期，不计完整连续。','Partial cycle, excluded from full-cycle streaks.')));
  if(!habit.active)identity.append(this.line(this.copy('已停用；停用期间不要求打卡。恢复从新活动段开始。','Inactive. No check-in is required during the pause. Restore starts a new activity segment.')));
  const actions=document.createElement('div');actions.className='habit-detail-actions';
  const edit=this.button(this.copy('编辑','Edit'),()=>this.ports.edit(habit.key));edit.disabled=this.busy;const lifecycle=this.button(habit.active?this.copy('停用','Deactivate'):this.copy('恢复','Restore'),()=>this.mutate(()=>this.lifecycle()));lifecycle.disabled=this.busy;actions.append(edit,lifecycle);
  if(habit.active&&habit.canRecordCompletion){const complete=this.button(habit.today.localCompletionState==='completed'?this.copy('撤回今日本地完成','Withdraw today local completion'):this.copy('今日打卡','Check in today'),()=>this.mutate(async()=>{const saved=await this.ports.completeToday(habit.key,habit.today.date,habit.today.localCompletionState!=='completed');if(saved)await this.load();return saved;}));complete.disabled=this.busy;actions.append(complete);}
  identity.append(actions);elements.push(identity);
  const stats=detail.statistics,metrics=document.createElement('section');metrics.className='habit-detail-statistics';
  metrics.append(this.line(this.copy('达标与连续','Attainment and streaks'),'h4'));
  const count=(value:number,exact:boolean)=>this.copy(`${exact?'':'已知至少 '}${value} 个达标天`,`${exact?'':'At least '}${value} attained days`);
  metrics.append(this.line(`${this.copy('本月','This month')}: ${count(stats.monthAttainedDays,stats.monthExact)}`),this.line(`${this.copy('累计','Total')}: ${count(stats.totalAttainedDays,stats.totalExact)}`));
  for(const streak of stats.streaks){const unit=streak.unit==='weeks'?this.copy('周','weeks'):this.copy('天','days');metrics.append(this.line(`${this.copy('当前连续','Current streak')}: ${streak.currentConfirmed?'':this.copy('可确认至少 ','At least ')}${streak.current} ${unit}${streak.currentConfirmed?'':this.copy('（完整连续未知）',' (full streak unknown)')}`),this.line(`${streak.highestConfirmed?this.copy('已确认历史最高','Confirmed lifetime highest'):this.copy('最高已知','Highest known')}: ${streak.highestKnown} ${unit}${streak.highestConfirmed?'':this.copy('（全历史最高未知）',' (lifetime maximum unknown)')}`));}
  metrics.append(this.line(`${this.copy('已读取区间','Read range')}: ${stats.coverageFrom} — ${stats.coverageTo} · ${this.copy('未知活动日','Unknown active days')}: ${stats.unknownDays}`,'small'));elements.push(metrics);
  const provenance=document.createElement('details');provenance.className='habit-detail-provenance';provenance.append(this.line(this.copy('目标、活动与来源','Goals, activity and sources'),'summary'));
  for(const revision of detail.goalRevisions)provenance.append(this.line(`${revision.effectiveDate} — ${revision.validThrough??this.copy('持续 / 至下一目标','ongoing / until next goal')}: ${habitSettingsGoalLabel(revision.goal,language)}`));
  for(const change of detail.activityChanges)provenance.append(this.line(`${change.livedDate}: ${change.active?this.copy('恢复','Restored'):this.copy('停用','Deactivated')} · ${change.changedAt}`));
  const sourceStates:Record<string,string>={ready:this.copy('已读取','Read'),stale:this.copy('来源较旧','Source stale'),retained:this.copy('保留原读数','Previous reading retained'),missing:this.copy('来源缺失','Source missing'),error:this.copy('来源错误','Source error'),unconfigured:this.copy('未配置来源','Source unconfigured')};
  provenance.append(this.line(`${this.copy('来源状态','Source state')}: ${sourceStates[detail.sourceState]??detail.sourceState} · ${detail.sourceGeneratedAt??this.copy('未知','unknown')}`));
  for(const source of detail.sources)provenance.append(this.line(`${source.producerLabel} · ${source.rangeFrom} — ${source.rangeTo} · ${source.generatedAt}`));
  for(const warning of detail.sourceWarnings)provenance.append(this.line(warning));elements.push(provenance);
  const history=document.createElement('section');history.className='habit-detail-records';history.append(this.line(this.copy('历史记录','History records'),'h4'),this.line(this.copy(`已显示 ${detail.records.length} / ${detail.recordCount} 个有记录或覆盖的日期；未读取缺口保持未知。`,`Showing ${detail.records.length} / ${detail.recordCount} dates with evidence or coverage. Unread gaps remain unknown.`),'small'));
  for(const record of detail.records){const row=document.createElement('article');row.className='habit-detail-record';row.append(this.line(record.cell.date,'strong'),this.line(`${record.cell.countsAsCompletion?this.copy('已达标','Attained'):this.copy('未确认达标','Attainment not confirmed')} · ${this.copy('覆盖','Coverage')}: ${record.cell.coverage}`));for(const fact of record.cell.details)row.append(this.line(localizeHabitDetail(fact,language),'small'));if(record.cell.hasExternalCompletion)row.append(this.line(this.copy('外部完成证据独立保留，撤回本地完成不会删除外部记录。','External completion evidence is retained independently. Withdrawing local completion does not remove it.'),'small'));
   if(record.localChanges.length){const changes=document.createElement('details');changes.append(this.line(this.copy('本地变更记录','Local change history'),'summary'));for(const change of record.localChanges)changes.append(this.line(`${change.changedAt} · ${change.state==='completed'?this.copy('完成','Completed'):this.copy('撤回','Withdrawn')}`));row.append(changes);}
   if(record.canCorrect){const correct=this.button(record.cell.localCompletionState==='completed'?this.copy('撤回本地完成','Withdraw local completion'):this.copy('记录本地完成','Record local completion'),()=>this.mutate(()=>this.correction(record.cell)));correct.disabled=this.busy;row.append(correct);}history.append(row);
  }
  if(detail.nextOffset!==null){const more=this.button(this.copy('读取更早记录','Load older records'),()=>{void this.load(detail.nextOffset??0);});more.disabled=this.busy;history.append(more);}elements.push(history);pane.replaceChildren(...elements);
 }
}
