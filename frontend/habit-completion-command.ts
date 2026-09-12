type HabitCompletionWriteLifecycle<T> = Readonly<{
  onPersisted: () => void;
  isPresentationCurrent: () => boolean;
  isTargetVisible: () => boolean;
  present: (view: T) => void;
  refresh: () => Promise<void>;
}>;

export async function reconcileHabitCompletionWrite<T>(
  write: Promise<T>,
  lifecycle: HabitCompletionWriteLifecycle<T>,
): Promise<T> {
  const view = await write;
  lifecycle.onPersisted();
  if (lifecycle.isPresentationCurrent()) {
    lifecycle.present(view);
  } else if (lifecycle.isTargetVisible()) {
    await lifecycle.refresh();
  }
  return view;
}
