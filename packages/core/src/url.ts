import type { EmojiAssetProvider, EmojiProviderRef, EmojiStyle } from "./types";
import { providers, publicProviders } from "./providers";
import { emojiData } from "./data";

export function resolveProvider(provider: EmojiProviderRef): EmojiAssetProvider | null {
  return typeof provider === "string" ? providers[provider] ?? null : provider;
}

/** Resolve an emoji through a built-in style or a custom asset provider. */
export function getEmojiUrl(emoji: string, providerRef: EmojiProviderRef): string | null {
  const data = emojiData[emoji];
  const provider = resolveProvider(providerRef);
  if (!data || !provider) return null;
  if (typeof providerRef === "string" && data.unsupported?.includes(providerRef)) return null;
  return provider.getUrl(data);
}

/**
 * Build a fallback chain. The default fallback is the publicly licensed Twemoji
 * provider; callers can supply their own ordered provider list.
 */
export function getFallbackChain(
  emoji: string,
  primary: EmojiProviderRef,
  fallbacks: readonly EmojiProviderRef[] = [publicProviders.twemoji],
): string[] {
  if (!emojiData[emoji]) return [];
  const refs = [primary, ...fallbacks];
  const urls: string[] = [];
  for (const ref of refs) {
    const url = getEmojiUrl(emoji, ref);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function hasEmoji(emoji: string): boolean {
  return emoji in emojiData;
}

export function getAvailableEmojis(): string[] {
  return Object.keys(emojiData);
}

export function getEmojiData(emoji: string) {
  return emojiData[emoji] ?? null;
}
