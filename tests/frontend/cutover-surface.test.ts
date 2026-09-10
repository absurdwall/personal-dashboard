import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const rust = readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8");

test("2.0 exposes exactly the FINAL Today, Calendar, and Habits destinations", () => {
  const destinations = Array.from(
    html.matchAll(/class="destination-button"[\s\S]*?data-workspace-destination="([^"]+)"/g),
    (match) => match[1],
  );

  assert.deepEqual(destinations, ["today", "calendar", "habits"]);
  for (const retiredId of [
    "workspace-destination-this-week",
    "workspace-destination-history",
    "workspace-destination-settings",
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
