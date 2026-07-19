import type {
  EmojiAssetProvider,
  EmojiData,
  EmojiAssetFormat,
  EmojiStyle,
  ProviderLicense,
  ProviderVisibility,
} from "./types";
import { fluentAssetNames } from "./fluent-data";
import { fluentAnimatedAssetNames } from "./fluent-animated-data";
import {
  SERENITYOS_DATASET_VERSION,
  SERENITYOS_RGI_ASSET_COUNT,
  serenityOSAssetIds,
} from "./serenityos-data";
import { emojiData } from "emoji-styles-data";

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
const FLUENT_ANIMATED_COMMIT = "daa0365c09795789ed2bc6e8b228c97736cb6669";
const NOTO_COMMIT = "8998f5dd683424a73e2314a8c1f1e359c19e8742";
const SERENITYOS_COMMIT = "b490eb8b17499c02d67c3e4de360e6ea583dc09c";

function serenityOSAssetId(data: Pick<EmojiData, "codepoint">): string {
  return data.codepoint
    .toUpperCase()
    .split("-")
    .filter((codepoint) => codepoint !== "FE0F")
    .map((codepoint) => `U+${codepoint}`)
    .join("_");
}

const FLUENT_SKIN_TONES: Record<string, readonly [folder: string, filename: string]> = {
  "1f3fb": ["Light", "light"],
  "1f3fc": ["Medium-Light", "medium-light"],
  "1f3fd": ["Medium", "medium"],
  "1f3fe": ["Medium-Dark", "medium-dark"],
  "1f3ff": ["Dark", "dark"],
};

function fluentAnimatedFilename(data: EmojiData): string | null {
  const codepoints = data.codepoint
    .toLowerCase()
    .split("-")
    .filter((codepoint) => codepoint !== "fe0f");
  const skinTones = codepoints.filter((codepoint) => FLUENT_SKIN_TONES[codepoint]);
  if (skinTones.length > 1) return null;

  const baseCodepoint = codepoints
    .filter((codepoint) => !FLUENT_SKIN_TONES[codepoint])
    .join("-");
  const mapped = fluentAnimatedAssetNames[baseCodepoint];
  if (!mapped) return null;

  const [folder, basename, hasSkinTones] = mapped;
  if (skinTones.length === 0) {
    return hasSkinTones
      ? `${encodeURIComponent(folder)}/Default/animated/${basename}_animated_default`
      : `${encodeURIComponent(folder)}/animated/${basename}_animated`;
  }
  if (!hasSkinTones) return null;

  const [toneFolder, toneFilename] = FLUENT_SKIN_TONES[skinTones[0]];
  return `${encodeURIComponent(folder)}/${toneFolder}/animated/${basename}_animated_${toneFilename}`;
}

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
  fluentAnimated: createCdnProvider({
    id: "fluent-animated",
    label: "Fluent Emoji Animated",
    baseUrl: `https://media.githubusercontent.com/media/microsoft/fluentui-emoji-animated/${FLUENT_ANIMATED_COMMIT}/assets`,
    extension: "png",
    visibility: "public",
    version: FLUENT_ANIMATED_COMMIT,
    source: "https://github.com/microsoft/fluentui-emoji-animated",
    supports: (data) => fluentAnimatedFilename(data) !== null,
    filename: (data) => fluentAnimatedFilename(data) ?? "unsupported",
    license: {
      name: "MIT",
      url: `https://github.com/microsoft/fluentui-emoji-animated/blob/${FLUENT_ANIMATED_COMMIT}/LICENSE`,
      attribution: "Fluent Emoji Animated by Microsoft",
    },
  }),
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
  serenityOS: createCdnProvider({
    id: "serenityos",
    label: "SerenityOS Pixel Art",
    baseUrl: `https://cdn.jsdelivr.net/gh/SerenityOS/serenity@${SERENITYOS_COMMIT}/Base/res/emoji`,
    extension: "png",
    visibility: "public",
    version: SERENITYOS_COMMIT,
    source: `https://github.com/SerenityOS/serenity/tree/${SERENITYOS_COMMIT}/Base/res/emoji`,
    supports: (data) => serenityOSAssetIds.has(serenityOSAssetId(data)),
    filename: serenityOSAssetId,
    coverage: () => {
      const total = Object.keys(emojiData).length;
      return {
        providerId: "serenityos",
        providerVersion: SERENITYOS_COMMIT,
        datasetVersion: SERENITYOS_DATASET_VERSION,
        total,
        supported: SERENITYOS_RGI_ASSET_COUNT,
        percentage: Number(((SERENITYOS_RGI_ASSET_COUNT / total) * 100).toFixed(2)),
        verified: true,
        source: `https://github.com/SerenityOS/serenity/tree/${SERENITYOS_COMMIT}/Base/res/emoji`,
      };
    },
    license: {
      name: "BSD-2-Clause",
      url: `https://github.com/SerenityOS/serenity/blob/${SERENITYOS_COMMIT}/LICENSE`,
      attribution: "SerenityOS emoji artwork by the SerenityOS developers and contributors",
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

/**
 * Licensed providers whose upstream delivery is intentionally rolling.
 * Keep these separate from `publicProviders` so production consumers can opt in.
 */
export const experimentalProviders = {
  notoAnimated: createCdnProvider({
    id: "noto-animated",
    label: "Noto Animated",
    baseUrl: "https://fonts.gstatic.com/s/e/notoemoji/latest",
    extension: "webp",
    format: "webp",
    visibility: "public",
    version: "rolling-latest",
    source: "https://googlefonts.github.io/noto-emoji-animation/",
    filename: (data) => `${data.codepoint.toLowerCase().replace(/-/g, "_")}/512`,
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Noto Animated Emoji by Google and contributors",
    },
  }),
} as const;

/** Built-in providers with documented redistribution terms. */
export const providers: Record<EmojiStyle, EmojiAssetProvider> = {
  "fluent-animated": publicProviders.fluentAnimated,
  "fluent-3d": publicProviders.fluent3d,
  "fluent-color": publicProviders.fluentColor,
  "fluent-flat": publicProviders.fluentFlat,
  noto: publicProviders.noto,
  serenityos: publicProviders.serenityOS,
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
