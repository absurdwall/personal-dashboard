import assert from "node:assert/strict";
import test from "node:test";

import { LatestRequest } from "../../frontend/latest-request.ts";
import {
  canMutateTodayTasks,
  canStartManualTodayRefresh,
  refreshTodayPresentation,
} from "../../frontend/today-refresh.ts";
import { PendingWriteBarrier, selectVaultAndRefresh } from "../../frontend/vault-selection.ts";

type TodayView = Readonly<{
  date: string;
  defaultPhase: "morning" | "daytime";
  targetBinding: string;
  taskName: string;
}>;

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

function refresh(
  requests: LatestRequest,
  date: string | null,
  invoke: (
    command: "today_view" | "daily_view",
    args?: { date: string },
  ) => Promise<TodayView>,
  currentDate: string | null,
  onOperationCountChanged: (delta: number) => void,
  onPresent: (view: TodayView) => void,
  onError: (error: unknown) => void,
  onPhase: (phase: TodayView["defaultPhase"]) => void,
) {
  return refreshTodayPresentation({
    requests,
    date,
    invoke,
    currentDate,
    viewDate: (view) => view.date,
    defaultPhase: (view) => view.defaultPhase,
    onPhase,
    onPresent,
    onError,
    onOperationCountChanged,
  });
}

test("the page refresh coordinator discards a slower response after the selected date changes", async () => {
  const requests = new LatestRequest();
  const older = deferred<TodayView>();
  const newer = deferred<TodayView>();
  const rendered: TodayView[] = [];
  const phases: TodayView["defaultPhase"][] = [];
  const errors: unknown[] = [];
  const commands: Array<["today_view" | "daily_view", { date: string } | undefined]> = [];
  let todayOperationCount = 0;
  const operationCountChanged = (delta: number) => {
    todayOperationCount += delta;
  };

  const first = refresh(
    requests,
    "2026-09-08",
    (command, args) => {
      commands.push([command, args]);
      return older.promise;
    },
    null,
    operationCountChanged,
    (view) => rendered.push(view),
    (error) => errors.push(error),
    (phase) => phases.push(phase),
  );
  await Promise.resolve();
  // showWorkspaceDestination invalidates the pending page request when its selected date changes.
  requests.invalidate();
  const second = refresh(
    requests,
    "2026-09-09",
    (command, args) => {
      commands.push([command, args]);
      return newer.promise;
    },
    null,
    operationCountChanged,
    (view) => rendered.push(view),
    (error) => errors.push(error),
    (phase) => phases.push(phase),
  );

  await Promise.resolve();
  assert.deepEqual(commands, [
    ["daily_view", { date: "2026-09-08" }],
    ["daily_view", { date: "2026-09-09" }],
  ]);
  newer.resolve({
    date: "2026-09-09",
    defaultPhase: "morning",
    targetBinding: "vault-a",
    taskName: "当前日期任务",
  });
  assert.deepEqual(await second, { state: "presented" });
  older.resolve({
    date: "2026-09-08",
    defaultPhase: "daytime",
    targetBinding: "vault-a",
    taskName: "旧日期任务",
  });
  assert.deepEqual(await first, { state: "stale" });

  assert.deepEqual(rendered.map((view) => [view.date, view.taskName]), [
    ["2026-09-09", "当前日期任务"],
  ]);
  assert.deepEqual(phases, ["morning"]);
  assert.deepEqual(errors, []);
  assert.equal(todayOperationCount, 0);
});

test("a deferred Today refresh cannot render over a Vault selection result", async () => {
  const requests = new LatestRequest();
  const oldVaultRead = deferred<TodayView>();
  const vaultSelection = deferred<{ view: TodayView; changed: boolean }>();
  const rendered: TodayView[] = [];
  let todayOperationCount = 0;
  const operationCountChanged = (delta: number) => {
    todayOperationCount += delta;
  };
  const record = (view: TodayView) => rendered.push(view);

  const oldRead = refresh(
    requests,
    null,
    () => oldVaultRead.promise,
    null,
    operationCountChanged,
    record,
    () => assert.fail("a stale read must not report an error"),
    () => undefined,
  );

  // selectTodayVault begins a newer presentation request before awaiting the native picker.
  const presentationRequest = requests.begin();
  const selection = selectVaultAndRefresh(() => vaultSelection.promise, {
    isCurrent: () => true,
    isPresentationCurrent: () => requests.isCurrent(presentationRequest),
    currentDestination: () => "today",
    waitForPendingWrites: async () => true,
    renderPendingWriteFailure: () => assert.fail("there are no pending writes"),
    prepareForVaultSwitch: () => undefined,
    renderToday: record,
    renderWorkspaceContextStatus: () => undefined,
    openCalendar: async () => undefined,
    refreshHabits: async () => undefined,
    refreshTasks: async () => undefined,
  });
  vaultSelection.resolve({
    changed: true,
    view: {
      date: "2026-09-26",
      defaultPhase: "morning",
      targetBinding: "vault-b",
      taskName: "B Vault 最新任务",
    },
  });
  assert.equal(await selection, "changed");
  oldVaultRead.resolve({
    date: "2026-09-26",
    defaultPhase: "morning",
    targetBinding: "vault-a",
    taskName: "A Vault 旧任务",
  });

  assert.deepEqual(await oldRead, { state: "stale" });
  assert.deepEqual(rendered.map((view) => [view.targetBinding, view.taskName]), [
    ["vault-b", "B Vault 最新任务"],
  ]);
  assert.equal(todayOperationCount, 0);
});

test("returning to Today waits for an in-flight Task write before reading the page", async () => {
  const requests = new LatestRequest();
  const writes = new PendingWriteBarrier();
  const pendingWrite = deferred<boolean>();
  let taskOperationCount = 1;
  let persistedTaskName = "刷新前的旧标题";
  const trackedWrite = writes.track(
    pendingWrite.promise.then((saved) => {
      if (saved) persistedTaskName = "Tasks 写入返回后的新标题";
      taskOperationCount = 0;
      return saved;
    }),
  );
  const rendered: TodayView[] = [];
  const errors: unknown[] = [];
  let todayOperationCount = 0;
  let readStarted = false;
  const readStartedSignal = deferred<void>();
  let releaseRead!: (view: TodayView) => void;
  const read = new Promise<TodayView>((resolve) => {
    releaseRead = resolve;
  });

  const result = refreshTodayPresentation({
    requests,
    date: "2026-09-26",
    invoke: async () => {
      readStarted = true;
      readStartedSignal.resolve(undefined);
      assert.equal(persistedTaskName, "Tasks 写入返回后的新标题");
      return read;
    },
    currentDate: null,
    viewDate: (view) => view.date,
    defaultPhase: (view) => view.defaultPhase,
    onPhase: () => undefined,
    onPresent: (view) => rendered.push(view),
    onError: (error) => errors.push(error),
    onOperationCountChanged: (delta) => {
      todayOperationCount += delta;
    },
    waitForPendingWrites: () => writes.wait(),
  });

  await Promise.resolve();
  assert.equal(readStarted, false);
  assert.equal(todayOperationCount, 1);
  assert.equal(canStartManualTodayRefresh(todayOperationCount, taskOperationCount), false);
  assert.equal(
    canMutateTodayTasks({
      todayOperationCount,
      taskOperationCount,
      hasTargetBinding: true,
      state: "ready",
      isPresentationCurrent: true,
    }),
    false,
  );

  pendingWrite.resolve(true);
  await trackedWrite;
  await readStartedSignal.promise;
  assert.equal(readStarted, true);
  releaseRead({
    date: "2026-09-26",
    defaultPhase: "morning",
    targetBinding: "vault-a",
    taskName: persistedTaskName,
  });

  assert.deepEqual(await result, { state: "presented" });
  assert.deepEqual(rendered.map((view) => view.taskName), ["Tasks 写入返回后的新标题"]);
  assert.deepEqual(errors, []);
  assert.equal(todayOperationCount, 0);
  assert.equal(canStartManualTodayRefresh(todayOperationCount, taskOperationCount), true);
});

test("Today task mutations stay gated during a deferred refresh, and manual refresh stays gated during a write", async () => {
  const requests = new LatestRequest();
  const pending = deferred<TodayView>();
  let todayOperationCount = 0;
  let taskOperationCount = 0;
  const result = refresh(
    requests,
    "2026-09-26",
    () => pending.promise,
    null,
    (delta) => {
      todayOperationCount += delta;
    },
    () => undefined,
    () => undefined,
    () => undefined,
  );

  assert.equal(canStartManualTodayRefresh(todayOperationCount, taskOperationCount), false);
  assert.equal(
    canMutateTodayTasks({
      todayOperationCount,
      taskOperationCount,
      hasTargetBinding: true,
      state: "ready",
      isPresentationCurrent: true,
    }),
    false,
  );

  pending.resolve({
    date: "2026-09-26",
    defaultPhase: "morning",
    targetBinding: "vault-a",
    taskName: "当天任务",
  });
  await result;
  assert.equal(canStartManualTodayRefresh(todayOperationCount, taskOperationCount), true);
  assert.equal(
    canMutateTodayTasks({
      todayOperationCount,
      taskOperationCount,
      hasTargetBinding: true,
      state: "ready",
      isPresentationCurrent: true,
    }),
    true,
  );

  taskOperationCount += 1;
  assert.equal(canStartManualTodayRefresh(todayOperationCount, taskOperationCount), false);
});

test("Today task actions become writable after a fresh read and stay gated after a failed refresh", async () => {
  const requests = new LatestRequest();
  const successfulRead = deferred<TodayView>();
  let todayOperationCount = 0;
  let isPresentationCurrent = true;
  const errors: unknown[] = [];
  const canWrite = () => canMutateTodayTasks({
    todayOperationCount,
    taskOperationCount: 0,
    hasTargetBinding: true,
    state: "ready",
    isPresentationCurrent,
  });
  const refreshing = refreshTodayPresentation({
    requests,
    date: "2026-09-26",
    invoke: () => successfulRead.promise,
    currentDate: "2026-09-26",
    viewDate: (view) => view.date,
    defaultPhase: (view) => view.defaultPhase,
    onPhase: () => undefined,
    onPresent: () => {
      isPresentationCurrent = true;
    },
    onError: (error) => errors.push(error),
    onOperationCountChanged: (delta) => {
      todayOperationCount += delta;
      if (delta > 0) isPresentationCurrent = false;
    },
  });

  assert.equal(canWrite(), false);
  successfulRead.resolve({
    date: "2026-09-26",
    defaultPhase: "morning",
    targetBinding: "vault-a",
    taskName: "当天任务",
  });
  assert.deepEqual(await refreshing, { state: "presented" });
  assert.equal(canWrite(), true);

  const failedRefresh = refreshTodayPresentation({
    requests,
    date: "2026-09-26",
    invoke: async () => {
      throw new Error("Daily Record read failed");
    },
    currentDate: "2026-09-26",
    viewDate: (view) => view.date,
    defaultPhase: (view) => view.defaultPhase,
    onPhase: () => undefined,
    onPresent: () => assert.fail("failed refresh must retain the last view as stale"),
    onError: (error) => errors.push(error),
    onOperationCountChanged: (delta) => {
      todayOperationCount += delta;
      if (delta > 0) isPresentationCurrent = false;
    },
  });

  assert.deepEqual((await failedRefresh).state, "failed");
  assert.equal(canWrite(), false);
  assert.equal(todayOperationCount, 0);
  assert.equal(errors.length, 1);
});
