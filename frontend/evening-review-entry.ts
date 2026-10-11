// Guard failures carry retained interface copy rather than an already rendered
// error wrapper. Backend diagnostics continue through the shared error setter.
export class EveningReviewGuardError extends Error {
  readonly copyKey: 'today.reviewBusy' | 'today.reviewTargetChanged';

  constructor(copyKey: 'today.reviewBusy' | 'today.reviewTargetChanged') {
    super(copyKey);
    this.copyKey = copyKey;
  }
}

export type EveningReviewTarget = Readonly<{ date: string; isToday: boolean; available: boolean }>;

// This controller prepares navigation and an editable draft. Sending remains
// the existing Collaboration composer's explicit action.
export function initializeEveningReviewEntry(
  button: HTMLButtonElement,
  status: HTMLElement,
  target: () => EveningReviewTarget | null,
  open: (date: string) => Promise<boolean>,
  copy: (element: HTMLElement, key: string, values?: Readonly<Record<string, string>>) => void,
  errorCopy: (element: HTMLElement, key: string, error: unknown) => void,
): Readonly<{ render: () => void }> {
  let pending = false;
  function render(): void {
    const selected = target();
    button.disabled = pending || !selected?.available;
    copy(button, selected?.isToday ? 'today.startReview' : 'today.startReviewDate',
      { date: selected?.date ?? '' });
  }
  button.addEventListener('click', async () => {
    const selected = target();
    if (pending || !selected?.available) return;
    pending = true;
    render();
    copy(status, 'today.reviewOpening', { date: selected.date });
    status.dataset.state = 'pending';
    try {
      const preserved = await open(selected.date);
      copy(status, preserved ? 'today.reviewDraftPreserved' : 'today.reviewDraftReady', { date: selected.date });
      status.dataset.state = 'ready';
    } catch (error) {
      if (error instanceof EveningReviewGuardError) copy(status, error.copyKey);
      else errorCopy(status, 'today.reviewOpenFailed', error);
      status.dataset.state = 'error';
    } finally {
      pending = false;
      render();
    }
  });
  render();
  return { render };
}
