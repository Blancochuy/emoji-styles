import type {
  EmojiAssetProvider,
  EmojiData,
  EmojiStyle,
  ProviderLicense,
  ProviderVisibility,
} from "./types";

export interface CdnProviderOptions {
  id: string;
  label: string;
  baseUrl: string;
  extension: string;
  visibility: ProviderVisibility;
  license?: ProviderLicense;
  filename?: (data: EmojiData) => string;
}

export function createCdnProvider(options: CdnProviderOptions): EmojiAssetProvider {
  return {
    id: options.id,
    label: options.label,
    visibility: options.visibility,
    license: options.license,
    getUrl(data) {
      const filename = options.filename?.(data) ?? data.name;
      return `${options.baseUrl}/${filename}.${options.extension}`;
    },
  };
}

/** Providers whose artwork has an explicit redistribution license. */
export const publicProviders = {
  twemoji: createCdnProvider({
    id: "twemoji",
    label: "Twemoji",
    baseUrl: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72",
    extension: "png",
    visibility: "public",
    filename: (data) => data.codepoint.replace(/-fe0f/gi, ""),
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Twemoji graphics by Twitter and contributors",
    },
  }),
} as const;

/**
 * Internal evaluation providers. Their presence is not a grant of artwork rights.
 * Do not expose these from a public package without a separate license review.
 */
export const experimentalProviders = {
  "microsoft-teams": createCdnProvider({
    id: "microsoft-teams", label: "Microsoft Teams 3D", baseUrl: "https://em-content.zobj.net/source/microsoft-teams/400", extension: "png", visibility: "experimental",
  }),
  apple: createCdnProvider({
    id: "apple", label: "Apple", baseUrl: "https://em-content.zobj.net/source/apple/453", extension: "png", visibility: "experimental",
  }),
  google: createCdnProvider({
    id: "google", label: "Google", baseUrl: "https://em-content.zobj.net/source/google/350", extension: "png", visibility: "experimental",
  }),
  samsung: createCdnProvider({
    id: "samsung", label: "Samsung", baseUrl: "https://em-content.zobj.net/source/samsung/320", extension: "png", visibility: "experimental",
  }),
  animated: createCdnProvider({
    id: "animated", label: "Animated Noto", baseUrl: "https://em-content.zobj.net/source/animated-noto-color-emoji/461", extension: "gif", visibility: "experimental",
  }),
} as const;

/** Full internal catalog. Prefer publicProviders in distributable code. */
export const providers: Record<EmojiStyle, EmojiAssetProvider> = {
  ...experimentalProviders,
  ...publicProviders,
};

export const SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 48,
};
