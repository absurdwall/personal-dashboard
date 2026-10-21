import { renderSleepHome, renderSleepInsights } from "./sleep-insights.js";
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
let language: () => string = () => "zh";
export function configureSleepLanguage(get: () => string): void { language = get; }
const copy = (zh: string, en: string): string => language().startsWith("en") ? en : zh;
export function formatSleepEndpoint(endpoint: SleepEndpoint, showDate = true): string {
  if (endpoint.kind === "point") return `${endpoint.approximate ? copy("约 ", "about ") : ""}${showDate ? endpoint.date + " " : ""}${endpoint.time}`;
  if (endpoint.kind === "range") return endpoint.reportedText + ` (${showDate ? endpoint.start.date + " " : ""}${endpoint.start.time}–${showDate ? endpoint.end.date + " " : ""}${endpoint.end.time})`;
  if (endpoint.kind === "text") return `${showDate ? endpoint.date + " " : ""}${endpoint.text}`;
  return endpoint.kind === "unknown" ? copy("未知", "unknown") : copy("未填写", "unrecorded");
}
export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  return copy(`${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`, `${Math.floor(minutes / 60)}h ${minutes % 60}m`);
}
export function readSleepRecords(): Promise<SleepView> { return window.__TAURI__.core.invoke<SleepView>("sleep_records"); }
let summaryDate = "";
let summaryRead = 0;
export async function refreshSleepSummary(date: string): Promise<void> {
  summaryDate = date;
  const sequence = ++summaryRead;
  const row = document.querySelector<HTMLElement>("#today-sleep-summary");
  if (!row) return;
  row.hidden = false;
  try {
    const view = await readSleepRecords();
    if (sequence !== summaryRead) return;
    const record = view.records.find(record => record.wakeDate === date);
    const button = row.querySelector<HTMLButtonElement>("button")!;
    button.textContent = `${copy("作息", "Sleep")} · ${date} · ${copy("入睡", "Onset")} ${record ? formatSleepEndpoint(record.sleepOnset, false) : "—"} · ${copy("离床", "Get-up")} ${record ? formatSleepEndpoint(record.getUp, false) : "—"}`;
    button.title = copy("用户报告的入睡与离床时间；点击查看或修改", "Reported sleep onset and get-up; view or edit");
    button.onclick = () => { void openSleepEditor(date); };
  } catch { if (sequence === summaryRead) row.hidden = true; }
}
function field<T extends HTMLElement>(tag: string, parent: HTMLElement, text?: string): T {
  const element = document.createElement(tag) as T;
  if (text) element.textContent = text;
  parent.append(element); return element;
}
function input(parent: HTMLElement, label: string, type: string, value: string, accessibleName?: string): HTMLInputElement {
  const wrapper = field<HTMLLabelElement>("label", parent, label);
  const control = field<HTMLInputElement>("input", wrapper); control.type = type; control.value = value; if (accessibleName) control.setAttribute("aria-label", accessibleName); return control;
}
function endpointEditor(parent: HTMLElement, title: string, initial: SleepEndpoint, wakeDate: string): () => SleepEndpoint {
  const section = field<HTMLFieldSetElement>("fieldset", parent); field("legend", section, title);
  const kind = field<HTMLSelectElement>("select", section); kind.setAttribute("aria-label", title + copy("精度", " precision"));
  for (const [value, label] of [["unrecorded",copy("未填写", "Unrecorded")],["unknown",copy("明确未知", "Explicitly unknown")],["point",copy("单点时间", "Point")],["range",copy("可靠范围", "Bounded range")],["text",copy("模糊原文", "Original wording")]]) {
    const option = field<HTMLOptionElement>("option", kind, label); option.value = value;
  }
  kind.value = initial.kind;
  const controls = field<HTMLDivElement>("div", section);
  let get = (): SleepEndpoint => initial;
  const render = (): void => {
    controls.replaceChildren();
    if (kind.value === "unknown" || kind.value === "unrecorded") { get = () => ({kind: kind.value as "unknown" | "unrecorded"}); return; }
    const defaultDate = initial.kind === "point" || initial.kind === "text" ? initial.date : wakeDate;
    if (kind.value === "text") {
      const date = input(controls,copy("实际日期", "Actual date"),"date",defaultDate,title + " · " + copy("实际日期", "Actual date"));
      const text = input(controls,copy("原文（如八点多）", "Original wording"),"text",initial.kind === "text" ? initial.text : "",title + " · " + copy("原文", "Original wording"));
      get = () => ({kind:"text",date:date.value,text:text.value}); return;
    }
    const pointControls = (point: SleepPoint | null, label: string): (() => SleepPoint) => {
      const group = field<HTMLDivElement>("div",controls); group.className="sleep-point-fields";
      if (label) field("strong",group,label);
      const prefix = title + (label ? " · " + label : "") + " · ";
      const date = input(group,copy("实际日期", "Actual date"),"date",point?.date ?? defaultDate,prefix + copy("实际日期", "Actual date"));
      const time = input(group,copy("时间", "Time"),"time",point?.time ?? "",prefix + copy("时间", "Time"));
      const zone = field<HTMLDetailsElement>("details", group);
      field("summary", zone, copy("时区与夏令时", "Time zone and daylight saving"));
      field("p", zone, copy("按所选日期和时间自动确定。夏令时回拨的重复时刻可在此更正。", "Determined from the selected local date and time. Adjust here for a repeated time when daylight saving ends."));
      const offset = input(zone,copy("UTC 偏移（分钟）", "UTC offset (minutes)"),"number",point ? String(point.utcOffsetMinutes) : "",prefix + copy("UTC 偏移（分钟）", "UTC offset (minutes)"));
      const approximate = input(group,copy("约", "Approximate"),"checkbox","",prefix + copy("约", "Approximate")); approximate.checked=point?.approximate ?? false;
      const deriveOffset = (): void => {
        if (date.value && time.value) { const parsed = new Date(`${date.value}T${time.value}`); if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === Number(date.value.slice(0,4)) && parsed.getMonth()+1 === Number(date.value.slice(5,7)) && parsed.getDate() === Number(date.value.slice(8,10)) && parsed.getHours() === Number(time.value.slice(0,2)) && parsed.getMinutes() === Number(time.value.slice(3,5))) offset.value=String(-parsed.getTimezoneOffset()); else offset.value=""; }
      };
      date.addEventListener("change",deriveOffset); time.addEventListener("change",deriveOffset);
      return () => { if (!date.value || !time.value || !offset.value) throw Error(copy("请检查实际日期与时间；夏令时切换中不存在的时间不能保存。", "Check the actual local date and time; a nonexistent daylight-saving time cannot be saved.")); return {date:date.value,time:time.value,utcOffsetMinutes:Number(offset.value),approximate:approximate.checked}; };
    };
    if (kind.value === "point") { const point = pointControls(initial.kind === "point" ? initial : null,""); get = () => ({kind:"point",...point()}); }
    else {
      const start=pointControls(initial.kind === "range" ? initial.start : null,copy("范围开始", "Range start"));
      const end=pointControls(initial.kind === "range" ? initial.end : null,copy("范围结束", "Range end"));
      const text=input(controls,copy("报告原文", "Reported wording"),"text",initial.kind === "range" ? initial.reportedText : "",title + " · " + copy("报告原文", "Reported wording"));
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
    const date = clock.date;
    if (!date) return;
    renderSleepHome(container, view, date, (selected, metric) => { void openSleepEditor(selected, metric); }, copy);
    container.hidden = false;
  } catch { if (request === habitsRead) container.hidden = true; }
}
export function refreshSleepSurfaces(): void {
  if (summaryDate) void refreshSleepSummary(summaryDate);
  void refreshSleepHabits();
}
export function resetSleepPresentation(): void {
  summaryRead++; habitsRead++; summaryDate = "";
  document.querySelector<HTMLElement>("#habits-sleep")?.setAttribute("hidden", "");
  document.querySelector<HTMLElement>("#today-sleep-summary")?.setAttribute("hidden", "");
  activeEditor?.close();
}
document.addEventListener("sleep-records-changed", refreshSleepSurfaces);
let activeEditor: HTMLDialogElement | null = null;
export async function openSleepEditor(date: string, metric: SleepMetric = "sleepOnset"): Promise<void> {
  activeEditor?.close(); activeEditor?.remove();
  const dialog=document.createElement("dialog"); dialog.className="sleep-editor"; activeEditor=dialog; document.body.append(dialog);
  const title=field("h2",dialog,copy("作息记录", "Sleep and wake record")); title.id="sleep-editor-title"; dialog.setAttribute("aria-labelledby",title.id); dialog.dataset.metric=metric;
  field("p",dialog,copy("用户报告的入睡与离床时间。估算时长包括醒后仍躺床的时间，并非生理睡眠测量。日期与 04:00 lived day 分开。", "Reported onset and get-up times. Estimated elapsed duration includes time awake in bed; it is not physiological sleep. Dates are independent of the 04:00 lived day."));
  const status=field("p",dialog); status.setAttribute("role","status");
  const close=field<HTMLButtonElement>("button",dialog,copy("关闭", "Close")); close.type="button"; close.onclick=()=>dialog.close();
  dialog.addEventListener("close",()=>{dialog.remove();if(activeEditor===dialog)activeEditor=null;}); dialog.showModal();
  try {
    const view=await readSleepRecords(); if(activeEditor!==dialog)return;
    const record=view.records.find(r=>r.wakeDate===date);
    const insights=field<HTMLDivElement>("div",dialog); insights.className="sleep-insights";
    const history=renderSleepInsights(insights,view,date,metric,(selected,selectedMetric)=>{void openSleepEditor(selected,selectedMetric);},copy);
    const form=field<HTMLFormElement>("form",dialog); form.className="sleep-editor-form";
    const wakeDate=input(form,copy("起床日／这一晚的归属日期", "Get-up date / night index"),"date",date); wakeDate.required=true;
    const onset=endpointEditor(form,copy("入睡时间", "Sleep onset"),record?.sleepOnset??{kind:"unrecorded"},date);
    const getUp=endpointEditor(form,copy("离床时间", "Get-up time"),record?.getUp??{kind:"unrecorded"},date);
    if(record)field("p",form,copy("估算时长：", "Estimated duration: ")+formatSleepDuration(record.estimatedDurationMinutes));
    const save=field<HTMLButtonElement>("button",form,copy("保存作息", "Save record")); save.type="submit";
    form.onsubmit=event=>{
      event.preventDefault();
      void (async()=>{
        save.disabled=true; status.textContent="";
        try {
          const sleepOnset=onset(),getUpValue=getUp();
          const sleepChanged=JSON.stringify(sleepOnset)!==JSON.stringify(record?.sleepOnset??{kind:"unrecorded"});
          const upChanged=JSON.stringify(getUpValue)!==JSON.stringify(record?.getUp??{kind:"unrecorded"});
          // Moving the index also submits the unchanged known endpoints for validation.
          const moving=wakeDate.value!==date;
          if(!sleepChanged&&!upChanged&&!moving) {dialog.close();return;}
          const saved=await window.__TAURI__.core.invoke<SleepView>("save_sleep_record",{input:{recordId:record?.id??null,wakeDate:wakeDate.value,changeId:crypto.randomUUID(),targetBinding:view.targetBinding,expectedRevision:view.revision,...(sleepChanged||moving?{sleepOnset}:{}),...(upChanged||moving?{getUp:getUpValue}:{})}});
          const actual=saved.records.find(r=>r.wakeDate===wakeDate.value);
          if(!actual)throw Error(copy("尚未确认保存读回。", "Saved readback is unconfirmed."));
          document.dispatchEvent(new CustomEvent("sleep-records-changed",{detail:saved}));
          dialog.close();
        }catch(error){status.textContent=String(error);}finally{save.disabled=false;}
      })();
    };
    dialog.append(history);
  }catch(error){status.textContent=String(error);}
}
