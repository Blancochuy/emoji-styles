import type { EmojiStyle } from "./types";
import { providers } from "./providers";
import { emojiData } from "./data";

/**
 * Get the image URL for an emoji character in a given style.
 * Returns null if the emoji is not mapped.
 */
export function getEmojiUrl(emoji: string, style: EmojiStyle): string | null {
  const data = emojiData[emoji];
  if (!data) return null;
  if (data.unsupported?.includes(style)) return null;

  const provider = providers[style];
  if (!provider) return null;

  if (style === "twemoji") {
    // Twemoji CDN doesn't use variation selectors (FE0F) in filenames
    const codepoint = data.codepoint.replace(/-fe0f/gi, "");
    return `${provider.baseUrl}/${codepoint}.${provider.extension}`;
  }

  return `${provider.baseUrl}/${data.name}.${provider.extension}`;
}

/**
 * Get the fallback chain for an emoji.
 * Returns URLs in priority order: requested style -> static alternatives.
 */
export function getFallbackChain(emoji: string, style: EmojiStyle): string[] {
  const primary = getEmojiUrl(emoji, style);
  if (!primary) return [];

  const chain: string[] = [primary];

  // Always add twemoji as a reliable fallback (CDN never returns 403)
  if (style !== "twemoji") {
    const twemojiUrl = getEmojiUrl(emoji, "twemoji");
    if (twemojiUrl && twemojiUrl !== primary) chain.push(twemojiUrl);
  }

  if (style === "animated" || style === "animated-noto" || style === "animated-fluent") {
    const staticFallbacks: EmojiStyle[] = ["microsoft-teams", "apple", "google"];
    for (const fb of staticFallbacks) {
      const url = getEmojiUrl(emoji, fb);
      if (url && url !== primary && !chain.includes(url)) chain.push(url);
    }
  }

  const data = emojiData[emoji];
  if (data?.unsupported?.includes(style)) {
    const alternatives: EmojiStyle[] = ["microsoft-teams", "apple", "google", "twemoji"];
    for (const alt of alternatives) {
      if (alt === style) continue;
      const url = getEmojiUrl(emoji, alt);
      if (url && !chain.includes(url)) chain.push(url);
    }
  }

  return chain;
}

/** Check if an emoji exists in our data mapping. */
export function hasEmoji(emoji: string): boolean {
  return emoji in emojiData;
}

/** Get all available emoji characters. */
export function getAvailableEmojis(): string[] {
  return Object.keys(emojiData);
}

/** Get emoji metadata. */
export function getEmojiData(emoji: string) {
  return emojiData[emoji] ?? null;
}
