import {
  SIZE_MAP,
  getFallbackChain,
  publicProviders,
  resolveEmoji,
  resolveEmojiToken,
  type EmojiAssetFormat,
  type EmojiProviderRef,
  type EmojiResolution,
  type EmojiSize,
  type EmojiTheme,
  type ResolvedEmojiAsset,
  type ResolvedEmojiToken,
} from "emoji-styles";
import { getRegisteredProvider, getRegisteredProviders } from "./registry";

export interface RenderEmojiOptions {
  provider?: EmojiProviderRef | string;
  fallbacks?: readonly (EmojiProviderRef | string)[];
  label?: string;
  decorative?: boolean;
  size?: EmojiSize;
  className?: string;
  loading?: "lazy" | "eager";
  nativeFallback?: boolean;
  /** Render a hydratable Web Component host instead of a neutral span. */
  element?: "span" | "styled-emoji";
}

export interface RenderEmojiTokenOptions extends Omit<RenderEmojiOptions, "label" | "decorative"> {
  locale?: string;
}

export interface EmojiPreload {
  href: string;
  as: "image";
  type: string;
}

export interface RenderedEmojiHTML {
  html: string;
  emoji: string;
  label: string;
  decorative: boolean;
  asset: ResolvedEmojiAsset | null;
  resolution: EmojiResolution | null;
  tokenResolution?: ResolvedEmojiToken;
  preload?: EmojiPreload;
  fallbackUrls: readonly string[];
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resolveRef(ref: EmojiProviderRef | string): EmojiProviderRef {
  return typeof ref === "string" ? getRegisteredProvider(ref) ?? ref as EmojiProviderRef : ref;
}

function mimeType(format: EmojiAssetFormat): string {
  return format === "svg" ? "image/svg+xml" : `image/${format}`;
}

function numericSize(size: EmojiSize = "md"): number {
  return typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
}

function renderMarkup(
  emoji: string,
  label: string,
  decorative: boolean,
  asset: ResolvedEmojiAsset | null,
  options: RenderEmojiOptions,
  fallbackUrls: readonly string[] = [],
  tokenHost?: { token: string; themeId: string },
): string {
  const size = numericSize(options.size);
  const classes = ["styled-emoji", options.className].filter(Boolean).join(" ");
  const tagName = options.element ?? "span";
  const providerId = typeof options.provider === "string" ? options.provider : options.provider?.id;
  const componentAttributes = tagName === "styled-emoji" ? [
    `emoji="${escapeAttribute(emoji)}"`,
    tokenHost ? `token="${escapeAttribute(tokenHost.token)}"` : "",
    tokenHost ? `theme="${escapeAttribute(tokenHost.themeId)}"` : "",
    providerId ? `provider="${escapeAttribute(providerId)}"` : "",
    options.label ? `label="${escapeAttribute(options.label)}"` : "",
    `size="${size}"`,
    options.decorative ? "decorative" : "",
    `loading="${options.loading ?? "lazy"}"`,
  ].filter(Boolean) : [];
  const common = [
    `class="${escapeAttribute(classes)}"`,
    `data-emoji="${escapeAttribute(emoji)}"`,
    `data-size="${size}"`,
    asset ? `data-provider="${escapeAttribute(asset.providerId)}"` : `data-provider="native"`,
    decorative ? `aria-hidden="true"` : `role="img" aria-label="${escapeAttribute(label)}"`,
    ...componentAttributes,
  ].join(" ");
  const native = `<span class="styled-emoji__native"${asset ? " hidden" : ""} aria-hidden="true">${escapeText(emoji)}</span>`;
  if (!asset) return `<${tagName} ${common}>${native}</${tagName}>`;

  const remainingFallbacks = fallbackUrls.filter((url) => url !== asset.url);
  const fallbackAttribute = remainingFallbacks.length
    ? ` data-fallbacks="${escapeAttribute(JSON.stringify(remainingFallbacks))}"`
    : "";
  const alt = decorative ? "" : label;
  return `<${tagName} ${common}><img class="styled-emoji__image" src="${escapeAttribute(asset.url)}" alt="${escapeAttribute(alt)}" width="${size}" height="${size}" loading="${options.loading ?? "lazy"}" decoding="async" draggable="false"${fallbackAttribute}>${native}</${tagName}>`;
}

export async function renderEmojiToHTMLResult(
  emoji: string,
  options: RenderEmojiOptions = {},
): Promise<RenderedEmojiHTML> {
  const provider = resolveRef(options.provider ?? publicProviders.twemoji);
  const requestedFallbacks = options.fallbacks ?? (options.nativeFallback === false ? [] : [publicProviders.native]);
  const fallbacks = requestedFallbacks.map(resolveRef);
  const resolution = await resolveEmoji(emoji, { provider, fallbacks });
  const label = options.label ?? resolution.metadata.label;
  const fallbackUrls = getFallbackChain(emoji, provider, fallbacks);
  const asset = resolution.selected;
  return {
    html: renderMarkup(emoji, label, options.decorative ?? false, asset, options, fallbackUrls),
    emoji,
    label,
    decorative: options.decorative ?? false,
    asset,
    resolution,
    preload: asset ? { href: asset.url, as: "image", type: mimeType(asset.format) } : undefined,
    fallbackUrls,
  };
}

export async function renderEmojiToHTML(
  emoji: string,
  options: RenderEmojiOptions = {},
): Promise<string> {
  return (await renderEmojiToHTMLResult(emoji, options)).html;
}

export async function renderEmojiTokenToHTMLResult(
  token: string,
  theme: EmojiTheme,
  options: RenderEmojiTokenOptions = {},
): Promise<RenderedEmojiHTML> {
  const provider = options.provider ? resolveRef(options.provider) : undefined;
  const fallbacks = options.fallbacks?.map(resolveRef);
  const tokenResolution = await resolveEmojiToken(token, theme, {
    provider,
    fallbacks,
    locale: options.locale,
    providers: getRegisteredProviders(),
  });
  const asset = tokenResolution.asset;
  const definition = theme.tokens[token];
  const tokenProviderRef = options.provider
    ?? definition?.provider
    ?? theme.defaultProvider
    ?? publicProviders.twemoji;
  const tokenProvider = resolveRef(tokenProviderRef);
  const tokenFallbacks = (options.fallbacks ?? theme.fallbacks ?? [publicProviders.native]).map(resolveRef);
  const fallbackUrls = tokenResolution.source === "emoji-provider"
    ? getFallbackChain(tokenResolution.emoji, tokenProvider, tokenFallbacks)
    : [];
  return {
    html: renderMarkup(
      tokenResolution.emoji,
      tokenResolution.label,
      tokenResolution.decorative,
      asset,
      options,
      fallbackUrls,
      { token, themeId: theme.id },
    ),
    emoji: tokenResolution.emoji,
    label: tokenResolution.label,
    decorative: tokenResolution.decorative,
    asset,
    resolution: tokenResolution.emojiResolution,
    tokenResolution,
    preload: asset ? { href: asset.url, as: "image", type: mimeType(asset.format) } : undefined,
    fallbackUrls,
  };
}

export async function renderEmojiTokenToHTML(
  token: string,
  theme: EmojiTheme,
  options: RenderEmojiTokenOptions = {},
): Promise<string> {
  return (await renderEmojiTokenToHTMLResult(token, theme, options)).html;
}

export function renderPreloadLink(preload: EmojiPreload): string {
  return `<link rel="preload" href="${escapeAttribute(preload.href)}" as="${preload.as}" type="${escapeAttribute(preload.type)}">`;
}
