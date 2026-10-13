import {
  habitSettingsGoalLabel, setHabitGoalCopy, type HabitGoal, type HabitSettings
} from './habit-settings.js';
import {
  localizeHabitDetail, interfaceCopy, setInterfaceCopy, setInterfaceError, setApplicationMessage, type InterfaceCopyKey, type HabitDetail
} from './interface-language.js';
import type {
  HabitLocalCompletionState
} from './habit-completion.js';
import type {
  HabitLocalizedNames
} from './habit-presentation.js';
type Language='zh'|'en';
type GoalRevision=Readonly< {
  effectiveDate:string;
  validThrough:string|null;
  goal:HabitGoal
} >;
type DetailCell=Readonly< {
  date:string;
  coverage:string;
  status:string;
  countsAsCompletion:boolean;
  localCompletionState:HabitLocalCompletionState;
  hasExternalCompletion:boolean;
  completionSourceLabels:readonly string[];
  details:readonly HabitDetail[]
} >;
export type DetailHabit=Readonly< {
  key:string;
  name:string;
  localizedNames:HabitLocalizedNames;
  active:boolean;
  canRecordCompletion:boolean;
  goalKind:string;
  settings:HabitSettings|null;
  currentGoal:HabitGoal|null;
  pendingGoal:Readonly< {
    effectiveDate:string;
    goal:HabitGoal
  } >|null;
  partialCycle:boolean;
  today:Readonly< {
    date:string;
    localCompletionState:HabitLocalCompletionState
  } >;
  sourceLabels:readonly string[];
  completedCount?:number|null;
  weeklyTarget?:number|null
} >;
type Snapshot=Readonly< {
  catalogTargetBinding:string|null;
  catalogRevision:string|null;
  habits:readonly DetailHabit[]
} >;
type Streak=Readonly< {
  unit:string;
  current:number;
  currentConfirmed:boolean;
  highestKnown:number;
  highestConfirmed:boolean
} >;
export type HabitDetailsView=Readonly< {
  habit:DetailHabit;
  startDateKnown:boolean;
  catalogRevision:string|null;
  catalogTargetBinding:string|null;
  completionRevision:string|null;
  completionTargetBinding:string|null;
  statistics:Readonly< {
    totalAttainedDays:number;
    monthAttainedDays:number;
    totalExact:boolean;
    monthExact:boolean;
    currentStreak:number;
    currentConfirmed:boolean;
    highestKnownStreak:number;
    highestConfirmed:boolean;
    unit:string;
    streaks:readonly Streak[];
    coverageFrom:string;
    coverageTo:string;
    unknownDays:number
  } >;
  sourceState:string;
  sourceGeneratedAt:string|null;
  sourceMessage:string;
  sources:readonly Readonly< {
    generatedAt:string;
    rangeFrom:string;
    rangeTo:string;
    producerLabel:string
  } >[];
  sourceWarnings:readonly string[];
  records:readonly Readonly< {
    cell:DetailCell;
    canCorrect:boolean;
    localChanges:readonly Readonly< {
      state:HabitLocalCompletionState;
      changedAt:string
    } >[]
  } >[];
  recordCount:number;
  offset:number;
  nextOffset:number|null;
  goalRevisions:readonly GoalRevision[];
  activityChanges:readonly Readonly< {
    active:boolean;
    livedDate:string;
    changedAt:string
  } >[];
} >;
type Ports=Readonly< {
  selection:HTMLElement;
  defaultPane:HTMLElement;
  detailPane:HTMLElement;
  language:()=>Language;
  name:(habit:DetailHabit)=>string;
  invoke:<T>(command:string,args:Record<string,unknown>)=>Promise<T>;
  edit:(key:string)=>void;
  completeToday:(key:string,date:string,completed:boolean)=>Promise<boolean>;
  onChanged:()=>Promise<void>;
  track:(operation:Promise<boolean>)=>unknown;
} >;
/** Owns selected-detail navigation and revision-bound operations; default DOM stays mounted. */
export class HabitDetailsController {
  private snapshot:Snapshot|null=null;
  private selected:string|null=null;
  private detail:HabitDetailsView|null=null;
  private generation=0;
  private showInactive=false;
  private busy=false;
  private message='';
  private messageKey: InterfaceCopyKey | null = null;
  private operationIds=new Map<string,string>();
  constructor(private ports:Ports) {
    this.ports.detailPane.classList.add('habit-selected-detail');
  }
private copy(key: InterfaceCopyKey, values: Record<string,string|number> = {}) {
    return interfaceCopy(key, this.ports.language(), values);
  }
private lineCopy(key: InterfaceCopyKey, tag = 'p', values: Record<string,string|number> = {}) {
    const element = document.createElement(tag);
    setInterfaceCopy(element, key, this.ports.language(), values);
    return element;
  }
private buttonCopy(key: InterfaceCopyKey, action: () => void) {
    const button = this.button('', action);
    setInterfaceCopy(button, key, this.ports.language());
    return button;
  }
private goalLine(key: InterfaceCopyKey, goal: HabitGoal, values: Record<string,string|number> = {}) {
    const line = document.createElement('p'), caption = this.lineCopy(key, 'span', values), value = document.createElement('span');
    setHabitGoalCopy(value, goal, this.ports.language());
    line.append(caption, value);
    return line;
  } update(snapshot:Snapshot) {
    const changedTarget=this.snapshot && this.snapshot.catalogTargetBinding!==snapshot.catalogTargetBinding;
    this.snapshot=snapshot;
    if(changedTarget || (this.selected && !snapshot.habits.some(habit=>habit.key===this.selected))) {
      this.back();
      this.showInactive=false;
    } this.renderSelection();
    if(this.selected)void this.load();
  } clear() {
    this.snapshot=null;
    this.showInactive=false;
    this.back();
    this.renderSelection();
  } select(key:string) {
    if(!this.snapshot?.habits.some(habit=>habit.key===key))return;
    this.selected=key;
    this.detail=null;
    this.message='';
    this.messageKey=null;
    this.renderSelection();
    this.ports.defaultPane.hidden=true;
    this.ports.detailPane.hidden=false;
    void this.load();
  } back() {
    this.generation++;
    this.selected=null;
    this.detail=null;
    this.message='';
    this.messageKey=null;
    this.ports.defaultPane.hidden=false;
    this.ports.detailPane.hidden=true;
    this.ports.detailPane.replaceChildren();
    this.renderSelection();
  }
private button(label:string,action:()=>void) {
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.addEventListener('click',action);
    return button;
  }
private line(text:string,tag='p') {
    const element=document.createElement(tag);
    element.textContent=text;
    return element;
  }
private renderSelection() {
    const rows=(this.snapshot?.habits??[]).filter(habit=>habit.active);
    const list=document.createDocumentFragment();
    for(const habit of rows)list.append(this.selectionRow(habit));
    const toggle=this.buttonCopy(this.showInactive?"habits.detailHideInactive":"habits.detailViewInactive",()=> {
      this.showInactive=!this.showInactive; this.renderSelection();
    });
    toggle.className='habit-inactive-toggle';
    toggle.setAttribute('aria-expanded',String(this.showInactive));
    list.append(toggle);
    if(this.showInactive) {
      const inactive=(this.snapshot?.habits??[]).filter(habit=>!habit.active);
      for(const habit of inactive)list.append(this.selectionRow(habit));
      if(!inactive.length)list.append(this.lineCopy("habits.detailNoInactiveHabits",'small'));
    } this.ports.selection.replaceChildren(list);
  }
private selectionRow(habit:DetailHabit) {
    const row=this.button(this.ports.name(habit),()=>this.select(habit.key));
    row.className='habits-summary-row habit-detail-selector';
    row.dataset.habitKey=habit.key;
    row.setAttribute('aria-label',this.ports.name(habit));
    row.setAttribute('aria-pressed',String(this.selected===habit.key));
    const label=document.createElement('span');
    label.textContent=this.ports.name(habit);
    const goal=document.createElement('small');
    if(habit.active)setHabitGoalCopy(goal,habit.currentGoal?? {
      kind:'unconfigured'
    },this.ports.language());
    else setInterfaceCopy(goal,'habits.detailInactive',this.ports.language());
    const value=document.createElement('strong');
    value.textContent=habit.active&&habit.goalKind==='weekly-count'&&habit.completedCount!==undefined&&habit.completedCount!==null?`${habit.completedCount}${habit.weeklyTarget!==null&&habit.weeklyTarget!==undefined?` / $ {
      habit.weeklyTarget
    } `:''}`:'';
    row.replaceChildren(label,value,goal);
    return row;
  }
private async load(offset=0) {
    const key=this.selected,target=this.snapshot?.catalogTargetBinding;
    if(!key||!target)return;
    const request=++this.generation;
    this.renderDetail();
    try {
      const view=await this.ports.invoke<HabitDetailsView>('habit_details', {
        habitKey:key,offset,limit:30
      });
      if(request!==this.generation||this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return;
      if(view.habit.key!==key||view.catalogTargetBinding!==target)throw Error(this.copy("habits.detailTheDetailTargetChangedReadAgain"));
      if(offset && this.detail && (this.detail.catalogRevision!==view.catalogRevision||this.detail.completionRevision!==view.completionRevision||this.detail.sourceGeneratedAt!==view.sourceGeneratedAt)) {
        this.messageKey="habits.detailRecordsChangedReadingTheFirstPageAgain";
        void this.load();
        return;
      } this.detail=offset&&this.detail? {
        ...view,records:[...this.detail.records,...view.records]
      }:view;
      this.renderDetail();
    } catch(error) {
      if(request!==this.generation)return;
      this.message=String(error);
      this.renderDetail();
    }
  }
private operationId(signature:string) {
    let id=this.operationIds.get(signature);
    if(!id) {
      id=crypto.randomUUID();
      this.operationIds.set(signature,id);
    } return id;
  }
private mutate(action:()=>Promise<boolean>) {
    if(this.busy)return;
    const key=this.selected,target=this.snapshot?.catalogTargetBinding;
    this.busy=true;
    this.message='';
    this.messageKey=null;
    this.renderDetail();
    const operation=action().catch(error=> {
      if(this.selected===key&&this.snapshot?.catalogTargetBinding===target)this.message=String(error); return false;
    }).finally(()=> {
      this.busy=false; this.renderDetail();
    });
    this.ports.track(operation);
  }
private async lifecycle() {
    const detail=this.detail,key=this.selected,target=this.snapshot?.catalogTargetBinding;
    if(!detail||!key||!target)return false;
    const active=!detail.habit.active;
    const signature=`${target}:${key}:active:${active}`;
    const saved=await this.ports.invoke<Snapshot>('set_habit_active', {
      input: {
        habitKey:key,active,changeId:this.operationId(signature),targetBinding:target,expectedRevision:detail.catalogRevision
      }
    });
    if(saved.catalogTargetBinding!==target||saved.habits.find(habit=>habit.key===key)?.active!==active)throw Error(this.copy("habits.detailSavedReadbackWasNotConfirmedRetrySafely"));
    this.operationIds.delete(signature);
    if(this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return true;
    await this.ports.onChanged();
    await this.load();
    return true;
  }
private async correction(cell:DetailCell) {
    const detail=this.detail,key=this.selected,target=this.snapshot?.catalogTargetBinding;
    if(!detail||!key||!target||!detail.completionTargetBinding)return false;
    const completed=cell.localCompletionState!=='completed';
    const signature=`${detail.completionTargetBinding}:${key}:${cell.date}:${completed}`;
    await this.ports.invoke('set_historical_habit_completion', {
      input: {
        habitKey:key,livedDate:cell.date,completed,changeId:this.operationId(signature),targetBinding:detail.completionTargetBinding,expectedRevision:detail.completionRevision
      }
    });
    const reread=await this.ports.invoke<HabitDetailsView>('habit_details', {
      habitKey:key,offset:0,limit:30
    });
    if(reread.catalogTargetBinding!==target)throw Error(this.copy("habits.detailTheVaultChangedReadAgain"));
    // Historical dates may be on later pages; the command itself verifies persisted canonical bytes.
    this.operationIds.delete(signature);
    if(this.selected!==key||this.snapshot?.catalogTargetBinding!==target)return true;
    this.detail=reread;
    await this.ports.onChanged();
    await this.load();
    return true;
  }
private renderDetail() {
    if(!this.selected)return;
    const pane=this.ports.detailPane;
    pane.hidden=false;
    pane.dataset.habitKey=this.selected;
    const back=this.buttonCopy("habits.detailBackToTodayList",()=>this.back());
    back.className='habit-detail-back';
    const status=this.line('');
    if(this.message) setInterfaceError(status,'habits.detailFailure',this.message,this.ports.language());
    else if(this.messageKey)setInterfaceCopy(status,this.messageKey,this.ports.language());
    else if(!this.detail)setInterfaceCopy(status,'habits.detailReadingDetails',this.ports.language());
    status.setAttribute('role','status');
    status.className='habit-detail-status';
    const elements:Node[]=[back,status];
    if(this.message||this.messageKey)elements.push(this.buttonCopy("habits.detailReadAgain",()=> {
      this.message=''; this.messageKey=null; void this.load();
    }));
    const detail=this.detail;
    if(!detail) {
      pane.replaceChildren(...elements);
      return;
    } const habit=detail.habit,language=this.ports.language();
    const heading=this.line(`${habit.settings?.emoji?habit.settings.emoji+' ':''}${this.ports.name(habit)}`,'h3');
    const identity=document.createElement('header');
    identity.className='habit-detail-identity';
    identity.append(heading, detail.startDateKnown && habit.settings ? this.lineCopy('habits.detailStartDateValue','p', {
      date:habit.settings.startDate
    }) : this.lineCopy('habits.detailOriginalStartDateNotSuppliedBySource'), this.goalLine('habits.settingsCurrentGoal',habit.currentGoal?? {
      kind:'unconfigured'
    }));
    if(habit.pendingGoal)identity.append(this.goalLine('habits.settingsPendingGoal',habit.pendingGoal.goal, {
      date:habit.pendingGoal.effectiveDate
    }));
    if(habit.partialCycle)identity.append(this.lineCopy("habits.detailPartialCycleExcludedFromFullCycleStreaks"));
    if(!habit.active)identity.append(this.lineCopy("habits.detailInactiveNoCheckInIsRequiredDuringThePauseRestoreStartsANewActivitySegment"));
    const actions=document.createElement('div');
    actions.className='habit-detail-actions';
    const edit=this.buttonCopy("habits.detailEdit",()=>this.ports.edit(habit.key));
    edit.disabled=this.busy;
    const lifecycle=this.buttonCopy(habit.active?"habits.detailDeactivate":"habits.detailRestore",()=>this.mutate(()=>this.lifecycle()));
    lifecycle.disabled=this.busy;
    actions.append(edit,lifecycle);
    if(habit.active&&habit.canRecordCompletion) {
      const complete=this.buttonCopy(habit.today.localCompletionState==='completed'?"habits.detailWithdrawTodayLocalCompletion":"habits.detailCheckInToday",()=>this.mutate(async()=> {
        const saved=await this.ports.completeToday(habit.key,habit.today.date,habit.today.localCompletionState!=='completed'); if(saved)await this.load(); return saved;
      }));
      complete.disabled=this.busy;
      actions.append(complete);
    } identity.append(actions);
    elements.push(identity);
    const stats=detail.statistics,metrics=document.createElement('section');
    metrics.className='habit-detail-statistics';
    metrics.append(this.lineCopy("habits.detailAttainmentAndStreaks",'h4'));
    metrics.append(this.lineCopy(stats.monthExact?'habits.detailMonthExact':'habits.detailMonthMinimum','p', {
      count:stats.monthAttainedDays
    }), this.lineCopy(stats.totalExact?'habits.detailTotalExact':'habits.detailTotalMinimum','p', {
      count:stats.totalAttainedDays
    }));
    for(const streak of stats.streaks) {
      const weeks=streak.unit==='weeks';
      metrics.append(this.lineCopy(weeks?(streak.currentConfirmed?'habits.detailCurrentWeeks':'habits.detailCurrentWeeksMinimum'):(streak.currentConfirmed?'habits.detailCurrentDays':'habits.detailCurrentDaysMinimum'),'p', {
        count:streak.current
      }), this.lineCopy(weeks?(streak.highestConfirmed?'habits.detailHighestWeeks':'habits.detailHighestWeeksMinimum'):(streak.highestConfirmed?'habits.detailHighestDays':'habits.detailHighestDaysMinimum'),'p', {
        count:streak.highestKnown
      }));
    } metrics.append(this.lineCopy('habits.detailReadRange','small', {
      from:stats.coverageFrom,to:stats.coverageTo,count:stats.unknownDays
    }));
    elements.push(metrics);
    const provenance=document.createElement('details');
    provenance.className='habit-detail-provenance';
    provenance.append(this.lineCopy("habits.detailGoalsActivityAndSources",'summary'));
    for(const revision of detail.goalRevisions)provenance.append(this.goalLine(revision.validThrough?'habits.detailGoalRange':'habits.detailGoalOngoing',revision.goal, {
      from:revision.effectiveDate,to:revision.validThrough??''
    }));
    for(const change of detail.activityChanges)provenance.append(this.lineCopy(change.active?'habits.detailRestoredAt':'habits.detailDeactivatedAt','p', {
      date:change.livedDate,time:change.changedAt
    }));
    const sourceStates:Record<string,InterfaceCopyKey>= {
      ready:'habits.detailRead',stale:'habits.detailSourceStale',retained:'habits.detailPreviousReadingRetained',missing:'habits.detailSourceMissing',error:'habits.detailSourceError',unconfigured:'habits.detailSourceUnconfigured'
    };
    if(habit.settings&&!detail.startDateKnown)provenance.append(this.lineCopy('habits.detailConfiguredStartRangeValue','p', {
      date:habit.settings.startDate
    }));
    const sourceState=document.createElement('p');
    sourceState.append(this.lineCopy('habits.detailSourceStateCaption','span'), sourceStates[detail.sourceState]?this.lineCopy(sourceStates[detail.sourceState],'span'):this.line(detail.sourceState,'span'),this.line(' · '+(detail.sourceGeneratedAt??''),'span'));
    if(!detail.sourceGeneratedAt)sourceState.append(this.lineCopy('habits.detailUnknown','span'));
    provenance.append(sourceState);
    if(detail.sourceMessage) {
      const message=this.line('');
      setApplicationMessage(message,detail.sourceMessage,language);
      provenance.append(message);
    } for(const source of detail.sources)provenance.append(this.line(`${source.producerLabel} · ${source.rangeFrom} — ${source.rangeTo} · ${source.generatedAt}`));
    for(const warning of detail.sourceWarnings) {
      const line=this.line('');
      setApplicationMessage(line,warning,language);
      provenance.append(line);
    } elements.push(provenance);
    const history=document.createElement('section');
    history.className='habit-detail-records';
    history.append(this.lineCopy("habits.detailHistoryRecords",'h4'),this.lineCopy('habits.detailRecordCount','small', {
      count:detail.records.length,total:detail.recordCount
    }));
    for(const record of detail.records) {
      const row=document.createElement('article');
      row.className='habit-detail-record';
      row.append(this.line(record.cell.date,'strong'),this.lineCopy(record.cell.countsAsCompletion?'habits.detailAttainedCoverage':'habits.detailUnconfirmedCoverage','p', {
        coverage:record.cell.coverage
      }));
      for(const fact of record.cell.details)row.append(this.line(localizeHabitDetail(fact,language),'small'));
      if(record.cell.hasExternalCompletion)row.append(this.lineCopy("habits.detailExternalCompletionEvidenceIsRetainedIndependentlyWithdrawingLocalCompletionDoesNotRem",'small'));
      if(record.localChanges.length) {
        const changes=document.createElement('details');
        changes.append(this.lineCopy("habits.detailLocalChangeHistory",'summary'));
        for(const change of record.localChanges)changes.append(this.lineCopy(change.state==='completed'?'habits.detailCompletedAt':'habits.detailWithdrawnAt','p', {
          time:change.changedAt
        }));
        row.append(changes);
      }
if(record.canCorrect) {
        const correct=this.buttonCopy(record.cell.localCompletionState==='completed'?"habits.detailWithdrawLocalCompletion":"habits.detailRecordLocalCompletion",()=>this.mutate(()=>this.correction(record.cell)));
        correct.disabled=this.busy;
        row.append(correct);
      } history.append(row);
    }
if(detail.nextOffset!==null) {
      const more=this.buttonCopy("habits.detailLoadOlderRecords",()=> {
        void this.load(detail.nextOffset??0);
      });
      more.disabled=this.busy;
      history.append(more);
    } elements.push(history);
    pane.replaceChildren(...elements);
  }
}
