import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { defineEmojiTheme, emojiData, getEmojiMetadata, isEmoji, toEmojiCodepointSequence, validateProviderManifest, type EmojiAssetFormat, type EmojiProviderManifest } from "emoji-styles";
import { validateAssetCollection } from "./validate";
import type { AssetMappingEntry, BuildProviderOptions, BuiltProvider } from "./types";

const RASTER_EXTENSIONS = new Set([".png", ".webp", ".avif"]);

function unicodeIndex(): Map<string, string> {
  const result = new Map<string, string>();
  for (const emoji of Object.keys(emojiData)) {
    const codepoints = toEmojiCodepointSequence(emoji);
    result.set(codepoints, emoji);
    result.set(codepoints.replace(/-fe0f/g, ""), emoji);
  }
  return result;
}

function normalizedStem(file: string): string {
  return basename(file, extname(file)).toLowerCase().replace(/^emoji[_-]u?/, "").replace(/_/g, "-").replace(/-fe0f/g, "");
}

function safeRelativeFile(file: string): boolean {
  return Boolean(file) && !file.startsWith("/") && !file.includes("\\") && !file.split("/").includes("..") && !/^[a-z][a-z0-9+.-]*:/i.test(file);
}

export async function buildProviderArtifacts(options: BuildProviderOptions): Promise<BuiltProvider> {
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(options.id)) throw new Error("Provider id must be a safe lowercase identifier");
  if (!options.license?.name && !options.license?.ownership && !options.provenance.license && !options.provenance.ownership) throw new Error("Asset ownership or license must be declared; the pipeline never infers rights");
  if (options.provenance.generated && !options.provenance.generator?.model) throw new Error("Generated assets require a recorded generator model");
  const entries = await readdir(options.directory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && RASTER_EXTENSIONS.has(extname(entry.name).toLowerCase())).map((entry) => entry.name).sort();
  if (!files.length) throw new Error("No PNG, WebP, or AVIF assets found");
  const formats = new Set(files.map((file) => extname(file).slice(1).toLowerCase()));
  if (formats.size !== 1) throw new Error("Provider output must use one normalized raster format");
  const collection = await validateAssetCollection(files.map((file) => join(options.directory, file)));
  const errors = collection.issues.filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(`Asset validation failed: ${errors.map((issue) => `${basename(issue.path ?? "asset")}: ${issue.code}: ${issue.message}`).join("; ")}`);
  const dimensions = new Set(collection.assets.map((asset) => `${asset.inspection!.width}x${asset.inspection!.height}`));
  if (dimensions.size !== 1) throw new Error("Provider assets must share the same canvas dimensions");
  const mappings = new Map<string, AssetMappingEntry>();
  for (const mapping of options.mapping ?? []) {
    if (!safeRelativeFile(mapping.file)) throw new Error(`Unsafe mapping path: ${mapping.file}`);
    if (!files.includes(mapping.file)) throw new Error(`Mapping references missing asset: ${mapping.file}`);
    if (mappings.has(mapping.file)) throw new Error(`Duplicate mapping: ${mapping.file}`);
    mappings.set(mapping.file, mapping);
  }
  const reverse = unicodeIndex();
  const assets: EmojiProviderManifest["assets"] = {};
  const tokens: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const [index, file] of files.entries()) {
    const mapped = mappings.get(file);
    const emoji = mapped?.emoji ?? reverse.get(normalizedStem(file));
    if (!emoji) throw new Error(`Missing Unicode emoji fallback for ${file}; provide mapping.emoji or a Unicode codepoint filename`);
    if (!isEmoji(emoji)) throw new Error(`Invalid Unicode emoji fallback for ${file}; expected exactly one emoji grapheme`);
    const inspection = collection.assets[index].inspection!;
    if (Object.prototype.hasOwnProperty.call(assets, emoji)) throw new Error(`Duplicate emoji mapping: ${emoji}`);
    assets[emoji] = { file, sha256: inspection.sha256, width: inspection.width, height: inspection.height };
    if (mapped?.token) {
      if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(mapped.token)) throw new Error(`Invalid semantic token: ${mapped.token}`);
      if (Object.prototype.hasOwnProperty.call(tokens, mapped.token)) throw new Error(`Duplicate semantic token mapping: ${mapped.token}`);
      tokens[mapped.token] = emoji;
      labels[mapped.token] = mapped.label ?? getEmojiMetadata(emoji)?.label ?? mapped.token;
    }
  }
  const format = [...formats][0] as EmojiAssetFormat;
  const manifest: EmojiProviderManifest = {
    $schema: "https://emoji.style/schemas/emoji-provider.schema.json",
    id: options.id,
    label: options.label ?? options.id.split(/[._-]/).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "),
    version: options.version ?? "1.0.0",
    format,
    basePath: options.basePath ?? "./assets",
    generated: options.provenance.generated,
    ...(options.provenance.generated ? { generator: { type: options.provenance.generator?.type ?? "unknown", model: options.provenance.generator?.model ?? "unknown", createdAt: options.provenance.createdAt } } : {}),
    ...(options.license ? { license: options.license } : {}),
    ...(options.provenance.source ? { source: options.provenance.source } : {}),
    assets,
  };
  const validation = validateProviderManifest(manifest);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  return {
    manifest,
    provenance: options.provenance,
    providerModule: renderProviderModule(),
    ...(Object.keys(tokens).length ? { themeModule: renderThemeModule(tokens, { id: options.id, version: manifest.version, labels }) } : {}),
    licenseDocument: renderLicenseDocument(manifest),
    readme: renderProviderReadme(manifest, Object.keys(tokens)),
  };
}

export function renderProviderModule(): string {
  return `import { createManifestProvider, type EmojiProviderManifest } from "emoji-styles";\nimport manifest from "./emoji-provider.json" with { type: "json" };\n\nexport const emojiProvider = createManifestProvider(manifest as EmojiProviderManifest);\n`;
}

export function renderThemeModule(tokens: Record<string, string>, options: { id?: string; version?: string; labels?: Record<string, string> } = {}): string {
  const theme = defineEmojiTheme(Object.fromEntries(Object.entries(tokens).map(([token, emoji]) => [token, {
    emoji, label: options.labels?.[token] ?? getEmojiMetadata(emoji)?.label ?? token,
  }])), { id: options.id ?? "custom-local", version: options.version ?? "1.0.0" });
  return `import { defineEmojiTheme } from "emoji-styles";\nimport { emojiProvider } from "./provider";\n\nexport const emojiTheme = defineEmojiTheme(${JSON.stringify(theme.tokens, null, 2)}, {\n  id: ${JSON.stringify(theme.id)},\n  version: ${JSON.stringify(theme.version)},\n  defaultProvider: emojiProvider,\n});\n`;
}

function renderLicenseDocument(manifest: EmojiProviderManifest): string {
  const license = manifest.license;
  return `# Asset license\n\n- Provider: ${manifest.label} (${manifest.id})\n- Asset license: ${license?.name ?? "Not declared"}\n- Ownership: ${license?.ownership ?? "Not declared"}\n- Source: ${manifest.source ?? "Not declared"}\n\nThis notice covers artwork in this provider. Emoji Styles source code remains licensed separately.\n`;
}

function renderProviderReadme(manifest: EmojiProviderManifest, tokens: string[]): string {
  return `# ${manifest.label}\n\nDeterministic Emoji Styles provider containing ${Object.keys(manifest.assets).length} reviewed asset(s).\n\n- Version: ${manifest.version}\n- Format: ${manifest.format}\n- Generated: ${manifest.generated ? "yes" : "no"}\n- Semantic tokens: ${tokens.length}\n\nValidate this pack with \`emoji-styles assets validate ./assets --size ${Object.values(manifest.assets)[0]?.width ?? 256} --format ${manifest.format}\`. Review \`LICENSE.md\` and \`PROVENANCE.json\` before redistribution.\n`;
}
