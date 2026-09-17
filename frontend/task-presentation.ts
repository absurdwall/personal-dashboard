export type TaskSchedulePresentation = Readonly<{
  date: string | null;
  time: string | null;
  timeDisabled: boolean;
}>;

export type TaskStateFilter = "all" | "pending" | "completed" | "abandoned" | "deleted";

export type TaskListScope = "all" | "inbox" | "archived" | `list:${string}`;

export function taskListScopeForId(listId: string): TaskListScope {
  return `list:${listId}`;
}

export function taskListIdFromScope(scope: TaskListScope): string | null {
  return scope.startsWith("list:") ? scope.slice("list:".length) : null;
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
