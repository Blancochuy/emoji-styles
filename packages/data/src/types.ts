export type EmojiQualification = "fully-qualified" | "component";

export interface EmojiMetadata {
  /** Stable CLDR-derived identifier retained for provider compatibility. */
  name: string;
  /** English CLDR short name suitable as an accessible fallback label. */
  alt: string;
  /** Canonical lowercase, hyphen-separated Unicode sequence. */
  codepoint: string;
  /** Individual lowercase Unicode scalar values in canonical order. */
  codepoints: readonly string[];
  /** Alias for codepoint that makes sequence semantics explicit. */
  sequence: string;
  unicodeVersion: string;
  emojiVersion: string;
  group: string;
  subgroup: string;
  qualification: EmojiQualification;
}

export interface EmojiDatasetInfo {
  unicodeVersion: string;
  emojiVersion: string;
  cldrVersion: string;
  source: string;
  sourceUrl: string;
  sourceSha256: string;
  sourceDate: string;
  generatedAt: string;
  generatorVersion: string;
  rgiCount: number;
  aliasCount: number;
}
