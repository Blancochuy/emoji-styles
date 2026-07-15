import { describe, expect, it } from "vitest";
import { createCdnProvider } from "../src/providers";
import { unicodeSequenceFixtures } from "emoji-styles-test-fixtures/unicode";
import { getEmojiData, getEmojiUrl, getFallbackChain, hasEmoji } from "../src/url";

describe("emoji URL API", () => {
  it("builds provider URLs", () => {
    expect(getEmojiUrl("🚀", "noto")).toContain("/png/128/emoji_u1f680.png");
    expect(getEmojiUrl("🚀", "fluent-3d")).toContain("/assets/Rocket/3D/rocket_3d.png");
  });

  it("uses official Fluent paths when CLDR labels differ", () => {
    expect(getEmojiUrl("🌑", "fluent-color")).toContain(
      "/assets/New%20moon/Color/new_moon_color.svg",
    );
    expect(getEmojiUrl("🚄", "fluent-flat")).toContain(
      "/assets/High-speed%20train/Flat/high-speed_train_flat.svg",
    );
  });

  it("removes variation selectors from Twemoji paths", () => {
    expect(getEmojiUrl("❤️", "twemoji")).toContain("/2764.png");
  });

  it("keeps variation selectors in Twemoji ZWJ paths", () => {
    expect(getEmojiUrl("👩‍⚕️", "twemoji")).toContain("/1f469-200d-2695-fe0f.png");
  });

  it("uses Twemoji's legacy unqualified filename for eye in speech bubble", () => {
    expect(getEmojiUrl("👁️‍🗨️", "twemoji")).toContain("/1f441-200d-1f5e8.png");
  });

  it.each(unicodeSequenceFixtures)("resolves complete $type metadata and provider paths", ({ emoji, codepoint }) => {
    expect(hasEmoji(emoji)).toBe(true);
    expect(getEmojiData(emoji)?.codepoint).toBe(codepoint);
    expect(getEmojiUrl(emoji, "twemoji")).toContain(
      `/${codepoint.includes("-200d-") ? codepoint : codepoint.replace(/-fe0f/g, "")}.png`,
    );
    expect(getEmojiUrl(emoji, "noto")).toContain(
      `/emoji_u${codepoint.replace(/-fe0f/g, "").replace(/-/g, "_")}.png`,
    );
  });

  it("resolves unqualified aliases through canonical provider paths", () => {
    expect(hasEmoji("❤")).toBe(true);
    expect(getEmojiData("❤")?.codepoint).toBe("2764-fe0f");
    expect(getEmojiUrl("❤", "twemoji")).toContain("/2764.png");
  });

  it("returns null for unknown emojis", () => {
    expect(hasEmoji("not-an-emoji")).toBe(false);
    expect(getEmojiUrl("not-an-emoji", "noto")).toBeNull();
  });

  it("includes Twemoji as a fallback", () => {
    expect(getFallbackChain("🚀", "noto")[1]).toContain("twemoji");
  });

  it("keeps native rendering native without a CDN fallback", () => {
    expect(getEmojiUrl("🚀", "native")).toBeNull();
    expect(getFallbackChain("🚀", "native")).toEqual([]);
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
