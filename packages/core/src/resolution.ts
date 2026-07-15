import {
  emojiData,
  emojiDatasetInfo,
  isRGIEmoji,
  normalizeEmoji,
  toEmojiCodepointSequence,
} from "emoji-styles-data";
import { publicProviders } from "./providers";
import { resolveProvider } from "./url";
import { tokenizeEmojiText } from "./tokenize";
import type {
  EmojiAssetFormat,
  EmojiAssetProvider,
  EmojiData,
  EmojiProviderRef,
  EmojiResolution,
  EmojiResolutionAttempt,
  NormalizedEmoji,
  NormalizedEmojiMetadata,
  ProviderCoverage,
  ResolvedEmojiAsset,
} from "./types";

export interface ResolveEmojiOptions {
  provider: EmojiProviderRef;
  fallbacks?: readonly EmojiProviderRef[];
}

export interface ProviderCoverageOptions {
  includeMissing?: boolean;
}

function inferFormat(provider: EmojiAssetProvider, url: string): EmojiAssetFormat {
  const declared = provider.formats?.[0];
  if (declared) return declared;
  const extension = url.split(/[?#]/, 1)[0].split(".").pop();
  if (extension === "svg" || extension === "webp" || extension === "avif") return extension;
  return "png";
}

export function createNormalizedEmoji(input: string): NormalizedEmoji | null {
  const normalized = normalizeEmoji(input);
  if (!normalized) return null;
  const data = emojiData[normalized] as EmojiData;
  return {
    input,
    normalized,
    data,
    metadata: {
      label: data.alt,
      codepoints: data.codepoints ?? data.codepoint.split("-"),
      sequence: data.sequence ?? data.codepoint,
      unicodeVersion: data.unicodeVersion,
      emojiVersion: data.emojiVersion,
      category: data.group,
      subgroup: data.subgroup,
    },
  };
}

function createUnknownEmoji(input: string): NormalizedEmoji {
  const normalized = input.normalize("NFC");
  const codepoint = toEmojiCodepointSequence(normalized);
  const data: EmojiData = {
    name: `emoji_${codepoint}`,
    alt: normalized,
    codepoint,
    codepoints: codepoint ? codepoint.split("-") : [],
    sequence: codepoint,
  };
  return {
    input,
    normalized,
    data,
    metadata: {
      label: normalized,
      codepoints: data.codepoints ?? [],
      sequence: codepoint,
    },
  };
}

export function getEmojiMetadata(input: string): NormalizedEmojiMetadata | null {
  return createNormalizedEmoji(input)?.metadata ?? null;
}

export function isEmoji(input: string): boolean {
  const tokens = tokenizeEmojiText(input);
  return tokens.length === 1 && tokens[0].type === "emoji" && tokens[0].value === input;
}

async function resolveAttempt(
  normalized: NormalizedEmoji,
  provider: EmojiAssetProvider,
): Promise<ResolvedEmojiAsset | null> {
  if (!isRGIEmoji(normalized.normalized) && !provider.supportsUnknownEmoji) return null;
  if (provider.resolve) return await provider.resolve(normalized);
  const url = provider.getUrl?.(normalized.data, normalized.normalized) ?? null;
  if (!url) return null;
  return {
    providerId: provider.id,
    providerVersion: provider.version ?? "legacy",
    url,
    format: inferFormat(provider, url),
    local: provider.local ?? false,
    license: provider.license,
  };
}

export async function resolveEmoji(
  input: string,
  options: ResolveEmojiOptions,
): Promise<EmojiResolution> {
  const known = createNormalizedEmoji(input);
  if (!known && !isEmoji(input)) throw new Error("resolveEmoji requires exactly one emoji grapheme");
  const normalized = known ?? createUnknownEmoji(input);
  const refs = [options.provider, ...(options.fallbacks ?? [])];
  const attempts: EmojiResolutionAttempt[] = [];
  let selected: ResolvedEmojiAsset | null = null;
  let selectedIndex = -1;
  let nativeFallback = false;
  let nativeIndex = -1;

  for (let index = 0; index < refs.length; index++) {
    const provider = resolveProvider(refs[index]);
    if (!provider) {
      attempts.push({ providerId: String(refs[index]), status: "error", asset: null, error: "Unknown provider" });
      continue;
    }
    if (provider.id === publicProviders.native.id) {
      nativeFallback = true;
      nativeIndex = index;
      attempts.push({ providerId: provider.id, status: "native", asset: null });
      break;
    }

    try {
      const asset = await resolveAttempt(normalized, provider);
      attempts.push({
        providerId: provider.id,
        status: asset ? "resolved" : "unsupported",
        asset,
      });
      if (asset) {
        selected = asset;
        selectedIndex = index;
        break;
      }
    } catch (error) {
      attempts.push({
        providerId: provider.id,
        status: "error",
        asset: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    input,
    normalized: normalized.normalized,
    metadata: normalized.metadata,
    selected,
    attempts,
    fallbackUsed: selectedIndex > 0 || nativeIndex > 0,
    nativeFallback,
  };
}

export async function getProviderCoverage(
  providerRef: EmojiProviderRef,
  options: ProviderCoverageOptions = {},
): Promise<ProviderCoverage> {
  const provider = resolveProvider(providerRef);
  if (!provider) throw new Error(`Unknown provider: ${String(providerRef)}`);
  if (provider.getCoverage) return await provider.getCoverage();

  const missing: string[] = [];
  let supported = 0;
  for (const emoji of Object.keys(emojiData)) {
    const normalized = createNormalizedEmoji(emoji)!;
    if (provider.id === publicProviders.native.id) {
      supported++;
      continue;
    }
    try {
      if (await resolveAttempt(normalized, provider)) supported++;
      else if (options.includeMissing) missing.push(emoji);
    } catch {
      if (options.includeMissing) missing.push(emoji);
    }
  }
  const total = Object.keys(emojiData).length;
  return {
    providerId: provider.id,
    providerVersion: provider.version ?? "legacy",
    datasetVersion: emojiDatasetInfo.emojiVersion,
    total,
    supported,
    percentage: total === 0 ? 0 : Number(((supported / total) * 100).toFixed(2)),
    verified: false,
    source: provider.source,
    missing: options.includeMissing ? missing : undefined,
  };
}
