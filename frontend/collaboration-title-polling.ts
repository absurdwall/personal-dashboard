/** Refresh saved session titles only while at least one title is pending. */
export class CollaborationTitlePolling {
  private timer: number | null = null;

  constructor(private readonly refresh: () => void) {}

  setPending(pending: boolean): void {
    if (pending && this.timer === null) this.timer = window.setInterval(this.refresh, 750);
    else if (!pending && this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}
