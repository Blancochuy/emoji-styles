import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { buildProviderArtifacts, normalizeEmojiAsset } from "../packages/asset-pipeline/src/index";
import type { BuildProviderOptions } from "../packages/asset-pipeline/src/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselineFlag = process.argv.indexOf("--baseline");
const baselineRef = baselineFlag < 0 ? "738076b" : process.argv[baselineFlag + 1];
if (!baselineRef) throw new Error("--baseline requires a git revision");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const baseline = git("rev-parse", "--verify", `${baselineRef}^{commit}`);
const packageRoot = join(root, "packages/asset-pipeline");
const temporary = await mkdtemp(join(packageRoot, ".benchmark-"));
const output = join(root, "benchmarks/emoji-quality/results/technical.json");

type Builder = typeof buildProviderArtifacts;
type Case = { id: string; expectedAccepted: boolean; setup: (directory: string) => Promise<BuildProviderOptions["mapping"]> };
type Outcome = { accepted: boolean; assetCount?: number; error?: string };

async function asset(color: string, size = 256): Promise<Buffer> {
  const source = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="40" height="40"><circle cx="20" cy="20" r="18" fill="${color}"/></svg>`), left: 12, top: 12 }]).png().toBuffer();
  return (await normalizeEmojiAsset({ input: source, size, format: "png" })).data;
}

try {
  // Materialize all baseline pipeline sources beside the package's installed deps.
  const paths = git("ls-tree", "-r", "--name-only", baseline, "packages/asset-pipeline/src").split("\n").filter((path) => path.endsWith(".ts"));
  const sourceDirectory = join(temporary, "baseline");
  await mkdir(sourceDirectory);
  for (const path of paths) await writeFile(join(sourceDirectory, path.split("/").pop()!), execFileSync("git", ["show", `${baseline}:${path}`], { cwd: root }));
  const before = await import(pathToFileURL(join(sourceDirectory, "index.ts")).href) as { buildProviderArtifacts: Builder };
  const first = await asset("#ff3366");
  const second = await asset("#33aaff");
  const mapping = [{ file: "first.png", emoji: "🚀", token: "action.launch" }, { file: "second.png", emoji: "💡", token: "status.idea" }];
  const pair = async (directory: string) => { await writeFile(join(directory, "first.png"), first); await writeFile(join(directory, "second.png"), second); return mapping; };
  const cases: Case[] = [
    { id: "valid-256", expectedAccepted: true, setup: pair },
    { id: "valid-128", expectedAccepted: true, setup: async (dir) => { await writeFile(join(dir, "1f680.png"), await asset("#ff3366", 128)); return undefined; } },
    { id: "opaque-rectangle", expectedAccepted: false, setup: async (dir) => { await sharp({ create: { width: 32, height: 16, channels: 3, background: "red" } }).png().toFile(join(dir, "1f680.png")); return undefined; } },
    { id: "transparent-empty", expectedAccepted: false, setup: async (dir) => { await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(join(dir, "1f680.png")); return undefined; } },
    { id: "extension-mismatch", expectedAccepted: false, setup: async (dir) => { await writeFile(join(dir, "1f680.png"), await sharp(first).webp({ lossless: true }).toBuffer()); return undefined; } },
    { id: "duplicate-content", expectedAccepted: false, setup: async (dir) => { await pair(dir); await writeFile(join(dir, "second.png"), first); return mapping; } },
    { id: "mixed-dimensions", expectedAccepted: false, setup: async (dir) => { await pair(dir); await writeFile(join(dir, "second.png"), await asset("#33aaff", 128)); return mapping; } },
    { id: "duplicate-emoji", expectedAccepted: false, setup: async (dir) => { await pair(dir); return [mapping[0], { ...mapping[1], emoji: "🚀" }]; } },
    { id: "duplicate-token", expectedAccepted: false, setup: async (dir) => { await pair(dir); return [mapping[0], { ...mapping[1], token: "action.launch" }]; } },
    { id: "missing-mapping-target", expectedAccepted: false, setup: async (dir) => { await pair(dir); return [...mapping, { file: "missing.png", emoji: "🔥", token: "status.fire" }]; } },
    { id: "token-without-fallback", expectedAccepted: false, setup: async (dir) => { await writeFile(join(dir, "first.png"), first); return [{ file: "first.png", token: "action.launch" }]; } },
    { id: "edge-contact", expectedAccepted: false, setup: async (dir) => { await sharp({ create: { width: 64, height: 64, channels: 4, background: "red" } }).png().toFile(join(dir, "1f680.png")); return undefined; } },
    { id: "corrupt-control", expectedAccepted: false, setup: async (dir) => { await writeFile(join(dir, "1f680.png"), "not an image"); return undefined; } },
  ];
  const decisions: Array<{ id: string; expectedAccepted: boolean; before: Outcome; after: Outcome }> = [];
  for (const testCase of cases) {
    const directory = join(temporary, testCase.id);
    await mkdir(directory);
    const assetMapping = await testCase.setup(directory);
    const options: BuildProviderOptions = { directory, id: "benchmark", mapping: assetMapping, provenance: { generated: false, createdAt: "2026-10-22T00:00:00Z", ownership: "Synthetic benchmark fixture" } };
    const run = async (builder: Builder): Promise<Outcome> => {
      try { const built = await builder(options); return { accepted: true, assetCount: Object.keys(built.manifest.assets).length }; }
      catch (error) { return { accepted: false, error: error instanceof Error ? error.message.split(temporary).join("<fixture>") : String(error) }; }
    };
    decisions.push({ id: testCase.id, expectedAccepted: testCase.expectedAccepted, before: await run(before.buildProviderArtifacts), after: await run(buildProviderArtifacts) });
  }
  const sourceHashes: Record<string, string> = {};
  for (const file of (await readdir(join(packageRoot, "src"))).filter((file) => file.endsWith(".ts")).sort()) sourceHashes[file] = createHash("sha256").update(await readFile(join(packageRoot, "src", file))).digest("hex");
  const summary = (condition: "before" | "after") => ({
    decisionsMatched: decisions.filter((testCase) => testCase[condition].accepted === testCase.expectedAccepted).length,
    totalCases: decisions.length,
    invalidAccepted: decisions.filter((testCase) => !testCase.expectedAccepted && testCase[condition].accepted).length,
    validRejected: decisions.filter((testCase) => testCase.expectedAccepted && !testCase[condition].accepted).length,
  });
  const report = { schemaVersion: 1, baseline, currentSourceHashes: sourceHashes, environment: { node: process.version, sharp: sharp.versions.sharp, vips: sharp.versions.vips, platform: process.platform, arch: process.arch }, scope: "Technical packaging acceptance; no visual-quality score", summary: { before: summary("before"), after: summary("after") }, cases: decisions };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.after.decisionsMatched !== cases.length) process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
