import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const workspaceRoot = resolve(projectRoot, "..");
const integrationContract = readFileSync(
  `${projectRoot}/docs/daily-flow-integration-v1.md`,
  "utf8",
);
const adapterContract = readFileSync(
  `${projectRoot}/docs/daily-flow-task-adapter-v1.md`,
  "utf8",
);
const dailyLoopSkill = readFileSync(
  `${workspaceRoot}/.agents/skills/life-daily-loop/SKILL.md`,
  "utf8",
);
const lifeCompanionSkill = readFileSync(
  `${workspaceRoot}/everyday/.agents/skills/life-companion/SKILL.md`,
  "utf8",
);
const lifeCompanionBoundaries = readFileSync(
  `${workspaceRoot}/everyday/.agents/skills/life-companion/references/tool-boundaries.md`,
  "utf8",
);
const everydayAgents = readFileSync(`${workspaceRoot}/everyday/AGENTS.md`, "utf8");

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

test("the canonical daily-loop entries point to one Daily Record path", () => {
  assert.match(dailyLoopSkill, /## Personal Dashboard Tasks/);
  assert.match(dailyLoopSkill, /personal-dashboard --daily-flow-tasks/);
  assert.match(dailyLoopSkill, /life\/Journal\/Daily\/YYYY\/YYYY-MM\/YYYY-MM-DD\.md/);
  assert.match(lifeCompanionSkill, /canonical `life\/` Daily\s+Record/);
  assert.match(lifeCompanionSkill, /life-daily-loop/);
  assert.match(lifeCompanionBoundaries, /life\/Journal\/Daily\/YYYY\/YYYY-MM\/YYYY-MM-DD\.md/);
  assert.doesNotMatch(lifeCompanionBoundaries, /Diary\/YYYY\/YYYY-MM\/YYYY-MM-DD\.md/);
  assert.match(everydayAgents, /canonical Life Companion daily-loop record/);
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
