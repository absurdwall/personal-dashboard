export type HabitGoal =
  | { kind: "daily-completion" }
  | { kind: "weekly-days"; days: number }
  | { kind: "daily-time"; time: string; dayRelation: "same-day" | "next-day" | "unresolved" }
  | { kind: "unconfigured" };

export type HabitSettings = {
  name: string;
  emoji: string | null;
  group: string | null;
  startDate: string;
  goal: HabitGoal;
};

export type HabitSettingsHabit = Readonly<{
  key: string;
  settings: HabitSettings | null;
  currentGoal: HabitGoal | null;
  pendingGoal: { effectiveDate: string; goal: HabitGoal } | null;
  goalLabel: string;
}>;

export type HabitSettingsSnapshot = Readonly<{
  catalogRevision: string | null;
  catalogTargetBinding: string | null;
  habits: readonly HabitSettingsHabit[];
}>;

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
      name: "", emoji: null, group: null, startDate: livedDate, goal: {kind: "daily-completion"},
    });
  }

  request(): HabitDefinitionRequest {
    const signature = JSON.stringify(this.settings);
    if (signature !== this.signature) {
      this.signature = signature;
      this.changeId = this.nextId();
    }
    return {habitKey: this.habitKey, changeId: this.changeId!, targetBinding: this.binding,
      expectedRevision: this.revision, settings: structuredClone(this.settings)};
  }

  reread(snapshot: HabitSettingsSnapshot): void {
    if (snapshot.catalogTargetBinding !== this.binding) throw new Error("Selected Vault changed. Reopen settings in the intended Vault.");
    this.revision = snapshot.catalogRevision;
    this.original = snapshot.habits.find(habit => habit.key === this.habitKey) ?? this.original;
  }
}

export function habitSettingsGoalLabel(goal: HabitGoal, language: "zh" | "en"): string {
  if (goal.kind === "weekly-days") return language === "zh" ? `每周 ${goal.days} 个达标天` : `${goal.days} attained days per week`;
  if (goal.kind === "daily-completion") return language === "zh" ? "每天完成" : "Complete every day";
  if (goal.kind === "unconfigured") return language === "zh" ? "未配置目标" : "No configured goal";
  const relation = goal.dayRelation === "next-day" ? (language === "zh" ? "次日 " : "next day ")
    : goal.dayRelation === "unresolved" ? (language === "zh" ? "日期归属待解释 · " : "day relation unresolved · ") : "";
  return `${language === "zh" ? "每日" : "Daily"} ${relation}${goal.time}`;
}

export function showHabitSettingsDialog<Snapshot extends HabitSettingsSnapshot>(options: {
  snapshot: Snapshot;
  livedDate: string;
  language: "zh" | "en";
  habitKey?: string;
  save(input: HabitDefinitionRequest): Promise<Snapshot>;
  reread(): Promise<Snapshot>;
  onSaved(snapshot: Snapshot): void;
}): HTMLDialogElement {
  const draft = new HabitSettingsDraft(options.snapshot, options.livedDate, options.habitKey);
  const copy = (zh: string, en: string) => options.language === "zh" ? zh : en;
  const dialog = document.createElement("dialog");
  dialog.className = "habit-settings-dialog";
  dialog.dataset.habitSettingsDialog = draft.habitKey;
  const form = document.createElement("form");
  const heading = document.createElement("h2");
  heading.id = `habit-settings-${draft.habitKey}`;
  heading.textContent = options.habitKey ? copy("编辑习惯", "Edit Habit") : copy("新建习惯", "Create Habit");
  dialog.setAttribute("aria-labelledby", heading.id);
  const current = document.createElement("p");
  current.dataset.habitCurrentGoal = "";
  const pending = document.createElement("p");
  pending.dataset.habitPendingGoal = "";
  const updateGoals = () => {
    current.hidden = !draft.original;
    current.textContent = draft.original ? `${copy("当前目标：", "Current goal: ")}${draft.original.currentGoal ? habitSettingsGoalLabel(draft.original.currentGoal, options.language) : draft.original.goalLabel}` : "";
    pending.hidden = !draft.original?.pendingGoal;
    pending.textContent = draft.original?.pendingGoal ? `${copy("待生效：", "Pending: ")}${draft.original.pendingGoal.effectiveDate} · ${habitSettingsGoalLabel(draft.original.pendingGoal.goal, options.language)}` : "";
  };
  updateGoals();
  const hint = document.createElement("p");
  hint.className = "habit-settings-hint";
  hint.textContent = copy("名称、图标和分组立即保存；目标从下个周期生效。每周按不同达标天计算。时间打卡只确认达到目标，不记录实际活动时刻。", "Name, emoji and group save immediately. Goal edits start next cycle. Weekly goals count distinct attained days. Threshold check-ins confirm the target without recording actual activity time.");
  form.append(heading, current, pending, hint);
  function inputField(labelText: string, field: string, value: string, type = "text") {
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.name = field;
    input.setAttribute("aria-label", labelText);
    input.value = value;
    label.append(input);
    form.append(label);
    return input;
  }
  const name = inputField(copy("名称", "Name"), "name", draft.settings.name);
  name.required = true;
  name.maxLength = 100;
  const emoji = inputField(copy("Emoji（可选）", "Emoji (optional)"), "emoji", draft.settings.emoji ?? "");
  emoji.maxLength = 40;
  const group = inputField(copy("分组（可选）", "Group (optional)"), "group", draft.settings.group ?? "");
  group.maxLength = 100;
  const start = inputField(copy("开始日期", "Start date"), "startDate", draft.settings.startDate, "date");
  start.required = true;
  const goalLabel = document.createElement("label");
  goalLabel.textContent = copy("频率与目标", "Frequency and goal");
  const frequency = document.createElement("select");
  frequency.name = "frequency";
  frequency.setAttribute("aria-label", copy("频率与目标", "Frequency and goal"));
  const choices: [HabitGoal["kind"], string][] = [
    ["daily-completion", copy("每天完成", "Complete every day")],
    ["weekly-days", copy("每周达标天数", "Attained days per week")],
    ["daily-time", copy("每日时间阈值", "Daily time threshold")],
  ];
  if (draft.settings.goal.kind === "unconfigured") choices.push(["unconfigured", copy("未配置目标（保留）", "No goal (retain)")]);
  for (const [value, text] of choices) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    frequency.append(option);
  }
  frequency.value = draft.settings.goal.kind;
  goalLabel.append(frequency);
  form.append(goalLabel);
  const days = inputField(copy("每周达标天数", "Attained days per week"), "days", draft.settings.goal.kind === "weekly-days" ? String(draft.settings.goal.days) : "3", "number");
  days.min = "1";
  days.max = "7";
  const time = inputField(copy("目标时刻", "Target time"), "time", draft.settings.goal.kind === "daily-time" ? draft.settings.goal.time : "", "time");
  time.step = "60";
  const relationLabel = document.createElement("label");
  relationLabel.textContent = copy("目标日期归属", "Target day relation");
  const relation = document.createElement("select");
  relation.name = "dayRelation";
  relation.setAttribute("aria-label", copy("目标日期归属", "Target day relation"));
  for (const [value, text] of [["same-day", copy("当天", "Same day")], ["next-day", copy("次日（如入睡）", "Next day (e.g. sleep)")], ["unresolved", copy("待解释（保留来源规则）", "Unresolved (retain source rule)")]]) {
    const option = document.createElement("option");
    option.value = value!;
    option.textContent = text!;
    relation.append(option);
  }
  relation.value = draft.settings.goal.kind === "daily-time" ? draft.settings.goal.dayRelation : "same-day";
  relationLabel.append(relation);
  form.append(relationLabel);
  const updateFrequency = () => {
    days.parentElement!.hidden = frequency.value !== "weekly-days";
    days.required = frequency.value === "weekly-days";
    days.disabled = frequency.value !== "weekly-days";
    time.parentElement!.hidden = frequency.value !== "daily-time";
    time.required = frequency.value === "daily-time";
    time.disabled = frequency.value !== "daily-time";
    relationLabel.hidden = frequency.value !== "daily-time";
    relation.disabled = frequency.value !== "daily-time";
  };
  frequency.addEventListener("change", updateFrequency);
  updateFrequency();
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const actions = document.createElement("div");
  actions.className = "habit-settings-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = copy("取消", "Cancel");
  const reread = document.createElement("button");
  reread.type = "button";
  reread.textContent = copy("重新读取", "Read again");
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = copy("保存", "Save");
  actions.append(cancel, reread, save);
  form.append(status, actions);
  dialog.append(form);
  let busy = false;
  function setBusy(value: boolean) {
    busy = value;
    for (const control of form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) control.disabled = value;
    if (!value) updateFrequency();
  }
  cancel.addEventListener("click", () => { if (!busy) dialog.close(); });
  dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
  dialog.addEventListener("close", () => dialog.remove());
  reread.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    try {
      draft.reread(await options.reread());
      updateGoals();
      status.textContent = copy("已重新读取；草稿保留，可重试保存。", "Read again. Draft kept; you can retry saving.");
    } catch (error) { status.textContent = String(error); }
    finally { setBusy(false); }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const goal: HabitGoal = frequency.value === "weekly-days" ? {kind: "weekly-days", days: Number(days.value)}
      : frequency.value === "daily-time" ? {kind: "daily-time", time: time.value, dayRelation: relation.value as "same-day" | "next-day" | "unresolved"}
      : frequency.value === "unconfigured" ? {kind: "unconfigured"} : {kind: "daily-completion"};
    draft.settings = {name: name.value.trim(), emoji: emoji.value.trim() || null, group: group.value.trim() || null, startDate: start.value, goal};
    if (!draft.settings.name) { name.setCustomValidity(copy("请输入名称。", "Enter a name.")); name.reportValidity(); return; }
    name.setCustomValidity("");
    const input = draft.request();
    setBusy(true);
    status.textContent = copy("正在保存…", "Saving…");
    try {
      const snapshot = await options.save(input);
      const saved = snapshot.habits.find(habit => habit.key === draft.habitKey);
      if (!snapshot.catalogRevision || JSON.stringify(saved?.settings) !== JSON.stringify(input.settings)) throw new Error(copy("保存读回未确认，草稿保留。请重新读取并重试。", "Save readback is unconfirmed. Draft kept. Read again and retry."));
      options.onSaved(snapshot);
      dialog.close();
    } catch (error) {
      status.textContent = `${copy("保存失败；草稿保留。", "Save failed; draft kept.")} ${String(error)}`;
    } finally { setBusy(false); }
  });
  name.addEventListener("input", () => name.setCustomValidity(""));
  document.body.append(dialog);
  dialog.showModal();
  name.focus();
  return dialog;
}
