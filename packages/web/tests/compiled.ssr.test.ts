// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileEmojiTheme, defineEmojiTheme, getEmojiUrl } from "emoji-styles";
import { renderEmojiToHTML } from "../src/ssr";
import type { CompiledEmojiTheme } from "emoji-styles/compiled";
import { renderCompiledEmojiTokenToHTML, renderCompiledEmojiTokenToHTMLResult, renderPreloadLink } from "../src/compiled";

const edges: CompiledEmojiTheme<"status.native" | "status.empty" | "action.label"> = {
  schemaVersion: 1,
  meta: { theme: { id: "edge", version: "1.0.0" }, nativeFallback: true, dataset: { emojiVersion: "17.0", unicodeVersion: "17.0", cldrVersion: "48", sourceSha256: "0" }, providers: [] },
  tokens: {
    "status.native": { emoji: "✅", label: "Done", decorative: false, unicode: "✅", sources: [] },
    "status.empty": { emoji: "🔥", label: "Hot", decorative: false, unicode: null, sources: [] },
    "action.label": { emoji: "🚀", label: `Deploy <now> & "ship"`, decorative: false, unicode: null, sources: [{ provider: "twemoji", url: "https://cdn.test/a.svg?x=1&y=2", format: "svg" }] },
  },
};

describe("compiled web SSR", () => {
  it("renders the first source with ordered fallbacks and a hidden native glyph, without browser globals", async () => {
    expect(typeof document).toBe("undefined");
    const theme = await compileEmojiTheme(defineEmojiTheme({
      "action.deploy": { emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" } },
    }, { id: "app", defaultProvider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: true }));
    const result = renderCompiledEmojiTokenToHTMLResult("action.deploy", theme, { size: 24, locale: "es-MX", className: "nav-icon", loading: "eager" });
    expect(result.source?.url).toBe(getEmojiUrl("🚀", "fluent-3d"));
    expect(result.fallbackUrls).toEqual([getEmojiUrl("🚀", "twemoji")]);
    expect(result.html).toContain('class="styled-emoji nav-icon" data-emoji-compiled data-emoji-token="action.deploy" data-emoji-theme="app"');
    expect(result.html).toContain('role="img" aria-label="Desplegar"');
    expect(result.html).toContain(`src="${getEmojiUrl("🚀", "fluent-3d")}" alt="Desplegar" width="24" height="24" loading="eager"`);
    expect(result.html).toContain(`data-fallbacks="${JSON.stringify([{ provider: "twemoji", url: getEmojiUrl("🚀", "twemoji") }]).replace(/"/g, "&quot;")}"`);
    expect(result.html).toContain('<span class="styled-emoji__native" hidden aria-hidden="true"><svg class="styled-emoji__native-glyph" width="24"');
    expect(result.preload).toEqual({ href: getEmojiUrl("🚀", "fluent-3d"), as: "image", type: "image/png" });
    expect(result.html).not.toMatch(/style=|<script|\son[a-z]+=/);
  });

  it("covers labels, decorative tokens, Unicode-only, empty and unknown tokens", () => {
    const escaped = renderCompiledEmojiTokenToHTML("action.label", edges);
    expect(escaped).toContain('aria-label="Deploy &lt;now&gt; &amp; &quot;ship&quot;"');
    expect(escaped).toContain('src="https://cdn.test/a.svg?x=1&amp;y=2"');
    expect(escaped).toContain('<span class="styled-emoji__native" hidden aria-hidden="true"></span>');
    expect(renderPreloadLink(renderCompiledEmojiTokenToHTMLResult("action.label", edges).preload!)).toContain('type="image/svg+xml"');

    const decorative = renderCompiledEmojiTokenToHTML("action.label", edges, { decorative: true, label: "Ignored" });
    expect(decorative).toContain('aria-hidden="true"><img');
    expect(decorative).toContain('alt=""');
    expect(decorative).not.toContain("role=");

    const native = renderCompiledEmojiTokenToHTML("status.native", edges);
    expect(native).toContain('data-provider="native" role="img" aria-label="Done"');
    expect(native).not.toContain("<img");
    expect(native).toContain('<span class="styled-emoji__native" aria-hidden="true"><svg');

    const empty = renderCompiledEmojiTokenToHTML("status.empty", edges);
    expect(empty).toContain('data-provider="unresolved" aria-hidden="true"');

    const unknown = renderCompiledEmojiTokenToHTMLResult("action.missing" as "action.label", edges);
    expect(unknown).toMatchObject({ emoji: null, source: null, html: '<span data-emoji-token="action.missing" data-emoji-error="Unknown emoji token">action.missing</span>' });
  });

  it("normalizes runtime loading values instead of inserting attributes into SSR markup", async () => {
    // JavaScript callers and data-driven templates do not have TypeScript's union guard.
    const loading = 'lazy" onerror="alert(1)' as "lazy";
    for (const html of [
      renderCompiledEmojiTokenToHTML("action.label", edges, { loading }),
      await renderEmojiToHTML("🚀", { provider: "twemoji", loading }),
      await renderEmojiToHTML("🚀", { provider: "twemoji", loading, element: "styled-emoji" }),
    ]) {
      expect(html).toContain('loading="lazy"');
      expect(html).not.toMatch(/\sonerror=/);
      expect(html).not.toContain("alert(1)");
    }
  });

  it("keeps the compiled entry free of the package root, the catalog and the full renderer", () => {
    const read = (file: string) => readFileSync(resolve(__dirname, "../src", file), "utf8");
    for (const file of ["compiled.ts", "html.ts"]) {
      const imports = [...read(file).matchAll(/^import[^;]*?from "([^"]+)"/gm)].map((match) => match[1]);
      expect(imports.every((specifier) => specifier === "emoji-styles/compiled" || specifier === "./html"), `${file}: ${imports.join(", ")}`).toBe(true);
    }
  });
});
