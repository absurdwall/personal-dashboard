export type HabitLocalCompletionState = "none" | "completed" | "withdrawn";

export type HabitCompletionExplanation =
  | "unknown"
  | "external"
  | "local"
  | "local-and-external"
  | "withdrawn"
  | "withdrawn-external";

type HabitCompletionCell = Readonly<{
  countsAsCompletion: boolean;
  hasExternalCompletion: boolean;
  localCompletionState: HabitLocalCompletionState;
  completionSourceLabels: readonly string[];
}>;

function isCanonicalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function historicalHabitCorrectionDate(
  selectedDate: string,
  todayDate: string,
): string | null {
  return isCanonicalDate(selectedDate) && isCanonicalDate(todayDate) && selectedDate < todayDate
    ? selectedDate
    : null;
}

export function habitCompletionPresentation(cell: HabitCompletionCell): Readonly<{
  checked: boolean;
  explanation: HabitCompletionExplanation;
  sourceLabels: readonly string[];
}> {
  const hasExternalCompletion = cell.hasExternalCompletion;
  let explanation: HabitCompletionExplanation;
  if (cell.localCompletionState === "completed") {
    explanation = hasExternalCompletion ? "local-and-external" : "local";
  } else if (cell.localCompletionState === "withdrawn") {
    explanation = hasExternalCompletion ? "withdrawn-external" : "withdrawn";
  } else {
    explanation = hasExternalCompletion ? "external" : "unknown";
  }
  return {
    checked: cell.countsAsCompletion,
    explanation,
    sourceLabels: cell.completionSourceLabels,
  };
}

type HistoricalHabitCorrection = Readonly<{
  canRecordCompletion: boolean;
  goalLabel: string | null;
  localChangeCount: number;
  cell: HabitCompletionCell;
}>;

export function historicalHabitCorrectionPresentation(
  habit: HistoricalHabitCorrection,
): Readonly<{
  checked: boolean;
  writable: boolean;
  localState: HabitLocalCompletionState;
  explanation: HabitCompletionExplanation;
  sourceLabels: readonly string[];
  goalKnown: boolean;
  localChangeCount: number;
}> {
  const completion = habitCompletionPresentation(habit.cell);
  return {
    checked: completion.checked,
    writable: habit.canRecordCompletion,
    localState: habit.cell.localCompletionState,
    explanation: completion.explanation,
    sourceLabels: completion.sourceLabels,
    goalKnown: habit.goalLabel !== null,
    localChangeCount: habit.localChangeCount,
  };
}
