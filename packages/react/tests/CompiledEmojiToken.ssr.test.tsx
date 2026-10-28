// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CompiledEmojiTheme } from "emoji-styles/compiled";
import { CompiledEmojiToken } from "../src/CompiledEmojiToken";

const theme: CompiledEmojiTheme<"action.deploy" | "reaction.fire"> = {
  schemaVersion: 1,
  meta: { theme: { id: "ssr", version: "1.0.0" }, nativeFallback: true, dataset: { emojiVersion: "16.0", unicodeVersion: "16.0", cldrVersion: "47", sourceSha256: "0" }, providers: [] },
  tokens: {
    "action.deploy": { emoji: "🚀", label: "Deploy", decorative: false, unicode: "🚀", sources: [{ provider: "twemoji", url: "https://cdn.test/rocket.png", format: "png" }] },
    "reaction.fire": { emoji: "🔥", label: "Fire", decorative: true, unicode: null, sources: [] },
  },
};

describe("CompiledEmojiToken SSR", () => {
  it("renders on the server without browser globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = renderToString(<><CompiledEmojiToken token="action.deploy" theme={theme} size="xl" /><CompiledEmojiToken token="reaction.fire" theme={theme} /></>);
    expect(html).toContain('src="https://cdn.test/rocket.png"');
    expect(html).toContain('alt="Deploy"');
    expect(html).toContain('width="32"');
    expect(html).toContain("emoji-styles--hidden");
    expect(html).not.toContain("style=");
  });
});
