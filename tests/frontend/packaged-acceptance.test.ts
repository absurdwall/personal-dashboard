import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const acceptance = readFileSync(
  new URL("../../scripts/acceptance/macos-ipc-workflow.sh", import.meta.url),
  "utf8",
);
const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const interfaceLanguage = readFileSync(
  new URL("../../frontend/interface-language.ts", import.meta.url),
  "utf8",
);
const driver = readFileSync(
  new URL("../../scripts/acceptance/macos-ui-driver.swift", import.meta.url),
  "utf8",
);

function scenarioBody(name: string): string {
  const start = acceptance.indexOf(`run_${name}_scenario()`);
  assert.notEqual(start, -1, `${name} must remain an explicit packaged scenario`);
  const next = acceptance.indexOf("\nrun_", start + 1);
  return acceptance.slice(start, next === -1 ? acceptance.length : next);
}

test("the final gate wires an explicit 4.0 packaged Tasks scenario", () => {
  assert.match(acceptance, /for scenario in [^\n]*dashboard-4/);
  assert.match(acceptance, /dashboard-4\) run_dashboard_4_scenario/);
});

test("packaged actions prefer the visible surface when shared projections are hidden", () => {
  assert.match(driver, /func findVisiblePressable/);
  assert.match(driver, /findVisiblePressable\(application, text, contains:/);
  assert.match(driver, /func findVisibleTextField/);
  assert.match(driver, /findVisibleTextField\(application, label/);
});

test("packaged date/time entry follows the host locale and explicit meridiem", () => {
  assert.match(driver, /DateFormatter\.dateFormat/);
  assert.match(driver, /func dateSegmentOrder/);
  assert.match(driver, /func usesTwelveHourClock/);
  assert.match(driver, /func setMeridiem/);
  assert.match(driver, /date\/time field did not accept/);
});

test("packaged task creation fields expose a localized unique accessibility label", () => {
  for (const id of [
    "task-create-name",
    "today-task-create-name",
    "calendar-task-create-name",
  ]) {
    assert.match(
      html,
      new RegExp(
        `id="${id}"[^>]*aria-label="新建任务名称"[^>]*data-i18n-aria-label="tasks\\.createLabel"`,
      ),
    );
  }
});

test("the packaged list-scope reset has a distinct Accessibility label", () => {
  assert.match(main, /dataset\.i18nAriaLabel = "tasks\.scopeAllList"/);
  assert.match(interfaceLanguage, /"tasks\.scopeAllList"/);
});

test("shared task lifecycle controls expose the task name to packaged Accessibility", () => {
  for (const copyKey of [
    "tasks.complete",
    "tasks.abandon",
    "tasks.delete",
    "tasks.undoDelete",
    "tasks.correctCompletion",
  ]) {
    assert.match(main, new RegExp(`${copyKey}[^\\n]*task\\.name`));
  }
});

test("the 4.0 packaged scenario exercises the shared task source and lifecycle", () => {
  const scenario = scenarioBody("dashboard_4");
  for (const marker of [
    "life/.personal-dashboard/tasks/v1/tasks.json",
    "Tasks",
    "Today",
    "Calendar",
    "Inbox",
    "Archived",
    "Completed",
    "Abandoned",
    "Deleted",
    "Restore task",
    "Restore",
    "+2",
    "Today 默认新建 · Today date",
    "Calendar 默认新建 · Selected date",
    "press-key \"space\"",
    "product-en-tasks-narrow.png",
    "product-en-calendar-narrow.png",
    "stop_app",
    "launch_app_waiting_for_text",
  ]) {
    assert.match(scenario, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(scenario, /run_live_daily_cycle_scenario|PERSONAL_DASHBOARD_ACCEPTANCE_LIVE/);
});
