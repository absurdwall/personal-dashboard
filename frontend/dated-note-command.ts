export type DatedNoteCategory = "ordinary" | "exercise";

type DatedNoteTarget = Readonly<{
  date: string;
  targetBinding: string;
  revision: string | null;
  records: readonly Readonly<{ id: string; category: DatedNoteCategory }>[];
}>;

type DatedNoteSubmission = Readonly<{
  content: string;
  category: DatedNoteCategory;
  correctionId: string | null;
}>;

type Invoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>;

export class DatedNoteTargetChangedError extends Error {
  constructor() {
    super("要更正的记录已经变化。草稿仍保留；请重新读取该日期后重试。");
  }
}

export async function submitDatedNote<T>(
  target: DatedNoteTarget,
  submission: DatedNoteSubmission,
  invoke: Invoke,
  operationId: (kind: "note" | "change") => string,
): Promise<T> {
  const correction = submission.correctionId
    ? target.records.find((record) => record.id === submission.correctionId)
    : null;
  if (submission.correctionId && (!correction || !target.revision)) {
    throw new DatedNoteTargetChangedError();
  }
  if (correction) {
    return invoke<T>("correct_dated_note", {
      input: {
        date: target.date,
        targetBinding: target.targetBinding,
        expectedRevision: target.revision,
        entryId: correction.id,
        changeId: operationId("change"),
        content: submission.content,
      },
    });
  }
  return invoke<T>("add_dated_note", {
    input: {
      date: target.date,
      targetBinding: target.targetBinding,
      expectedRevision: target.revision,
      entryId: operationId("note"),
      category: submission.category,
      content: submission.content,
    },
  });
}
