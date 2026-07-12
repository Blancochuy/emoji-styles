import { describe, expect, it } from "vitest";
import { createCdnProvider } from "../src/providers";
import { getEmojiUrl, getFallbackChain, hasEmoji } from "../src/url";

describe("emoji URL API", () => {
  it("builds provider URLs", () => {
    expect(getEmojiUrl("🚀", "apple")).toBe(
      "https://em-content.zobj.net/source/apple/453/rocket_1f680.png",
    );
  });

  it("removes variation selectors from Twemoji paths", () => {
    expect(getEmojiUrl("❤️", "twemoji")).toContain("/2764.png");
  });

  it("returns null for unknown emojis", () => {
    expect(hasEmoji("not-an-emoji")).toBe(false);
    expect(getEmojiUrl("not-an-emoji", "apple")).toBeNull();
  });

  it("includes Twemoji as a fallback", () => {
    expect(getFallbackChain("🚀", "apple")[1]).toContain("twemoji");
  });

  it("supports custom asset providers", () => {
    const provider = createCdnProvider({
      id: "company",
      label: "Company",
      baseUrl: "https://assets.example.com/emoji/v1",
      extension: "webp",
      visibility: "custom",
    });
    expect(getEmojiUrl("🚀", provider)).toBe(
      "https://assets.example.com/emoji/v1/rocket_1f680.webp",
    );
  });
});
