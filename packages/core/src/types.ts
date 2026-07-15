export type EmojiStyle =
  | "fluent-3d"
  | "fluent-color"
  | "fluent-flat"
  | "noto"
  | "twemoji"
  | "native";

export type EmojiSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | number;

export type ProviderVisibility = "public" | "custom";
export type EmojiAssetFormat = "png" | "svg" | "webp" | "avif";

export interface ProviderLicense {
  name: string;
  url?: string;
  attribution?: string;
  ownership?: string;
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
  /** Required for v2 providers; optional only while adapting legacy providers. */
  version?: string;
  formats?: readonly EmojiAssetFormat[];
  local?: boolean;
  source?: string;
  license?: ProviderLicense;
  /** Whether the provider can resolve emoji absent from the bundled catalog. */
  supportsUnknownEmoji?: boolean;
  /** @deprecated Implement `resolve` for v2 providers. Retained for synchronous compatibility. */
  getUrl?(data: EmojiData, emoji?: string): string | null;
  resolve?(emoji: NormalizedEmoji): ProviderResolution;
  getCoverage?(): ProviderCoverage | Promise<ProviderCoverage>;
}

export type EmojiProviderRef = EmojiStyle | EmojiAssetProvider;

export interface NormalizedEmojiMetadata {
  label: string;
  codepoints: readonly string[];
  sequence: string;
  unicodeVersion?: string;
  emojiVersion?: string;
  category?: string;
  subgroup?: string;
}

export interface NormalizedEmoji {
  input: string;
  normalized: string;
  metadata: NormalizedEmojiMetadata;
  data: EmojiData;
}

export interface ResolvedEmojiAsset {
  providerId: string;
  providerVersion: string;
  url: string;
  format: EmojiAssetFormat;
  local: boolean;
  width?: number;
  height?: number;
  checksum?: string;
  license?: ProviderLicense;
}

export type ProviderResolution =
  | ResolvedEmojiAsset
  | null
  | Promise<ResolvedEmojiAsset | null>;

export interface EmojiResolutionAttempt {
  providerId: string;
  status: "resolved" | "unsupported" | "native" | "error";
  asset: ResolvedEmojiAsset | null;
  error?: string;
}

export interface EmojiResolution {
  input: string;
  normalized: string;
  metadata: NormalizedEmojiMetadata;
  selected: ResolvedEmojiAsset | null;
  attempts: EmojiResolutionAttempt[];
  fallbackUsed: boolean;
  nativeFallback: boolean;
}

export interface ProviderCoverage {
  providerId: string;
  providerVersion: string;
  datasetVersion: string;
  total: number;
  supported: number;
  percentage: number;
  verified: boolean;
  source?: string;
  missing?: readonly string[];
}

export interface ProviderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
