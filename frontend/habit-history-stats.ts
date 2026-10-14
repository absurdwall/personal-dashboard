export type HabitHistoryGoal =
  | Readonly<{ kind: "daily-count" }>
  | Readonly<{ kind: "weekly-count"; days: number }>
  | Readonly<{ kind: "daily-time"; standard: string; dayRelation: "same-day" | "next-day" | "unresolved" }>;

export type HabitHistoryContext = Readonly<{
  key: string;
  startDate: string | null;
  createdLocally: boolean;
  sourceExists: boolean;
  sourceActive: boolean;
  baseGoal: HabitHistoryGoal | null;
  currentGoal: HabitHistoryGoal | null;
  sourceGoalHistory: readonly Readonly<{ weekOf: string; goal: HabitHistoryGoal }>[];
  goalRevisions: readonly Readonly<{
    effectiveOn: string;
    changedAt: string;
    disposition: "scheduled" | "superseded" | "cancelled";
    goal: HabitHistoryGoal | null;
  }>[];
  lifecycleChanges: readonly Readonly<{
    kind: "deactivated" | "restored";
    effectiveOn: string;
    changedAt: string;
  }>[];
}>;

export type HabitHistoryFact = Readonly<{
  date: string;
  canonicalState: "ready" | "missing" | "error";
  localState: "completed" | "withdrawn" | "none";
  completedAt: string | null;
  localChangedAt: string | null;
  projected?: Readonly<{
    coverage: string;
    status: string;
    countsAsCompletion: boolean;
    actualTimeLabel: string | null;
    details: readonly Readonly<{
      kind?: string;
      status?: string;
      observedAt?: string;
      actualTime?: Readonly<{ localTime?: string; dayRelation?: string }>;
      sourceLabel?: string;
    }>[];
  }>;
}>;

export type HabitHistoryPrecision = "confirmed" | "at-least" | "unknown";
export type HabitHistoryMetric = Readonly<{
  value: number | null;
  precision: HabitHistoryPrecision;
  unit: "days" | "weeks";
}>;

export type HabitHistoryStats = Readonly<{
  month: HabitHistoryMetric;
  allTime: HabitHistoryMetric;
  currentStreak: HabitHistoryMetric;
  highestStreak: HabitHistoryMetric;
  coverageFrom: string;
  coverageTo: string;
  coverageIsComplete: boolean;
}>;

type Outcome = "success" | "failure" | "unknown" | "inactive" | "partial";
type Period = Readonly<{ key: string; outcome: Outcome; partial: boolean }>;

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value ? null : day;
}

function shiftDay(value: string, amount: number): string {
  const date = parseDay(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayOf(value: string): string {
  const date = parseDay(value);
  if (!date) return value;
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

function goalOn(context: HabitHistoryContext, date: string, currentDate: string): HabitHistoryGoal | null {
  const weekOf = mondayOf(date);
  const revision = [...context.goalRevisions]
    .filter((item) => item.disposition === "scheduled" && item.effectiveOn <= date)
    .sort((left, right) => left.effectiveOn.localeCompare(right.effectiveOn) || left.changedAt.localeCompare(right.changedAt))
    .at(-1);
  if (revision) return revision.goal;
  const sourceHistory = context.sourceGoalHistory.find((item) => item.weekOf === weekOf);
  if (sourceHistory) return sourceHistory.goal;
  if (context.createdLocally) return context.baseGoal;
  if (weekOf === mondayOf(currentDate)) return context.currentGoal;
  return null;
}

function lifecycleAt(
  context: HabitHistoryContext,
  date: string,
  currentDate: string,
  fact: HabitHistoryFact | undefined,
): Readonly<{ active: boolean; transition?: "deactivated" | "restored"; changedAt?: string }> {
  const changes = [...context.lifecycleChanges].sort((left, right) =>
    left.effectiveOn.localeCompare(right.effectiveOn) || left.changedAt.localeCompare(right.changedAt),
  );
  const applicable = changes.filter((change) => change.effectiveOn < date);
  const sameDay = changes.filter((change) => change.effectiveOn === date).at(-1);
  if (sameDay) {
    const beforeTransition = sameDay.kind === "deactivated";
    const projectedAt = fact?.projected?.details.find((detail) =>
      detail.kind === "observation" && ["completed", "threshold-met"].includes(detail.status ?? ""),
    )?.observedAt;
    const completionAt = fact?.completedAt ?? fact?.localChangedAt ?? projectedAt;
    const completionBeforeDeactivation = sameDay.kind === "deactivated" && Boolean(completionAt && completionAt < sameDay.changedAt);
    const completionAfterRestore = sameDay.kind === "restored" && Boolean(completionAt && completionAt >= sameDay.changedAt);
    return {
      active: completionBeforeDeactivation || completionAfterRestore,
      transition: sameDay.kind,
      changedAt: sameDay.changedAt,
    };
  }
  if (changes.length === 0) {
    // Source active is only a current observation. Keep older facts visible;
    // the current inactive source day does not establish its earlier lifetime.
    return { active: date < currentDate || context.sourceActive };
  }
  let active = changes[0].kind === "deactivated";
  for (const change of applicable) active = change.kind === "restored";
  return { active };
}

function hasObservation(fact: HabitHistoryFact, status: string): boolean {
  return fact.projected?.details.some((detail) => detail.kind === "observation" && detail.status === status) ?? false;
}

function localCompletionForDate(fact: HabitHistoryFact): boolean {
  if (fact.localState === "completed") return true;
  return fact.projected?.countsAsCompletion === true || fact.projected?.status === "completed";
}

function outcomeFor(
  context: HabitHistoryContext,
  fact: HabitHistoryFact | undefined,
  date: string,
  currentDate: string,
  projectionFreshness: "ready" | "stale" | "retained" | "missing" | "error" | "unconfigured",
  effectiveStartDate: string | null,
): Outcome {
  if (date > currentDate || (effectiveStartDate && date < effectiveStartDate)) return "inactive";
  const life = lifecycleAt(context, date, currentDate, fact);
  if (!life.active) return life.transition ? "partial" : "inactive";
  const goal = goalOn(context, date, currentDate);
  if (!goal || !fact) return "unknown";
  if (fact.projected?.status === "conflict") return "unknown";

  if (goal.kind === "daily-time") {
    if (hasObservation(fact, "threshold-met")) return "success";
    // Explicit actual times are displayed as their own evidence. They do not
    // by themselves prove a threshold check or completion.
    if (hasObservation(fact, "actual-time")) return "unknown";
    // Today's period is still open. A fresh source's not-done or coverage
    // marker cannot turn an unfinished day into a failure before it closes.
    if (date === currentDate) return "unknown";
    if (projectionFreshness === "ready" && (fact.projected?.status === "notDone" || hasObservation(fact, "not-done"))) return "failure";
    if (projectionFreshness === "ready" && fact.projected?.coverage === "complete" && fact.projected.status !== "unavailable") return "failure";
    return "unknown";
  }

  if (localCompletionForDate(fact)) return "success";
  if (date === currentDate) return "unknown";
  if (projectionFreshness === "ready" && (fact.projected?.status === "notDone" || hasObservation(fact, "not-done"))) return "failure";
  if (fact.localState === "withdrawn" && fact.canonicalState === "ready" && !context.sourceExists) return "failure";
  if (
    fact.projected?.coverage === "complete" &&
    fact.projected.status !== "unavailable" &&
    fact.canonicalState !== "error"
  ) return "failure";
  return "unknown";
}

function metric(value: number | null, precision: HabitHistoryPrecision, unit: "days" | "weeks"): HabitHistoryMetric {
  return { value: precision === "unknown" ? null : value, precision, unit };
}

function buildPeriods(
  context: HabitHistoryContext,
  facts: ReadonlyMap<string, HabitHistoryFact>,
  from: string,
  to: string,
  currentDate: string,
  projectionFreshness: "ready" | "stale" | "retained" | "missing" | "error" | "unconfigured",
  effectiveStartDate: string | null,
): Readonly<{ unit: "days" | "weeks"; periods: Period[]; outcomes: Map<string, Outcome> }> {
  const outcomes = new Map<string, Outcome>();
  const dates: string[] = [];
  for (let date = from; date <= to && date <= currentDate; date = shiftDay(date, 1)) {
    dates.push(date);
    outcomes.set(date, outcomeFor(context, facts.get(date), date, currentDate, projectionFreshness, effectiveStartDate));
  }
  const currentGoal = goalOn(context, currentDate, currentDate);
  const unit = currentGoal?.kind === "weekly-count" ? "weeks" : "days";
  if (unit === "days") {
    return {
      unit,
      outcomes,
      periods: dates.map((date) => ({ key: date, outcome: outcomes.get(date) ?? "unknown", partial: false })),
    };
  }

  const weekKeys = [...new Set(dates.map(mondayOf))];
  const periods = weekKeys.map((weekOf) => {
    const weekDates = dates.filter((date) => mondayOf(date) === weekOf);
    const weekGoal = goalOn(context, weekDates[0] ?? weekOf, currentDate);
    const activeOutcomes = weekDates.map((date) => outcomes.get(date) ?? "unknown");
    if (!weekGoal || weekGoal.kind !== "weekly-count") return { key: weekOf, outcome: "unknown" as Outcome, partial: false };
    if (activeOutcomes.includes("success") && activeOutcomes.filter((outcome) => outcome === "success").length >= weekGoal.days) {
      return { key: weekOf, outcome: "success" as Outcome, partial: false };
    }
    const lifecyclePartial = activeOutcomes.includes("partial");
    const firstActiveDay = weekDates.find((date) => !["inactive", "partial"].includes(outcomes.get(date) ?? "unknown"));
    const partial = weekOf < (context.startDate ? mondayOf(context.startDate) : from) ||
      Boolean(firstActiveDay && (firstActiveDay > weekOf || lifecyclePartial));
    const weekEnd = shiftDay(weekOf, 6);
    if (weekEnd >= currentDate) return { key: weekOf, outcome: "unknown" as Outcome, partial };
    if (partial) return { key: weekOf, outcome: "partial" as Outcome, partial };
    if (activeOutcomes.includes("inactive") && activeOutcomes.every((outcome) => outcome === "inactive")) {
      return { key: weekOf, outcome: "inactive" as Outcome, partial: false };
    }
    if (activeOutcomes.some((outcome) => outcome === "unknown" || outcome === "partial")) {
      return { key: weekOf, outcome: "unknown" as Outcome, partial: false };
    }
    return { key: weekOf, outcome: "failure" as Outcome, partial: false };
  });
  return { unit, outcomes, periods };
}

function runLength(periods: readonly Period[], startIndex: number): number {
  let count = 0;
  for (let index = startIndex; index >= 0; index -= 1) {
    if (periods[index].outcome !== "success" || periods[index].partial) break;
    count += 1;
  }
  return count;
}

export function deriveHabitHistoryStats(input: Readonly<{
  context: HabitHistoryContext;
  facts: readonly HabitHistoryFact[];
  rangeFrom: string;
  rangeTo: string;
  currentDate: string;
  projectionFreshness: "ready" | "stale" | "retained" | "missing" | "error" | "unconfigured";
}>): HabitHistoryStats {
  const { context, rangeFrom, rangeTo, currentDate } = input;
  const facts = new Map(input.facts.map((fact) => [fact.date, fact]));
  const hasEvidenceBeforeCurrentStart = context.startDate !== null && [...facts.values()].some((fact) =>
    fact.date < context.startDate! && (
      fact.localState !== "none" ||
      fact.projected?.countsAsCompletion === true ||
      fact.projected?.status === "completed" ||
      fact.projected?.details.some((detail) => detail.kind === "observation" && detail.status === "threshold-met")
    ),
  );
  const effectiveStartDate = hasEvidenceBeforeCurrentStart ? null : context.startDate;
  const { unit, periods, outcomes } = buildPeriods(
    context,
    facts,
    rangeFrom,
    rangeTo,
    currentDate,
    input.projectionFreshness,
    effectiveStartDate,
  );
  const monthFrom = `${currentDate.slice(0, 7)}-01`;
  const monthDates = [...outcomes.keys()].filter((date) => date >= monthFrom && date <= currentDate);
  const monthValue = monthDates.filter((date) => outcomes.get(date) === "success").length;
  const monthComplete = effectiveStartDate !== null
    ? rangeFrom <= (effectiveStartDate > monthFrom ? effectiveStartDate : monthFrom)
    : rangeFrom <= monthFrom;
  const monthKnown = monthDates.every((date) => !["unknown", "partial"].includes(outcomes.get(date) ?? "unknown")) &&
    (!context.sourceExists || input.projectionFreshness === "ready") && monthComplete;
  const monthHasEvidence = monthValue > 0 || monthDates.some((date) => outcomes.get(date) === "failure");
  const month = metric(monthValue, monthKnown ? "confirmed" : monthHasEvidence ? "at-least" : "unknown", "days");

  const allTimeValue = [...outcomes.values()].filter((outcome) => outcome === "success").length;
  const hasCompleteLifetimeStart = context.startDate !== null && !hasEvidenceBeforeCurrentStart && rangeFrom <= context.startDate;
  const allTimeKnown = hasCompleteLifetimeStart && rangeTo >= currentDate &&
    [...outcomes.values()].every((outcome) => !["unknown", "partial"].includes(outcome)) &&
    (!context.sourceExists || input.projectionFreshness === "ready");
  const allTimeHasEvidence = allTimeValue > 0 || [...outcomes.values()].some((outcome) => outcome === "failure");
  const allTime = metric(allTimeValue, allTimeKnown ? "confirmed" : allTimeHasEvidence ? "at-least" : "unknown", "days");

  const lifetimePeriods = periods.filter((period) => period.key <= currentDate);
  const currentPeriodKey = unit === "weeks" ? mondayOf(currentDate) : currentDate;
  let currentIndex = lifetimePeriods.findIndex((period) => period.key === currentPeriodKey);
  if (currentIndex < 0) currentIndex = lifetimePeriods.length - 1;
  let currentValue: number | null = null;
  let currentPrecision: HabitHistoryPrecision = "unknown";
  if (currentIndex >= 0) {
    const current = lifetimePeriods[currentIndex];
    if (current.outcome === "success") {
      currentValue = runLength(lifetimePeriods, currentIndex);
      currentPrecision = currentValue > 0 ? "at-least" : "unknown";
    } else if (unit === "days" && current.key === currentDate && current.outcome === "unknown") {
      currentValue = runLength(lifetimePeriods, currentIndex - 1);
      currentPrecision = currentValue > 0 ? "at-least" : "unknown";
    } else if (unit === "weeks" && current.key === currentPeriodKey && current.outcome === "unknown") {
      currentValue = runLength(lifetimePeriods, currentIndex - 1);
      currentPrecision = currentValue > 0 ? "at-least" : "unknown";
    } else if (current.outcome === "failure" || current.outcome === "inactive") {
      currentValue = 0;
      currentPrecision = "confirmed";
    }
  }
  const currentStreak = metric(currentValue, currentPrecision, unit);

  let highest = 0;
  let run = 0;
  for (const period of lifetimePeriods) {
    if (period.outcome === "success" && !period.partial) {
      run += 1;
      highest = Math.max(highest, run);
    } else {
      run = 0;
    }
  }
  const highestHasKnownSuccess = highest > 0;
  const highestStreak = metric(
    highestHasKnownSuccess ? highest : allTimeKnown ? 0 : null,
    allTimeKnown ? "confirmed" : highestHasKnownSuccess ? "at-least" : "unknown",
    unit,
  );

  return {
    month,
    allTime,
    currentStreak,
    highestStreak,
    coverageFrom: rangeFrom,
    coverageTo: rangeTo,
    coverageIsComplete: allTimeKnown,
  };
}
