/**
 * Markup helpers shared by the full SSR renderer and the compiled entry. This module must not
 * import `emoji-styles` at runtime: `emoji-styles-web/compiled` stays free of the Unicode catalog.
 */
import type { CompiledEmojiSource } from "emoji-styles/compiled";

export interface EmojiPreload {
  href: string;
  as: "image";
  type: string;
}

export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Public SSR helpers are also called from JavaScript; never interpolate an unchecked loading value. */
export function normalizeLoading(value: unknown): "lazy" | "eager" {
  return value === "eager" ? "eager" : "lazy";
}

export function mimeType(format: CompiledEmojiSource["format"]): string {
  return format === "svg" ? "image/svg+xml" : `image/${format}`;
}

/** Inline SVG text keeps the OS glyph at the requested box size without inline styles. */
export function renderNativeGlyph(emoji: string, size: number): string {
  return `<svg class="styled-emoji__native-glyph" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><text class="styled-emoji__native-text" x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="88">${escapeText(emoji)}</text></svg>`;
}

export function renderPreloadLink(preload: EmojiPreload): string {
  return `<link rel="preload" href="${escapeAttribute(preload.href)}" as="${preload.as}" type="${escapeAttribute(preload.type)}">`;
}
