import { emojiAliases, emojiData } from "emoji-styles-data";

export interface EmojiTextToken {
  type: "emoji" | "text";
  value: string;
}

const candidatesByFirstUnit = new Map<string, string[]>();
for (const emoji of [...Object.keys(emojiData), ...Object.keys(emojiAliases)]) {
  const firstUnit = String.fromCodePoint(emoji.codePointAt(0)!);
  const candidates = candidatesByFirstUnit.get(firstUnit) ?? [];
  candidates.push(emoji);
  candidatesByFirstUnit.set(firstUnit, candidates);
}
for (const candidates of candidatesByFirstUnit.values()) {
  candidates.sort((a, b) => b.length - a.length);
}

interface SegmenterResult { segment: string }
interface SegmenterLike { segment(input: string): Iterable<SegmenterResult> }
interface SegmenterConstructor { new (locales?: string | string[], options?: { granularity: "grapheme" }): SegmenterLike }

const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
const emojiGraphemePattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3/u;

function appendToken(tokens: EmojiTextToken[], token: EmojiTextToken) {
  const previous = tokens[tokens.length - 1];
  if (token.type === "text" && previous?.type === "text") {
    previous.value += token.value;
  } else {
    tokens.push(token);
  }
}

/** Split text into supported emoji graphemes and ordinary text. */
export function tokenizeEmojiText(text: string): EmojiTextToken[] {
  if (!text) return [];

  if (Segmenter) {
    const tokens: EmojiTextToken[] = [];
    const segments = new Segmenter(undefined, { granularity: "grapheme" }).segment(text);
    for (const { segment } of segments) {
      appendToken(tokens, {
        type: emojiGraphemePattern.test(segment) ? "emoji" : "text",
        value: segment,
      });
    }
    return tokens;
  }

  const tokens: EmojiTextToken[] = [];
  let textStart = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const firstUnit = String.fromCodePoint(text.codePointAt(cursor)!);
    const candidates = candidatesByFirstUnit.get(firstUnit);
    const emoji = candidates?.find((candidate) => text.startsWith(candidate, cursor));

    if (!emoji) {
      cursor += firstUnit.length;
      continue;
    }

    if (cursor > textStart) {
      tokens.push({ type: "text", value: text.slice(textStart, cursor) });
    }
    tokens.push({ type: "emoji", value: emoji });
    cursor += emoji.length;
    textStart = cursor;
  }

  if (textStart < text.length) {
    tokens.push({ type: "text", value: text.slice(textStart) });
  }

  return tokens;
}
