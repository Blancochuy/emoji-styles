import { useMemo } from "react";
import { getEmojiUrl, hasEmoji, publicProviders, type EmojiProviderRef } from "emoji-styles";

export function useEmoji(emoji: string, provider: EmojiProviderRef = publicProviders.twemoji) {
  return useMemo(() => ({ url: getEmojiUrl(emoji, provider), exists: hasEmoji(emoji) }), [emoji, provider]);
}
