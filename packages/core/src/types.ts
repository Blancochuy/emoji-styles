export type EmojiStyle =
  | "microsoft-teams"
  | "apple"
  | "google"
  | "samsung"
  | "animated"
  | "twemoji";

export type EmojiSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | number;

export interface EmojiData {
  /** CDN filename (without extension) e.g. "rocket_1f680" */
  name: string;
  /** Human-readable alt text */
  alt: string;
  /** Unicode codepoint(s) for Twemoji path e.g. "1f680" */
  codepoint: string;
  /** Styles that DON'T have this emoji (blacklist) */
  unsupported?: EmojiStyle[];
}

export interface ProviderConfig {
  name: EmojiStyle;
  baseUrl: string;
  extension: string;
  label: string;
}
