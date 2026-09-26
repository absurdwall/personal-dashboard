import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };
const packageLock = JSON.parse(
  readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8"),
) as { version: string; packages: { "": { version: string } } };
const tauriConfig = JSON.parse(
  readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
) as { version: string; identifier: string };
const cargoToml = readFileSync(
  new URL("../../src-tauri/Cargo.toml", import.meta.url),
  "utf8",
);
const cargoLock = readFileSync(
  new URL("../../src-tauri/Cargo.lock", import.meta.url),
  "utf8",
);

test("the 3.0.2 candidate versions every package declaration without changing identity", () => {
  assert.equal(packageJson.version, "3.0.2");
  assert.equal(packageLock.version, "3.0.2");
  assert.equal(packageLock.packages[""].version, "3.0.2");
  assert.equal(tauriConfig.version, "3.0.2");
  assert.equal(tauriConfig.identifier, "com.tortillaflat.personal-dashboard");
  assert.match(cargoToml, /^version = "3\.0\.2"$/m);

  const packageEntry = cargoLock.slice(cargoLock.indexOf('name = "personal-dashboard"'));
  assert.match(packageEntry, /^version = "3\.0\.2"$/m);
});
