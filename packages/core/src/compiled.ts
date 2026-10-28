/**
 * Catalog-free runtime contract for compiled semantic themes.
 *
 * This entry point must stay free of `emoji-styles-data`, tokenization, provider tables and
 * the package root. Everything the browser needs was resolved at compile time in Node.
 */
import { selectLocalizedLabel } from "./label";
import { SIZE_MAP } from "./size";
import type { EmojiAssetFormat, EmojiSize, ProviderLicense } from "./types";

export const COMPILED_EMOJI_THEME_SCHEMA_VERSION = 1 as const;

/** One artwork candidate, in the order a browser should try it. */
export interface CompiledEmojiSource {
  /** Provider id; look it up in `meta.providers` for revision and license. */
  provider: string;
  url: string;
  format: EmojiAssetFormat;
}

export interface CompiledEmojiTokenEntry {
  /** Normalized Unicode emoji the token stands for. */
  emoji: string;
  label: string;
  labels?: Readonly<Record<string, string>>;
  decorative: boolean;
  /** Ordered artwork candidates. Empty when only the Unicode fallback (or nothing) applies. */
  sources: readonly CompiledEmojiSource[];
  /** Native Unicode fallback after the last source, or null when the theme disallows it. */
  unicode: string | null;
}

export interface CompiledEmojiProvider {
  id: string;
  /** Provider revision (commit, release or theme version) the URLs were computed from. */
  version: string;
  label?: string;
  source?: string;
  license?: ProviderLicense;
}

export interface CompiledEmojiDataset {
  emojiVersion: string;
  unicodeVersion: string;
  cldrVersion: string;
  sourceSha256: string;
}

export interface CompiledEmojiThemeMeta {
  theme: { id: string; version: string };
  nativeFallback: boolean;
  dataset: CompiledEmojiDataset;
  /** Every provider that contributes at least one source, sorted by id. */
  providers: readonly CompiledEmojiProvider[];
}

export interface CompiledEmojiTheme<Token extends string = string> {
  schemaVersion: typeof COMPILED_EMOJI_THEME_SCHEMA_VERSION;
  meta: CompiledEmojiThemeMeta;
  tokens: Readonly<Record<Token, CompiledEmojiTokenEntry>>;
}

/** Union of token names of a compiled theme type. */
export type CompiledEmojiTokenName<Theme extends CompiledEmojiTheme> = keyof Theme["tokens"] & string;

export function getCompiledEmojiToken(theme: CompiledEmojiTheme, token: string): CompiledEmojiTokenEntry | null {
  return Object.prototype.hasOwnProperty.call(theme.tokens, token) ? theme.tokens[token] : null;
}

export function getCompiledEmojiLabel(entry: Pick<CompiledEmojiTokenEntry, "label" | "labels">, locale?: string): string {
  return selectLocalizedLabel(entry.label, entry.labels, locale);
}

export function getCompiledEmojiDimension(size: EmojiSize = "md"): number {
  return typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
}

export { SIZE_MAP };
export type { EmojiSize };
