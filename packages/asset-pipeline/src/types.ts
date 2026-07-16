import type { EmojiAssetFormat, EmojiProviderManifest, ProviderLicense } from "emoji-styles";

export type RasterAssetFormat = Extract<EmojiAssetFormat, "png" | "webp" | "avif">;

export interface AssetLimits {
  maxBytes: number;
  maxInputPixels: number;
  maxDimension: number;
}

export interface AlphaBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AssetInspection {
  path?: string;
  bytes: number;
  sha256: string;
  format: string;
  width: number;
  height: number;
  channels: number;
  pages: number;
  animated: boolean;
  hasAlpha: boolean;
  alphaBounds: AlphaBounds | null;
  occupancy: number;
  centerOffsetX: number;
  centerOffsetY: number;
  edgeAlphaRatio: number;
  meanLuminance: number;
}

export interface NormalizeEmojiAssetOptions {
  input: string | Buffer;
  output?: string;
  size?: number;
  format?: RasterAssetFormat;
  safeArea?: number;
  alphaThreshold?: number;
  limits?: Partial<AssetLimits>;
}

export interface NormalizedEmojiAsset {
  data: Buffer;
  inspection: AssetInspection;
  source: AssetInspection;
  output?: string;
}

export type ValidationSeverity = "error" | "warning";

export interface AssetValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
}

export interface ValidateAssetOptions {
  size?: number;
  format?: RasterAssetFormat;
  safeArea?: number;
  safeAreaTolerance?: number;
  maxCenterOffset?: number;
  maxBytes?: number;
  requireAlpha?: boolean;
}

export interface AssetValidationResult {
  valid: boolean;
  inspection?: AssetInspection;
  issues: AssetValidationIssue[];
}

export interface AssetCollectionValidation {
  valid: boolean;
  assets: AssetValidationResult[];
  issues: AssetValidationIssue[];
}

export interface AssetMappingEntry {
  file: string;
  emoji?: string;
  token?: string;
  label?: string;
}

export interface AssetProvenance {
  generated: boolean;
  createdAt: string;
  generator?: {
    type: string;
    provider?: string;
    model?: string;
  };
  humanDirection?: string;
  referenceAssets?: string[];
  modifications?: string[];
  source?: string;
  ownership?: string;
  license?: string;
}

export interface BuildProviderOptions {
  directory: string;
  id: string;
  label?: string;
  version?: string;
  basePath?: string;
  mapping?: AssetMappingEntry[];
  license?: ProviderLicense;
  provenance: AssetProvenance;
}

export interface BuiltProvider {
  manifest: EmojiProviderManifest;
  provenance: AssetProvenance;
  providerModule: string;
  themeModule?: string;
  licenseDocument: string;
  readme: string;
}

export const DEFAULT_ASSET_LIMITS: AssetLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxInputPixels: 16_777_216,
  maxDimension: 4096,
};
