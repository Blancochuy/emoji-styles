import type {
  EmojiAssetProvider,
  EmojiData,
  EmojiAssetFormat,
  EmojiStyle,
  ProviderLicense,
  ProviderVisibility,
} from "./types";
import { fluentAssetNames } from "./fluent-data";

export interface CdnProviderOptions {
  id: string;
  label: string;
  baseUrl: string;
  extension: string;
  visibility: ProviderVisibility;
  license?: ProviderLicense;
  filename?: (data: EmojiData) => string;
  version?: string;
  format?: EmojiAssetFormat;
  local?: boolean;
  source?: string;
  supports?: (data: EmojiData, emoji?: string) => boolean;
  coverage?: () => import("./types").ProviderCoverage | Promise<import("./types").ProviderCoverage>;
}

export function createCdnProvider(options: CdnProviderOptions): EmojiAssetProvider {
  const format = options.format ?? options.extension as EmojiAssetFormat;
  const getUrl = (data: EmojiData, emoji?: string) => {
    if (options.supports && !options.supports(data, emoji)) return null;
    const filename = options.filename?.(data) ?? data.name;
    return `${options.baseUrl}/${filename}.${options.extension}`;
  };
  return {
    id: options.id,
    label: options.label,
    visibility: options.visibility,
    version: options.version ?? "unversioned",
    formats: [format],
    local: options.local ?? false,
    source: options.source ?? options.baseUrl,
    license: options.license,
    getUrl,
    resolve(emoji) {
      const url = getUrl(emoji.data, emoji.normalized);
      if (!url) return null;
      return {
        providerId: options.id,
        providerVersion: options.version ?? "unversioned",
        url,
        format,
        local: options.local ?? false,
        license: options.license,
      };
    },
    getCoverage: options.coverage,
  };
}

/** Match Twemoji's asset convention: keep VS16 inside ZWJ sequences, omit it otherwise. */
export function getTwemojiAssetId(data: Pick<EmojiData, "codepoint">): string {
  const codepoint = data.codepoint.toLowerCase();
  // Twemoji stores this legacy ZWJ sequence in its unqualified filename form.
  if (codepoint === "1f441-fe0f-200d-1f5e8-fe0f") return "1f441-200d-1f5e8";
  return codepoint.includes("-200d-") ? codepoint : codepoint.replace(/-fe0f/g, "");
}

const FLUENT_COMMIT = "62ecdc0d7ca5c6df32148c169556bc8d3782fca4";
const NOTO_COMMIT = "8998f5dd683424a73e2314a8c1f1e359c19e8742";

function fluentFilename(data: EmojiData, style: "3D" | "Color" | "Flat") {
  const codepoint = data.codepoint.toLowerCase().replace(/-fe0f/g, "");
  const mapped = fluentAssetNames[codepoint];
  const folder = mapped?.[0] ?? data.alt;
  const slug = mapped?.[1] ?? data.alt
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${encodeURIComponent(folder)}/${style}/${slug}_${style.toLowerCase()}`;
}

/** Providers whose artwork has an explicit redistribution license. */
export const publicProviders = {
  fluent3d: createCdnProvider({
    id: "fluent-3d",
    label: "Fluent Emoji 3D",
    baseUrl: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@${FLUENT_COMMIT}/assets`,
    extension: "png",
    visibility: "public",
    version: FLUENT_COMMIT,
    source: "https://github.com/microsoft/fluentui-emoji",
    filename: (data) => fluentFilename(data, "3D"),
    license: {
      name: "MIT",
      url: "https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE",
      attribution: "Fluent Emoji by Microsoft",
    },
  }),
  fluentColor: createCdnProvider({
    id: "fluent-color",
    label: "Fluent Emoji Color",
    baseUrl: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@${FLUENT_COMMIT}/assets`,
    extension: "svg",
    visibility: "public",
    version: FLUENT_COMMIT,
    source: "https://github.com/microsoft/fluentui-emoji",
    filename: (data) => fluentFilename(data, "Color"),
    license: {
      name: "MIT",
      url: "https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE",
      attribution: "Fluent Emoji by Microsoft",
    },
  }),
  fluentFlat: createCdnProvider({
    id: "fluent-flat",
    label: "Fluent Emoji Flat",
    baseUrl: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@${FLUENT_COMMIT}/assets`,
    extension: "svg",
    visibility: "public",
    version: FLUENT_COMMIT,
    source: "https://github.com/microsoft/fluentui-emoji",
    filename: (data) => fluentFilename(data, "Flat"),
    license: {
      name: "MIT",
      url: "https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE",
      attribution: "Fluent Emoji by Microsoft",
    },
  }),
  noto: createCdnProvider({
    id: "noto",
    label: "Noto Emoji",
    baseUrl: `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@${NOTO_COMMIT}/png/128`,
    extension: "png",
    visibility: "public",
    version: NOTO_COMMIT,
    source: "https://github.com/googlefonts/noto-emoji",
    filename: (data) => `emoji_u${data.codepoint.replace(/-fe0f/gi, "").replace(/-/g, "_")}`,
    license: {
      name: "Apache-2.0",
      url: "https://github.com/googlefonts/noto-emoji",
      attribution: "Noto Emoji by Google and contributors",
    },
  }),
  twemoji: createCdnProvider({
    id: "twemoji",
    label: "Twemoji",
    baseUrl: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72",
    extension: "png",
    visibility: "public",
    version: "15.1.0",
    source: "https://github.com/jdecked/twemoji",
    supports: (data) => Number.parseFloat(data.emojiVersion ?? "Infinity") <= 15.1,
    filename: getTwemojiAssetId,
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Twemoji graphics by Twitter and contributors",
    },
  }),
  native: {
    id: "native",
    label: "Native Unicode",
    visibility: "public",
    version: "unicode",
    formats: [],
    local: true,
    source: "unicode",
    getUrl: () => null,
    resolve: () => null,
  } satisfies EmojiAssetProvider,
} as const;

/** Built-in providers with documented redistribution terms. */
export const providers: Record<EmojiStyle, EmojiAssetProvider> = {
  "fluent-3d": publicProviders.fluent3d,
  "fluent-color": publicProviders.fluentColor,
  "fluent-flat": publicProviders.fluentFlat,
  noto: publicProviders.noto,
  twemoji: publicProviders.twemoji,
  native: publicProviders.native,
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
