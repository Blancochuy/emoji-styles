import type {
  EmojiAssetFormat,
  EmojiAssetProvider,
  ProviderLicense,
  ProviderVisibility,
} from "./types";

export interface CompositeProviderOptions {
  id: string;
  label: string;
  version: string;
  providers: readonly EmojiAssetProvider[];
  visibility?: ProviderVisibility;
  license?: ProviderLicense;
}

export function createCompositeProvider(options: CompositeProviderOptions): EmojiAssetProvider {
  if (options.providers.length === 0) throw new Error("Composite providers require at least one provider");
  const formats = [...new Set(
    options.providers.flatMap((provider) => provider.formats ?? []),
  )] as EmojiAssetFormat[];

  return {
    id: options.id,
    label: options.label,
    version: options.version,
    formats,
    local: options.providers.every((provider) => provider.local === true),
    source: options.providers.map((provider) => provider.id).join(","),
    visibility: options.visibility ?? "custom",
    license: options.license,
    supportsUnknownEmoji: options.providers.some((provider) => provider.supportsUnknownEmoji),
    getUrl(data, emoji) {
      for (const provider of options.providers) {
        const url = provider.getUrl?.(data, emoji);
        if (url) return url;
      }
      return null;
    },
    async resolve(emoji) {
      for (const provider of options.providers) {
        const asset = provider.resolve
          ? await provider.resolve(emoji)
          : provider.getUrl?.(emoji.data, emoji.normalized);
        if (typeof asset === "string") {
          return {
            providerId: provider.id,
            providerVersion: provider.version ?? "legacy",
            url: asset,
            format: provider.formats?.[0] ?? "png",
            local: provider.local ?? false,
            license: provider.license,
          };
        }
        if (asset) return asset;
      }
      return null;
    },
  };
}
