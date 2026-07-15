import { emojiAliases, emojiData, emojiDatasetInfo } from "./generated";

export type { EmojiDatasetInfo, EmojiMetadata, EmojiQualification } from "./types";
export { emojiAliases, emojiData, emojiDatasetInfo };

/** Return the canonical fully-qualified RGI form for a supported emoji input. */
export function normalizeEmoji(input: string): string | null {
  if (!input) return null;
  const normalized = input.normalize("NFC");
  if (normalized in emojiData) return normalized;
  return emojiAliases[normalized] ?? null;
}

/** True only when the input itself is an RGI sequence or standalone RGI component. */
export function isRGIEmoji(input: string): boolean {
  return Boolean(input) && input.normalize("NFC") in emojiData;
}

/** Convert arbitrary Unicode input to a lowercase, hyphen-separated scalar sequence. */
export function toEmojiCodepointSequence(input: string): string {
  return Array.from(input.normalize("NFC"), (character) =>
    character.codePointAt(0)!.toString(16),
  ).join("-");
}
