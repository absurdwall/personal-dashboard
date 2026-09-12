type DayTaskPlanStatus = Readonly<{
  message: string;
  planError: string | null;
}>;

export function preserveDayTaskPlanError<T extends DayTaskPlanStatus>(
  previous: T,
  mutationResult: T,
): T {
  if (mutationResult.planError || !previous.planError) {
    return mutationResult;
  }
  return {
    ...mutationResult,
    message: previous.planError,
    planError: previous.planError,
  };
}

export function preserveTodayDayTaskPlanError<
  T extends Readonly<{ dayTasks: DayTaskPlanStatus }>,
>(previous: T, mutationResult: T): T {
  const dayTasks = preserveDayTaskPlanError(previous.dayTasks, mutationResult.dayTasks);
  return dayTasks === mutationResult.dayTasks
    ? mutationResult
    : { ...mutationResult, dayTasks };
}
