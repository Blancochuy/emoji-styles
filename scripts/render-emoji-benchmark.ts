import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContactSheet, normalizeEmojiAsset, validateEmojiAsset } from "../packages/asset-pipeline/src/index";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(root, "benchmarks/emoji-quality");
const protocol = JSON.parse(await readFile(join(directory, "visual-protocol.json"), "utf8")) as {
  generator: string; model: null; seed: null; attemptsPerCondition: number;
  tasks: Array<{ id: string; condition: string; token: string; prompt: string }>;
};
const repairProtocol = JSON.parse(await readFile(join(directory, "repair-protocol.json"), "utf8")) as {
  tasks: Array<{ id: string; condition: string; token: string; prompt: string; editTarget: string }>;
};
const inputs = [];
const assets = [];
await mkdir(join(directory, "normalized"), { recursive: true });
await mkdir(join(directory, "results"), { recursive: true });
for (const task of [...protocol.tasks, ...repairProtocol.tasks]) {
  if (!/^(before|after|repair)-[a-z.]+$/.test(task.id)) throw new Error("Invalid benchmark task ID");
  const rawPath = join(directory, "raw", `${task.id}.png`);
  const outputPath = join(directory, "normalized", `${task.id}.webp`);
  const normalized = await normalizeEmojiAsset({ input: rawPath, size: 256, format: "webp", safeArea: 0.76 });
  await writeFile(outputPath, normalized.data);
  const validation = await validateEmojiAsset(normalized.data, { size: 256, format: "webp", safeArea: 0.76 });
  assets.push({
    id: task.id, token: task.token, condition: task.condition,
    raw: { file: `raw/${task.id}.png`, sha256: normalized.source.sha256, width: normalized.source.width, height: normalized.source.height, hasAlpha: normalized.source.hasAlpha, transparentPixelRatio: normalized.source.transparentPixelRatio, cornerAlpha: normalized.source.cornerAlpha },
    normalized: { file: `normalized/${task.id}.webp`, sha256: normalized.inspection.sha256 },
    technicalValidation: validation,
  });
  inputs.push(outputPath);
}
await createContactSheet({ inputs: inputs.slice(0, protocol.tasks.length), output: join(directory, "results/comparison.png"), columns: 2, review: true });
await createContactSheet({ inputs: [inputs[3], inputs[4]], output: join(directory, "results/repair.png"), columns: 2, review: true });
await writeFile(join(directory, "results/visual-assets.json"), `${JSON.stringify({
  schemaVersion: 1,
  generator: { provider: protocol.generator, model: protocol.model, modelUnknownReason: "Identifier not exposed by built-in tool", seed: protocol.seed },
  attemptsPerCondition: protocol.attemptsPerCondition,
  pairedComparison: protocol.tasks.map((task) => task.id),
  separatePostReviewCorrections: repairProtocol.tasks.map((task) => task.id),
  noCandidatesDiscarded: true,
  normalization: { size: 256, format: "webp", safeArea: 0.76 },
  transparency: { requestedFromTool: true, backgroundRemovalApplied: false, rawAlphaPreserved: true },
  rights: "Generated benchmark artwork; ownership and redistribution status require user confirmation. The source-code MIT license does not establish artwork rights.",
  assets,
}, null, 2)}\n`);
console.log(`Rebuilt ${assets.length} normalized assets, comparison.png, and the separate repair.png from frozen raw outputs. No image generation executed.`);
