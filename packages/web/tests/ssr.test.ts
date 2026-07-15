// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defineEmojiTheme, publicProviders } from "emoji-styles";
import {
  renderEmojiToHTML,
  renderEmojiToHTMLResult,
  renderEmojiTokenToHTML,
  renderPreloadLink,
} from "../src";

describe("SSR renderer", () => {
  it("renders deterministic, CSP-friendly and escaped image markup", async () => {
    const html = await renderEmojiToHTML("🚀", {
      provider: publicProviders.fluent3d,
      label: `Deploy <now> & "ship"`,
      size: 24,
      loading: "eager",
    });

    expect(html).toContain("<span class=\"styled-emoji\"");
    expect(html).toContain("rocket_3d.png");
    expect(html).toContain("width=\"24\" height=\"24\"");
    expect(html).toContain("Deploy &lt;now&gt; &amp; &quot;ship&quot;");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("<script");
  });

  it("returns native markup when a provider cannot resolve the emoji", async () => {
    const html = await renderEmojiToHTML("💡", {
      provider: publicProviders.fluentAnimated,
      fallbacks: [publicProviders.native],
    });
    expect(html).toContain("data-provider=\"native\"");
    expect(html).toContain("💡");
    expect(html).not.toContain("<img");
  });

  it("renders a hydratable Web Component host on request", async () => {
    const html = await renderEmojiToHTML("🚀", {
      provider: "fluent-3d",
      element: "styled-emoji",
      size: 24,
    });
    expect(html).toMatch(/^<styled-emoji /);
    expect(html).toContain("emoji=\"🚀\"");
    expect(html).toContain("provider=\"fluent-3d\"");
    expect(html).toMatch(/<\/styled-emoji>$/);
  });

  it("renders semantic tokens and preload metadata", async () => {
    const theme = defineEmojiTheme({
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy application",
        asset: { url: "/assets/deploy.svg", format: "svg", local: true },
      },
    }, { id: "product", version: "1.0.0" });

    const html = await renderEmojiTokenToHTML("action.deploy", theme, { size: 32 });
    const result = await renderEmojiToHTMLResult("🚀", { provider: "twemoji" });
    expect(html).toContain("/assets/deploy.svg");
    expect(html).toContain("Deploy application");
    expect(result.preload?.type).toBe("image/png");
    expect(renderPreloadLink(result.preload!)).toContain("rel=\"preload\"");
  });
});
