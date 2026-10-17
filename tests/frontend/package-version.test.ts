import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

test("the Beta release declaration preserves identity and advances the installed build", () => {
  const release = readJson("release.json");
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const tauri = readJson("src-tauri/tauri.conf.json");
  assert.equal(release.displayVersion, "1.0.0 Beta 1");
  assert.equal(release.version, "1.0.0");
  assert.equal(release.tag, "v1.0.0-beta.1");
  assert.equal(release.identifier, "com.tortillaflat.personal-dashboard");
  assert.ok(Number(release.build.split(".")[0]) > 4, "the build advances beyond installed 4.0.7 even though the public display restarts at 1.0.0");
  assert.match(release.build, /^\d{1,4}\.\d{1,2}\.\d{1,2}$/);
  for (const version of [packageJson.version, packageLock.version, packageLock.packages[""].version, tauri.version]) assert.equal(version, release.version);
  assert.equal(tauri.identifier, release.identifier);
  assert.equal(tauri.bundle.macOS.bundleVersion, release.build);
  assert.equal(tauri.bundle.macOS.minimumSystemVersion, release.minimumSystemVersion);
  const cargoToml = readFileSync(new URL("../../src-tauri/Cargo.toml", import.meta.url), "utf8");
  const cargoLock = readFileSync(new URL("../../src-tauri/Cargo.lock", import.meta.url), "utf8");
  assert.match(cargoToml, new RegExp(`^version = "${release.version.replaceAll(".", "\\.")}"$`, "m"));
  const packageEntry = cargoLock.slice(cargoLock.indexOf('name = "personal-dashboard"'));
  assert.match(packageEntry, new RegExp(`^version = "${release.version.replaceAll(".", "\\.")}"$`, "m"));
});
