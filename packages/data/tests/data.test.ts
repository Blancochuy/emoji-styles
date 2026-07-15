import { describe, expect, it } from "vitest";
import { unicodeSequenceFixtures } from "emoji-styles-test-fixtures/unicode";
import {
  emojiData,
  emojiDatasetInfo,
  isRGIEmoji,
  normalizeEmoji,
  toEmojiCodepointSequence,
} from "../src";

describe("Unicode RGI dataset", () => {
  it("records pinned source and generator metadata", () => {
    expect(emojiDatasetInfo).toMatchObject({
      unicodeVersion: "17.0",
      emojiVersion: "17.0",
      cldrVersion: "48",
      generatorVersion: "2.0.0",
      rgiCount: 3953,
      aliasCount: 1272,
    });
    expect(emojiDatasetInfo.sourceUrl).toContain("/17.0.0/emoji/emoji-test.txt");
    expect(emojiDatasetInfo.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each(unicodeSequenceFixtures)("supports $type sequences", ({ emoji, codepoint }) => {
    expect(isRGIEmoji(emoji)).toBe(true);
    expect(normalizeEmoji(emoji)).toBe(emoji);
    expect(toEmojiCodepointSequence(emoji)).toBe(codepoint);
    expect(emojiData[emoji]).toMatchObject({
      codepoint,
      sequence: codepoint,
      unicodeVersion: "17.0",
    });
    expect(emojiData[emoji].codepoints.join("-")).toBe(codepoint);
  });

  it("normalizes omitted emoji variation selectors without calling them RGI", () => {
    expect(isRGIEmoji("❤")).toBe(false);
    expect(normalizeEmoji("❤")).toBe("❤️");
  });

  it("rejects empty, text, and text-presentation input", () => {
    expect(normalizeEmoji("")).toBeNull();
    expect(normalizeEmoji("hello")).toBeNull();
    expect(normalizeEmoji("❤︎")).toBeNull();
  });
});
