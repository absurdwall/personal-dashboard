/** The opening value is retained separately from both edited and freshly read values. */
export type TaskDraftValues = Readonly<{
  name: string;
  content: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  listId: string | null;
  priority?: string;
  tagIds?: readonly string[];
  parentId?: string | null;
}>;

export type TaskDraftConflictField = "name" | "content" | "schedule" | "listId" | "priority" | "tagIds" | "parentId";
export type TaskDraftRecovery = Readonly<{
  revision: string;
  current: TaskDraftValues;
  proposed: TaskDraftValues;
  conflicts: readonly TaskDraftConflictField[];
}>;

const scheduleFields = ["date", "time", "endDate", "endTime"] as const;
const fields = ["name", "content", "listId", "priority", "tagIds", "parentId"] as const;

function comparable(field: TaskDraftConflictField, value: TaskDraftValues): string {
  if (field === "schedule") return JSON.stringify(scheduleFields.map(key => value[key]));
  // Catalog order and persisted sorted order describe the same tag association.
  if (field === "tagIds") return JSON.stringify([...new Set(value.tagIds ?? [])].sort());
  return JSON.stringify(value[field]) ?? "omitted";
}

function adopt(target: Record<string, unknown>, source: TaskDraftValues, field: TaskDraftConflictField): void {
  for (const key of field === "schedule" ? scheduleFields : [field]) target[key] = source[key];
}

export function compareTaskDraft(
  base: TaskDraftValues,
  local: TaskDraftValues,
  current: TaskDraftValues,
  revision: string,
): TaskDraftRecovery {
  const proposed: Record<string, unknown> = {...local};
  const conflicts: TaskDraftConflictField[] = [];
  for (const field of [...fields, "schedule"] as const) {
    // Omission is a backend preserve request, never an implicit clear.
    if ((field === "priority" || field === "tagIds" || field === "parentId") && local[field] === undefined) continue;
    const opening = comparable(field, base), edited = comparable(field, local), saved = comparable(field, current);
    if (saved === edited || saved === opening) continue;
    // Relations/catalog associations require explicit acknowledgement even when untouched locally.
    if (edited !== opening || field === "tagIds" || field === "parentId" || field === "listId") conflicts.push(field);
    else adopt(proposed, current, field);
  }
  return {revision, current, proposed: proposed as TaskDraftValues, conflicts};
}

/** Accept only the observed conflicting fields; preserve every other retained edit. */
export function useCurrentConflictingFields(recovery: TaskDraftRecovery): TaskDraftValues {
  const result: Record<string, unknown> = {...recovery.proposed};
  for (const field of recovery.conflicts) adopt(result, recovery.current, field);
  return result as TaskDraftValues;
}

export function taskDraftConflictValue(field: TaskDraftConflictField, values: TaskDraftValues): string {
  if (field === "schedule") return scheduleFields.map(key => values[key]).join(" · ");
  if (field === "tagIds") return (values.tagIds ?? []).join(", ");
  return String(values[field] ?? "");
}
