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
