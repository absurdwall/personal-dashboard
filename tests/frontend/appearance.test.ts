import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAccentColor,
  SerializedLatestMutation,
} from "../../frontend/appearance.ts";

test("an accent selection updates the shared page color tokens immediately", () => {
  const properties = new Map<string, string>();

  applyAccentColor("blue", {
    setProperty(name, value) {
      properties.set(name, value);
    },
  });

  assert.deepEqual(Object.fromEntries(properties), {
    "--parity-accent": "#4d6f91",
    "--parity-accent-strong": "#3d5f80",
    "--parity-accent-soft": "#eaf0f8",
  });
});

test("appearance writes are serialized and only the latest response is presented", async () => {
  const mutations = new SerializedLatestMutation("initial-confirmed");
  const events: string[] = [];
  let finishFirst!: (value: string) => void;
  let finishSecond!: (value: string) => void;
  const first = mutations.enqueue(
    () => new Promise<string>((resolve) => {
      events.push("first-started");
      finishFirst = resolve;
    }),
    (value) => events.push(value),
    () => events.push("first-failed"),
  );
  const second = mutations.enqueue(
    () => new Promise<string>((resolve) => {
      events.push("second-started");
      finishSecond = resolve;
    }),
    (value) => events.push(value),
    () => events.push("second-failed"),
  );

  await Promise.resolve();
  assert.deepEqual(events, ["first-started"]);
  finishFirst("stale-first-result");
  await first;
  await Promise.resolve();
  assert.deepEqual(events, ["first-started", "second-started"]);
  finishSecond("latest-second-result");
  await second;
  assert.deepEqual(events, ["first-started", "second-started", "latest-second-result"]);
});

test("two queued failures roll back to the last confirmed appearance", async () => {
  const mutations = new SerializedLatestMutation("forest");
  const presentations: string[] = [];
  const first = mutations.enqueue(
    async () => { throw new Error("first failed"); },
    () => presentations.push("unexpected first success"),
    (_error, confirmed) => presentations.push(`first:${confirmed}`),
  );
  const second = mutations.enqueue(
    async () => { throw new Error("second failed"); },
    () => presentations.push("unexpected second success"),
    (_error, confirmed) => presentations.push(`second:${confirmed}`),
  );

  await Promise.all([first, second]);

  assert.deepEqual(presentations, ["second:forest"]);
});
