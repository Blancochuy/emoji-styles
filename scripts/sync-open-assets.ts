import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emojiData } from "../packages/data/src/generated";
import { getTwemojiAssetId } from "../packages/core/src/providers";
import { optimizeImage, type ImageFormat } from "./image-optimizer";

interface ProviderConfig {
  version: string;
  outputDirectory: string;
  baseUrl: string;
  extension: string;
  license: string;
  source: string;
  licenseUrl: string;
}

interface AssetRecord {
  codepoint: string;
  file: string;
  sha256: string;
  bytes: number;
  sourceFormat: ImageFormat;
  outputFormat: ImageFormat;
  animated: boolean;
  frames: number;
  loop?: number;
  delays?: number[];
  sourceBytes: number;
  optimized: boolean;
  reason: string;
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const dryRun = process.argv.includes("--dry-run");
const providerName = "twemoji";
const configPath = resolve(repositoryRoot, "assets/providers.json");
const configs = JSON.parse(await readFile(configPath, "utf8")) as Record<string, ProviderConfig>;
const config = configs[providerName];

if (!config) throw new Error(`Missing ${providerName} configuration in assets/providers.json`);
if (!/^https:\/\//.test(config.baseUrl)) throw new Error("Asset baseUrl must use HTTPS");
if (!config.version || !config.license || !config.licenseUrl) {
  throw new Error("Provider version and license metadata are required");
}

const codepoints = [...new Set(
  Object.values(emojiData)
    .filter((data) => Number.parseFloat(data.emojiVersion) <= Number.parseFloat(config.version))
    .map(getTwemojiAssetId),
)].sort();

console.log(`${providerName}@${config.version}: ${codepoints.length} supported RGI assets`);

const outputDirectory = resolve(repositoryRoot, config.outputDirectory);
const assetIndexPath = resolve(repositoryRoot, "packages/assets-twemoji/src/asset-ids.ts");
if (!outputDirectory.startsWith(`${repositoryRoot}\\`) && !outputDirectory.startsWith(`${repositoryRoot}/`)) {
  throw new Error("Provider outputDirectory must stay inside the repository");
}

if (dryRun) {
  const manifest = JSON.parse(
    await readFile(resolve(outputDirectory, "manifest.json"), "utf8"),
  ) as { assets: AssetRecord[]; failures: string[] };
  const manifestCodepoints = new Set(manifest.assets.map((asset) => asset.codepoint));
  const missing = codepoints.filter((codepoint) => !manifestCodepoints.has(codepoint));
  if (manifest.failures.length > 0 || missing.length > 0) {
    throw new Error(
      `Local manifest is incomplete: ${missing.length} missing assets and ${manifest.failures.length} recorded failures`,
    );
  }
  const expectedIndex = renderAssetIndex(manifest.assets.map((asset) => asset.codepoint));
  const currentIndex = await readFile(assetIndexPath, "utf8").catch(() => "");
  if (currentIndex !== expectedIndex) {
    throw new Error("Twemoji runtime asset index is stale. Run `pnpm assets:sync`.");
  }
  console.log(`Manifest covers all ${manifest.assets.length} supported RGI assets.`);
  process.exit(0);
}

await mkdir(outputDirectory, { recursive: true });

const previousManifest = JSON.parse(
  await readFile(resolve(outputDirectory, "manifest.json"), "utf8").catch(() => '{"assets":[]}'),
) as { assets: AssetRecord[]; generatedAt?: string };
const previousAssets = new Map(previousManifest.assets.map((asset) => [asset.codepoint, asset]));

async function download(codepoint: string): Promise<AssetRecord> {
  const previous = previousAssets.get(codepoint);
  if (previous) {
    const existing = await readFile(resolve(outputDirectory, previous.file)).catch(() => null);
    if (existing && createHash("sha256").update(existing).digest("hex") === previous.sha256) {
      return previous;
    }
  }
  const sourceFile = `${codepoint}.${config.extension}`;
  const response = await fetch(`${config.baseUrl}/${sourceFile}`);
  if (!response.ok) throw new Error(`${sourceFile}: HTTP ${response.status}`);

  const source = Buffer.from(await response.arrayBuffer());
  const optimized = await optimizeImage(source);
  const file = `${codepoint}.${optimized.outputFormat}`;
  await writeFile(resolve(outputDirectory, file), optimized.data);
  return {
    codepoint,
    file,
    sha256: createHash("sha256").update(optimized.data).digest("hex"),
    bytes: optimized.outputBytes,
    sourceFormat: optimized.sourceFormat,
    outputFormat: optimized.outputFormat,
    animated: optimized.animated,
    frames: optimized.frames,
    loop: optimized.loop,
    delays: optimized.delays,
    sourceBytes: optimized.sourceBytes,
    optimized: optimized.optimized,
    reason: optimized.reason,
  };
}

const records: AssetRecord[] = [];
const failures: string[] = [];
const concurrency = 8;

for (let offset = 0; offset < codepoints.length; offset += concurrency) {
  const batch = codepoints.slice(offset, offset + concurrency);
  const results = await Promise.allSettled(batch.map(download));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") records.push(result.value);
    else failures.push(`${batch[index]}: ${String(result.reason)}`);
  });
  console.log(`${Math.min(offset + concurrency, codepoints.length)}/${codepoints.length}`);
}

const manifest = {
  provider: providerName,
  version: config.version,
  source: config.source,
  license: config.license,
  licenseUrl: config.licenseUrl,
  generatedAt: previousManifest.generatedAt ?? new Date().toISOString(),
  assets: records.sort((a, b) => a.codepoint.localeCompare(b.codepoint)),
  failures,
};

function renderAssetIndex(assetIds: readonly string[]): string {
  const sorted = [...new Set(assetIds)].sort();
  return [
    "/** Auto-generated from the verified Twemoji manifest. Do not edit. */",
    `export const TWEMOJI_ASSET_COUNT = ${sorted.length};`,
    "export const twemojiAssetIds = new Set<string>([",
    ...sorted.map((assetId) => `  ${JSON.stringify(assetId)},`),
    "]);",
    "",
  ].join("\n");
}

await writeFile(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
await writeFile(assetIndexPath, renderAssetIndex(records.map((record) => record.codepoint)), "utf8");

if (failures.length > 0) {
  throw new Error(`Asset sync completed with ${failures.length} missing files`);
}

console.log(`Wrote ${records.length} verified assets to ${outputDirectory}`);
