import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectRoot = process.cwd();
const integrationContract = readFileSync(
  `${projectRoot}/docs/daily-flow-integration-v1.md`,
  "utf8",
);
const adapterContract = readFileSync(
  `${projectRoot}/docs/daily-flow-task-adapter-v1.md`,
  "utf8",
);

test("the integration contract names the real closed-app Dashboard entry", () => {
  assert.match(integrationContract, /canonical `life-daily-loop`/);
  assert.match(integrationContract, /`everyday` Life Companion/);
  assert.match(integrationContract, /personal-dashboard --daily-flow-tasks/);
  assert.match(integrationContract, /schemaVersion: 1/);
  assert.match(integrationContract, /vaultPath/);
  assert.match(integrationContract, /livedDate/);
  assert.match(integrationContract, /targetBinding/);
  assert.match(integrationContract, /revision/);
});

test("the integration and adapter contracts preserve source and permission boundaries", () => {
  assert.match(integrationContract, /Dida365/);
  assert.match(integrationContract, /no copy, fuzzy merge, local check, or write-back/);
  assert.match(integrationContract, /suggestion/);
  assert.match(integrationContract, /correctCompletion/);
  assert.match(integrationContract, /stale revision conflict/);
  assert.match(adapterContract, /同一 `taskId \+ sourceReference`/);
  assert.match(adapterContract, /建议列表本身[\s\S]*从不产生任务/);
  assert.match(adapterContract, /noop/);
});
