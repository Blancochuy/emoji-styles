import { SIZE_MAP, type EmojiAssetProvider, type EmojiSize, type EmojiTheme } from "emoji-styles";
import { getRegisteredTheme } from "./registry";
import {
  renderEmojiToHTMLResult,
  renderEmojiTokenToHTMLResult,
  type RenderedEmojiHTML,
} from "./ssr";

const HTMLElementBase = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

function parseSize(value: string | null): EmojiSize | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  return value in SIZE_MAP ? value as EmojiSize : undefined;
}

export interface StyledEmojiResolvedDetail {
  emoji: string;
  providerId: string | null;
  fallbackUsed: boolean;
  token?: string;
}

export class StyledEmojiElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ["emoji", "token", "theme", "provider", "label", "size", "decorative", "loading"];
  }

  providerObject?: EmojiAssetProvider;
  themeObject?: EmojiTheme;
  #renderVersion = 0;
  #fallbackIndex = 0;
  #fallbackUrls: readonly string[] = [];

  connectedCallback(): void {
    this.classList.add("styled-emoji");
    void this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.render();
  }

  async render(): Promise<void> {
    const version = ++this.#renderVersion;
    const token = this.getAttribute("token") ?? undefined;
    const emoji = this.getAttribute("emoji") ?? "";
    const provider = this.providerObject ?? this.getAttribute("provider") ?? undefined;
    const size = parseSize(this.getAttribute("size"));

    try {
      let result: RenderedEmojiHTML;
      if (token) {
        const theme = this.themeObject ?? getRegisteredTheme(this.getAttribute("theme") ?? undefined);
        if (!theme) throw new Error(`No registered theme for token ${token}`);
        result = await renderEmojiTokenToHTMLResult(token, theme, { provider, size });
      } else {
        if (!emoji) throw new Error("styled-emoji requires an emoji or token attribute");
        result = await renderEmojiToHTMLResult(emoji, {
          provider,
          label: this.getAttribute("label") ?? undefined,
          decorative: this.hasAttribute("decorative"),
          size,
          loading: this.getAttribute("loading") === "eager" ? "eager" : "lazy",
        });
      }
      if (version !== this.#renderVersion) return;
      this.commit(result, token);
    } catch (error) {
      if (version !== this.#renderVersion) return;
      this.replaceChildren(document.createTextNode(emoji));
      this.dispatchEvent(new CustomEvent("emoji-error", {
        detail: { emoji, token, error: error instanceof Error ? error.message : String(error) },
        bubbles: true,
      }));
    }
  }

  private commit(result: RenderedEmojiHTML, token?: string): void {
    const requestedSize = parseSize(this.getAttribute("size")) ?? "md";
    const size = typeof requestedSize === "number" ? requestedSize : SIZE_MAP[requestedSize];
    this.setAttribute("data-provider", result.asset?.providerId ?? "native");
    this.setAttribute("data-resolved-emoji", result.emoji);
    if (result.decorative) {
      this.setAttribute("aria-hidden", "true");
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
    } else {
      this.removeAttribute("aria-hidden");
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", result.label);
    }

    const native = document.createElement("span");
    native.className = "styled-emoji__native";
    native.setAttribute("aria-hidden", "true");
    native.textContent = result.emoji;

    this.#fallbackIndex = 0;
    this.#fallbackUrls = result.fallbackUrls.filter((url) => url !== result.asset?.url);
    if (!result.asset) {
      this.replaceChildren(native);
    } else {
      const existing = this.querySelector<HTMLImageElement>("img.styled-emoji__image");
      const image = existing?.getAttribute("src") === result.asset.url
        ? existing
        : document.createElement("img");
      image.className = "styled-emoji__image";
      image.src = result.asset.url;
      image.alt = result.decorative ? "" : result.label;
      image.width = size;
      image.height = size;
      image.loading = this.getAttribute("loading") === "eager" ? "eager" : "lazy";
      image.decoding = "async";
      image.draggable = false;
      image.onerror = () => this.handleImageError(image, native, result, token);
      native.hidden = true;
      this.replaceChildren(image, native);
    }

    const detail: StyledEmojiResolvedDetail = {
      emoji: result.emoji,
      providerId: result.asset?.providerId ?? null,
      fallbackUsed: result.resolution?.fallbackUsed ?? false,
      token,
    };
    this.dispatchEvent(new CustomEvent<StyledEmojiResolvedDetail>("emoji-resolved", { detail, bubbles: true }));
  }

  private handleImageError(
    image: HTMLImageElement,
    native: HTMLElement,
    result: RenderedEmojiHTML,
    token?: string,
  ): void {
    const next = this.#fallbackUrls[this.#fallbackIndex++];
    if (next) {
      image.src = next;
      this.dispatchEvent(new CustomEvent("emoji-fallback", {
        detail: { emoji: result.emoji, token, url: next, index: this.#fallbackIndex },
        bubbles: true,
      }));
      return;
    }
    image.hidden = true;
    native.hidden = false;
    this.setAttribute("data-provider", "native");
    this.dispatchEvent(new CustomEvent("emoji-fallback", {
      detail: { emoji: result.emoji, token, url: null, index: this.#fallbackIndex },
      bubbles: true,
    }));
  }
}

export function defineStyledEmoji(tagName = "styled-emoji"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tagName)) customElements.define(tagName, StyledEmojiElement);
}
