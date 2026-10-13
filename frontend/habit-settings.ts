import {
  interfaceCopy, setInterfaceCopy, setInterfaceError, type InterfaceCopyKey, type InterfaceLanguage
} from "./interface-language.js";
export type HabitGoal = | {
  kind: "daily-completion"
} | {
  kind: "weekly-days";
  days: number
} | {
  kind: "daily-time";
  time: string;
  dayRelation: "same-day" | "next-day" | "unresolved"
} | {
  kind: "unconfigured"
};
export type HabitSettings = {
  name: string;
  emoji: string | null;
  group: string | null;
  startDate: string;
  goal: HabitGoal;
};
export type HabitSettingsHabit = Readonly< {
  key: string;
  settings: HabitSettings | null;
  currentGoal: HabitGoal | null;
  pendingGoal: {
    effectiveDate: string;
    goal: HabitGoal
  } | null;
  goalLabel: string;
} >;
export type HabitSettingsSnapshot = Readonly< {
  catalogRevision: string | null;
  catalogTargetBinding: string | null;
  habits: readonly HabitSettingsHabit[];
} >;
export type HabitDefinitionRequest = {
  habitKey: string;
  changeId: string;
  targetBinding: string;
  expectedRevision: string | null;
  settings: HabitSettings;
};
/** Draft state is separate from saved settings; the backend owns persistence and cycles. */
export class HabitSettingsDraft {
  settings: HabitSettings;
  original: HabitSettingsHabit | undefined;
  habitKey: string;
  private binding: string;
  private revision: string | null;
  private nextId: () => string;
  private signature: string | null = null;
  private changeId: string | null = null;
  constructor(snapshot: HabitSettingsSnapshot, livedDate: string, habitKey?: string, nextId = () => crypto.randomUUID()) {
    if (!snapshot.catalogTargetBinding) throw new Error("Habit catalog / Vault is unavailable. Read again before saving.");
    this.original = snapshot.habits.find(habit => habit.key === habitKey);
    if (habitKey && !this.original?.settings) throw new Error("Habit settings unavailable. Read again before editing.");
    this.nextId = nextId;
    this.habitKey = habitKey ?? `local-${nextId()}`;
    this.binding = snapshot.catalogTargetBinding;
    this.revision = snapshot.catalogRevision;
    this.settings = structuredClone(this.original?.settings ?? {
      name: "", emoji: null, group: null, startDate: livedDate, goal: {
        kind: "daily-completion"
      },
    });
  } request(): HabitDefinitionRequest {
    const signature = JSON.stringify(this.settings);
    if (signature !== this.signature) {
      this.signature = signature;
      this.changeId = this.nextId();
    } return {
      habitKey: this.habitKey, changeId: this.changeId!, targetBinding: this.binding, expectedRevision: this.revision, settings: structuredClone(this.settings)
    };
  } reread(snapshot: HabitSettingsSnapshot): void {
    if (snapshot.catalogTargetBinding !== this.binding) throw new Error("Selected Vault changed. Reopen settings in the intended Vault.");
    this.revision = snapshot.catalogRevision;
    this.original = snapshot.habits.find(habit => habit.key === this.habitKey) ?? this.original;
  }
} function habitGoalCopy(goal: HabitGoal): {
  key: InterfaceCopyKey;
  values: Record<string,string|number>
} {
  if (goal.kind === "weekly-days") return {
    key:"habits.goalWeekly",values: {
      days:goal.days
    }
  };
  if (goal.kind === "daily-completion") return {
    key:"habits.goalDaily",values: {}
  };
  if (goal.kind === "unconfigured") return {
    key:"habits.goalNone",values: {}
  };
  return {
    key:goal.dayRelation === "next-day" ? "habits.goalTimeNext" : goal.dayRelation === "unresolved" ? "habits.goalTimeUnresolved" : "habits.goalTimeSame",values: {
      time:goal.time
    }
  };
}
export function habitSettingsGoalLabel(goal: HabitGoal, language: InterfaceLanguage): string {
  const copy=habitGoalCopy(goal);
  return interfaceCopy(copy.key,language,copy.values);
}
export function setHabitGoalCopy(element:HTMLElement,goal:HabitGoal,language:InterfaceLanguage):void {
  const copy=habitGoalCopy(goal);
  setInterfaceCopy(element,copy.key,language,copy.values);
}
export function showHabitSettingsDialog<Snapshot extends HabitSettingsSnapshot>(options: {
  snapshot: Snapshot; livedDate: string; language: InterfaceLanguage; habitKey?: string; save(input: HabitDefinitionRequest): Promise<Snapshot>; reread(): Promise<Snapshot>; onSaved(snapshot: Snapshot): void;
}): HTMLDialogElement {
  const draft=new HabitSettingsDraft(options.snapshot,options.livedDate,options.habitKey);
  const language=():InterfaceLanguage=>document.documentElement.lang ? (document.documentElement.lang.startsWith("zh")?"zh":"en") : options.language;
  const copy=(element:HTMLElement,key:InterfaceCopyKey,values:Record<string,string|number>= {})=>setInterfaceCopy(element,key,language(),values);
  const dialog=document.createElement("dialog");
  dialog.className="habit-settings-dialog";
  dialog.dataset.habitSettingsDialog=draft.habitKey;
  const form=document.createElement("form"),heading=document.createElement("h2");
  heading.id=`habit-settings-${draft.habitKey}`;
  copy(heading,options.habitKey?"habits.settingsEdit":"habits.settingsCreate");
  dialog.setAttribute("aria-labelledby",heading.id);
  const current=document.createElement("p"),pending=document.createElement("p");
  current.dataset.habitCurrentGoal="";
  pending.dataset.habitPendingGoal="";
  const updateGoals=()=> {
    current.hidden=!draft.original;
    pending.hidden=!draft.original?.pendingGoal;
    current.replaceChildren();
    pending.replaceChildren();
    if(draft.original) {
      const label=document.createElement("span"),goal=document.createElement("span");
      copy(label,"habits.settingsCurrentGoal");
      if(draft.original.currentGoal)setHabitGoalCopy(goal,draft.original.currentGoal,language());
      else goal.textContent=draft.original.goalLabel;
      current.append(label,goal);
    }
if(draft.original?.pendingGoal) {
      const label=document.createElement("span"),goal=document.createElement("span");
      copy(label,"habits.settingsPendingGoal", {
        date:draft.original.pendingGoal.effectiveDate
      });
      setHabitGoalCopy(goal,draft.original.pendingGoal.goal,language());
      pending.append(label,goal);
    }
  };
  updateGoals();
  const hint=document.createElement("p");
  hint.className="habit-settings-hint";
  copy(hint,"habits.settingsHint");
  form.append(heading,current,pending,hint);
  function inputField(key:InterfaceCopyKey,field:string,value:string,type="text") {
    const label=document.createElement("label"),text=document.createElement("span"),input=document.createElement("input");
    copy(text,key);
    input.type=type;
    input.name=field;
    input.dataset.i18nAriaLabel=key;
    input.setAttribute("aria-label",interfaceCopy(key,language()));
    input.value=value;
    label.append(text,input);
    form.append(label);
    return input;
  } const name=inputField("habits.settingsName","name",draft.settings.name);
  name.required=true;
  name.maxLength=100;
  const emoji=inputField("habits.settingsEmoji","emoji",draft.settings.emoji??"");
  emoji.maxLength=40;
  const group=inputField("habits.settingsGroup","group",draft.settings.group??"");
  group.maxLength=100;
  const start=inputField("habits.settingsStartDate","startDate",draft.settings.startDate,"date");
  start.required=true;
  const goalLabel=document.createElement("label"),goalText=document.createElement("span"),frequency=document.createElement("select");
  copy(goalText,"habits.settingsFrequency");
  frequency.name="frequency";
  frequency.dataset.i18nAriaLabel="habits.settingsFrequency";
  frequency.setAttribute("aria-label",interfaceCopy("habits.settingsFrequency",language()));
  const choices:[HabitGoal["kind"],InterfaceCopyKey][]=[["daily-completion","habits.goalDaily"],["weekly-days","habits.settingsWeekly"],["daily-time","habits.settingsTime"]];
  if(draft.settings.goal.kind==="unconfigured")choices.push(["unconfigured","habits.settingsNoGoal"]);
  for(const [value,key] of choices) {
    const option=document.createElement("option");
    option.value=value;
    copy(option,key);
    frequency.append(option);
  } frequency.value=draft.settings.goal.kind;
  goalLabel.append(goalText,frequency);
  form.append(goalLabel);
  const days=inputField("habits.settingsWeekly","days",draft.settings.goal.kind==="weekly-days"?String(draft.settings.goal.days):"3","number");
  days.min="1";
  days.max="7";
  const time=inputField("habits.settingsTargetTime","time",draft.settings.goal.kind==="daily-time"?draft.settings.goal.time:"","time");
  time.step="60";
  const relationLabel=document.createElement("label"),relationText=document.createElement("span"),relation=document.createElement("select");
  copy(relationText,"habits.settingsRelation");
  relation.name="dayRelation";
  relation.dataset.i18nAriaLabel="habits.settingsRelation";
  relation.setAttribute("aria-label",interfaceCopy("habits.settingsRelation",language()));
  for(const [value,key] of [["same-day","habits.settingsSameDay"],["next-day","habits.settingsNextDay"],["unresolved","habits.settingsUnresolved"]] as const) {
    const option=document.createElement("option");
    option.value=value;
    copy(option,key);
    relation.append(option);
  } relation.value=draft.settings.goal.kind==="daily-time"?draft.settings.goal.dayRelation:"same-day";
  relationLabel.append(relationText,relation);
  form.append(relationLabel);
  const updateFrequency=()=> {
    days.parentElement!.hidden=frequency.value!=="weekly-days";
    days.required=frequency.value==="weekly-days";
    days.disabled=frequency.value!=="weekly-days";
    time.parentElement!.hidden=frequency.value!=="daily-time";
    time.required=frequency.value==="daily-time";
    time.disabled=frequency.value!=="daily-time";
    relationLabel.hidden=frequency.value!=="daily-time";
    relation.disabled=frequency.value!=="daily-time";
  };
  frequency.addEventListener("change",updateFrequency);
  updateFrequency();
  const status=document.createElement("p");
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  const actions=document.createElement("div");
  actions.className="habit-settings-actions";
  const cancel=document.createElement("button"),reread=document.createElement("button"),save=document.createElement("button");
  cancel.type="button";
  reread.type="button";
  save.type="submit";
  copy(cancel,"habits.settingsCancel");
  copy(reread,"habits.settingsReread");
  copy(save,"habits.settingsSave");
  actions.append(cancel,reread,save);
  form.append(status,actions);
  dialog.append(form);
  let busy=false;
  function setBusy(value:boolean) {
    busy=value;
    for(const control of form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>("input,select,button"))control.disabled=value;
    if(!value)updateFrequency();
  } cancel.addEventListener("click",()=> {
    if(!busy)dialog.close();
  });
  dialog.addEventListener("cancel",event=> {
    if(busy)event.preventDefault();
  });
  dialog.addEventListener("close",()=>dialog.remove());
  reread.addEventListener("click",async()=> {
    if(busy)return; setBusy(true); try {
      draft.reread(await options.reread()); updateGoals(); copy(status,"habits.settingsRereadReady");
    } catch(error) {
      setInterfaceError(status,"habits.settingsReadFailed",String(error),language());
    } finally {
      setBusy(false);
    }
  });
  form.addEventListener("submit",async event=> {
    event.preventDefault(); if(busy)return; name.setCustomValidity(name.value.trim()?"":interfaceCopy("habits.settingsEnterName",language())); if(!form.reportValidity())return; const goal:HabitGoal=frequency.value==="weekly-days"? {
      kind:"weekly-days",days:Number(days.value)
    }:frequency.value==="daily-time"? {
      kind:"daily-time",time:time.value,dayRelation:relation.value as "same-day"|"next-day"|"unresolved"
    }:frequency.value==="unconfigured"? {
      kind:"unconfigured"
    }: {
      kind:"daily-completion"
    }; draft.settings= {
      name:name.value.trim(),emoji:emoji.value.trim()||null,group:group.value.trim()||null,startDate:start.value,goal
    }; const input=draft.request(); setBusy(true); copy(status,"habits.settingsSaving"); try {
      const snapshot=await options.save(input),saved=snapshot.habits.find(habit=>habit.key===draft.habitKey); if(!snapshot.catalogRevision||JSON.stringify(saved?.settings)!==JSON.stringify(input.settings))throw Error(interfaceCopy("habits.settingsUnconfirmed",language())); options.onSaved(snapshot); dialog.close();
    } catch(error) {
      setInterfaceError(status,"habits.settingsSaveFailed",String(error),language());
    } finally {
      setBusy(false);
    }
  });
  name.addEventListener("input",()=>name.setCustomValidity(""));
  document.body.append(dialog);
  dialog.showModal();
  name.focus();
  return dialog;
}
