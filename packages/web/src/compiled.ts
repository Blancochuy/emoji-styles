/**
 * Catalog-free rendering of themes produced by `emoji-styles theme compile`, for sites without
 * React (Astro, Vue, Svelte, server templates, plain HTML). Imports only `emoji-styles/compiled`;
 * never import the package root or `./ssr` from here.
 */
import {
  getCompiledEmojiDimension,
  getCompiledEmojiLabel,
  getCompiledEmojiToken,
  type CompiledEmojiSource,
  type CompiledEmojiTheme,
  type CompiledEmojiTokenName,
  type EmojiSize,
} from "emoji-styles/compiled";
import { escapeAttribute, escapeText, mimeType, normalizeLoading, renderNativeGlyph, type EmojiPreload } from "./html";

export type { EmojiPreload } from "./html";
export { renderPreloadLink } from "./html";
export type { CompiledEmojiTheme, CompiledEmojiTokenName, EmojiSize } from "emoji-styles/compiled";

export interface RenderCompiledEmojiTokenOptions {
  size?: EmojiSize;
  className?: string;
  /** Locale used to pick one of the compiled `labels`. */
  locale?: string;
  /** Overrides the compiled accessible label. */
  label?: string;
  /** Overrides the compiled decorative flag. */
  decorative?: boolean;
  loading?: "lazy" | "eager";
}

export interface RenderedCompiledEmojiHTML {
  html: string;
  token: string;
  /** Null when the token is not in the theme. */
  emoji: string | null;
  label: string;
  decorative: boolean;
  /** First artwork candidate; later ones are in `fallbackUrls`. */
  source: CompiledEmojiSource | null;
  fallbackUrls: readonly string[];
  nativeFallback: boolean;
  preload?: EmojiPreload;
}

/** Marks markup that `installCompiledEmojiFallbacks` may repair; the full renderer has its own. */
const HOST_SELECTOR = "[data-emoji-compiled]";

/**
 * Render one compiled token as static HTML. Synchronous and DOM-free, so it works in any server
 * template. The markup carries the remaining sources; `installCompiledEmojiFallbacks` (or
 * `defineCompiledEmoji`) advances through them in the browser after an image error.
 */
export function renderCompiledEmojiTokenToHTMLResult<Theme extends CompiledEmojiTheme>(
  token: CompiledEmojiTokenName<Theme>,
  theme: Theme,
  options: RenderCompiledEmojiTokenOptions = {},
): RenderedCompiledEmojiHTML {
  const entry = getCompiledEmojiToken(theme, token);
  if (!entry) {
    return {
      html: `<span${options.className ? ` class="${escapeAttribute(options.className)}"` : ""} data-emoji-token="${escapeAttribute(token)}" data-emoji-error="Unknown emoji token">${escapeText(token)}</span>`,
      token, emoji: null, label: token, decorative: false, source: null, fallbackUrls: [], nativeFallback: false,
    };
  }
  const size = getCompiledEmojiDimension(options.size);
  const label = options.label ?? getCompiledEmojiLabel(entry, options.locale);
  const decorative = options.decorative ?? entry.decorative;
  const [source = null, ...rest] = entry.sources;
  const fallbackUrls = rest.map(({ url }) => url);
  const hidden = decorative || !source && !entry.unicode;
  const attributes = [
    `class="${escapeAttribute(["styled-emoji", options.className].filter(Boolean).join(" "))}"`,
    `data-emoji-compiled`,
    `data-emoji-token="${escapeAttribute(token)}"`,
    `data-emoji-theme="${escapeAttribute(theme.meta.theme.id)}"`,
    `data-emoji="${escapeAttribute(entry.emoji)}"`,
    `data-size="${size}"`,
    `data-provider="${escapeAttribute(source?.provider ?? (entry.unicode ? "native" : "unresolved"))}"`,
    hidden ? `aria-hidden="true"` : `role="img" aria-label="${escapeAttribute(label)}"`,
  ].join(" ");
  const native = `<span class="styled-emoji__native"${source || !entry.unicode ? " hidden" : ""} aria-hidden="true">${entry.unicode ? renderNativeGlyph(entry.unicode, size) : ""}</span>`;
  // Provider ids travel with the URLs so `data-provider` stays accurate after a fallback.
  const fallbacks = rest.length ? ` data-fallbacks="${escapeAttribute(JSON.stringify(rest.map(({ provider, url }) => ({ provider, url }))))}"` : "";
  const image = source
    ? `<img class="styled-emoji__image" src="${escapeAttribute(source.url)}" alt="${escapeAttribute(decorative ? "" : label)}" width="${size}" height="${size}" loading="${normalizeLoading(options.loading)}" decoding="async" draggable="false"${fallbacks}>`
    : "";
  return {
    html: `<span ${attributes}>${image}${native}</span>`,
    token, emoji: entry.emoji, label, decorative, source, fallbackUrls, nativeFallback: entry.unicode !== null,
    preload: source ? { href: source.url, as: "image", type: mimeType(source.format) } : undefined,
  };
}

export function renderCompiledEmojiTokenToHTML<Theme extends CompiledEmojiTheme>(
  token: CompiledEmojiTokenName<Theme>,
  theme: Theme,
  options: RenderCompiledEmojiTokenOptions = {},
): string {
  return renderCompiledEmojiTokenToHTMLResult(token, theme, options).html;
}

/** Errors are handled once even when a host element and a document listener both see them. */
const handledErrors = new WeakSet<Event>();

/** Move a failed compiled image to its next source, then to the Unicode fallback or nothing. */
function advance(image: HTMLImageElement): void {
  const host = image.closest<HTMLElement>(HOST_SELECTOR);
  if (!host) return;
  let remaining: Array<{ provider: string; url: string }> = [];
  try {
    const parsed: unknown = JSON.parse(image.getAttribute("data-fallbacks") ?? "[]");
    if (Array.isArray(parsed)) remaining = parsed.filter((item): item is { provider: string; url: string } => typeof item?.url === "string" && typeof item?.provider === "string");
  } catch { /* malformed markup: treat as exhausted */ }
  const token = host.getAttribute("data-emoji-token") ?? undefined;
  const emoji = host.getAttribute("data-emoji") ?? "";
  const next = remaining.shift();
  if (next) {
    if (remaining.length) image.setAttribute("data-fallbacks", JSON.stringify(remaining));
    else image.removeAttribute("data-fallbacks");
    image.src = next.url;
    host.setAttribute("data-provider", next.provider);
    host.dispatchEvent(new CustomEvent("emoji-fallback", { detail: { emoji, token, url: next.url, provider: next.provider, native: false }, bubbles: true }));
    return;
  }
  image.hidden = true;
  const native = host.querySelector<HTMLElement>(":scope > .styled-emoji__native");
  const hasGlyph = Boolean(native?.firstElementChild);
  if (native && hasGlyph) native.hidden = false;
  host.setAttribute("data-provider", hasGlyph ? "native" : "unresolved");
  if (!hasGlyph) {
    host.setAttribute("aria-hidden", "true");
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
  }
  host.dispatchEvent(new CustomEvent("emoji-fallback", { detail: { emoji, token, url: null, native: hasGlyph }, bubbles: true }));
}

function onImageError(event: Event): void {
  const image = event.target;
  if (handledErrors.has(event) || !(image instanceof HTMLImageElement) || !image.classList.contains("styled-emoji__image")) return;
  handledErrors.add(event);
  advance(image);
}

function isBroken(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth === 0 && Boolean(image.getAttribute("src"));
}

/**
 * Enable source fallbacks for server-rendered compiled markup inside `root`. Image errors do not
 * bubble, so this listens in the capture phase; images that already failed before the script ran
 * are repaired immediately. No inline handlers are emitted, so a strict CSP keeps working.
 * Returns a function that removes the listener.
 */
export function installCompiledEmojiFallbacks(root: Document | Element = document): () => void {
  root.addEventListener("error", onImageError, true);
  for (const image of root.querySelectorAll<HTMLImageElement>(`${HOST_SELECTOR} img.styled-emoji__image`)) {
    if (isBroken(image)) advance(image);
  }
  return () => root.removeEventListener("error", onImageError, true);
}

const HTMLElementBase = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;
const MANAGED_ATTRIBUTES = ["data-emoji-token", "data-emoji-compiled", "data-emoji-theme", "data-emoji", "data-size", "data-provider", "data-emoji-error", "role", "aria-label", "aria-hidden"];

function parseSize(value: string | null): EmojiSize | undefined {
  if (!value) return undefined;
  return /^\d+$/.test(value) ? Number(value) : value as EmojiSize;
}

/**
 * Register a custom element that renders tokens of one compiled theme in the browser, for client
 * rendering without a server step: `<compiled-emoji token="action.deploy" size="20">`.
 * Attributes: token, size, locale, label, decorative, loading. Register one tag name per theme.
 */
export function defineCompiledEmoji<Theme extends CompiledEmojiTheme>(theme: Theme, tagName = "compiled-emoji"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  customElements.define(tagName, class CompiledEmojiElement extends HTMLElementBase {
    static get observedAttributes(): string[] {
      return ["token", "size", "locale", "label", "decorative", "loading"];
    }

    connectedCallback(): void {
      this.addEventListener("error", onImageError, true);
      this.render();
    }

    disconnectedCallback(): void {
      this.removeEventListener("error", onImageError, true);
    }

    attributeChangedCallback(): void {
      if (this.isConnected) this.render();
    }

    render(): void {
      const result = renderCompiledEmojiTokenToHTMLResult(this.getAttribute("token") ?? "", theme, {
        size: parseSize(this.getAttribute("size")),
        locale: this.getAttribute("locale") ?? undefined,
        label: this.getAttribute("label") ?? undefined,
        decorative: this.hasAttribute("decorative") ? this.getAttribute("decorative") !== "false" : undefined,
        loading: this.getAttribute("loading") === "eager" ? "eager" : "lazy",
      });
      const template = document.createElement("template");
      template.innerHTML = result.html;
      const rendered = template.content.firstElementChild as HTMLElement;
      for (const name of MANAGED_ATTRIBUTES) this.removeAttribute(name);
      for (const { name, value } of rendered.attributes) {
        if (name === "class") this.classList.add(...value.split(" ").filter(Boolean));
        else this.setAttribute(name, value);
      }
      this.replaceChildren(...rendered.childNodes);
    }
  });
}
