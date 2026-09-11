import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const driver = readFileSync(
  new URL("../../scripts/acceptance/macos-ui-driver.swift", import.meta.url),
  "utf8",
);
const acceptance = readFileSync(
  new URL("../../scripts/acceptance/macos-ipc-workflow.sh", import.meta.url),
  "utf8",
);

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should remain an explicit implementation seam`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction);
}

test("the final scoped responsive rules keep text navigation visible", () => {
  const marker = css.lastIndexOf("Ticket 09 final cascade: keep the restored FINAL shell ahead of legacy rules");
  assert.notEqual(marker, -1);
  const finalRules = css.slice(marker);

  assert.match(finalRules, /@media \(min-width: 681px\) and \(max-width: 900px\)/);
  assert.match(finalRules, /grid-template-columns: 10rem minmax\(0, 1fr\)/);
  assert.match(finalRules, /\.destination-icon \{\s*display: none;/);
  assert.match(finalRules, /\.destination-button \{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(finalRules, /\.destination-button > span:not\(\.destination-icon\) \{/);
  assert.match(finalRules, /clip: auto/);
  assert.match(finalRules, /@media \(max-width: 680px\)/);
  assert.match(finalRules, /\.workspace-navigation \{[\s\S]*display: flex/);
  assert.match(finalRules, /\.workspace-compact-navigation,[\s\S]*display: none/);
  assert.match(finalRules, /\.app-shell\[data-workspace-destination\]/);
  assert.match(finalRules, /\.app-shell\[data-workspace-destination="calendar"\]/);
  assert.match(finalRules, /calendar-summary-status[\s\S]*border-radius: 0/);
  assert.match(finalRules, /calendar-header h2[\s\S]*font-family: Georgia/);
  assert.match(finalRules, /\.app-shell\[data-workspace-destination="habits"\]/);
});

test("Vault reselection invalidates and refreshes the active Calendar or Habits projection", () => {
  const resetBody = functionBody(main, "resetVaultScopedWorkspaceState");
  for (const token of [
    "calendarMonthRequests.invalidate()",
    "calendarSelectionRequests.invalidate()",
    "habitSnapshotRequests.invalidate()",
    "habitDateRequests.invalidate()",
    "selectedCalendarDate = null",
    "currentCalendarMonth = null",
    "selectedHabitCell = null",
    "currentHabitDateView = null",
  ]) {
    assert.match(resetBody, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const vaultBody = functionBody(main, "selectTodayVault");
  assert.match(vaultBody, /selectVaultAndRefresh\(/);
  assert.match(vaultBody, /prepareForVaultSwitch:[\s\S]*resetVaultScopedWorkspaceState\(\)/);
  assert.match(vaultBody, /openCalendar,/);
  assert.match(vaultBody, /refreshHabits,/);
  assert.match(resetBody, /calendarSummaryHeading\.textContent = "正在读取选中日期…"/);
  assert.match(resetBody, /renderWorkspaceRailContext\(currentWorkspaceDestination\)/);
});

test("Habits exposes the FINAL header metric while keeping the week label secondary", () => {
  assert.match(html, /id="workspace-context-status"/);
  assert.match(main, /本周已知/);
  assert.match(main, /featureArea: "HABITS · 平级入口"/);
  assert.match(main, /description: "周次数与每日目标时刻放在同一份轻量列表里。"/);
  assert.match(html, /WEEK OF · SOURCED SNAPSHOT/);
  assert.match(css, /workspace-context-status\[data-state="habits-summary"\]/);
  assert.match(css, /\.habits-header \.destination-heading[\s\S]*font-size: 0\.76rem/);
  assert.match(css, /data-workspace-destination="habits"\] \.workspace-header h1[\s\S]*font-family: Georgia/);
  assert.match(css, /data-workspace-destination="habits"\] \.habit-snapshot-row[\s\S]*minmax\(0, 0\.85fr\)/);
});

test("Calendar and Habits packaged scenarios start from the 2.0 Today surface", () => {
  const calendar = acceptance.slice(
    acceptance.indexOf("run_calendar_scenario()"),
    acceptance.indexOf("run_habits_scenario()"),
  );
  const habits = acceptance.slice(
    acceptance.indexOf("run_habits_scenario()"),
    acceptance.indexOf("run_dashboard_2_scenario()"),
  );

  assert.doesNotMatch(calendar, /Log workout now/);
  assert.doesNotMatch(habits, /Log workout now/);
  assert.match(calendar, /launch_app_waiting_for_text "Today" 30/);
  assert.match(habits, /launch_app_waiting_for_text "Today" 30/);
  assert.match(habits, /run_driver assert-text "Today"/);
  assert.match(habits, /run_driver assert-text "Calendar"/);
  assert.match(habits, /run_driver assert-text "Habits"/);
});

test("Calendar and Habits semantic checks no longer require retired destinations", () => {
  assert.match(driver, /let dashboardDestinationMode = calendarMode \|\| habitsMode/);
  assert.match(driver, /requiresDestinationSwitcher && !dashboardDestinationMode/);
  assert.match(driver, /\["Today", "Calendar", "Habits"\]/);
});
