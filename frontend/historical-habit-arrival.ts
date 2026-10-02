type Arrival = Readonly<{ date: string }>;

// An explicit entry gets one arrival. Deferred layout work must still belong to
// that same entry, even when the user returns to the same date later.
export class HistoricalHabitArrival {
  private pending: Arrival | null = null;

  select(date: string): void {
    this.pending = { date };
  }

  clear(): void {
    this.pending = null;
  }

  forDate(date: string): Arrival | null {
    return this.pending?.date === date ? this.pending : null;
  }

  consume(arrival: Arrival, visibleDate: string | null): boolean {
    if (this.pending !== arrival || arrival.date !== visibleDate) return false;
    this.pending = null;
    return true;
  }
}
