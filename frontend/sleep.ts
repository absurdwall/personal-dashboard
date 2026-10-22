import { createSleepElement } from "./sleep-dom.js";
import { formatSleepDuration, formatSleepEndpoint } from "./sleep-format.js";
import { localizedSleepElement, setSleepAttribute, setSleepCopy, setSleepError, sleepLanguage, sleepText, SLEEP_LANGUAGE_CHANGED_EVENT, type SleepCopyKey } from "./sleep-presentation.js";
import { renderSleepHome, renderSleepInsights } from "./sleep-insights.js";
export { configureSleepLanguage } from "./sleep-presentation.js";
export type SleepPoint = Readonly<{ date: string; time: string; utcOffsetMinutes: number; approximate?: boolean }>;
export type SleepEndpoint = Readonly<
  | ({ kind: "point" } & SleepPoint)
  | { kind: "range"; start: SleepPoint; end: SleepPoint; reportedText: string }
  | { kind: "text"; date: string; text: string }
  | { kind: "unknown" | "unrecorded" }
>;
export type SleepRecord = Readonly<{ id: string; wakeDate: string; sleepOnset: SleepEndpoint; getUp: SleepEndpoint; estimatedDurationMinutes: number | null }>;
export type SleepView = Readonly<{ targetBinding: string; revision: string | null; records: readonly SleepRecord[] }>;
export type SleepMetric = "sleepOnset" | "getUp" | "duration";
export function readSleepRecords(): Promise<SleepView> { return window.__TAURI__.core.invoke<SleepView>("sleep_records"); }
let summaryDate = "";
let summaryRead = 0;
let lastSummary: Readonly<{date: string; view: SleepView}> | null = null;
let lastHabits: Readonly<{date: string; view: SleepView}> | null = null;
function renderSleepSummary(view: SleepView, date: string): void {
  const row = document.querySelector<HTMLElement>("#today-sleep-summary");
  if (!row) return;
  const record = view.records.find(record => record.wakeDate === date);
  const button = row.querySelector<HTMLButtonElement>("button")!;
  setSleepCopy(button,"sleep.summary",{date,onset:record ? formatSleepEndpoint(record.sleepOnset,"summary",sleepLanguage()) : "—",getUp:record ? formatSleepEndpoint(record.getUp,"summary",sleepLanguage()) : "—"});
  setSleepAttribute(button,"title","sleep.summaryHelp");
  button.onclick = () => { void openSleepEditor(date); };
}
function renderHabitSleepCopy(view: SleepView, date: string): void {
  const container = document.querySelector<HTMLElement>("#habits-sleep");
  if (container) renderSleepHome(container,view,date,(selected,metric)=>{ void openSleepEditor(selected,metric); });
}
document.addEventListener(SLEEP_LANGUAGE_CHANGED_EVENT,()=>{
  if (lastSummary) renderSleepSummary(lastSummary.view,lastSummary.date);
  if (lastHabits) renderHabitSleepCopy(lastHabits.view,lastHabits.date);
});
export function ensureSleepSummaryDate(date: string): void {
  if (summaryDate !== date) void refreshSleepSummary(date);
}
export async function refreshSleepSummary(requestedDate: string | Promise<string>): Promise<void> {
  const sequence = ++summaryRead;
  const row = document.querySelector<HTMLElement>("#today-sleep-summary");
  if (!row) return;
  row.hidden = false;
  // A newer known clock date must supersede an unresolved earlier clock read.
  summaryDate = typeof requestedDate === "string" ? requestedDate : "";
  try {
    const date = await requestedDate;
    if (sequence !== summaryRead) return;
    summaryDate = date;
    const view = await readSleepRecords();
    if (sequence !== summaryRead) return;
    lastSummary = {view,date};
    renderSleepSummary(view,date);
  } catch { if (sequence === summaryRead) row.hidden = true; }
}
function input(parent: HTMLElement, label: SleepCopyKey, type: string, value: string, accessibleName?: SleepCopyKey): HTMLInputElement {
  const wrapper = createSleepElement("label", parent);
  localizedSleepElement("span", wrapper, label);
  const control = createSleepElement("input", wrapper);
  control.type = type; control.value = value;
  if (accessibleName) setSleepAttribute(control, "aria-label", accessibleName);
  return control;
}
function endpointEditor(parent: HTMLElement, endpoint: "onset" | "getUp", initial: SleepEndpoint, wakeDate: string): () => SleepEndpoint {
  const section = createSleepElement("fieldset", parent);
  localizedSleepElement("legend", section, endpoint === "onset" ? "sleep.onsetTitle" : "sleep.getUpTitle");
  const kind = createSleepElement("select", section);
  setSleepAttribute(kind,"aria-label",`sleep.${endpoint}.precision`);
  for (const [value, key] of [["unrecorded","sleep.optionUnrecorded"],["unknown","sleep.optionUnknown"],["point","sleep.optionPoint"],["range","sleep.optionRange"],["text","sleep.optionText"]] as const) {
    const option = localizedSleepElement("option", kind, key); option.value = value;
  }
  kind.value = initial.kind;
  const controls = createSleepElement("div", section);
  let get = (): SleepEndpoint => initial;
  const render = (): void => {
    controls.replaceChildren();
    if (kind.value === "unknown" || kind.value === "unrecorded") { get = () => ({kind: kind.value as "unknown" | "unrecorded"}); return; }
    const defaultDate = initial.kind === "point" || initial.kind === "text" ? initial.date : wakeDate;
    if (kind.value === "text") {
      const date = input(controls,"sleep.actualDate","date",defaultDate,`sleep.${endpoint}.date`);
      const text = input(controls,"sleep.originalWords","text",initial.kind === "text" ? initial.text : "",`sleep.${endpoint}.original`);
      get = () => ({kind:"text",date:date.value,text:text.value}); return;
    }
    const pointControls = (point: SleepPoint | null, bound?: "start" | "end"): (() => SleepPoint) => {
      const group = createSleepElement("div", controls); group.className="sleep-point-fields";
      if (bound) localizedSleepElement("strong",group,bound === "start" ? "sleep.rangeStart" : "sleep.rangeEnd");
      const prefix = bound ? `sleep.${endpoint}.${bound}.` as const : `sleep.${endpoint}.` as const;
      const date = input(group,"sleep.actualDate","date",point?.date ?? defaultDate,`${prefix}date`);
      const time = input(group,"sleep.time","time",point?.time ?? "",`${prefix}time`);
      const zone = createSleepElement("details", group);
      localizedSleepElement("summary",zone,"sleep.timeZone");
      localizedSleepElement("p",zone,"sleep.timeZoneHelp");
      const offset = input(zone,"sleep.offset","number",point ? String(point.utcOffsetMinutes) : "",`${prefix}offset`);
      const approximate = input(group,"sleep.approximate","checkbox","",`${prefix}approximate`); approximate.checked=point?.approximate ?? false;
      const deriveOffset = (): void => {
        if (date.value && time.value) { const parsed = new Date(`${date.value}T${time.value}`); if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === Number(date.value.slice(0,4)) && parsed.getMonth()+1 === Number(date.value.slice(5,7)) && parsed.getDate() === Number(date.value.slice(8,10)) && parsed.getHours() === Number(time.value.slice(0,2)) && parsed.getMinutes() === Number(time.value.slice(3,5))) offset.value=String(-parsed.getTimezoneOffset()); else offset.value=""; }
      };
      date.addEventListener("change",deriveOffset); time.addEventListener("change",deriveOffset);
      return () => { if (!date.value || !time.value || !offset.value) throw Error(sleepText("sleep.invalidLocalTime")); return {date:date.value,time:time.value,utcOffsetMinutes:Number(offset.value),approximate:approximate.checked}; };
    };
    if (kind.value === "point") { const point = pointControls(initial.kind === "point" ? initial : null); get = () => ({kind:"point",...point()}); }
    else {
      const start=pointControls(initial.kind === "range" ? initial.start : null,"start");
      const end=pointControls(initial.kind === "range" ? initial.end : null,"end");
      const text=input(controls,"sleep.wording","text",initial.kind === "range" ? initial.reportedText : "",`sleep.${endpoint}.wording`);
      get=()=>({kind:"range",start:start(),end:end(),reportedText:text.value});
    }
  };
  kind.onchange=render; render(); return () => get();
}
let habitsRead = 0;
export async function refreshSleepHabits(): Promise<void> {
  const container = document.querySelector<HTMLElement>("#habits-sleep");
  if (!container) return;
  const request = ++habitsRead;
  try {
    const [view, clock] = await Promise.all([readSleepRecords(), window.__TAURI__.core.invoke<{ date: string }>("today_clock")]);
    if (request !== habitsRead) return;
    if (!clock.date) return;
    lastHabits = {view,date:clock.date};
    renderHabitSleepCopy(view,clock.date);
    container.hidden = false;
  } catch { if (request === habitsRead) container.hidden = true; }
}
export function refreshSleepSurfaces(): void {
  if (summaryDate) void refreshSleepSummary(summaryDate);
  void refreshSleepHabits();
}
export function resetSleepPresentation(): void {
  summaryRead++; habitsRead++; summaryDate = ""; lastSummary = null; lastHabits = null;
  document.querySelector<HTMLElement>("#habits-sleep")?.setAttribute("hidden", "");
  document.querySelector<HTMLElement>("#today-sleep-summary")?.setAttribute("hidden", "");
  activeEditor?.close();
}
document.addEventListener("sleep-records-changed", refreshSleepSurfaces);
let activeEditor: HTMLDialogElement | null = null;
export async function openSleepEditor(date: string, metric: SleepMetric = "sleepOnset"): Promise<void> {
  activeEditor?.close(); activeEditor?.remove();
  const dialog=document.createElement("dialog"); dialog.className="sleep-editor"; activeEditor=dialog; document.body.append(dialog);
  const title=localizedSleepElement("h2",dialog,"sleep.editorTitle"); title.id="sleep-editor-title"; dialog.setAttribute("aria-labelledby",title.id); dialog.dataset.metric=metric;
  localizedSleepElement("p",dialog,"sleep.explanation");
  const status=createSleepElement("p",dialog); status.setAttribute("role","status");
  const close=localizedSleepElement("button",dialog,"sleep.close"); close.type="button"; close.onclick=()=>dialog.close();
  dialog.addEventListener("close",()=>{dialog.remove();if(activeEditor===dialog)activeEditor=null;}); dialog.showModal();
  try {
    const view=await readSleepRecords(); if(activeEditor!==dialog)return;
    const record=view.records.find(r=>r.wakeDate===date);
    const insights=createSleepElement("div",dialog); insights.className="sleep-insights";
    const history=renderSleepInsights(insights,view,date,metric,(selected,selectedMetric)=>{void openSleepEditor(selected,selectedMetric);});
    const form=createSleepElement("form",dialog); form.className="sleep-editor-form";
    const wakeDate=input(form,"sleep.wakeDate","date",date); wakeDate.required=true;
    const onset=endpointEditor(form,"onset",record?.sleepOnset??{kind:"unrecorded"},date);
    const getUp=endpointEditor(form,"getUp",record?.getUp??{kind:"unrecorded"},date);
    if(record) {
      const duration = createSleepElement("p",form);
      const renderDuration = (): void => setSleepCopy(duration,"sleep.estimated",{value:formatSleepDuration(record.estimatedDurationMinutes,sleepLanguage())});
      renderDuration();
      document.addEventListener(SLEEP_LANGUAGE_CHANGED_EVENT,renderDuration);
      dialog.addEventListener("close",()=>document.removeEventListener(SLEEP_LANGUAGE_CHANGED_EVENT,renderDuration),{once:true});
    }
    const save=localizedSleepElement("button",form,"sleep.save"); save.type="submit";
    form.onsubmit=event=>{
      event.preventDefault();
      void (async()=>{
        save.disabled=true; status.textContent=""; delete status.dataset.i18n; delete status.dataset.i18nError;
        try {
          const sleepOnset=onset(),getUpValue=getUp();
          const sleepChanged=JSON.stringify(sleepOnset)!==JSON.stringify(record?.sleepOnset??{kind:"unrecorded"});
          const upChanged=JSON.stringify(getUpValue)!==JSON.stringify(record?.getUp??{kind:"unrecorded"});
          const moving=wakeDate.value!==date;
          if(!sleepChanged&&!upChanged&&!moving) {dialog.close();return;}
          const saved=await window.__TAURI__.core.invoke<SleepView>("save_sleep_record",{input:{recordId:record?.id??null,wakeDate:wakeDate.value,changeId:crypto.randomUUID(),targetBinding:view.targetBinding,expectedRevision:view.revision,...(sleepChanged||moving?{sleepOnset}:{}),...(upChanged||moving?{getUp:getUpValue}:{})}});
          const actual=saved.records.find(r=>r.wakeDate===wakeDate.value);
          const otherRecords=view.records.filter(r=>r.id!==record?.id);
          const confirmed=saved.targetBinding===view.targetBinding && !!saved.revision && !!actual
            && (record ? actual.id===record.id : !!actual.id && !view.records.some(r=>r.id===actual.id))
            && JSON.stringify(actual.sleepOnset)===JSON.stringify(sleepOnset)
            && JSON.stringify(actual.getUp)===JSON.stringify(getUpValue)
            && saved.records.length===otherRecords.length+1
            && new Set(saved.records.map(r=>r.id)).size===saved.records.length
            && new Set(saved.records.map(r=>r.wakeDate)).size===saved.records.length
            && otherRecords.every(previous=>JSON.stringify(saved.records.find(r=>r.id===previous.id))===JSON.stringify(previous));
          if(!confirmed)throw Error(sleepText("sleep.readbackChanged"));
          document.dispatchEvent(new CustomEvent("sleep-records-changed",{detail:saved}));
          dialog.close();
        }catch(error){setSleepError(status,error);}finally{save.disabled=false;}
      })();
    };
    dialog.append(history);
  }catch(error){setSleepError(status,error);}
}
