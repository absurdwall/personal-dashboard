import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");

test("Tasks is a real destination between Today and Calendar with Inbox and All editing", () => {
  const destinations = Array.from(
    html.matchAll(/class="destination-button"[\s\S]*?data-workspace-destination="([^"]+)"/g),
    (match) => match[1],
  );
  assert.deepEqual(destinations, ["today", "tasks", "calendar", "habits"]);
  assert.match(html, /id="workspace-destination-tasks"/);
  assert.match(html, /data-task-scope="all"/);
  assert.match(html, /data-task-scope="inbox"/);
  for (const field of ["task-create-name", "task-create-content", "task-create-date", "task-create-time"]) {
    assert.match(html, new RegExp(`id="${field}"`));
  }
  assert.match(main, /core\.invoke<TasksView>\("tasks_view"\)/);
  assert.match(main, /core\.invoke<TasksView>\("create_task"/);
  assert.match(main, /core\.invoke<TasksView>\("update_task"/);
});

test("Tasks fixed copy has Chinese and English counterparts", () => {
  for (const key of [
    "destination.tasks",
    "workspace.tasksDescription",
    "tasks.introduction",
    "tasks.scopeAll",
    "tasks.scopeInbox",
    "tasks.namePlaceholder",
    "tasks.timeNeedsDate",
    "tasks.savedToVault",
  ]) {
    const line = copies.split("\n").find((candidate) => candidate.includes(`"${key}"`));
    assert.ok(line, `missing copy ${key}`);
    assert.match(line, /zh:/);
    assert.match(line, /en:/);
  }
});

test("task writes serialize refresh reconciliation and retain retry identity", () => {
  const refresh = main.slice(
    main.indexOf("async function refreshTasks"),
    main.indexOf("async function createTask"),
  );
  assert.match(refresh, /if \(taskOperationCount > 0\)/);
  assert.match(main, /taskRefreshQueued/);
  assert.match(main, /const operationKey = JSON\.stringify\(\[binding, "create"\]\)/);
  assert.match(main, /view\.state === "ready" && Boolean\(savedTask\)/);
  assert.match(main, /tasks\.confirmationFailed/);
});
