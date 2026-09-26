import type { LatestRequest } from "./latest-request.js";

export type TodayRefreshResult =
  | Readonly<{ state: "presented" }>
  | Readonly<{ state: "stale" }>
  | Readonly<{ state: "failed"; error: unknown }>;

export type TodayTaskSurfaceState = "unconfigured" | "empty" | "ready" | "error";

export function canStartManualTodayRefresh(
  todayOperationCount: number,
  taskOperationCount: number,
): boolean {
  return todayOperationCount === 0 && taskOperationCount === 0;
}

export function canMutateTodayTasks(input: Readonly<{
  todayOperationCount: number;
  taskOperationCount: number;
  hasTargetBinding: boolean;
  state: TodayTaskSurfaceState;
  isPresentationCurrent: boolean;
}>): boolean {
  return (
    input.isPresentationCurrent &&
    input.hasTargetBinding &&
    input.state !== "unconfigured" &&
    input.state !== "error" &&
    input.todayOperationCount === 0 &&
    input.taskOperationCount === 0
  );
}

export async function refreshTodayPresentation<View, Phase>(input: Readonly<{
  requests: LatestRequest;
  date: string | null;
  invoke: (
    command: "today_view" | "daily_view",
    args?: { date: string },
  ) => Promise<View>;
  currentDate: string | null;
  viewDate: (view: View) => string;
  defaultPhase: (view: View) => Phase;
  onPhase: (phase: Phase) => void;
  onPresent: (view: View) => void;
  onError: (error: unknown) => void;
  onOperationCountChanged: (delta: number) => void;
  waitForPendingWrites?: () => Promise<unknown>;
}>): Promise<TodayRefreshResult> {
  const request = input.requests.begin();
  input.onOperationCountChanged(1);
  try {
    await input.waitForPendingWrites?.();
    if (!input.requests.isCurrent(request)) {
      return { state: "stale" };
    }
    const view = input.date === null
      ? await input.invoke("today_view")
      : await input.invoke("daily_view", { date: input.date });
    if (!input.requests.isCurrent(request)) {
      return { state: "stale" };
    }
    if (input.currentDate !== input.viewDate(view)) {
      input.onPhase(input.defaultPhase(view));
    }
    input.onPresent(view);
    return { state: "presented" };
  } catch (error) {
    if (!input.requests.isCurrent(request)) {
      return { state: "stale" };
    }
    input.onError(error);
    return { state: "failed", error };
  } finally {
    input.onOperationCountChanged(-1);
  }
}
