import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defineEmojiTheme } from "emoji-styles";
import { defineStyledEmoji, registerEmojiTheme, type StyledEmojiElement } from "../src";

describe("styled-emoji Web Component", () => {
  beforeAll(() => defineStyledEmoji());
  beforeEach(() => document.body.replaceChildren());

  it("resolves accessible image markup and emits an event", async () => {
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    const resolved = vi.fn();
    element.addEventListener("emoji-resolved", resolved);
    element.setAttribute("emoji", "🚀");
    element.setAttribute("provider", "fluent-3d");
    element.setAttribute("label", "Deploy");
    element.setAttribute("size", "24");
    document.body.append(element);
    await element.render();

    expect(element.getAttribute("role")).toBe("img");
    expect(element.getAttribute("aria-label")).toBe("Deploy");
    expect(element.querySelector("img")?.src).toContain("rocket_3d.png");
    expect(resolved).toHaveBeenCalled();
  });

  it("supports registered semantic themes", async () => {
    const theme = defineEmojiTheme({
      "status.success": { emoji: "✅", label: "Successful", decorative: false },
    }, { id: "component-test", version: "1.0.0", defaultProvider: "twemoji" });
    registerEmojiTheme(theme);
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    element.setAttribute("token", "status.success");
    element.setAttribute("theme", "component-test");
    document.body.append(element);
    await element.render();

    expect(element.getAttribute("aria-label")).toBe("Successful");
    expect(element.querySelector("img")?.src).toContain("2705.png");
  });

  it("falls back to preserved native Unicode after an image error", async () => {
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    element.setAttribute("emoji", "🚀");
    element.setAttribute("provider", "fluent-3d");
    document.body.append(element);
    await element.render();
    element.querySelector("img")?.dispatchEvent(new Event("error"));

    expect(element.getAttribute("data-provider")).toBe("native");
    expect(element.querySelector<HTMLElement>(".styled-emoji__native")?.hidden).toBe(false);
    expect(element.querySelector(".styled-emoji__native-glyph")?.getAttribute("width")).toBe("20");
    expect(element.textContent).toContain("🚀");
  });

  it("scales native Unicode to the requested numeric size", async () => {
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    element.setAttribute("emoji", "🚀");
    element.setAttribute("provider", "native");
    element.setAttribute("size", "96");
    document.body.append(element);
    await element.render();

    const glyph = element.querySelector(".styled-emoji__native-glyph");
    expect(glyph?.getAttribute("width")).toBe("96");
    expect(glyph?.getAttribute("height")).toBe("96");
    expect(element.hasAttribute("style")).toBe(false);
  });

  it("does not reveal OS emoji when native fallback is disabled", async () => {
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    element.setAttribute("emoji", "🚀");
    element.setAttribute("provider", "fluent-3d");
    element.setAttribute("native-fallback", "false");
    document.body.append(element);
    await element.render();
    element.querySelector("img")?.dispatchEvent(new Event("error"));
    expect(element.getAttribute("data-provider")).toBe("unresolved");
    expect(element.textContent).not.toContain("🚀");
  });

  it("reuses matching server-rendered image markup during hydration", async () => {
    const element = document.createElement("styled-emoji") as StyledEmojiElement;
    element.setAttribute("emoji", "🚀");
    element.setAttribute("provider", "fluent-3d");
    const image = document.createElement("img");
    image.className = "styled-emoji__image";
    image.src = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@62ecdc0d7ca5c6df32148c169556bc8d3782fca4/assets/Rocket/3D/rocket_3d.png";
    element.append(image);
    document.body.append(element);
    await element.render();

    expect(element.querySelector("img")).toBe(image);
  });
});
