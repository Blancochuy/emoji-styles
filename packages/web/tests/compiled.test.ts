import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompiledEmojiTheme } from "emoji-styles/compiled";
import { defineCompiledEmoji, installCompiledEmojiFallbacks, renderCompiledEmojiTokenToHTML } from "../src/compiled";

const theme: CompiledEmojiTheme<"action.deploy" | "status.flag"> = {
  schemaVersion: 1,
  meta: { theme: { id: "dom", version: "1.0.0" }, nativeFallback: true, dataset: { emojiVersion: "17.0", unicodeVersion: "17.0", cldrVersion: "48", sourceSha256: "0" }, providers: [] },
  tokens: {
    "action.deploy": { emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" }, decorative: false, unicode: "🚀", sources: [
      { provider: "fluent-3d", url: "https://cdn.test/one.png", format: "png" },
      { provider: "twemoji", url: "https://cdn.test/two.svg", format: "svg" },
    ] },
    "status.flag": { emoji: "🚩", label: "Flagged", decorative: false, unicode: null, sources: [{ provider: "twemoji", url: "https://cdn.test/flag.svg", format: "svg" }] },
  },
};

/** jsdom never loads images; mark them as pending so only explicit errors count. */
function pending(root: ParentNode): void {
  for (const image of root.querySelectorAll("img")) Object.defineProperty(image, "complete", { configurable: true, value: false });
}
const fail = (image: Element) => image.dispatchEvent(new Event("error"));
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); document.body.replaceChildren(); });

describe("compiled web fallbacks", () => {
  it("advances server-rendered markup through each source, then to the Unicode glyph", () => {
    const template = document.createElement("template");
    template.innerHTML = renderCompiledEmojiTokenToHTML("action.deploy", theme);
    pending(template.content);
    document.body.append(template.content);
    cleanups.push(installCompiledEmojiFallbacks());
    const host = document.querySelector<HTMLElement>("[data-emoji-token]")!;
    const image = host.querySelector("img")!;
    const events: unknown[] = [];
    host.addEventListener("emoji-fallback", (event) => events.push((event as CustomEvent).detail));

    fail(image);
    expect(image.getAttribute("src")).toBe("https://cdn.test/two.svg");
    expect(image.hasAttribute("data-fallbacks")).toBe(false);
    expect(host.getAttribute("data-provider")).toBe("twemoji");
    expect(host.querySelector<HTMLElement>(".styled-emoji__native")!.hidden).toBe(true);

    fail(image);
    expect(image.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>(".styled-emoji__native")!.hidden).toBe(false);
    expect(host.getAttribute("data-provider")).toBe("native");
    expect(host.getAttribute("aria-label")).toBe("Deploy");
    expect(events).toEqual([
      { emoji: "🚀", token: "action.deploy", url: "https://cdn.test/two.svg", provider: "twemoji", native: false },
      { emoji: "🚀", token: "action.deploy", url: null, native: true },
    ]);
  });

  it("hides tokens without a Unicode fallback, repairs images that failed before install, and uninstalls", () => {
    document.body.innerHTML = renderCompiledEmojiTokenToHTML("status.flag", theme) + renderCompiledEmojiTokenToHTML("action.deploy", theme);
    const [flag, deploy] = document.querySelectorAll<HTMLImageElement>("img");
    Object.defineProperty(deploy, "complete", { configurable: true, value: false });
    Object.defineProperty(flag, "complete", { configurable: true, value: true }); // already broken: naturalWidth is 0
    const uninstall = installCompiledEmojiFallbacks();
    const host = flag.closest<HTMLElement>("[data-emoji-token]")!;
    expect(flag.hidden).toBe(true);
    expect(host.getAttribute("data-provider")).toBe("unresolved");
    expect(host.getAttribute("aria-hidden")).toBe("true");
    expect(host.hasAttribute("role") || host.hasAttribute("aria-label")).toBe(false);
    expect(deploy.getAttribute("src")).toBe("https://cdn.test/one.png");

    uninstall();
    fail(deploy);
    expect(deploy.getAttribute("src")).toBe("https://cdn.test/one.png");
  });

  it("ignores images outside compiled markup", () => {
    document.body.innerHTML = `<span class="styled-emoji"><img class="styled-emoji__image" src="https://cdn.test/x.png" data-fallbacks='[{"provider":"twemoji","url":"https://cdn.test/y.png"}]'></span>`;
    pending(document.body);
    cleanups.push(installCompiledEmojiFallbacks());
    const image = document.querySelector("img")!;
    fail(image);
    expect(image.getAttribute("src")).toBe("https://cdn.test/x.png");
  });
});

describe("defineCompiledEmoji", () => {
  defineCompiledEmoji(theme, "test-compiled-emoji");

  it("renders tokens, re-renders on attribute changes and keeps author classes", () => {
    const element = document.createElement("test-compiled-emoji");
    element.className = "toolbar-icon";
    element.setAttribute("token", "action.deploy");
    element.setAttribute("size", "24");
    element.setAttribute("locale", "es");
    document.body.append(element);
    expect(element.getAttribute("class")).toBe("toolbar-icon");
    expect(element.hasAttribute("data-emoji-compiled")).toBe(true);
    expect(element.getAttribute("aria-label")).toBe("Desplegar");
    expect(element.querySelector("img")).toMatchObject({ alt: "Desplegar", width: 24 });

    element.setAttribute("decorative", "");
    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.hasAttribute("role") || element.hasAttribute("aria-label")).toBe(false);
    expect(element.querySelector("img")!.alt).toBe("");

    element.setAttribute("token", "missing");
    expect(element.getAttribute("data-emoji-error")).toBe("Unknown emoji token");
    expect(element.textContent).toBe("missing");
    expect(element.hasAttribute("aria-hidden")).toBe(false);
  });

  it("leaves class to the author's framework and keeps the stylesheet hook when class is rewritten", async () => {
    const style = document.createElement("style");
    style.textContent = await readFile(resolve(__dirname, "../styles.css"), "utf8");
    document.head.append(style);
    cleanups.push(() => style.remove());
    const element = document.createElement("test-compiled-emoji");
    element.setAttribute("token", "action.deploy");
    document.body.append(element);
    // Vue hydration and `:class` patches replace the whole attribute.
    element.className = "framework-owned";
    element.setAttribute("token", "status.flag");
    expect(element.getAttribute("class")).toBe("framework-owned");
    expect(element.hasAttribute("data-emoji-compiled")).toBe(true);
    expect(getComputedStyle(element).display).toBe("inline-flex");
    element.removeAttribute("class");
    expect(getComputedStyle(element).display).toBe("inline-flex");
  });

  it("handles its own image errors once, even with a document listener installed", () => {
    cleanups.push(installCompiledEmojiFallbacks());
    const element = document.createElement("test-compiled-emoji");
    element.setAttribute("token", "action.deploy");
    document.body.append(element);
    const listener = vi.fn();
    element.addEventListener("emoji-fallback", listener);
    fail(element.querySelector("img")!);
    expect(element.querySelector("img")!.getAttribute("src")).toBe("https://cdn.test/two.svg");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps token metadata and fallback events aligned after token changes", () => {
    const element = document.createElement("test-compiled-emoji");
    element.setAttribute("token", "action.deploy");
    document.body.append(element);
    expect(element.getAttribute("data-emoji-token")).toBe("action.deploy");
    const events: unknown[] = [];
    element.addEventListener("emoji-fallback", event => events.push((event as CustomEvent).detail));
    fail(element.querySelector("img")!);
    expect(events).toEqual([{ emoji: "🚀", token: "action.deploy", url: "https://cdn.test/two.svg", provider: "twemoji", native: false }]);
    element.setAttribute("token", "status.flag");
    expect(element.getAttribute("data-emoji-token")).toBe("status.flag");
    fail(element.querySelector("img")!);
    expect(events.at(-1)).toEqual({ emoji: "🚩", token: "status.flag", url: null, native: false });
  });

  it("does not redefine a registered tag", () => {
    expect(() => defineCompiledEmoji(theme, "test-compiled-emoji")).not.toThrow();
  });
});
