import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const requiredExternalInputs = (root: string): boolean =>
  existsSync(`${root}/.agents/skills/life-daily-loop/SKILL.md`);

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

// This contract test reads the canonical life-daily-loop path contract. A
// managed worktree resolves it through Git's common directory; other checkout
// layouts can set an explicit workspace root.
const workspaceRoot = resolveWorkspaceRoot();
const integrationContract = readFileSync(
  `${projectRoot}/docs/daily-flow-integration-v1.md`,
  "utf8",
);
const adapterContract = readFileSync(
  `${projectRoot}/docs/daily-flow-task-adapter-v1.md`,
  "utf8",
);
const dashboardTaskSkill = readFileSync(
  `${projectRoot}/.agents/skills/personal-dashboard-daily-tasks/SKILL.md`,
  "utf8",
);
const dailyLoopSkill = readFileSync(
  `${workspaceRoot}/.agents/skills/life-daily-loop/SKILL.md`,
  "utf8",
);

function assertExternalContract(content: string, contract: RegExp, description: string): void {
  assert.ok(contract.test(content), `canonical life-daily-loop is missing ${description}`);
}

test("the project-owned Dashboard skill names the real closed-app task entry", () => {
  assert.match(integrationContract, /`personal-dashboard-daily-tasks` skill/);
  assert.match(dashboardTaskSkill, /personal-dashboard --daily-flow-tasks/);
  assert.match(dashboardTaskSkill, /schemaVersion: 1/);
  assert.match(integrationContract, /personal-dashboard --daily-flow-tasks/);
  assert.match(integrationContract, /schemaVersion: 1/);
  assert.match(integrationContract, /vaultPath/);
  assert.match(integrationContract, /livedDate/);
  assert.match(integrationContract, /targetBinding/);
  assert.match(integrationContract, /revision/);
});

test("the canonical life-daily-loop keeps its Daily Record path", () => {
  assertExternalContract(
    dailyLoopSkill,
    /life\/Journal\/Daily\/YYYY\/YYYY-MM\/YYYY-MM-DD\.md/,
    "the life/Journal/Daily date path",
  );
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
