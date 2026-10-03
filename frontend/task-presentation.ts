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

export function taskListDisplayName(
  list: Readonly<{ name: string; isSystem: boolean }>,
  inboxLabel: string,
): string {
  return list.isSystem ? inboxLabel : list.name;
}

export function taskListCount<T extends Readonly<{
  listId: string;
  state: Exclude<TaskStateFilter, "all" | "deleted">;
  deletedAt: string | null;
}>>(
  tasks: readonly T[],
  listId: string,
  stateScope: TaskStateFilter,
): number {
  return tasks.filter((task) => {
    if (task.listId !== listId) return false;
    if (stateScope === "deleted") return task.deletedAt !== null;
    return task.deletedAt === null &&
      (stateScope === "all" || task.state === stateScope);
  }).length;
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

export function taskOperationScope(targetBinding: string, taskId: string): string {
  return JSON.stringify([targetBinding, taskId]);
}

export type TaskOperationRequestSource = Readonly<{
  begin(): number;
  isCurrent(token: number): boolean;
}>;

export type TaskOperationRequest = Readonly<{
  signature: string;
  changeId: string;
  requestToken: number;
  scope: string | null;
}>;

export class TaskOperationIdentityStore {
  private readonly operationIds = new Map<
    string,
    Readonly<{ id: string; scope: string | null }>
  >();

  getOrCreate(
    signature: string,
    create: () => string,
    scope: string | null = null,
  ): string {
    const existing = this.operationIds.get(signature)?.id;
    if (existing) return existing;
    const created = create();
    this.operationIds.set(signature, { id: created, scope });
    return created;
  }

  begin(
    signature: string,
    create: () => string,
    requests: TaskOperationRequestSource,
    scope: string | null = null,
  ): TaskOperationRequest {
    return {
      signature,
      changeId: this.getOrCreate(signature, create, scope),
      requestToken: requests.begin(),
      scope,
    };
  }

  settleConfirmed(
    operation: TaskOperationRequest,
    requests: TaskOperationRequestSource,
    confirmed: boolean,
  ): boolean {
    if (!confirmed || !requests.isCurrent(operation.requestToken)) return false;
    this.delete(operation.signature);
    if (operation.scope) this.retireOther(operation.scope, operation.signature);
    return true;
  }

  delete(signature: string): void {
    this.operationIds.delete(signature);
  }

  retireOther(scope: string, keepSignature: string): void {
    for (const [signature, operation] of this.operationIds) {
      if (operation.scope === scope && signature !== keepSignature) {
        this.operationIds.delete(signature);
      }
    }
  }

  clear(): void {
    this.operationIds.clear();
  }
}

export type TaskUpdateEdit = Readonly<{
  targetBinding: string;
  taskId: string;
  name: string;
  content: string | null;
  date: string | null;
  time: string | null;
  listId: string;
}>;

export type TaskUpdateInput = TaskUpdateEdit &
  Readonly<{
    expectedRevision: string;
    changeId: string;
  }>;

export type TaskUpdateView = Readonly<{
  state: "unconfigured" | "empty" | "ready" | "error";
  targetBinding: string | null;
  tasks: readonly Readonly<{
    id: string;
    name: string;
    content: string | null;
    date: string | null;
    time: string | null;
    listId: string;
  }>[];
}>;

export type TaskUpdateOperationResult<View extends TaskUpdateView> = Readonly<{
  view: View;
  operation: TaskOperationRequest;
  responseIsCurrent: boolean;
  confirmed: boolean;
}>;

export async function performTaskUpdateRequest<View extends TaskUpdateView>(
  edit: TaskUpdateEdit,
  options: Readonly<{
    expectedRevision: string;
    requests: TaskOperationRequestSource;
    identities: TaskOperationIdentityStore;
    createChangeId: () => string;
    invoke: (input: TaskUpdateInput) => Promise<View>;
    isCurrent: (requestToken: number, view: View) => boolean;
    onBegin?: (operation: TaskOperationRequest) => void;
  }>,
): Promise<TaskUpdateOperationResult<View>> {
  const operationKey = taskEditOperationKey(edit);
  const operation = options.identities.begin(
    operationKey,
    options.createChangeId,
    options.requests,
    taskOperationScope(edit.targetBinding, edit.taskId),
  );
  options.onBegin?.(operation);
  const view = await options.invoke({
    ...edit,
    expectedRevision: options.expectedRevision,
    changeId: operation.changeId,
  });
  const responseIsCurrent = options.isCurrent(operation.requestToken, view);
  const savedTask = view.tasks.find(
    (candidate) =>
      candidate.id === edit.taskId &&
      candidate.name === edit.name &&
      candidate.content === edit.content &&
      candidate.date === edit.date &&
      candidate.time === edit.time &&
      candidate.listId === edit.listId,
  );
  const confirmed = taskMutationConfirmed(
    responseIsCurrent,
    view.state,
    Boolean(savedTask),
  );
  return {
    view,
    operation,
    responseIsCurrent,
    confirmed: options.identities.settleConfirmed(
      operation,
      options.requests,
      confirmed,
    ),
  };
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

export type TodayTaskTimeAxisCandidate = Readonly<{
  id: string;
  name: string;
  listId: string;
  date: string | null;
  time: string | null;
  state: "pending" | "completed" | "abandoned";
  deletedAt: string | null;
  timePassed: boolean;
}>;

export type TodayTaskTimeAxisEntry = Readonly<{
  period: null;
  id: string;
  text: string;
  sourceDate: string;
  startMinute: number;
  endMinute: null;
  continuesFromPreviousDay: false;
  continuesIntoNextDay: false;
  task: Readonly<{
    id: string;
    state: "pending" | "completed";
    timePassed: boolean;
  }>;
}>;

export function todayTaskTimeAxisEntries<T extends TodayTaskTimeAxisCandidate>(
  tasks: readonly T[],
  selectedDate: string,
  archivedListIds: ReadonlySet<string>,
): readonly TodayTaskTimeAxisEntry[] {
  return tasks.flatMap((task) => {
    if (
      task.time === null ||
      task.deletedAt !== null ||
      task.state === "abandoned" ||
      archivedListIds.has(task.listId)
    ) return [];
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time)) return [];
    const hour = Number(task.time.slice(0, 2));
    const minute = Number(task.time.slice(3, 5));
    const nextDay = new Date(`${selectedDate}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const wallMinute = hour * 60 + minute;
    const projected = task.date === selectedDate ? wallMinute :
      task.date === nextDay.toISOString().slice(0, 10) ? wallMinute + 1440 : -1;
    if (projected < 240 || projected >= 1680) return [];
    return [{
      period: null,
      id: task.id,
      text: task.name,
      sourceDate: task.date!,
      startMinute: projected,
      endMinute: null,
      continuesFromPreviousDay: false,
      continuesIntoNextDay: false,
      task: {
        id: task.id,
        state: task.state,
        timePassed: task.timePassed,
      },
    }];
  });
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

export function isCurrentTodayTaskResponse(
  request: Readonly<{ isCurrent: (token: number) => boolean }>,
  token: number,
  currentDestination: string,
  currentDate: string | null,
  expectedDate: string | null,
  currentTargetBinding: string | null,
  expectedTargetBinding: string,
  responseTargetBinding: string | null,
  currentRevision: string | null,
  expectedRevision: string | null,
): boolean {
  return (
    request.isCurrent(token) &&
    currentDestination === "today" &&
    currentDate === expectedDate &&
    currentTargetBinding === expectedTargetBinding &&
    responseTargetBinding === expectedTargetBinding &&
    (expectedRevision === null || currentRevision === expectedRevision)
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

/** Ended work is history, never a pending row, even in the default All view. */
export function taskDisplaySections<T extends Readonly<{ state: string }>>(
  tasks: readonly T[],
  stateFilter: TaskStateFilter,
): Readonly<{ main: readonly T[]; history: readonly T[] }> {
  return stateFilter === "all"
    ? { main: tasks.filter(task => task.state === "pending"), history: tasks.filter(task => task.state !== "pending") }
    : { main: tasks, history: [] };
}

export function taskHistoryDate(task: Readonly<{
  state: string;
  completion: Readonly<{ completedOn: string }> | null;
  changes?: readonly Readonly<{ kind: string; changedAt: string }>[];
}>): string | null {
  if (task.state === "completed") return task.completion?.completedOn ?? null;
  return [...(task.changes ?? [])].reverse().find(change => change.kind === "abandoned")?.changedAt.slice(0, 10) ?? null;
}

export function taskHistoryGroups<T extends Parameters<typeof taskHistoryDate>[0] & Readonly<{ id: string }>>(
  tasks: readonly T[],
  limit: number,
  includedTaskIds: ReadonlySet<string> = new Set(),
): readonly Readonly<{ date: string | null; tasks: readonly T[] }>[] {
  const sorted = tasks.map((task, index) => ({ task, index, date: taskHistoryDate(task) }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.index - b.index)
    .filter((entry, index) => index < limit || includedTaskIds.has(entry.task.id));
  const groups: { date: string | null; tasks: T[] }[] = [];
  for (const entry of sorted) {
    const last = groups.at(-1);
    if (last && last.date === entry.date) last.tasks.push(entry.task);
    else groups.push({ date: entry.date, tasks: [entry.task] });
  }
  return groups;
}
