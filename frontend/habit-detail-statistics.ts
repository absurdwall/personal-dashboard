export type HabitDetailTarget =
  | Readonly<{ kind: "daily-completion" }>
  | Readonly<{ kind: "weekly-count"; standard: number }>
  | Readonly<{ kind: "daily-time"; standard: string; dayRelation: string }>;

export type HabitDetailCell = Readonly<{
  date: string;
  coverage: string;
  countsAsCompletion: boolean;
  hasExternalCompletion: boolean;
  localCompletionState: "none" | "completed" | "withdrawn";
}>;

export type HabitDetailStatsHabit = Readonly<{
  active: boolean;
  goalKind: string;
  goalTarget: HabitDetailTarget | null;
  goalHistory: readonly Readonly<{
    weekOf: string;
    target: HabitDetailTarget | null;
  }>[];
  history: readonly HabitDetailCell[];
  definition: Readonly<{
    origin: "local" | "sourced";
    startDate: string | null;
    lifecycleActive: boolean;
    lifecycleHistory: readonly Readonly<{
      active: boolean;
      effectiveFrom: string;
    }>[];
    goalRevisions: readonly Readonly<{
      effectiveFrom: string;
      target: HabitDetailTarget;
      status: string;
    }>[];
    currentGoal: HabitDetailTarget | null;
    currentGoalEffectiveFrom: string | null;
  }> | null;
}>;

export type HabitDetailStatsInput = Readonly<{
  habit: HabitDetailStatsHabit;
  completions: readonly Readonly<{
    livedDate: string;
    state: "none" | "completed" | "withdrawn";
  }>[];
  today: string;
  canonicalState: "ready" | "missing" | "error" | string;
  snapshotGeneratedAt: string | null;
  snapshotState: string;
}>;

export type HabitDetailStats = Readonly<{
  monthAttainedDays: number | null;
  monthExact: boolean;
  cumulativeAttainedDays: number | null;
  cumulativeExact: boolean;
  currentStreak: number | null;
  highestConfirmedStreak: number | null;
  highestHistoryExact: boolean;
  streakUnit: "days" | "weeks";
  coverageFrom: string | null;
  coverageTo: string | null;
}>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monday(value: string): string {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return addDays(value, -((day + 6) % 7));
}

function datesBetween(from: string, to: string): string[] {
  if (!validDate(from) || !validDate(to) || from > to) return [];
  const result: string[] = [];
  for (let date = from; date <= to && result.length < 36600; date = addDays(date, 1)) {
    result.push(date);
  }
  return result;
}

function targetForDate(
  habit: HabitDetailStatsHabit,
  date: string,
  today?: string,
): HabitDetailTarget | null {
  const definition = habit.definition;
  if (definition) {
    const revision = [...definition.goalRevisions]
      .filter((item) => item.status !== "cancelled" && item.effectiveFrom <= date)
      .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))
      .at(-1);
    if (revision) return revision.target;
  }
  const week = monday(date);
  const weeklyContext = habit.goalHistory.find((item) => item.weekOf === week)?.target;
  if (weeklyContext) return weeklyContext;
  if (definition?.currentGoal && definition.currentGoalEffectiveFrom &&
      date >= definition.currentGoalEffectiveFrom) {
    return definition.currentGoal;
  }
  return date === today ? habit.goalTarget : null;
}

function activeOn(habit: HabitDetailStatsHabit, date: string, today: string): boolean | null {
  const events = [...(habit.definition?.lifecycleHistory ?? [])]
    .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
  if (!events.length) {
    if (date === today) return habit.active;
    if (habit.definition?.origin === "local" && habit.active) return true;
    if (habit.definition?.origin === "local" && !habit.active) return false;
    return habit.active ? true : null;
  }
  let active = true;
  for (const event of events) {
    if (event.effectiveFrom > date) break;
    active = event.active;
  }
  return active;
}

function coverageIsComplete(input: HabitDetailStatsInput, date: string): boolean {
  const generatedDate = input.snapshotGeneratedAt?.slice(0, 10);
  if (input.snapshotState === "error" || input.snapshotState === "missing" ||
      input.snapshotState === "unconfigured" || (validDate(generatedDate) && date > generatedDate)) {
    return false;
  }
  return input.habit.history.some((cell) => cell.date === date && cell.coverage === "complete");
}

function completionOn(input: HabitDetailStatsInput, date: string): boolean {
  const local = input.completions.find((item) => item.livedDate === date);
  if (local?.state === "completed") return true;
  const cell = input.habit.history.find((item) => item.date === date);
  if (local?.state === "withdrawn") return Boolean(cell?.hasExternalCompletion);
  return Boolean(cell?.countsAsCompletion);
}

function attainedDates(input: HabitDetailStatsInput): Set<string> {
  const { habit, today } = input;
  const start = habit.definition?.startDate;
  const dates = new Set<string>();
  const candidates = new Set<string>([
    ...input.completions.filter((item) => item.state === "completed").map((item) => item.livedDate),
    ...habit.history.filter((cell) => cell.countsAsCompletion).map((cell) => cell.date),
  ]);
  for (const date of candidates) {
    if (!validDate(date) || date > today || (validDate(start) && date < start)) continue;
    const activity = activeOn(habit, date, today);
    const target = targetForDate(habit, date, today);
    if (activity === true && target && completionOn(input, date)) dates.add(date);
  }
  return dates;
}

function dateRangeCovered(input: HabitDetailStatsInput, from: string, to: string): boolean {
  const first = validDate(input.habit.definition?.startDate)
    ? input.habit.definition.startDate > from ? input.habit.definition.startDate : from
    : from;
  if (first > to) return true;
  for (const date of datesBetween(first, to)) {
    const activity = activeOn(input.habit, date, input.today);
    if (activity === false) continue;
    if (activity === null || !targetForDate(input.habit, date, input.today)) return false;
    if (!completionOn(input, date) && !coverageIsComplete(input, date)) return false;
  }
  return true;
}

type PeriodResult = "achieved" | "missed" | "unknown" | "inactive" | "partial";

function dailyResult(input: HabitDetailStatsInput, date: string, attained: Set<string>): PeriodResult {
  if (validDate(input.habit.definition?.startDate) && date < input.habit.definition.startDate) return "partial";
  const activity = activeOn(input.habit, date, input.today);
  if (activity === false) return "inactive";
  const targetKind = targetForDate(input.habit, date, input.today)?.kind;
  if (activity === null || (targetKind !== "daily-completion" && targetKind !== "daily-time")) return "unknown";
  if (attained.has(date)) return "achieved";
  return coverageIsComplete(input, date) ? "missed" : "unknown";
}

function weeklyResult(input: HabitDetailStatsInput, weekOf: string, attained: Set<string>): PeriodResult {
  const weekDates = datesBetween(weekOf, addDays(weekOf, 6));
  const definedDates = weekDates.filter((date) => date <= input.today);
  const target = targetForDate(input.habit, weekOf, input.today);
  if (!target || target.kind !== "weekly-count") return "unknown";
  if (validDate(input.habit.definition?.startDate) && input.habit.definition.startDate > weekOf) return "partial";
  const revision = input.habit.definition?.currentGoalEffectiveFrom;
  if (validDate(revision) && revision > weekOf && revision <= addDays(weekOf, 6)) return "partial";
  const activity = definedDates.map((date) => activeOn(input.habit, date, input.today));
  if (activity.some((item) => item === false)) return "inactive";
  if (activity.some((item) => item === null)) return "unknown";
  const completed = new Set(weekDates.filter((date) => attained.has(date))).size;
  if (completed >= target.standard) return "achieved";
  if (weekDates.some((date) => date > input.today)) return "unknown";
  return definedDates.every((date) => coverageIsComplete(input, date)) ? "missed" : "unknown";
}

function streaks(
  input: HabitDetailStatsInput,
  attained: Set<string>,
  unit: "days" | "weeks",
): Readonly<{ current: number | null; highest: number | null; exact: boolean }> {
  const start = validDate(input.habit.definition?.startDate)
    ? input.habit.definition.startDate
    : [...attained].sort()[0] ?? input.today;
  const periodStart = unit === "days" ? start : monday(start);
  const currentStart = unit === "days" ? input.today : monday(input.today);
  const evaluate = (period: string) => unit === "days"
    ? dailyResult(input, period, attained)
    : weeklyResult(input, period, attained);
  const currentPeriodResult = evaluate(currentStart);
  const openCurrentAchieved = currentPeriodResult === "achieved";
  let cursor = openCurrentAchieved
    ? currentStart
    : unit === "days" ? addDays(currentStart, -1) : addDays(currentStart, -7);
  let current = 0;
  let currentKnown = false;
  for (let count = 0; count < 36600 && cursor >= periodStart; count += 1) {
    const result = evaluate(cursor);
    if (result !== "achieved") {
      currentKnown = result === "missed";
      break;
    }
    current += 1;
    currentKnown = true;
    cursor = unit === "days" ? addDays(cursor, -1) : addDays(cursor, -7);
  }
  if (cursor < periodStart && validDate(input.habit.definition?.startDate)) currentKnown = true;

  let highest = 0;
  let run = 0;
  let runUnit: string | null = null;
  const periods = unit === "days"
    ? datesBetween(periodStart, input.today)
    : datesBetween(periodStart, monday(input.today)).filter((date) => monday(date) === date);
  for (const period of periods) {
    const target = targetForDate(input.habit, unit === "days" ? period : addDays(period, 6), input.today);
    const targetUnit = target?.kind === "weekly-count"
      ? "weekly-count"
      : target?.kind === "daily-completion" || target?.kind === "daily-time"
        ? "daily-completion"
        : "unknown";
    const result = evaluate(period);
    if (result === "achieved" && targetUnit === (unit === "days" ? "daily-completion" : "weekly-count")) {
      if (runUnit !== targetUnit) run = 0;
      run += 1;
      runUnit = targetUnit;
      highest = Math.max(highest, run);
    } else {
      run = 0;
      runUnit = null;
    }
  }
  const exactThrough = unit === "days"
    ? openCurrentAchieved ? input.today : addDays(input.today, -1)
    : openCurrentAchieved ? input.today : addDays(monday(input.today), -1);
  const exact = exactThrough < periodStart || dateRangeCovered(input, periodStart, exactThrough);
  return {
    current: currentPeriodResult === "inactive" || currentPeriodResult === "partial"
      ? null
      : current > 0 || currentKnown ? current : null,
    highest: highest > 0 ? highest : null,
    exact,
  };
}

export function habitDetailStatistics(input: HabitDetailStatsInput): HabitDetailStats {
  const { habit, today } = input;
  const attained = attainedDates(input);
  const monthFrom = `${today.slice(0, 7)}-01`;
  const monthAttainedDays = [...attained].filter((date) => date >= monthFrom && date <= today).length;
  const monthExact = (habit.definition?.origin === "local" && input.canonicalState === "ready") ||
    dateRangeCovered(input, monthFrom, today);
  const startDate = validDate(habit.definition?.startDate) ? habit.definition.startDate : null;
  const cumulativeExact = Boolean(
    startDate && input.canonicalState === "ready" &&
      (habit.definition?.origin === "local" || dateRangeCovered(input, startDate, today)),
  );
  const unit = targetForDate(habit, today, today)?.kind === "weekly-count" ? "weeks" : "days";
  const streak = streaks(input, attained, unit);
  const coverageDates = habit.history.map((cell) => cell.date).filter(validDate).sort();
  return {
    monthAttainedDays: monthAttainedDays > 0 || monthExact ? monthAttainedDays : null,
    monthExact,
    cumulativeAttainedDays: attained.size > 0 || cumulativeExact ? attained.size : null,
    cumulativeExact,
    currentStreak: streak.current,
    highestConfirmedStreak: streak.highest,
    highestHistoryExact: streak.exact,
    streakUnit: unit,
    coverageFrom: coverageDates[0] ?? null,
    coverageTo: coverageDates.at(-1) ?? null,
  };
}
