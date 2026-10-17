import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, parse } from "node:path";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDirectory = join(repositoryRoot, "frontend");
const arguments_ = process.argv.slice(2);
const outputIndex = arguments_.indexOf("--output");
const outputDirectory = outputIndex === -1 ? join(repositoryRoot, "dist") : resolve(arguments_[outputIndex + 1]);
if (outputDirectory === parse(outputDirectory).root || outputDirectory === resolve(repositoryRoot) || outputDirectory === resolve(frontendDirectory)) {
  throw Error("Refusing to replace a source/root directory with frontend build output");
}
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
