import assert from "node:assert/strict";
import test from "node:test";
import {
  isCurrentTaskResponse,
  normalizeTaskSchedule,
  taskListMutationConfirmed,
  taskListScopeForId,
  taskMutationConfirmed,
  taskVisibleInScope,
} from "../../frontend/task-presentation.ts";

test("clearing a task date also clears its time and disables the time control", () => {
  assert.deepEqual(normalizeTaskSchedule("", "09:30"), {
    date: null,
    time: null,
    timeDisabled: true,
  });
  assert.deepEqual(normalizeTaskSchedule("2026-10-01", "09:30"), {
    date: "2026-10-01",
    time: "09:30",
    timeDisabled: false,
  });
});

test("a late task response cannot cross a destination or target binding boundary", () => {
  let currentToken = 2;
  const request = { isCurrent: (token: number) => token === currentToken };

  assert.equal(isCurrentTaskResponse(request, 1, "tasks", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "calendar", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-b"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-a"), true);
  currentToken = 3;
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 3, "tasks", null, "vault-b"), true);
});

test("task state filters keep deleted records out of active scopes", () => {
  const pending = { listId: "inbox", state: "pending" as const, deletedAt: null };
  const completed = { listId: "inbox", state: "completed" as const, deletedAt: null };
  const abandoned = { listId: "archive", state: "abandoned" as const, deletedAt: null };
  const deleted = { listId: "inbox", state: "completed" as const, deletedAt: "2026-09-17T14:00-04:00" };

  assert.equal(taskVisibleInScope(pending, "all", "all"), true);
  assert.equal(taskVisibleInScope(pending, "all", "completed"), false);
  assert.equal(taskVisibleInScope(completed, "inbox", "completed"), true);
  assert.equal(taskVisibleInScope(abandoned, "inbox", "abandoned"), false);
  assert.equal(taskVisibleInScope(abandoned, "all", "abandoned"), true);
  assert.equal(taskVisibleInScope(deleted, "inbox", "deleted"), true);
  assert.equal(taskVisibleInScope(deleted, "inbox", "all"), false);
});

test("task list scopes keep archived work out of active views and expose it for recall", () => {
  const active = { listId: "planning", state: "pending" as const, deletedAt: null };
  const archived = {
    listId: "planning",
    listArchived: true,
    state: "completed" as const,
    deletedAt: null,
  };

  assert.equal(taskVisibleInScope(active, "all", "pending"), true);
  assert.equal(taskVisibleInScope(active, taskListScopeForId("planning"), "pending"), true);
  assert.equal(taskVisibleInScope(archived, "all", "completed"), false);
  assert.equal(taskVisibleInScope(archived, "archived", "completed"), true);
  assert.equal(taskVisibleInScope(archived, taskListScopeForId("planning"), "completed"), false);
});

test("task mutation confirmation requires a current ready response and the saved task", () => {
  assert.equal(taskMutationConfirmed(true, "ready", true), true);
  assert.equal(taskMutationConfirmed(false, "ready", true), false);
  assert.equal(taskMutationConfirmed(true, "error", true), false);
  assert.equal(taskMutationConfirmed(true, "ready", false), false);
});

test("list mutation confirmation accepts an empty source when the list is present", () => {
  assert.equal(taskListMutationConfirmed(true, "empty", true), true);
  assert.equal(taskListMutationConfirmed(true, "ready", true), true);
  assert.equal(taskListMutationConfirmed(true, "empty", false), false);
  assert.equal(taskListMutationConfirmed(true, "error", true), false);
});
