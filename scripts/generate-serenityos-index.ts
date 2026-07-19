import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { emojiData, emojiDatasetInfo } from "../packages/data/src/generated";
import {
  assertSerenityOSRevision,
  collectSerenityOSAssetIds,
  renderSerenityOSData,
} from "./serenityos-index";

interface SerenityOSProviderConfig {
  version: string;
}

const args = process.argv.slice(2).filter((argument) => argument !== "--");
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(args[0] ?? "");
const outputPath = resolve(repositoryRoot, args[1] ?? "packages/core/src/serenityos-data.ts");
const config = JSON.parse(
  await readFile(resolve(repositoryRoot, "assets/providers.json"), "utf8"),
) as Record<string, SerenityOSProviderConfig>;
const expectedRevision = config.serenityos?.version;
const execFileAsync = promisify(execFile);

if (!args[0]) {
  throw new Error(
    "Usage: tsx scripts/generate-serenityos-index.ts <SerenityOS checkout> [output]",
  );
}
if (!expectedRevision) throw new Error("Missing serenityos configuration in assets/providers.json");

const { stdout: checkedOutRevision } = await execFileAsync(
  "git",
  ["-C", sourceRoot, "rev-parse", "HEAD"],
  { encoding: "utf8" },
);
assertSerenityOSRevision(checkedOutRevision, expectedRevision);

const assetFiles = await readdir(join(sourceRoot, "Base", "res", "emoji"));
const assetIds = collectSerenityOSAssetIds(
  assetFiles,
  Object.values(emojiData).map((data) => data.codepoint),
);
const output = renderSerenityOSData(
  assetIds,
  expectedRevision,
  emojiDatasetInfo.emojiVersion,
);

await writeFile(outputPath, output, "utf8");
console.log(
  `Wrote ${assetIds.length} SerenityOS RGI asset IDs from ${expectedRevision} to ${outputPath}`,
);
