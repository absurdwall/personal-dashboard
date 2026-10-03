export type CollaborationVoiceTarget = Readonly<{
  sessionId: string;
  targetDate: string;
}>;

export type CollaborationVoiceState = "idle" | "requesting" | "connecting" | "recording" | "transcribing";

export type CollaborationVoiceFailure =
  | "permission-denied"
  | "capture-unavailable"
  | "recording-failed"
  | "empty-recording"
  | "recognition-failed"
  | "login-required"
  | "connection-failed";

export function enqueueCollaborationDraftWrite<T>(
  pendingWrites: Map<string, Promise<T>>,
  target: CollaborationVoiceTarget,
  writeDraft: () => Promise<T>,
): Promise<T> {
  const key = voiceDraftKey(target);
  const previous = pendingWrites.get(key);
  const write = previous
    ? previous.catch(() => undefined as T).then(writeDraft)
    : writeDraft();
  pendingWrites.set(key, write);
  void write.then(
    () => {
      if (pendingWrites.get(key) === write) pendingWrites.delete(key);
    },
    () => {
      if (pendingWrites.get(key) === write) pendingWrites.delete(key);
    },
  );
  return write;
}

export function beginVoiceTranscriptSave<T>(
  target: CollaborationVoiceTarget,
  transcript: string,
  existingDraft: string,
  saveDraft: (target: CollaborationVoiceTarget, draft: string) => Promise<T>,
): Readonly<{ draft: string; saved: Promise<T> }> {
  const draft = appendVoiceTranscript(existingDraft, transcript);
  return {
    draft,
    saved: saveDraft({ ...target }, draft),
  };
}

export type CollaborationVoiceHandlers = Readonly<{
  onState(state: CollaborationVoiceState, target: CollaborationVoiceTarget): void;
  onTranscript(target: CollaborationVoiceTarget, text: string): void;
  onFailure(target: CollaborationVoiceTarget, failure: CollaborationVoiceFailure): void;
  onCancel(target: CollaborationVoiceTarget): void;
}>;

export function voiceDraftKey(target: CollaborationVoiceTarget): string {
  return `${target.sessionId}\u0000${target.targetDate}`;
}

export function appendVoiceTranscript(draft: string, transcript: string): string {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return draft;
  if (!draft) return cleanTranscript;
  return `${draft}${draft.endsWith("\n") ? "" : "\n"}${cleanTranscript}`;
}
