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
  if (!provider) return null;
  if (!data) {
    if (!provider.supportsUnknownEmoji) return null;
    const codepoint = Array.from(emoji, (char) => char.codePointAt(0)!.toString(16)).join("-");
    return provider.getUrl({ name: `emoji_${codepoint}`, alt: emoji, codepoint }, emoji);
  }
  if (typeof providerRef === "string" && data.unsupported?.includes(providerRef)) return null;
  return provider.getUrl(data, emoji);
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
  if (resolveProvider(primary)?.id === "native") return [];
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
