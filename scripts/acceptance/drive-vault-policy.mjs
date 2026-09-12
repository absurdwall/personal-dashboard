import { execFile } from "node:child_process";
import { realpath, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DRIVE_ACCEPTANCE_MARKER =
  "personal-dashboard-drive-compatibility-v1";

/** @param {string} output */
export function redactDriveAccountPath(output) {
  return output.replace(/GoogleDrive-[^/\s]+/g, "GoogleDrive-<account>");
}

/**
 * Keep packaged Drive acceptance inside a dedicated marker-owned fixture.
 * This validates identity only; it does not claim that a local write reached
 * Google's cloud.
 *
 * @param {{
 *   fileProviderEvaluation: string;
 *   homeDirectory: string;
 *   markerContents: string;
 *   platform: string;
 *   vaultPath: string;
 * }} input
 */
export function validateDriveAcceptanceVault(input) {
  if (input.platform !== "darwin") {
    throw new Error("Drive compatibility acceptance requires macOS");
  }

  const cloudStorage = path.join(
    input.homeDirectory,
    "Library",
    "CloudStorage",
  );
  const relative = path.relative(cloudStorage, input.vaultPath);
  const segments = relative.split(path.sep).filter(Boolean);
  const isInsideCloudStorage =
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
  const isDriveMyDriveChild =
    isInsideCloudStorage &&
    segments.length >= 3 &&
    segments[0].startsWith("GoogleDrive-") &&
    segments[1] === "My Drive";

  if (!isDriveMyDriveChild) {
    throw new Error(
      "Vault must be a dedicated child folder below a Google Drive desktop-client My Drive root",
    );
  }
  if (input.markerContents !== DRIVE_ACCEPTANCE_MARKER) {
    throw new Error("Vault is missing the exact Drive acceptance marker");
  }
  const isRegisteredDriveItem =
    input.fileProviderEvaluation.includes("fileproviderItems") &&
    input.fileProviderEvaluation.includes(
      'filename = ".personal-dashboard-drive-acceptance"',
    ) &&
    input.fileProviderEvaluation.includes("isExcludedFromSync = 0");
  if (!isRegisteredDriveItem) {
    throw new Error(
      "acceptance marker is not a registered Google Drive File Provider item",
    );
  }

  return {
    fixtureName: path.basename(input.vaultPath),
    provider: "Google Drive desktop client",
  };
}

/** @param {string} vaultArgument */
export async function validateDriveAcceptanceVaultOnDisk(vaultArgument) {
  const vaultPath = await realpath(vaultArgument);
  const homeDirectory = await realpath(process.env.HOME ?? "");
  const markerContents = (
    await readFile(path.join(vaultPath, ".personal-dashboard-drive-acceptance"), "utf8")
  ).trim();
  const markerPath = path.join(vaultPath, ".personal-dashboard-drive-acceptance");
  let fileProviderEvaluation;
  try {
    ({ stdout: fileProviderEvaluation } = await execFileAsync(
      "/usr/bin/fileproviderctl",
      ["evaluate", markerPath],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    ));
  } catch {
    throw new Error(
      "could not verify the marker as a registered Google Drive File Provider item",
    );
  }
  const result = validateDriveAcceptanceVault({
    fileProviderEvaluation,
    homeDirectory,
    markerContents,
    platform: process.platform,
    vaultPath,
  });

  const requiredDirectories = [
    path.join(vaultPath, ".obsidian"),
    path.join(vaultPath, "life", "Journal", "Daily"),
  ];
  for (const requiredDirectory of requiredDirectories) {
    const metadata = await stat(requiredDirectory);
    if (!metadata.isDirectory()) {
      throw new Error(`required Vault directory is not a directory: ${path.basename(requiredDirectory)}`);
    }
  }

  return { ...result, vaultPath };
}

const invokedPath = process.argv[1] ? await realpath(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const vaultArgument = process.argv[2];
  if (!vaultArgument) {
    console.error("usage: node drive-vault-policy.mjs <isolated-drive-vault>");
    process.exitCode = 2;
  } else {
    try {
      const result = await validateDriveAcceptanceVaultOnDisk(vaultArgument);
      console.log(`Drive acceptance Vault ready: ${result.fixtureName}`);
    } catch (error) {
      console.error(
        redactDriveAccountPath(
          error instanceof Error ? error.message : String(error),
        ),
      );
      process.exitCode = 1;
    }
  }
}
