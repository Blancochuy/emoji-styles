import { useMemo } from "react";
import { getEmojiUrl, hasEmoji, type EmojiStyle } from "emoji-styles";

export function useEmoji(emoji: string, style: EmojiStyle = "microsoft-teams") {
  return useMemo(() => ({ url: getEmojiUrl(emoji, style), exists: hasEmoji(emoji) }), [emoji, style]);
}
