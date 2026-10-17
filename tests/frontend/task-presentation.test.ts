import assert from "node:assert/strict";
import test from "node:test";
import { LatestRequest } from "../../frontend/latest-request.ts";
import {
  calendarTasksForDate,
  isCurrentTaskResponse,
  isCurrentTodayTaskResponse,
  normalizeTaskSchedule,
  taskListMutationConfirmed,
  taskListScopeForId,
  taskFolderScopeForId,
  taskFolderIdFromScope,
  taskParentCandidates,
  taskEditOperationKey,
  taskListDisplayName,
  taskListCount,
  TaskOperationIdentityStore,
  taskMutationConfirmed,
  performTaskUpdateRequest,
  taskScopeCount,
  type TaskUpdateView,
  type TaskUpdateInput,
  todayTaskGroups,
  todayTaskTimeAxisEntries,
  taskVisibleInScope,
  taskPropertiesPresentation,
} from "../../frontend/task-presentation.ts";

test("system task lists use the localized Inbox display while user list names stay unchanged", () => {
  assert.equal(
    taskListDisplayName({ name: "Inbox", isSystem: true }, "收集箱"),
    "收集箱",
  );
  assert.equal(
    taskListDisplayName({ name: "Inbox", isSystem: true }, "Inbox"),
    "Inbox",
  );
  assert.equal(
    taskListDisplayName({ name: "我的计划", isSystem: false }, "收集箱"),
    "我的计划",
  );
});

test("task list management counts follow the selected state filter", () => {
  const tasks = [
    { listId: "inbox", state: "pending" as const, deletedAt: null },
    { listId: "inbox", state: "completed" as const, deletedAt: null },
    { listId: "work", state: "abandoned" as const, deletedAt: null },
    { listId: "inbox", state: "completed" as const, deletedAt: "2026-09-18T10:00-04:00" },
  ];

  assert.equal(taskListCount(tasks, "inbox", "all"), 2);
  assert.equal(taskListCount(tasks, "inbox", "pending"), 1);
  assert.equal(taskListCount(tasks, "inbox", "completed"), 1);
  assert.equal(taskListCount(tasks, "inbox", "deleted"), 1);
  assert.equal(taskListCount(tasks, "work", "abandoned"), 1);
  assert.equal(taskListCount(tasks, "work", "completed"), 0);
});

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

test("Task priority sorting is stable and priority and tag filters compose without changing default order", () => {
  const tasks = [
    { id: "none-first", priority: null, tagIds: ["home"] },
    { id: "low", priority: "low" as const, tagIds: ["work"] },
    { id: "high-first", priority: "high" as const, tagIds: ["home", "work"] },
    { id: "medium", priority: "medium" as const, tagIds: ["home"] },
    { id: "high-second", priority: "high" as const, tagIds: ["home"] },
    { id: "none-second", priority: undefined, tagIds: ["home"] },
  ];

  assert.deepEqual(
    taskPropertiesPresentation(tasks, "all", null, "default").map((task) => task.id),
    ["none-first", "low", "high-first", "medium", "high-second", "none-second"],
  );
  assert.deepEqual(
    taskPropertiesPresentation(tasks, "all", "home", "priority").map((task) => task.id),
    ["high-first", "high-second", "medium", "none-first", "none-second"],
  );
  assert.deepEqual(
    taskPropertiesPresentation(tasks, "low", "home", "default").map((task) => task.id),
    [],
  );
  assert.deepEqual(
    taskPropertiesPresentation(tasks, "high", "work", "default").map((task) => task.id),
    ["high-first"],
  );
});

test("Today projects dated timed shared tasks as identity-preserving points on its existing axis", () => {
  const tasks = [
    {
      id: "pending-timed",
      name: "同名事项",
      listId: "inbox",
      date: "2026-09-17",
      time: "17:00",
      state: "pending" as const,
      deletedAt: null,
      timePassed: true,
    },
    {
      id: "completed-timed",
      name: "同名事项",
      listId: "inbox",
      date: "2026-09-17",
      time: "17:00",
      state: "completed" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "untimed",
      name: "只在右侧",
      listId: "inbox",
      date: "2026-09-17",
      time: null,
      state: "pending" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "undated",
      name: "未安排",
      listId: "inbox",
      date: null,
      time: null,
      state: "pending" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "future",
      name: "明天",
      listId: "inbox",
      date: "2026-09-18",
      time: "09:00",
      state: "pending" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "past-date",
      name: "昨天",
      listId: "inbox",
      date: "2026-09-16",
      time: "09:00",
      state: "pending" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "abandoned",
      name: "已放弃",
      listId: "inbox",
      date: "2026-09-17",
      time: "10:00",
      state: "abandoned" as const,
      deletedAt: null,
      timePassed: false,
    },
    {
      id: "deleted",
      name: "已删除",
      listId: "inbox",
      date: "2026-09-17",
      time: "11:00",
      state: "pending" as const,
      deletedAt: "2026-09-17T12:00:00-04:00",
      timePassed: false,
    },
    {
      id: "archived",
      name: "已归档",
      listId: "archived-list",
      date: "2026-09-17",
      time: "12:00",
      state: "pending" as const,
      deletedAt: null,
      timePassed: false,
    },
  ];

  assert.deepEqual(
    todayTaskTimeAxisEntries(tasks, "2026-09-17", new Set(["archived-list"])),
    [
      {
        period: null,
        id: "pending-timed",
        text: "同名事项",
        sourceDate: "2026-09-17",
        startMinute: 17 * 60,
        endMinute: null,
        continuesFromPreviousDay: false,
        continuesIntoNextDay: false,
        task: { id: "pending-timed", state: "pending", timePassed: true },
      },
      {
        period: null,
        id: "completed-timed",
        text: "同名事项",
        sourceDate: "2026-09-17",
        startMinute: 17 * 60,
        endMinute: null,
        continuesFromPreviousDay: false,
        continuesIntoNextDay: false,
        task: { id: "completed-timed", state: "completed", timePassed: false },
      },
    ],
  );
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

test("a delayed Today task response cannot cross a date, vault, revision, or request boundary", () => {
  const requests = new LatestRequest();
  const oldDateRequest = requests.begin();
  const currentDateRequest = requests.begin();
  const current = (
    token: number,
    destination = "today",
    currentDate: string | null = "2026-09-18",
    responseBinding: string | null = "vault-a",
    currentRevision: string | null = "r2",
  ) => isCurrentTodayTaskResponse(
    requests,
    token,
    destination,
    currentDate,
    "2026-09-18",
    "vault-a",
    "vault-a",
    responseBinding,
    currentRevision,
    "r2",
  );

  assert.equal(current(oldDateRequest), false, "a slower prior-date response is stale");
  assert.equal(current(currentDateRequest), true);
  assert.equal(current(currentDateRequest, "calendar"), false, "leaving Today rejects the response");
  assert.equal(current(currentDateRequest, "today", "2026-09-17"), false, "changing the Today date rejects it");
  assert.equal(current(currentDateRequest, "today", "2026-09-18", "vault-b"), false, "changing Vault rejects it");
  assert.equal(current(currentDateRequest, "today", "2026-09-18", "vault-a", "r1"), false, "a newer revision rejects it");
  requests.invalidate();
  assert.equal(current(currentDateRequest), false, "invalidating Today reads rejects late work");
});

test("Today time-axis projection follows one Task across rescheduling and midnight", () => {
  const original = {
    id: "moving-task",
    name: "续约确认",
    listId: "work",
    date: "2026-09-17",
    time: "17:30",
    state: "pending" as const,
    deletedAt: null,
    overdue: false,
    timePassed: false,
  };
  const tomorrow = { ...original, name: "改期后的续约确认", date: "2026-09-18", time: "09:00" };

  assert.deepEqual(
    todayTaskTimeAxisEntries([original], "2026-09-17", new Set()).map((entry) => entry.id),
    ["moving-task"],
  );
  assert.deepEqual(todayTaskTimeAxisEntries([tomorrow], "2026-09-17", new Set()), []);
  assert.deepEqual(
    todayTaskTimeAxisEntries([tomorrow], "2026-09-18", new Set()).map((entry) => [entry.id, entry.text, entry.startMinute]),
    [["moving-task", "改期后的续约确认", 9 * 60]],
    "a moved Task leaves the old point and returns on its new date without a new identity",
  );

  const yesterday = { ...original, overdue: true };
  assert.deepEqual(todayTaskTimeAxisEntries([yesterday], "2026-09-18", new Set()), []);
  const nextDayGroups = todayTaskGroups([yesterday], "2026-09-18", true, new Set());
  assert.deepEqual(nextDayGroups.scheduled, []);
  assert.deepEqual(nextDayGroups.overdue.map((task) => task.id), ["moving-task"]);
});

test("Today projection hides and restores one Task identity through shared lifecycle states", () => {
  const scheduled: {
    id: string;
    name: string;
    listId: string;
    date: string;
    time: string;
    state: "pending" | "completed" | "abandoned";
    deletedAt: string | null;
    overdue: boolean;
    timePassed: boolean;
  } = {
    id: "lifecycle-task",
    name: "共享任务",
    listId: "work",
    date: "2026-09-17",
    time: "17:30",
    state: "pending",
    deletedAt: null,
    overdue: false,
    timePassed: false,
  };
  const project = (
    task: typeof scheduled,
    archivedLists: ReadonlySet<string> = new Set(),
  ) => todayTaskTimeAxisEntries([task], "2026-09-17", archivedLists).map((entry) => entry.id);

  assert.deepEqual(project(scheduled), ["lifecycle-task"]);
  assert.deepEqual(project({ ...scheduled, state: "abandoned" }), []);
  assert.deepEqual(project(scheduled), ["lifecycle-task"], "reopening the same Task restores its point");
  assert.deepEqual(project({ ...scheduled, deletedAt: "2026-09-17T17:10-04:00" }), []);
  assert.deepEqual(project(scheduled), ["lifecycle-task"], "restoring the same Task restores its point");
  assert.deepEqual(project(scheduled, new Set(["work"])), []);
  assert.deepEqual(project(scheduled), ["lifecycle-task"], "restoring the list restores the same Task point");
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

test("folder scopes aggregate only their assigned active lists and leave fixed scopes intact", () => {
  const folderScope = taskFolderScopeForId("planning-folder");
  const folderIdsByList = new Map([ ["work", "planning-folder"], ["home", "planning-folder"] ]);
  const archivedLists = new Set(["home"]);
  const tasks = [
    {listId: "work", state: "pending" as const, deletedAt: null, date: null, overdue: false},
    {listId: "home", state: "pending" as const, deletedAt: null, date: null, overdue: false},
    {listId: "other", state: "pending" as const, deletedAt: null, date: null, overdue: false},
  ];

  assert.equal(taskFolderIdFromScope(folderScope), "planning-folder");
  assert.deepEqual(
    tasks.filter((task) => taskVisibleInScope({
      ...task,
      listArchived: archivedLists.has(task.listId),
      listFolderId: folderIdsByList.get(task.listId),
    }, folderScope, "pending")).map((task) => task.listId),
    ["work"],
  );
  assert.equal(taskVisibleInScope(tasks[0], "all", "pending"), true);
  assert.equal(taskVisibleInScope(tasks[0], "inbox", "pending"), false);
  assert.equal(taskScopeCount(tasks, folderScope, "pending", null, archivedLists, folderIdsByList), 1);
});

test("parent candidates hide the Task and its full descendant chain", () => {
  const tasks = [
    {id: "root", parentTaskId: null, deletedAt: null},
    {id: "child", parentTaskId: "root", deletedAt: null},
    {id: "grandchild", parentTaskId: "child", deletedAt: null},
    {id: "sibling", parentTaskId: "root", deletedAt: null},
    {id: "other", parentTaskId: null, deletedAt: null},
    {id: "deleted", parentTaskId: null, deletedAt: "2026-10-12T10:00-04:00"},
  ];

  assert.deepEqual(taskParentCandidates(tasks, "child").map((task) => task.id), ["root", "sibling", "other"]);
  assert.deepEqual(taskParentCandidates(tasks).map((task) => task.id), ["root", "child", "grandchild", "sibling", "other"]);
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
  const received: TaskUpdateInput[] = [];
  let committedName = "初始任务";
  const invoke = async (input: TaskUpdateInput): Promise<TaskUpdateView> => {
    received.push(input);
    if (received.length === 1) return firstResponse.promise;
    committedName = input.name;
    return taskUpdateView(committedName);
  };
  const firstPromise = performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke,
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });

  assert.equal(received[0]?.name, "第一版");
  committedName = received[0]?.name ?? committedName;
  requests.invalidate();
  firstResponse.resolve(taskUpdateView(committedName));
  const firstResult = await firstPromise;
  assert.equal(firstResult.responseIsCurrent, false);
  assert.equal(firstResult.confirmed, false);
  assert.equal(committedName, "第一版");

  const secondResult = await performTaskUpdateRequest(secondEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke,
    isCurrent: (token, view) =>
      requests.isCurrent(token) && view.targetBinding === "vault-a",
  });
  assert.equal(secondResult.confirmed, true);
  assert.notEqual(secondResult.operation.changeId, firstResult.operation.changeId);
  assert.equal(committedName, "第二版");

  const retryFirstResult = await performTaskUpdateRequest(firstEdit, {
    expectedRevision: "revision-1",
    requests,
    identities,
    createChangeId: () => `change-${++nextId}`,
    invoke,
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
    { id: "today-time-passed", listId: "inbox", date: "2026-09-17", state: "pending" as const, deletedAt: null, overdue: false, timePassed: true },
    { id: "overdue", listId: "work", date: "2026-09-16", state: "pending" as const, deletedAt: null, overdue: true },
    { id: "completed", listId: "inbox", date: "2026-09-17", state: "completed" as const, deletedAt: null, overdue: false },
    { id: "undated", listId: "inbox", date: null, state: "pending" as const, deletedAt: null, overdue: false },
    { id: "abandoned", listId: "inbox", date: "2026-09-17", state: "abandoned" as const, deletedAt: null, overdue: false },
    { id: "deleted", listId: "inbox", date: "2026-09-17", state: "pending" as const, deletedAt: "2026-09-17T10:00-04:00", overdue: false },
    { id: "archived", listId: "work", date: "2026-09-17", state: "pending" as const, deletedAt: null, overdue: false },
  ];

  const groups = todayTaskGroups(tasks, "2026-09-17", true, new Set(["archived", "work"]));

  assert.deepEqual(groups.scheduled.map((task) => task.id), ["today", "today-time-passed", "completed"]);
  assert.deepEqual(groups.overdue.map((task) => task.id), []);
  assert.equal(
    taskScopeCount(tasks, "today", "pending", "2026-09-17", new Set(["archived", "work"])),
    2,
  );

  const currentWork = todayTaskGroups(tasks, "2026-09-17", true, new Set(["archived"]));
  assert.deepEqual(currentWork.scheduled.map((task) => task.id), ["today", "today-time-passed", "completed", "archived"]);
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

test("lived-day Task projection includes next-date early hours exactly once and preserves Calendar schedules", () => {
  const task = { id: "one", name: "night", listId: "inbox", date: "2026-10-02", time: "03:59", state: "completed" as const, deletedAt: null, timePassed: false };
  assert.deepEqual(todayTaskTimeAxisEntries([task], "2026-10-01", new Set()).map(entry => [entry.id, entry.sourceDate, entry.startMinute, entry.task.state]), [["one", "2026-10-02", 1679, "completed"]]);
  assert.deepEqual(todayTaskTimeAxisEntries([task], "2026-10-02", new Set()), []);
  const boundary = { ...task, time: "04:00" };
  assert.deepEqual(todayTaskTimeAxisEntries([boundary], "2026-10-01", new Set()), []);
  assert.equal(todayTaskTimeAxisEntries([boundary], "2026-10-02", new Set())[0].startMinute, 240);
  assert.equal(task.date, "2026-10-02");
  assert.equal(task.time, "03:59");
  const yearEnd = { ...task, date: "2027-01-01", time: "00:00" };
  assert.equal(todayTaskTimeAxisEntries([yearEnd], "2026-12-31", new Set())[0].startMinute, 1440);
  assert.deepEqual(todayTaskTimeAxisEntries([{ ...task, time: null }], "2026-10-01", new Set()), []);
});

test("interval edits retain distinct retry identities and require confirmed end readback", async () => {
  const requests = new LatestRequest();
  const identities = new TaskOperationIdentityStore();
  const edit = { targetBinding: "binding", taskId: "overnight", name: "Synthetic", content: null,
    date: "2026-10-10", time: "23:30", listId: "inbox",
    executionEnd: { date: "2026-10-11", time: "00:30" } };
  assert.notEqual(taskEditOperationKey(edit), taskEditOperationKey({ ...edit, executionEnd: null }));
  assert.notEqual(taskEditOperationKey({ ...edit, executionEnd: undefined }), taskEditOperationKey({ ...edit, executionEnd: null }), "omission and clear are different operations");
  const result = await performTaskUpdateRequest(edit, {
    expectedRevision: "r1", requests, identities, createChangeId: () => "interval-edit",
    isCurrent: () => true,
    invoke: async () => ({ state: "ready", targetBinding: "binding", tasks: [{ ...edit, id: edit.taskId, executionEnd: null }] }),
  });
  assert.equal(result.confirmed, false, "unchanged end must not be reported as a saved interval");
});

test("Task property patches distinguish omitted values from explicitly cleared values", async () => {
  const requests = new LatestRequest();
  const identities = new TaskOperationIdentityStore();
  const base = taskUpdateEdit("Keep legacy caller");
  const legacy = await performTaskUpdateRequest(base, {
    expectedRevision: "r1", requests, identities, createChangeId: () => "legacy-change",
    isCurrent: () => true,
    invoke: async (input) => {
      assert.equal("priority" in input, false);
      assert.equal("tagIds" in input, false);
      return taskUpdateView(input.name);
    },
  });
  assert.equal(legacy.confirmed, true, "old callers can omit new fields");

  const clear = { ...base, name: "Clear properties", priority: null, tagIds: [] as readonly string[] };
  assert.notEqual(taskEditOperationKey(base), taskEditOperationKey(clear));
  const cleared = await performTaskUpdateRequest(clear, {
    expectedRevision: "r2", requests, identities, createChangeId: () => "clear-change",
    isCurrent: () => true,
    invoke: async (input) => {
      assert.equal(input.priority, null);
      assert.deepEqual(input.tagIds, []);
      return {
        state: "ready",
        targetBinding: "vault-a",
        tasks: [{ ...input, id: input.taskId, priority: null, tagIds: [] }],
      };
    },
  });
  assert.equal(cleared.confirmed, true, "explicit clear is only confirmed after readback");

  const mismatched = await performTaskUpdateRequest({ ...clear, priority: "high", tagIds: ["work"] }, {
    expectedRevision: "r3", requests, identities, createChangeId: () => "mismatch-change",
    isCurrent: () => true,
    invoke: async (input) => ({
      state: "ready",
      targetBinding: "vault-a",
      tasks: [{ ...input, id: input.taskId, priority: null, tagIds: [] }],
    }),
  });
  assert.equal(mismatched.confirmed, false, "different saved properties are not reported as successful");
});

test("parent changes use distinct retry identities and require relation readback", async () => {
  const requests = new LatestRequest();
  const identities = new TaskOperationIdentityStore();
  const base = taskUpdateEdit("Parented child");
  const linked = { ...base, parentTaskId: "parent-a" };
  const unlinked = { ...base, parentTaskId: null };
  assert.notEqual(taskEditOperationKey(base), taskEditOperationKey(linked));
  assert.notEqual(taskEditOperationKey(linked), taskEditOperationKey(unlinked));

  const saved = await performTaskUpdateRequest(linked, {
    expectedRevision: "r1", requests, identities, createChangeId: () => "link-parent",
    isCurrent: () => true,
    invoke: async (input) => ({
      state: "ready",
      targetBinding: "vault-a",
      tasks: [{ ...input, id: input.taskId, parentTaskId: "parent-a" }],
    }),
  });
  assert.equal(saved.confirmed, true);

  const mismatch = await performTaskUpdateRequest(unlinked, {
    expectedRevision: "r2", requests, identities, createChangeId: () => "unlink-parent",
    isCurrent: () => true,
    invoke: async (input) => ({
      state: "ready",
      targetBinding: "vault-a",
      tasks: [{ ...input, id: input.taskId, parentTaskId: "parent-a" }],
    }),
  });
  assert.equal(mismatch.confirmed, false, "an unchanged parent relation is not a confirmed unlink");
});
