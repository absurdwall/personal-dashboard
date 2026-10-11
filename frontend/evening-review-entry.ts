export type EveningReviewTarget = Readonly<{ date: string; isToday: boolean; available: boolean }>;

// This controller prepares navigation and an editable draft. Sending remains
// the existing Collaboration composer's explicit action.
export function initializeEveningReviewEntry(
  button: HTMLButtonElement,
  status: HTMLElement,
  target: () => EveningReviewTarget | null,
  open: (date: string) => Promise<boolean>,
  copy: (key: string, values?: Readonly<Record<string, string>>) => string,
): Readonly<{ render: () => void }> {
  let pending = false;
  function render(): void {
    const selected = target();
    button.disabled = pending || !selected?.available;
    button.textContent = selected?.isToday ? copy('today.startReview')
      : copy('today.startReviewDate', { date: selected?.date ?? '' });
  }
  button.addEventListener('click', async () => {
    const selected = target();
    if (pending || !selected?.available) return;
    pending = true;
    render();
    status.textContent = copy('today.reviewOpening', { date: selected.date });
    status.dataset.state = 'pending';
    try {
      const preserved = await open(selected.date);
      status.textContent = copy(preserved ? 'today.reviewDraftPreserved' : 'today.reviewDraftReady', { date: selected.date });
      status.dataset.state = 'ready';
    } catch (error) {
      status.textContent = `${copy('today.reviewOpenFailed')} ${String(error)}`;
      status.dataset.state = 'error';
    } finally {
      pending = false;
      render();
    }
  });
  render();
  return { render };
}
