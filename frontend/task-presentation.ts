export type TaskSchedulePresentation = Readonly<{
  date: string | null;
  time: string | null;
  timeDisabled: boolean;
}>;

export type TaskStateFilter = "all" | "pending" | "completed" | "abandoned" | "deleted";

type TodayTaskCandidate = Readonly<{
  listId: string;
  date: string | null;
  state: Exclude<TaskStateFilter, "all" | "deleted">;
  deletedAt: string | null;
  overdue: boolean;
}>;

export type TaskListScope = "all" | "today" | "inbox" | "archived" | `list:${string}`;

export function taskListScopeForId(listId: string): TaskListScope {
  return `list:${listId}`;
}

export function taskListIdFromScope(scope: TaskListScope): string | null {
  return scope.startsWith("list:") ? scope.slice("list:".length) : null;
}

export function taskEditOperationKey(
  edit: Readonly<{
    targetBinding: string;
    taskId: string;
    name: string;
    content: string | null;
    date: string | null;
    time: string | null;
    listId: string;
  }>,
): string {
  return JSON.stringify([
    edit.targetBinding,
    "update",
    edit.taskId,
    edit.name,
    edit.content,
    edit.date,
    edit.time,
    edit.listId,
  ]);
}

export class TaskOperationIdentityStore {
  private readonly operationIds = new Map<string, string>();

  getOrCreate(signature: string, create: () => string): string {
    const existing = this.operationIds.get(signature);
    if (existing) return existing;
    const created = create();
    this.operationIds.set(signature, created);
    return created;
  }

  delete(signature: string): void {
    this.operationIds.delete(signature);
  }

  clear(): void {
    this.operationIds.clear();
  }
}

export function calendarTasksForDate<T extends Readonly<{
  date: string | null;
  deletedAt: string | null;
}>>(tasks: readonly T[], date: string): readonly T[] {
  return tasks.filter((task) => task.date === date && task.deletedAt === null);
}

export function taskVisibleInScope(
  task: Readonly<{
    listId: string;
    listArchived?: boolean;
    state: Exclude<TaskStateFilter, "all" | "deleted">;
    deletedAt: string | null;
  }>,
  listScope: TaskListScope,
  stateScope: TaskStateFilter,
): boolean {
  if (listScope === "today") return false;
  const listMatches =
    listScope === "archived"
      ? task.listArchived === true
      : listScope === "all"
        ? task.listArchived !== true
        : listScope === "inbox"
          ? task.listId === "inbox" && task.listArchived !== true
          : task.listId === taskListIdFromScope(listScope) && task.listArchived !== true;
  if (!listMatches) return false;
  if (stateScope === "deleted") return task.deletedAt !== null;
  return (
    task.deletedAt === null &&
    (stateScope === "all" || task.state === stateScope)
  );
}

export function taskScopeCount<T extends TodayTaskCandidate>(
  tasks: readonly T[],
  listScope: TaskListScope,
  stateScope: TaskStateFilter,
  currentDate: string | null,
  archivedListIds: ReadonlySet<string>,
): number {
  if (listScope === "today") {
    if (!currentDate) return 0;
    const groups = todayTaskGroups(tasks, currentDate, true, archivedListIds);
    return [...groups.scheduled, ...groups.overdue].filter(
      (task) => stateScope === "all" || task.state === stateScope,
    ).length;
  }
  return tasks.filter((task) =>
    taskVisibleInScope(
      { ...task, listArchived: archivedListIds.has(task.listId) },
      listScope,
      stateScope,
    ),
  ).length;
}

export function taskVisibleInToday(
  task: TodayTaskCandidate,
  selectedDate: string,
  isToday: boolean,
  listArchived: boolean,
): boolean {
  if (listArchived || task.deletedAt !== null || task.state === "abandoned") return false;
  if (task.date === selectedDate) return true;
  return isToday && task.state === "pending" && task.overdue;
}

export function todayTaskGroups<T extends TodayTaskCandidate>(
  tasks: readonly T[],
  selectedDate: string,
  isToday: boolean,
  archivedListIds: ReadonlySet<string>,
): Readonly<{ scheduled: readonly T[]; overdue: readonly T[] }> {
  const visible = tasks.filter((task) =>
    taskVisibleInToday(task, selectedDate, isToday, archivedListIds.has(task.listId)),
  );
  return {
    scheduled: visible.filter(
      (task) => !isToday || task.state !== "pending" || !task.overdue,
    ),
    overdue: visible.filter(
      (task) => isToday && task.state === "pending" && task.overdue,
    ),
  };
}

export function normalizeTaskSchedule(
  date: string | null | undefined,
  time: string | null | undefined,
): TaskSchedulePresentation {
  const normalizedDate = date?.trim() || null;
  return {
    date: normalizedDate,
    time: normalizedDate ? time?.trim() || null : null,
    timeDisabled: normalizedDate === null,
  };
}

export function isCurrentTaskResponse(
  request: Readonly<{ isCurrent: (token: number) => boolean }>,
  token: number,
  currentDestination: string,
  expectedTargetBinding: string | null,
  responseTargetBinding: string | null,
): boolean {
  return (
    request.isCurrent(token) &&
    currentDestination === "tasks" &&
    (expectedTargetBinding === null || expectedTargetBinding === responseTargetBinding)
  );
}

export function taskMutationConfirmed(
  responseIsCurrent: boolean,
  viewState: "unconfigured" | "empty" | "ready" | "error",
  taskFound: boolean,
): boolean {
  return responseIsCurrent && viewState === "ready" && taskFound;
}

export function taskListMutationConfirmed(
  responseIsCurrent: boolean,
  viewState: "unconfigured" | "empty" | "ready" | "error",
  listFound: boolean,
): boolean {
  return responseIsCurrent && (viewState === "ready" || viewState === "empty") && listFound;
}
