import assert from "node:assert/strict";
import test from "node:test";
import { habitDetailStatistics } from "../../frontend/habit-detail-statistics.ts";

function habit(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    goalKind: "daily-completion",
    goalTarget: { kind: "daily-completion" },
    goalHistory: [],
    history: [],
    definition: {
      origin: "local",
      startDate: "2026-10-01",
      lifecycleActive: true,
      lifecycleHistory: [],
      goalRevisions: [{
        effectiveFrom: "2026-10-01",
        target: { kind: "daily-completion" },
        status: "active",
      }],
      currentGoal: { kind: "daily-completion" },
      currentGoalEffectiveFrom: "2026-10-01",
    },
    ...overrides,
  } as any;
}

function input(
  completions: readonly { livedDate: string; state: "completed" | "withdrawn" }[],
  overrides: Record<string, unknown> = {},
) {
  return {
    habit: habit(overrides.habit as Record<string, unknown> | undefined),
    completions,
    today: "2026-10-14",
    canonicalState: "ready",
    snapshotGeneratedAt: null,
    snapshotState: "missing",
    ...overrides,
  } as any;
}

test("canonical lived-date history deduplicates attainment days and does not bridge unknown gaps", () => {
  const stats = habitDetailStatistics(input([
    { livedDate: "2026-10-12", state: "completed" },
    { livedDate: "2026-10-12", state: "completed" },
    { livedDate: "2026-10-14", state: "completed" },
  ]));

  assert.equal(stats.monthAttainedDays, 2);
  assert.equal(stats.monthExact, true);
  assert.equal(stats.cumulativeAttainedDays, 2);
  assert.equal(stats.cumulativeExact, true);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.highestConfirmedStreak, 1);
  assert.equal(stats.highestHistoryExact, false);
});

test("inactive dates split confirmed streaks while retaining earlier completions", () => {
  const stats = habitDetailStatistics(input([
    { livedDate: "2026-10-11", state: "completed" },
    { livedDate: "2026-10-12", state: "completed" },
    { livedDate: "2026-10-13", state: "completed" },
    { livedDate: "2026-10-14", state: "completed" },
  ], {
    today: "2026-10-14",
    habit: habit({
      active: true,
      definition: {
        origin: "local",
        startDate: "2026-10-01",
        lifecycleActive: true,
        lifecycleHistory: [
          { active: false, effectiveFrom: "2026-10-13" },
          { active: true, effectiveFrom: "2026-10-14" },
        ],
        goalRevisions: [{
          effectiveFrom: "2026-10-01",
          target: { kind: "daily-completion" },
          status: "active",
        }],
        currentGoal: { kind: "daily-completion" },
        currentGoalEffectiveFrom: "2026-10-01",
      },
    }),
  }));

  assert.equal(stats.cumulativeAttainedDays, 3);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.highestConfirmedStreak, 2);
});

test("missing history coverage is shown as unknown rather than a zero count", () => {
  const stats = habitDetailStatistics(input([], {
    canonicalState: "missing",
    habit: habit({
      active: true,
      goalKind: "daily-completion",
      definition: {
        origin: "sourced",
        startDate: null,
        lifecycleActive: true,
        lifecycleHistory: [],
        goalRevisions: [],
        currentGoal: { kind: "daily-completion" },
        currentGoalEffectiveFrom: "2026-10-01",
      },
    }),
  }));

  assert.equal(stats.monthAttainedDays, null);
  assert.equal(stats.cumulativeAttainedDays, null);
  assert.equal(stats.currentStreak, null);
  assert.equal(stats.highestConfirmedStreak, null);
});

test("explicit completion evidence for a daily-time Habit uses daily streak units", () => {
  const dailyTime = { kind: "daily-time", standard: "07:00", dayRelation: "same-day" };
  const stats = habitDetailStatistics(input([], {
    canonicalState: "missing",
    habit: habit({
      active: true,
      goalKind: "daily-time",
      goalTarget: dailyTime,
      history: [{
        date: "2026-10-13",
        coverage: "complete",
        countsAsCompletion: true,
        hasExternalCompletion: true,
        localCompletionState: "none",
      }],
      definition: {
        origin: "sourced",
        startDate: "2026-10-01",
        lifecycleActive: true,
        lifecycleHistory: [],
        goalRevisions: [{ effectiveFrom: "2026-10-01", target: dailyTime, status: "active" }],
        currentGoal: dailyTime,
        currentGoalEffectiveFrom: "2026-10-01",
      },
    }),
  }));

  assert.equal(stats.streakUnit, "days");
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.highestConfirmedStreak, 1);
});

test("an unachieved open weekly goal does not prematurely break the prior streak", () => {
  const weeklyTarget = { kind: "weekly-count", standard: 2 };
  const stats = habitDetailStatistics(input([
    { livedDate: "2026-10-05", state: "completed" },
    { livedDate: "2026-10-07", state: "completed" },
  ], {
    today: "2026-10-14",
    habit: habit({
      active: true,
      goalKind: "weekly-count",
      goalTarget: weeklyTarget,
      goalHistory: [
        { weekOf: "2026-10-05", target: weeklyTarget },
      ],
      definition: {
        origin: "local",
        startDate: "2026-09-01",
        lifecycleActive: true,
        lifecycleHistory: [],
        goalRevisions: [{
          effectiveFrom: "2026-09-01",
          target: weeklyTarget,
          status: "active",
        }],
        currentGoal: weeklyTarget,
        currentGoalEffectiveFrom: "2026-09-01",
      },
    }),
  }));

  assert.equal(stats.streakUnit, "weeks");
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.highestConfirmedStreak, 1);
});

test("restoring midweek starts a new weekly streak segment", () => {
  const weeklyTarget = { kind: "weekly-count", standard: 2 };
  const stats = habitDetailStatistics(input([
    { livedDate: "2026-10-05", state: "completed" },
    { livedDate: "2026-10-07", state: "completed" },
  ], {
    today: "2026-10-14",
    habit: habit({
      active: true,
      goalKind: "weekly-count",
      goalTarget: weeklyTarget,
      goalHistory: [{ weekOf: "2026-10-05", target: weeklyTarget }],
      definition: {
        origin: "local",
        startDate: "2026-09-01",
        lifecycleActive: true,
        lifecycleHistory: [
          { active: false, effectiveFrom: "2026-10-13" },
          { active: true, effectiveFrom: "2026-10-14" },
        ],
        goalRevisions: [{
          effectiveFrom: "2026-09-01",
          target: weeklyTarget,
          status: "active",
        }],
        currentGoal: weeklyTarget,
        currentGoalEffectiveFrom: "2026-09-01",
      },
    }),
  }));

  assert.equal(stats.currentStreak, null);
  assert.equal(stats.highestConfirmedStreak, 1);
});
