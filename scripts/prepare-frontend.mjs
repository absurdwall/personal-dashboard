import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDirectory = join(repositoryRoot, "frontend");
const outputDirectory = join(repositoryRoot, "dist");

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  ["index.html", "styles.css"].map((filename) =>
    copyFile(join(frontendDirectory, filename), join(outputDirectory, filename)),
  ),
);
