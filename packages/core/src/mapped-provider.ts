import { normalizeEmoji } from "emoji-styles-data";
import { tokenizeEmojiText } from "./tokenize";
import type { EmojiAssetProvider, ProviderLicense } from "./types";

export type EmojiAssetMap = Readonly<Record<string, string>>;

export interface MappedProviderOptions {
  id?: string;
  label?: string;
  /** Exact Unicode emoji mapped to an application-owned asset URL. */
  assets: EmojiAssetMap;
  /** Used whenever an emoji has no custom asset. */
  fallback?: EmojiAssetProvider;
  license?: ProviderLicense;
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

  return {
    id: options.id ?? "mapped",
    label: options.label ?? "Custom emoji",
    visibility: "custom",
    license: options.license,
    supportsUnknownEmoji: true,
    getUrl(data, emoji) {
      const customAsset = emoji ? assetsByEmoji.get(emoji) : undefined;
      if (customAsset) return customAsset;
      if (emoji && !normalizeEmoji(emoji) && !options.fallback?.supportsUnknownEmoji) return null;
      return options.fallback?.getUrl(data, emoji) ?? null;
    },
  };
}
