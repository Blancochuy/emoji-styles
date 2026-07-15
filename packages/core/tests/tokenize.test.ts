import { describe, expect, it } from "vitest";
import { tokenizeEmojiText } from "../src/tokenize";

describe("tokenizeEmojiText", () => {
  it("preserves text while extracting adjacent emoji", () => {
    expect(tokenizeEmojiText("Ship 🚀🔥 now")).toEqual([
      { type: "text", value: "Ship " },
      { type: "emoji", value: "🚀" },
      { type: "emoji", value: "🔥" },
      { type: "text", value: " now" },
    ]);
  });

  it("prefers complete variation-selector sequences", () => {
    expect(tokenizeEmojiText("Made with ❤️")).toEqual([
      { type: "text", value: "Made with " },
      { type: "emoji", value: "❤️" },
    ]);
  });

  it("keeps ZWJ sequences and skin tones as complete graphemes", () => {
    expect(tokenizeEmojiText("Code 👨‍💻 ship 👍🏽")).toEqual([
      { type: "text", value: "Code " },
      { type: "emoji", value: "👨‍💻" },
      { type: "text", value: " ship " },
      { type: "emoji", value: "👍🏽" },
    ]);
  });

  it("keeps flags, keycaps, families, and tag sequences complete", () => {
    const tagFlag = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
    expect(tokenizeEmojiText(`🇲🇽 1️⃣ 👨‍👩‍👧‍👦 ${tagFlag}`)).toEqual([
      { type: "emoji", value: "🇲🇽" },
      { type: "text", value: " " },
      { type: "emoji", value: "1️⃣" },
      { type: "text", value: " " },
      { type: "emoji", value: "👨‍👩‍👧‍👦" },
      { type: "text", value: " " },
      { type: "emoji", value: tagFlag },
    ]);
  });

  it("leaves unknown content untouched", () => {
    expect(tokenizeEmojiText("plain text")).toEqual([{ type: "text", value: "plain text" }]);
  });
});
