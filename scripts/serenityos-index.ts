export function assertSerenityOSRevision(actual: string, expected: string): void {
  const revision = actual.trim();
  if (revision !== expected) {
    throw new Error(`Expected SerenityOS/serenity@${expected}, found ${revision}`);
  }
}

export function toSerenityOSAssetId(codepoint: string): string {
  return codepoint
    .toUpperCase()
    .split("-")
    .filter((value) => value !== "FE0F")
    .map((value) => `U+${value}`)
    .join("_");
}

export function collectSerenityOSAssetIds(
  assetFiles: readonly string[],
  codepoints: readonly string[],
): string[] {
  const upstreamIds = new Set(
    assetFiles
      .filter((file) => file.endsWith(".png"))
      .map((file) => file.slice(0, -4)),
  );
  return [...new Set(codepoints.map(toSerenityOSAssetId))]
    .filter((id) => upstreamIds.has(id))
    .sort((left, right) => left.localeCompare(right));
}

export function renderSerenityOSData(
  assetIds: readonly string[],
  revision: string,
  datasetVersion: string,
): string {
  const sorted = [...new Set(assetIds)].sort((left, right) => left.localeCompare(right));
  return [
    "/**",
    " * Generated from SerenityOS pixel art emoji filenames.",
    ` * Source revision: ${revision}`,
    ` * Emoji Styles dataset: Unicode Emoji ${datasetVersion}`,
    " * Run: pnpm --filter emoji-styles-scripts generate:serenityos -- <serenity checkout>",
    " */",
    `export const SERENITYOS_RGI_ASSET_COUNT = ${sorted.length};`,
    `export const SERENITYOS_DATASET_VERSION = ${JSON.stringify(datasetVersion)};`,
    "export const serenityOSAssetIds = new Set<string>([",
    ...sorted.map((assetId) => `  ${JSON.stringify(assetId)},`),
    "]);",
    "",
  ].join("\n");
}
