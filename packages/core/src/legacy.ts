import type {
  EmojiAssetFormat,
  EmojiAssetProvider,
  ProviderVisibility,
} from "./types";

export interface LegacyEmojiAssetProvider {
  id: string;
  label: string;
  visibility: ProviderVisibility;
  license?: EmojiAssetProvider["license"];
  supportsUnknownEmoji?: boolean;
  getUrl: NonNullable<EmojiAssetProvider["getUrl"]>;
}

export interface LegacyProviderAdapterOptions {
  version?: string;
  format?: EmojiAssetFormat;
  local?: boolean;
  source?: string;
}

export function isV2Provider(provider: EmojiAssetProvider): boolean {
  return Boolean(
    provider.resolve &&
    provider.version &&
    provider.formats &&
    typeof provider.local === "boolean",
  );
}

export function adaptLegacyProvider(
  legacy: LegacyEmojiAssetProvider,
  options: LegacyProviderAdapterOptions = {},
): EmojiAssetProvider {
  const format = options.format ?? "png";
  return {
    ...legacy,
    version: options.version ?? "legacy",
    formats: [format],
    local: options.local ?? false,
    source: options.source,
    resolve(emoji) {
      const url = legacy.getUrl(emoji.data, emoji.normalized);
      return url ? {
        providerId: legacy.id,
        providerVersion: options.version ?? "legacy",
        url,
        format,
        local: options.local ?? false,
        license: legacy.license,
      } : null;
    },
  };
}
