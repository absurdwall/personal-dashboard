import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDirectory = join(repositoryRoot, "frontend");
const arguments_ = process.argv.slice(2);
// Only this repository's generated dist directory is owned by this script.
// Validate arguments before cleanup; callers cannot select a deletion target.
for (const argument of arguments_) {
  if (argument !== "--diagnostic-voice-gate") {
    throw Error(`Unknown frontend build argument: ${argument}`);
  }
}
const outputDirectory = join(repositoryRoot, "dist");
const diagnostic = arguments_.includes("--diagnostic-voice-gate");
// dist is generated. Recreate it so a diagnostic build cannot leak stale assets
// into a later production candidate.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  ["index.html", "styles.css", ...(diagnostic ? ["voice-runtime-gate.html"] : [])].map((filename) =>
    copyFile(join(frontendDirectory, filename), join(outputDirectory, filename)),
  ),
);
