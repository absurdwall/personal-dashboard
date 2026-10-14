import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveHabitHistoryStats,
  type HabitHistoryContext,
  type HabitHistoryFact,
} from "../../frontend/habit-history-stats.ts";

function context(overrides: Partial<HabitHistoryContext> = {}): HabitHistoryContext {
  return {
    key: "reading",
    startDate: "2026-10-12",
    createdLocally: true,
    sourceExists: false,
    sourceActive: true,
    baseGoal: { kind: "daily-count" },
    currentGoal: { kind: "daily-count" },
    sourceGoalHistory: [],
    goalRevisions: [],
    lifecycleChanges: [],
    ...overrides,
  };
}

function fact(
  date: string,
  state: HabitHistoryFact["localState"],
  overrides: Partial<HabitHistoryFact> = {},
): HabitHistoryFact {
  return {
    date,
    canonicalState: "ready",
    localState: state,
    completedAt: state === "completed" ? `${date}T10:00:00-04:00` : null,
    localChangedAt: state === "withdrawn" ? `${date}T10:00:00-04:00` : null,
    ...overrides,
  };
}

function stats(
  value: Readonly<{
    context?: HabitHistoryContext;
    facts: readonly HabitHistoryFact[];
    from: string;
    to: string;
    today: string;
    freshness?: "ready" | "stale" | "retained" | "missing" | "error" | "unconfigured";
  }>,
) {
  return deriveHabitHistoryStats({
    context: value.context ?? context(),
    facts: value.facts,
    rangeFrom: value.from,
    rangeTo: value.to,
    currentDate: value.today,
    projectionFreshness: value.freshness ?? "missing",
  });
}

test("local canonical outcomes produce exact deduplicated month and lifetime counts only with complete dates", () => {
  const result = stats({
    facts: [
      fact("2026-10-12", "completed"),
      fact("2026-10-13", "completed"),
      fact("2026-10-14", "withdrawn"),
    ],
    from: "2026-10-12",
    to: "2026-10-14",
    today: "2026-10-14",
  });
  assert.deepEqual(result.month, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.allTime, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.currentStreak, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.highestStreak, { value: 2, precision: "at-least", unit: "days" });
});

test("missing local dates stay unknown and do not get presented as failure or zero", () => {
  const result = stats({
    facts: [fact("2026-10-12", "completed"), fact("2026-10-13", "completed")],
    from: "2026-10-12",
    to: "2026-10-14",
    today: "2026-10-14",
  });
  assert.deepEqual(result.month, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.allTime, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.currentStreak, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.highestStreak, { value: 2, precision: "at-least", unit: "days" });
});

test("moving the current start date later does not hide earlier retained completions", () => {
  const movedStart = context({ startDate: "2026-10-14" });
  const result = stats({
    context: movedStart,
    facts: [fact("2026-10-12", "completed"), fact("2026-10-13", "completed"), fact("2026-10-14", "none")],
    from: "2026-10-12",
    to: "2026-10-14",
    today: "2026-10-14",
  });
  assert.deepEqual(result.month, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.allTime, { value: 2, precision: "at-least", unit: "days" });
  assert.equal(result.coverageIsComplete, false, "the current start date cannot recover the original lifetime boundary");
});

test("weekly streak evaluates each week against its historical goal and leaves the open current week unresolved", () => {
  const weekly = context({
    baseGoal: { kind: "weekly-count", days: 2 },
    currentGoal: { kind: "weekly-count", days: 3 },
    goalRevisions: [{
      effectiveOn: "2026-10-19",
      changedAt: "2026-10-14T14:00:00-04:00",
      disposition: "scheduled",
      goal: { kind: "weekly-count", days: 3 },
    }],
  });
  const result = stats({
    context: weekly,
    facts: [
      fact("2026-10-12", "completed"), fact("2026-10-13", "completed"),
      fact("2026-10-19", "completed"), fact("2026-10-20", "completed"),
    ],
    from: "2026-10-12",
    to: "2026-10-21",
    today: "2026-10-21",
  });
  assert.deepEqual(result.month, { value: 4, precision: "at-least", unit: "days" });
  assert.deepEqual(result.currentStreak, { value: 1, precision: "at-least", unit: "weeks" });
  assert.deepEqual(result.highestStreak, { value: 1, precision: "at-least", unit: "weeks" });
});

test("unknown source gaps break current streak and prevent a confirmed historical maximum", () => {
  const sourced = context({
    createdLocally: false,
    sourceExists: true,
    sourceGoalHistory: [{ weekOf: "2026-10-12", goal: { kind: "daily-count" } }],
  });
  const result = stats({
    context: sourced,
    facts: [
      fact("2026-10-12", "none", { projected: {
        coverage: "complete", status: "completed", countsAsCompletion: true, actualTimeLabel: null, details: [],
      } }),
      fact("2026-10-13", "none", { projected: {
        coverage: "complete", status: "notDone", countsAsCompletion: false, actualTimeLabel: null, details: [],
      } }),
      fact("2026-10-14", "none", { projected: {
        coverage: "unknown", status: "unknown", countsAsCompletion: false, actualTimeLabel: null, details: [],
      } }),
    ],
    from: "2026-10-12",
    to: "2026-10-14",
    today: "2026-10-14",
    freshness: "ready",
  });
  assert.deepEqual(result.currentStreak, { value: null, precision: "unknown", unit: "days" });
  assert.deepEqual(result.highestStreak, { value: 1, precision: "at-least", unit: "days" });
  assert.equal(result.coverageIsComplete, false);
});

test("deactivation breaks activity streaks while preserving pre-deactivation and restored completions", () => {
  const withLifecycle = context({
    lifecycleChanges: [
      { kind: "deactivated", effectiveOn: "2026-10-14", changedAt: "2026-10-14T12:00:00-04:00" },
      { kind: "restored", effectiveOn: "2026-10-17", changedAt: "2026-10-17T09:00:00-04:00" },
    ],
  });
  const result = stats({
    context: withLifecycle,
    facts: [
      fact("2026-10-12", "completed"),
      fact("2026-10-13", "completed"),
      fact("2026-10-14", "none"),
      fact("2026-10-15", "none"),
      fact("2026-10-16", "none"),
      fact("2026-10-17", "completed", { completedAt: "2026-10-17T10:00:00-04:00" }),
      fact("2026-10-18", "completed"),
    ],
    from: "2026-10-12",
    to: "2026-10-18",
    today: "2026-10-18",
  });
  assert.deepEqual(result.allTime, { value: 4, precision: "at-least", unit: "days" });
  assert.deepEqual(result.currentStreak, { value: 2, precision: "at-least", unit: "days" });
  assert.deepEqual(result.highestStreak, { value: 2, precision: "at-least", unit: "days" });
});

test("a time threshold is explicit attainment; an actual time alone remains a distinct unknown", () => {
  const timeHabit = context({
    baseGoal: { kind: "daily-time", standard: "07:30", dayRelation: "same-day" },
    currentGoal: { kind: "daily-time", standard: "07:30", dayRelation: "same-day" },
  });
  const result = stats({
    context: timeHabit,
    facts: [
      fact("2026-10-12", "none", { projected: {
        coverage: "complete", status: "thresholdMet", countsAsCompletion: false, actualTimeLabel: null,
        details: [{ kind: "observation", status: "threshold-met" }],
      } }),
      fact("2026-10-13", "none", { projected: {
        coverage: "complete", status: "actualTime", countsAsCompletion: false, actualTimeLabel: "07:18",
        details: [{ kind: "observation", status: "actual-time" }],
      } }),
    ],
    from: "2026-10-12",
    to: "2026-10-13",
    today: "2026-10-13",
    freshness: "ready",
  });
  assert.deepEqual(result.allTime, { value: 1, precision: "at-least", unit: "days" });
  assert.deepEqual(result.currentStreak, { value: 1, precision: "at-least", unit: "days" });
});

test("an unmet current day remains open for daily count and time goals", () => {
  for (const goal of [
    { kind: "daily-count" as const },
    { kind: "daily-time" as const, standard: "07:30", dayRelation: "same-day" as const },
  ]) {
    const daily = context({
      createdLocally: false,
      sourceExists: true,
      baseGoal: goal,
      currentGoal: goal,
      sourceGoalHistory: [{ weekOf: "2026-10-12", goal }],
    });
    const result = stats({
      context: daily,
      facts: [
        fact("2026-10-13", "none", { projected: {
          coverage: "complete", status: "completed", countsAsCompletion: true, actualTimeLabel: null,
          details: goal.kind === "daily-time" ? [{ kind: "observation", status: "threshold-met" }] : [],
        } }),
        fact("2026-10-14", "none", { projected: {
          coverage: "complete", status: "notDone", countsAsCompletion: false, actualTimeLabel: null,
          details: [{ kind: "observation", status: "not-done" }],
        } }),
      ],
      from: "2026-10-13",
      to: "2026-10-14",
      today: "2026-10-14",
      freshness: "ready",
    });
    assert.deepEqual(result.currentStreak, { value: 1, precision: "at-least", unit: "days" });
    assert.equal(result.highestStreak.value, 1);
  }
});
