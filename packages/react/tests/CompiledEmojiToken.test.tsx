import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { compileEmojiTheme, defineEmojiTheme } from "emoji-styles";
import type { CompiledEmojiTheme } from "emoji-styles/compiled";
import { CompiledEmojiToken } from "../src/CompiledEmojiToken";

type Name = "action.deploy" | "action.nosources" | "reaction.fire" | "status.hidden";
const meta = { theme: { id: "fixture", version: "1.0.0" }, nativeFallback: true, dataset: { emojiVersion: "16.0", unicodeVersion: "16.0", cldrVersion: "47", sourceSha256: "0" }, providers: [] };
const theme: CompiledEmojiTheme<Name> = {
  schemaVersion: 1,
  meta,
  tokens: {
    "action.deploy": { emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" }, decorative: false, unicode: "🚀", sources: [{ provider: "fluent-3d", url: "https://cdn.test/rocket-3d.png", format: "png" }, { provider: "twemoji", url: "https://cdn.test/rocket-twemoji.png", format: "png" }] },
    "action.nosources": { emoji: "🏠", label: "Home", decorative: false, unicode: "🏠", sources: [] },
    "reaction.fire": { emoji: "🔥", label: "Fire", decorative: true, unicode: null, sources: [{ provider: "twemoji", url: "https://cdn.test/fire.png", format: "png" }] },
    "status.hidden": { emoji: "✅", label: "Success", decorative: false, unicode: null, sources: [{ provider: "twemoji", url: "https://cdn.test/check.png", format: "png" }] },
  },
};

describe("CompiledEmojiToken", () => {
  it("renders the first source, label and size with the existing class names", () => {
    const html = renderToString(<CompiledEmojiToken token="action.deploy" theme={theme} size="lg" lazy={false} />);
    expect(html).toContain('src="https://cdn.test/rocket-3d.png"');
    expect(html).toContain('alt="Deploy"');
    expect(html).toContain('width="24"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('class="emoji-styles emoji-styles--size-lg"');
    expect(html).toContain('data-emoji-token="action.deploy"');
    expect(html).toContain('data-provider="fluent-3d"');
    expect(html).not.toContain("style=");
    expect(renderToString(<CompiledEmojiToken token="action.deploy" theme={theme} />)).toContain('loading="lazy"');
  });

  it("uses the locale label, an explicit label, and hides decorative tokens from assistive technology", () => {
    expect(renderToString(<CompiledEmojiToken token="action.deploy" theme={theme} locale="es-MX" />)).toContain('alt="Desplegar"');
    expect(renderToString(<CompiledEmojiToken token="action.deploy" theme={theme} locale="fr" label="Ship it" />)).toContain('alt="Ship it"');
    const decorative = renderToString(<CompiledEmojiToken token="reaction.fire" theme={theme} />);
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).toContain('alt=""');
    expect(decorative).toContain("emoji-styles--decorative");
    expect(renderToString(<CompiledEmojiToken token="action.deploy" theme={theme} decorative />)).toContain('alt=""');
  });

  it("renders a labelled Unicode glyph when a token has no artwork, and flags unknown tokens", () => {
    const native = renderToString(<CompiledEmojiToken token="action.nosources" theme={theme} size={96} />);
    expect(native).toContain('role="img"');
    expect(native).toContain('aria-label="Home"');
    expect(native).toContain('width="96"');
    expect(native).toContain("emoji-styles--size-custom");
    expect(native).not.toContain("<img");
    const unknown = renderToString(<CompiledEmojiToken token={"nope.token" as Name} theme={theme} />);
    expect(unknown).toContain('data-emoji-error="Unknown emoji token"');
  });

  it("tries the next source on error, then the Unicode fallback", () => {
    const { container } = render(<CompiledEmojiToken token="action.deploy" theme={theme} />);
    expect(screen.getByAltText("Deploy")).toHaveAttribute("src", "https://cdn.test/rocket-3d.png");
    fireEvent.error(screen.getByAltText("Deploy"));
    expect(screen.getByAltText("Deploy")).toHaveAttribute("src", "https://cdn.test/rocket-twemoji.png");
    expect(container.querySelector("[data-provider]")).toHaveAttribute("data-provider", "twemoji");
    fireEvent.error(screen.getByAltText("Deploy"));
    expect(container.querySelector("img")).toBeNull();
    const glyph = screen.getByRole("img", { name: "Deploy" });
    expect(glyph).toHaveClass("emoji-styles--native");
    expect(glyph).toHaveTextContent("🚀");
  });

  it("renders nothing visible and stays hidden from assistive technology when no fallback is allowed", () => {
    const { container } = render(<CompiledEmojiToken token="status.hidden" theme={theme} />);
    fireEvent.error(screen.getByAltText("Success"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstElementChild).toHaveClass("emoji-styles--hidden");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("restarts from the first source when the token changes", () => {
    const { rerender } = render(<CompiledEmojiToken token="action.deploy" theme={theme} />);
    fireEvent.error(screen.getByAltText("Deploy"));
    rerender(<CompiledEmojiToken token="reaction.fire" theme={theme} />);
    rerender(<CompiledEmojiToken token="action.deploy" theme={theme} />);
    expect(screen.getByAltText("Deploy")).toHaveAttribute("src", "https://cdn.test/rocket-3d.png");
  });

  it("hydrates server markup of a really compiled theme without mismatch", async () => {
    const compiled = await compileEmojiTheme(defineEmojiTheme({ "action.deploy": { emoji: "🚀", label: "Deploy" } }, { defaultProvider: "fluent-3d", fallbacks: ["twemoji"] }));
    const element = <CompiledEmojiToken token="action.deploy" theme={compiled} />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => { hydrateRoot(container, element); await Promise.resolve(); });
    expect(consoleError.mock.calls.flatMap((call) => call.map(String)).filter((message) => /hydration|did not match|server html/i.test(message))).toEqual([]);
    expect(container.querySelector("img")).toHaveAttribute("src", expect.stringContaining("/Rocket/3D/rocket_3d.png"));
    container.remove();
  });
});

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
describe.skipIf(!existsSync(resolve(dist, "compiled.js")))("built compiled entry", () => {
  it("imports only React, its JSX runtime and emoji-styles/compiled, never the catalog or the full renderer", () => {
    const seen = new Set<string>();
    const queue = [resolve(dist, "compiled.js")];
    const external = new Set<string>();
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/emoji-styles-data|tokenizeEmojiText|resolveEmoji|EmojiProvider|useEmojiContext/);
      for (const match of code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
        if (match[1].startsWith(".")) queue.push(resolve(dirname(file), match[1]));
        else external.add(match[1]);
      }
    }
    expect([...external].sort()).toEqual(["emoji-styles/compiled", "react", "react/jsx-runtime"]);
    expect([...seen].map((file) => file.slice(dist.length + 1))).toEqual(["compiled.js"]);
    expect(readFileSync(resolve(dist, "compiled.d.ts"), "utf8")).not.toMatch(/from ['"]emoji-styles['"]|emoji-styles-data/);
  });
});
