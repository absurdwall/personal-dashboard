import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("first use offers empty personal space creation alongside existing Vault selection", () => {
  const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
  assert.match(html, /id="settings-create-space"/);
  assert.match(html, /id="settings-select-vault"/);
  assert.match(html, /id="create-today-space"/);
});

test("space-creation failure translates recovery copy and preserves the OS diagnostic", async () => {
  const { localizeApplicationError } = await import("../../frontend/interface-language.ts");
  const diagnostic = "Permission denied (os error 13) /Users/synthetic/资料";
  const error = `Could not create personal space: ${diagnostic}. Choose a new folder name in a writable location. Existing folders are never converted or overwritten; the previous selection is unchanged.`;
  const translated = localizeApplicationError(error, "zh");
  assert.ok(translated.startsWith("无法新建个人空间："));
  assert.ok(translated.includes(diagnostic));
  assert.ok(translated.includes("原有选择未更改"));
  assert.equal(localizeApplicationError(error, "en"), error);
});

test("unavailable standalone Codex explains recovery in both UI languages without rewriting its diagnostic", async () => {
  const { localizeCollaborationDiagnostic } = await import("../../frontend/interface-language.ts");
  const diagnostic = "/Users/synthetic/旧版 codex: Permission denied (os error 13)";
  const error = `No compatible Codex CLI could start. Install or update the documented standalone Codex CLI, then refresh. Last check: ${diagnostic}`;
  const translated = localizeCollaborationDiagnostic(error, "zh");
  assert.ok(translated.startsWith("没有可启动的兼容 Codex CLI。"));
  assert.ok(translated.endsWith(diagnostic));
  assert.equal(localizeCollaborationDiagnostic(error, "en"), error);
});
