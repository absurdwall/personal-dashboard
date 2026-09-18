import assert from "node:assert/strict";
import test from "node:test";
import { LatestRequest } from "../../frontend/latest-request.ts";
import {
  calendarTasksForDate,
  isCurrentTaskResponse,
  normalizeTaskSchedule,
  taskListMutationConfirmed,
  taskListScopeForId,
  taskEditOperationKey,
  TaskOperationIdentityStore,
  taskMutationConfirmed,
  performTaskUpdateRequest,
  taskScopeCount,
  type TaskUpdateView,
  todayTaskGroups,
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

test("scope counts follow the active state filter without changing membership semantics", () => {
  const tasks = [
    { listId: "inbox", date: "2026-09-17", state: "pending" as const, deletedAt: null, overdue: false },
    { listId: "inbox", date: "2026-09-17", state: "completed" as const, deletedAt: null, overdue: false },
    { listId: "work", listArchived: true, date: "2026-09-17", state: "abandoned" as const, deletedAt: null, overdue: false },
    { listId: "inbox", date: null, state: "completed" as const, deletedAt: "2026-09-18T10:00-04:00", overdue: false },
  ];
  const archivedListIds = new Set(["work"]);

  assert.equal(taskScopeCount(tasks, "all", "all", "2026-09-17", archivedListIds), 2);
  assert.equal(taskScopeCount(tasks, "all", "pending", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "all", "completed", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "all", "deleted", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "archived", "abandoned", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "today", "pending", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "today", "completed", "2026-09-17", archivedListIds), 1);
  assert.equal(taskScopeCount(tasks, "today", "deleted", "2026-09-17", archivedListIds), 0);
});

test("task mutation confirmation requires a current ready response and the saved task", () => {
  assert.equal(taskMutationConfirmed(true, "ready", true), true);
  assert.equal(taskMutationConfirmed(false, "ready", true), false);
  assert.equal(taskMutationConfirmed(true, "error", true), false);
  assert.equal(taskMutationConfirmed(true, "ready", false), false);
});

test("a late committed edit can be retried idempotently without poisoning a new edit", () => {
  const originalEdit = {
    targetBinding: "vault-a",
    taskId: "task-1",
    name: "原任务（已保存）",
    content: "原内容",
    date: "2026-09-20",
    time: "09:00",
    listId: "inbox",
  };
  const nextEdit = { ...originalEdit, name: "原任务（再次编辑）" };

  assert.equal(
    taskEditOperationKey(originalEdit),
    taskEditOperationKey(originalEdit),
    "retrying the same uncertain write must retain its idempotency identity",
  );
  assert.notEqual(
    taskEditOperationKey(originalEdit),
    taskEditOperationKey(nextEdit),
    "a later intentional payload must receive a new identity after a late response",
  );
  assert.equal(taskMutationConfirmed(false, "ready", true), false);
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function taskUpdateView(name: string): TaskUpdateView {
  return {
    state: "ready",
    targetBinding: "vault-a",
    tasks: [{
      id: "task-1",
      name,
      content: null,
      date: null,
      time: null,
      listId: "inbox",
    }],
  };
}

function taskUpdateEdit(name: string) {
  return {
    targetBinding: "vault-a",
    taskId: "task-1",
    name,
    content: null,
    date: null,
    time: null,
    listId: "inbox",
  };
}

test("the update request seam keeps a late committed payload distinct from a later edit", async () => {
  const identities = new TaskOperationIdentityStore();
  const requests = new LatestRequest();
  let nextId = 0;
  const firstEdit = taskUpdateEdit("第一版");
  const secondEdit = taskUpdateEdit("第二版");
  const firstResponse = deferred<TaskUpdateView>();
  const firstPromise = performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke: async () => firstResponse.promise,
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });

  requests.invalidate();
  firstResponse.resolve(taskUpdateView("第一版"));
  const firstResult = await firstPromise;
  assert.equal(firstResult.responseIsCurrent, false);
  assert.equal(firstResult.confirmed, false);

  const secondResult = await performTaskUpdateRequest(secondEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke: async (input) => taskUpdateView(input.name),
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });
  assert.equal(secondResult.confirmed, true);
  assert.notEqual(secondResult.operation.changeId, firstResult.operation.changeId);

  const retryFirstResult = await performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke: async (input) => taskUpdateView(input.name),
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });
  assert.notEqual(
    retryFirstResult.operation.changeId,
    firstResult.operation.changeId,
    "a later confirmed edit must retire the earlier payload identity",
  );
});

test("the update request seam reuses an uncertain payload identity for retry after navigation", async () => {
  const identities = new TaskOperationIdentityStore();
  const requests = new LatestRequest();
  let nextId = 0;
  const firstEdit = taskUpdateEdit("第一版");
  const firstResponse = deferred<TaskUpdateView>();
  const firstPromise = performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke: async () => firstResponse.promise,
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });
  requests.invalidate();
  firstResponse.resolve(taskUpdateView("第一版"));
  const firstResult = await firstPromise;

  const retryResult = await performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke: async (input) => taskUpdateView(input.name),
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });
  assert.equal(firstResult.confirmed, false);
  assert.equal(retryResult.confirmed, true);
  assert.equal(
    retryResult.operation.changeId,
    firstResult.operation.changeId,
    "retrying the same uncertain edit after navigation must reuse its identity",
  );
});

test("list mutation confirmation accepts an empty source when the list is present", () => {
  assert.equal(taskListMutationConfirmed(true, "empty", true), true);
  assert.equal(taskListMutationConfirmed(true, "ready", true), true);
  assert.equal(taskListMutationConfirmed(true, "empty", false), false);
  assert.equal(taskListMutationConfirmed(true, "error", true), false);
});

test("Today groups dated active tasks and overdue pending work without pulling in undated or archived tasks", () => {
  const tasks = [
    { id: "today", listId: "inbox", date: "2026-09-17", state: "pending" as const, deletedAt: null, overdue: false },
    { id: "overdue", listId: "work", date: "2026-09-16", state: "pending" as const, deletedAt: null, overdue: true },
    { id: "completed", listId: "inbox", date: "2026-09-17", state: "completed" as const, deletedAt: null, overdue: false },
    { id: "undated", listId: "inbox", date: null, state: "pending" as const, deletedAt: null, overdue: false },
    { id: "abandoned", listId: "inbox", date: "2026-09-17", state: "abandoned" as const, deletedAt: null, overdue: false },
    { id: "deleted", listId: "inbox", date: "2026-09-17", state: "pending" as const, deletedAt: "2026-09-17T10:00-04:00", overdue: false },
    { id: "archived", listId: "work", date: "2026-09-17", state: "pending" as const, deletedAt: null, overdue: false },
  ];

  const groups = todayTaskGroups(tasks, "2026-09-17", true, new Set(["archived", "work"]));

  assert.deepEqual(groups.scheduled.map((task) => task.id), ["today", "completed"]);
  assert.deepEqual(groups.overdue.map((task) => task.id), []);

  const currentWork = todayTaskGroups(tasks, "2026-09-17", true, new Set(["archived"]));
  assert.deepEqual(currentWork.scheduled.map((task) => task.id), ["today", "completed", "archived"]);
  assert.deepEqual(currentWork.overdue.map((task) => task.id), ["overdue"]);
});

test("a historical Today date keeps its dated tasks in the scheduled group", () => {
  const groups = todayTaskGroups(
    [
      { id: "historical-pending", listId: "inbox", date: "2026-09-16", state: "pending" as const, deletedAt: null, overdue: false },
      { id: "historical-late", listId: "inbox", date: "2026-09-16", state: "pending" as const, deletedAt: null, overdue: true },
    ],
    "2026-09-16",
    false,
    new Set(),
  );
  assert.deepEqual(
    groups.scheduled.map((task) => task.id),
    ["historical-pending", "historical-late"],
  );
  assert.deepEqual(groups.overdue, []);
});

test("Calendar keeps dated history, including archived-list tasks, without deleted or undated work", () => {
  const tasks = [
    { id: "active", date: "2026-09-05", deletedAt: null },
    { id: "archived", date: "2026-09-05", deletedAt: null },
    { id: "deleted", date: "2026-09-05", deletedAt: "2026-09-06T09:00-04:00" },
    { id: "undated", date: null, deletedAt: null },
    { id: "other-day", date: "2026-09-06", deletedAt: null },
  ];

  assert.deepEqual(
    calendarTasksForDate(tasks, "2026-09-05").map((task) => task.id),
    ["active", "archived"],
  );
});
