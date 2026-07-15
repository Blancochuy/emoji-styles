export type EmojiStyle =
  | "fluent-3d"
  | "fluent-color"
  | "fluent-flat"
  | "noto"
  | "twemoji"
  | "native";

export type EmojiSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | number;

export type ProviderVisibility = "public" | "custom";

export interface ProviderLicense {
  name: string;
  url: string;
  attribution?: string;
}

export interface EmojiData {
  /** Stable CLDR-derived identifier used by provider URL formatters. */
  name: string;
  /** Human-readable alt text. */
  alt: string;
  /** Canonical lowercase, hyphen-separated Unicode sequence. */
  codepoint: string;
  /** Enriched fields are present for catalog entries and optional for custom providers. */
  codepoints?: readonly string[];
  sequence?: string;
  unicodeVersion?: string;
  emojiVersion?: string;
  group?: string;
  subgroup?: string;
  qualification?: "fully-qualified" | "component";
  /** Styles that DON'T have this emoji (blacklist) */
  unsupported?: EmojiStyle[];
}

export interface ProviderConfig {
  name: EmojiStyle;
  baseUrl: string;
  extension: string;
  label: string;
}

/** A source of emoji artwork. Custom providers keep asset hosting outside the core. */
export interface EmojiAssetProvider {
  id: string;
  label: string;
  visibility: ProviderVisibility;
  license?: ProviderLicense;
  /** Whether the provider can resolve emoji absent from the bundled catalog. */
  supportsUnknownEmoji?: boolean;
  getUrl(data: EmojiData, emoji?: string): string | null;
}

export type EmojiProviderRef = EmojiStyle | EmojiAssetProvider;
