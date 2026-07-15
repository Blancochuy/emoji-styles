import { emojiData, emojiDatasetInfo, normalizeEmoji } from "emoji-styles-data";
import { tokenizeEmojiText } from "./tokenize";
import type {
  EmojiAssetFormat,
  EmojiAssetProvider,
  NormalizedEmoji,
  ProviderCoverage,
  ProviderLicense,
  ProviderValidationResult,
  ResolvedEmojiAsset,
} from "./types";

export interface EmojiProviderManifestAsset {
  file: string;
  sha256?: string;
  width?: number;
  height?: number;
}

export interface EmojiProviderGenerator {
  type: string;
  model: string;
  createdAt: string;
}

export interface EmojiProviderManifest {
  $schema?: string;
  id: string;
  label: string;
  version: string;
  format: EmojiAssetFormat;
  basePath: string;
  generated?: boolean;
  generator?: EmojiProviderGenerator;
  license?: ProviderLicense;
  source?: string;
  assets: Record<string, EmojiProviderManifestAsset>;
}

export interface ManifestProviderOptions {
  baseUrl?: string;
  visibility?: "public" | "custom";
  local?: boolean;
}

function isSafeRelativeAssetPath(file: string): boolean {
  return typeof file === "string" && Boolean(file) &&
    !file.startsWith("/") &&
    !file.includes("\\") &&
    !file.split("/").includes("..") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(file);
}

function isSafeBasePath(basePath: string): boolean {
  if (typeof basePath !== "string" || !basePath.trim()) return false;
  const scheme = basePath.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || scheme === "http" || scheme === "https";
}

export function validateProviderManifest(
  manifest: EmojiProviderManifest,
): ProviderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!manifest.id?.trim()) errors.push("Manifest id is required");
  else if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(manifest.id)) {
    errors.push("Manifest id must use lowercase letters, numbers, dots, underscores, or hyphens");
  }
  if (!manifest.label?.trim()) errors.push("Manifest label is required");
  if (!manifest.version?.trim()) errors.push("Manifest version is required");
  if (!manifest.basePath?.trim()) errors.push("Manifest basePath is required");
  else if (!isSafeBasePath(manifest.basePath)) errors.push("Manifest basePath must be relative, HTTP, or HTTPS");
  if (!["png", "svg", "webp", "avif"].includes(manifest.format)) {
    errors.push("Manifest format must be png, svg, webp, or avif");
  }
  if (!manifest.assets || typeof manifest.assets !== "object" || Array.isArray(manifest.assets)) {
    errors.push("Manifest assets must be an object");
  } else {
    const normalizedKeys = new Set<string>();
    for (const [emoji, asset] of Object.entries(manifest.assets)) {
      if (!emoji.trim()) {
        errors.push("Manifest asset keys cannot be empty");
      } else {
        const tokens = tokenizeEmojiText(emoji);
        if (tokens.length !== 1 || tokens[0]?.type !== "emoji" || tokens[0].value !== emoji) {
          errors.push(`Invalid emoji asset key: ${emoji}`);
        }
      }
      const normalized = normalizeEmoji(emoji) ?? emoji.normalize("NFC");
      if (normalizedKeys.has(normalized)) errors.push(`Duplicate normalized emoji asset key: ${emoji}`);
      normalizedKeys.add(normalized);
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
        errors.push(`Invalid asset record for ${emoji}`);
        continue;
      }
      if (!isSafeRelativeAssetPath(asset.file)) errors.push(`Unsafe asset path for ${emoji}`);
      if (asset.sha256 && !/^[a-f0-9]{64}$/i.test(asset.sha256)) {
        errors.push(`Invalid SHA-256 for ${emoji}`);
      }
      if (asset.width !== undefined && (!Number.isInteger(asset.width) || asset.width <= 0)) {
        errors.push(`Invalid width for ${emoji}`);
      }
      if (asset.height !== undefined && (!Number.isInteger(asset.height) || asset.height <= 0)) {
        errors.push(`Invalid height for ${emoji}`);
      }
    }
  }
  if (manifest.generated) {
    if (!manifest.generator) errors.push("Generated manifests require generator provenance");
    if (!manifest.generator?.type?.trim()) errors.push("Generated manifests require a generator type");
    if (!manifest.generator?.model?.trim()) errors.push("Generated manifests require a recorded model");
    if (!manifest.generator?.createdAt || Number.isNaN(Date.parse(manifest.generator.createdAt))) {
      errors.push("Generated manifests require a valid generator createdAt timestamp");
    }
    if (!manifest.license?.ownership) warnings.push("Generated manifests should record asset ownership");
  }
  if (!manifest.license) warnings.push("Manifest does not declare an asset license");
  return { valid: errors.length === 0, errors, warnings };
}

function joinAssetUrl(basePath: string, file: string): string {
  return `${basePath.replace(/\/$/, "")}/${file.replace(/^\//, "")}`;
}

export function createManifestProvider(
  manifest: EmojiProviderManifest,
  options: ManifestProviderOptions = {},
): EmojiAssetProvider {
  const validation = validateProviderManifest(manifest);
  if (!validation.valid) throw new Error(validation.errors.join("; "));

  const assets = new Map<string, EmojiProviderManifestAsset>();
  for (const [input, asset] of Object.entries(manifest.assets)) {
    assets.set(normalizeEmoji(input) ?? input.normalize("NFC"), asset);
  }
  const basePath = options.baseUrl ?? manifest.basePath;
  if (!isSafeBasePath(basePath)) throw new Error("Provider base URL must be relative, HTTP, or HTTPS");
  const local = options.local ?? !/^https?:\/\//i.test(basePath);

  const resolveAsset = (emoji: NormalizedEmoji): ResolvedEmojiAsset | null => {
    const asset = assets.get(emoji.normalized);
    if (!asset) return null;
    return {
      providerId: manifest.id,
      providerVersion: manifest.version,
      url: joinAssetUrl(basePath, asset.file),
      format: manifest.format,
      local,
      width: asset.width,
      height: asset.height,
      checksum: asset.sha256,
      license: manifest.license,
    };
  };

  return {
    id: manifest.id,
    label: manifest.label,
    version: manifest.version,
    formats: [manifest.format],
    local,
    source: manifest.source,
    visibility: options.visibility ?? "custom",
    license: manifest.license,
    supportsUnknownEmoji: true,
    getUrl(data, input) {
      const normalized = input ? normalizeEmoji(input) ?? input.normalize("NFC") : null;
      const asset = normalized ? assets.get(normalized) : undefined;
      return asset ? joinAssetUrl(basePath, asset.file) : null;
    },
    resolve: resolveAsset,
    getCoverage(): ProviderCoverage {
      const supported = [...assets.keys()].filter((emoji) => emoji in emojiData).length;
      const total = Object.keys(emojiData).length;
      return {
        providerId: manifest.id,
        providerVersion: manifest.version,
        datasetVersion: emojiDatasetInfo.emojiVersion,
        total,
        supported,
        percentage: Number(((supported / total) * 100).toFixed(2)),
        verified: true,
        source: manifest.source,
      };
    },
  };
}

export function createGeneratedProvider(
  manifest: EmojiProviderManifest,
  options?: ManifestProviderOptions,
): EmojiAssetProvider {
  if (!manifest.generated) throw new Error("Generated providers require generated: true");
  return createManifestProvider(manifest, options);
}
