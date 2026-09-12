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
