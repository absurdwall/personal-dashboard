import assert from "node:assert/strict";
import test from "node:test";

import {
  DRIVE_ACCEPTANCE_MARKER,
  redactDriveAccountPath,
  validateDriveAcceptanceVault,
} from "../../scripts/acceptance/drive-vault-policy.mjs";

const homeDirectory = "/Users/synthetic";
const fileProviderEvaluation = `
domainUserInfo = {
  "CONTEXT_MENU_FILE_REVISIONS" = 1;
};
fileproviderItems = (
  {
    filename = ".personal-dashboard-drive-acceptance";
    isExcludedFromSync = 0;
    isUploaded = 1;
  }
);
`;

test("accepts only a marker-owned Vault below a Drive desktop-client My Drive root", () => {
  assert.deepEqual(
    validateDriveAcceptanceVault({
      homeDirectory,
      fileProviderEvaluation,
      markerContents: DRIVE_ACCEPTANCE_MARKER,
      platform: "darwin",
      vaultPath:
        "/Users/synthetic/Library/CloudStorage/GoogleDrive-example.invalid/My Drive/PD-Acceptance-08-safe",
    }),
    {
      fixtureName: "PD-Acceptance-08-safe",
      provider: "Google Drive desktop client",
    },
  );
});

test("rejects an ordinary temporary directory even when it looks like a Vault", () => {
  assert.throws(
    () =>
      validateDriveAcceptanceVault({
        homeDirectory,
        fileProviderEvaluation,
        markerContents: DRIVE_ACCEPTANCE_MARKER,
        platform: "darwin",
        vaultPath: "/tmp/PD-Acceptance-08-fake",
      }),
    /Google Drive desktop-client My Drive/,
  );
});

test("rejects the Drive root, an unmarked folder, and a non-Mac host", () => {
  assert.throws(
    () =>
      validateDriveAcceptanceVault({
        homeDirectory,
        fileProviderEvaluation,
        markerContents: DRIVE_ACCEPTANCE_MARKER,
        platform: "darwin",
        vaultPath:
          "/Users/synthetic/Library/CloudStorage/GoogleDrive-example.invalid/My Drive",
      }),
    /dedicated child folder/,
  );
  assert.throws(
    () =>
      validateDriveAcceptanceVault({
        homeDirectory,
        fileProviderEvaluation,
        markerContents: "",
        platform: "darwin",
        vaultPath:
          "/Users/synthetic/Library/CloudStorage/GoogleDrive-example.invalid/My Drive/PD-Acceptance-08-safe",
      }),
    /acceptance marker/,
  );
  assert.throws(
    () =>
      validateDriveAcceptanceVault({
        homeDirectory,
        fileProviderEvaluation,
        markerContents: DRIVE_ACCEPTANCE_MARKER,
        platform: "linux",
        vaultPath:
          "/Users/synthetic/Library/CloudStorage/GoogleDrive-example.invalid/My Drive/PD-Acceptance-08-safe",
      }),
    /macOS/,
  );
});

test("rejects a path-shaped lookalike without a registered Drive File Provider item", () => {
  assert.throws(
    () =>
      validateDriveAcceptanceVault({
        homeDirectory,
        fileProviderEvaluation: "no file provider item found",
        markerContents: DRIVE_ACCEPTANCE_MARKER,
        platform: "darwin",
        vaultPath:
          "/Users/synthetic/Library/CloudStorage/GoogleDrive-example.invalid/My Drive/PD-Acceptance-08-safe",
      }),
    /registered Google Drive File Provider/,
  );
});

test("redacts Drive account segments from success and failure output", () => {
  assert.equal(
    redactDriveAccountPath(
      "failed at /Users/synthetic/Library/CloudStorage/GoogleDrive-private@example.invalid/My Drive/fixture",
    ),
    "failed at /Users/synthetic/Library/CloudStorage/GoogleDrive-<account>/My Drive/fixture",
  );
});
