import assert from "node:assert/strict";
import test from "node:test";

import { LatestRequest } from "../../frontend/latest-request.ts";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("a slower Calendar selection cannot replace the latest selected date", async () => {
  const requests = new LatestRequest();
  const older = deferred<string>();
  const newer = deferred<string>();
  let rendered = "";

  const renderWhenCurrent = async (promise: Promise<string>) => {
    const token = requests.begin();
    const value = await promise;
    if (requests.isCurrent(token)) {
      rendered = value;
    }
  };

  const first = renderWhenCurrent(older.promise);
  const second = renderWhenCurrent(newer.promise);
  newer.resolve("2026-08-09");
  await second;
  older.resolve("2026-08-08");
  await first;

  assert.equal(rendered, "2026-08-09");
});

test("navigation invalidates a pending write presentation", async () => {
  const requests = new LatestRequest();
  const write = deferred<string>();
  let rendered = "selected historical day";
  const token = requests.begin();
  const completion = write.promise.then((value) => {
    if (requests.isCurrent(token)) {
      rendered = value;
    }
  });

  requests.invalidate();
  write.resolve("stale current-day write response");
  await completion;

  assert.equal(rendered, "selected historical day");
});
