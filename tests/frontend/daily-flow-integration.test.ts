import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const requiredExternalInputs = (root: string): boolean =>
  existsSync(`${root}/.agents/skills/life-daily-loop/SKILL.md`) &&
  existsSync(`${root}/everyday/.agents/skills/life-companion/SKILL.md`) &&
  existsSync(`${root}/everyday/.agents/skills/life-companion/references/tool-boundaries.md`) &&
  existsSync(`${root}/everyday/AGENTS.md`);

function resolveWorkspaceRoot(): string {
  const configuredRoot = process.env.PERSONAL_DASHBOARD_WORKSPACE_ROOT?.trim();
  if (configuredRoot) {
    if (!requiredExternalInputs(configuredRoot)) {
      throw new Error(
        `PERSONAL_DASHBOARD_WORKSPACE_ROOT does not contain the required daily-flow inputs: ${configuredRoot}`,
      );
    }
    return configuredRoot;
  }

  const gitCommonDir = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: projectRoot, encoding: "utf8" },
  ).trim();
  const candidates = [
    resolve(projectRoot, ".."),
    resolve(gitCommonDir, "../.."),
    resolve(gitCommonDir, ".."),
  ];
  const workspaceRoot = candidates.find(requiredExternalInputs);
  if (workspaceRoot) return workspaceRoot;
  throw new Error(
    "Daily-flow integration inputs are unavailable. Run from the Tortilla Flat source checkout or set PERSONAL_DASHBOARD_WORKSPACE_ROOT to its root.",
  );
}

// This contract test intentionally reads the canonical life-daily-loop and
// everyday instructions. A managed worktree resolves them through Git's
// common directory; an explicit root is available for other checkout layouts.
const workspaceRoot = resolveWorkspaceRoot();
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
