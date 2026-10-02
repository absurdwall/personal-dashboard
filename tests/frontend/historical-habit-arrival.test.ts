import assert from "node:assert/strict";
import test from "node:test";
import { HistoricalHabitArrival } from "../../frontend/historical-habit-arrival.ts";

test("explicit historical arrival waits for its date and runs once across refreshes", () => {
  const arrival = new HistoricalHabitArrival();
  arrival.select("2026-09-07");
  assert.equal(arrival.forDate("2026-08-31"), null);
  const target = arrival.forDate("2026-09-07")!;
  assert.equal(arrival.consume(target, "2026-08-31"), false);
  assert.equal(arrival.consume(target, "2026-09-07"), true);
  assert.equal(arrival.forDate("2026-09-07"), null);
  assert.equal(arrival.consume(target, "2026-09-07"), false);
});

test("rapid date changes and returning to the same date reject old layout callbacks", () => {
  const arrival = new HistoricalHabitArrival();
  arrival.select("2026-09-07");
  const oldTarget = arrival.forDate("2026-09-07")!;
  arrival.select("2026-08-31");
  assert.equal(arrival.consume(oldTarget, "2026-08-31"), false);
  arrival.select("2026-09-07");
  assert.equal(arrival.consume(oldTarget, "2026-09-07"), false);
  assert.equal(arrival.consume(arrival.forDate("2026-09-07")!, "2026-09-07"), true);
});

test("leaving Today or switching Vault cancels deferred arrival even for the same date", () => {
  const arrival = new HistoricalHabitArrival();
  arrival.select("2026-09-07");
  const target = arrival.forDate("2026-09-07")!;
  arrival.clear();
  assert.equal(arrival.consume(target, "2026-09-07"), false);
  assert.equal(arrival.forDate("2026-09-07"), null);
});
