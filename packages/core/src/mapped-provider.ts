import { normalizeEmoji } from "emoji-styles-data";
import { tokenizeEmojiText } from "./tokenize";
import type { EmojiAssetFormat, EmojiAssetProvider, ProviderLicense } from "./types";

export type EmojiAssetMap = Readonly<Record<string, string>>;

export interface MappedProviderOptions {
  id?: string;
  label?: string;
  /** Exact Unicode emoji mapped to an application-owned asset URL. */
  assets: EmojiAssetMap;
  /** Used whenever an emoji has no custom asset. */
  fallback?: EmojiAssetProvider;
  license?: ProviderLicense;
  version?: string;
  source?: string;
  format?: EmojiAssetFormat;
  local?: boolean;
}

/**
 * Create a partial custom provider without requiring a filename convention.
 * Invalid or empty mappings fail immediately so configuration errors surface
 * during application startup instead of as broken images in production.
 */
export function createMappedProvider(options: MappedProviderOptions): EmojiAssetProvider {
  const assetsByEmoji = new Map<string, string>();

  for (const [emoji, url] of Object.entries(options.assets)) {
    const tokens = tokenizeEmojiText(emoji);
    if (tokens.length !== 1 || tokens[0].type !== "emoji" || tokens[0].value !== emoji) {
      throw new Error(`Invalid emoji mapping key: ${emoji}`);
    }
    if (!url.trim()) {
      throw new Error(`Asset URL cannot be empty for emoji: ${emoji}`);
    }
    assetsByEmoji.set(emoji, url);
  }

  const id = options.id ?? "mapped";
  const version = options.version ?? "custom";
  const format = options.format ?? "svg";
  const local = options.local ?? true;
  const getUrl = (data: Parameters<NonNullable<EmojiAssetProvider["getUrl"]>>[0], emoji?: string) => {
    const customAsset = emoji ? assetsByEmoji.get(emoji) : undefined;
    if (customAsset) return customAsset;
    if (emoji && !normalizeEmoji(emoji) && !options.fallback?.supportsUnknownEmoji) return null;
    return options.fallback?.getUrl?.(data, emoji) ?? null;
  };

  return {
    id,
    label: options.label ?? "Custom emoji",
    version,
    formats: [format],
    local,
    source: options.source,
    visibility: "custom",
    license: options.license,
    supportsUnknownEmoji: true,
    getUrl,
    async resolve(emoji) {
      const customAsset = assetsByEmoji.get(emoji.normalized) ?? assetsByEmoji.get(emoji.input);
      if (customAsset) {
        return {
          providerId: id,
          providerVersion: version,
          url: customAsset,
          format,
          local,
          license: options.license,
        };
      }
      if (options.fallback?.resolve) return await options.fallback.resolve(emoji);
      const url = options.fallback?.getUrl?.(emoji.data, emoji.normalized);
      return url ? {
        providerId: options.fallback?.id ?? id,
        providerVersion: options.fallback?.version ?? version,
        url,
        format: options.fallback?.formats?.[0] ?? format,
        local: options.fallback?.local ?? local,
        license: options.fallback?.license ?? options.license,
      } : null;
    },
  };
}
