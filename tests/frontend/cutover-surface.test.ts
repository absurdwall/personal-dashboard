import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const rust = readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8");

test("4.0 preserves the existing destinations and adds Tasks without retired runtime surfaces", () => {
  const destinations = Array.from(
    html.matchAll(/class="destination-button"[\s\S]*?data-workspace-destination="([^"]+)"/g),
    (match) => match[1],
  );

  assert.deepEqual(destinations, ["today", "tasks", "calendar", "habits"]);
  assert.match(html, /id="workspace-destination-settings"/);
  for (const retiredId of [
    "workspace-destination-this-week",
    "workspace-destination-history",
    "exercise-dashboard",
    "profile-panel",
    "notification-panel",
  ]) {
    assert.doesNotMatch(html, new RegExp(`id="${retiredId}"|class="${retiredId}"`));
  }
});

test("shipping frontend source contains no retired Exercise or Profile runtime", () => {
  for (const retiredToken of [
    "ExerciseDashboardView",
    "ProfileView",
    "exercise_dashboard",
    "profile_state",
    "notification_state",
    "backup_profile",
  ]) {
    assert.doesNotMatch(main, new RegExp(retiredToken));
  }
});

test("normal 2.0 startup registers no retired Exercise, Profile, migration, or reminder commands", () => {
  const runBoundary = rust.slice(rust.indexOf("pub fn run()"));

  for (const retiredRuntime of [
    "BaselineMigrationApplication",
    "ExerciseApplication",
    "ProfileApplication",
    "ProfileBackupApplication",
    "ProfileMoveApplication",
    "NotificationApplication",
  ]) {
    assert.doesNotMatch(runBoundary, new RegExp(retiredRuntime));
  }
  for (const retiredCommand of [
    "baseline_migration_state",
    "exercise_dashboard",
    "profile_state",
    "backup_profile",
    "notification_state",
  ]) {
    assert.doesNotMatch(runBoundary, new RegExp(retiredCommand));
  }
});

test("Calendar and Habits summaries use the non-receiving daily read command", () => {
  const calendarSelection = main.slice(
    main.indexOf("async function selectCalendarDate"),
    main.indexOf("async function refreshCalendarMonth"),
  );
  const calendarOpen = main.slice(
    main.indexOf("async function openCalendar"),
    main.indexOf("async function chooseCalendarMonth"),
  );
  const calendarToday = main.slice(
    main.indexOf("async function showCalendarToday"),
    main.indexOf("const habitStatusLabels"),
  );
  const habitDate = main.slice(
    main.indexOf("async function loadSelectedHabitDate"),
    main.indexOf("function stashHabitNoteDraft"),
  );

  for (const readOnlySurface of [
    calendarSelection,
    calendarOpen,
    calendarToday,
    habitDate,
  ]) {
    assert.match(readOnlySurface, /"read_daily_view"/);
    assert.doesNotMatch(readOnlySurface, /"daily_view"|"today_view"/);
  }
});
