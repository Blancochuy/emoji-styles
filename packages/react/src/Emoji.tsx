"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getEmojiMetadata,
  getFallbackChain,
  getEmojiUrl,
  publicProviders,
  resolveEmoji,
  SIZE_MAP,
  type EmojiProviderRef,
  type EmojiResolution,
  type EmojiSize,
  type EmojiStyle,
} from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

const DEFAULT_FALLBACKS = [publicProviders.twemoji] as const;

export interface EmojiFallbackEvent {
  emoji: string;
  from: string | null;
  to: string | null;
  index: number;
  native: boolean;
}

export interface EmojiErrorEvent {
  emoji: string;
  url: string;
  providerId: string;
  index: number;
}

export interface EmojiComponentProps {
  emoji: string;
  style?: EmojiStyle;
  provider?: EmojiProviderRef;
  fallbacks?: readonly EmojiProviderRef[];
  /** Append native OS emoji after the configured provider chain. Defaults to true. */
  nativeFallback?: boolean;
  size?: EmojiSize;
  className?: string;
  /** Accessible label. Defaults to the CLDR label from the bundled dataset. */
  label?: string;
  /** @deprecated Use label. */
  alt?: string;
  decorative?: boolean;
  loading?: "lazy" | "eager";
  /** @deprecated Use loading="lazy" or loading="eager". */
  lazy?: boolean;
  /** @deprecated Use nativeFallback. */
  fallback?: boolean;
  onResolve?: (resolution: EmojiResolution) => void;
  onFallback?: (event: EmojiFallbackEvent) => void;
  onError?: (event: EmojiErrorEvent) => void;
}

function providerId(provider: EmojiProviderRef): string {
  return typeof provider === "string" ? provider : provider.id;
}

function sizeClass(size: EmojiSize): string {
  if (typeof size !== "number") return `emoji-styles--size-${size}`;
  const preset = Object.entries(SIZE_MAP).find(([, dimension]) => dimension === size)?.[0];
  return preset ? `emoji-styles--size-${preset}` : "emoji-styles--size-custom";
}

function NativeEmojiGlyph({ emoji, dimension }: { emoji: string; dimension: number }) {
  return (
    <svg
      className="emoji-styles__native-glyph"
      width={dimension}
      height={dimension}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <text
        className="emoji-styles__native-text"
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="88"
      >
        {emoji}
      </text>
    </svg>
  );
}

export function Emoji({
  emoji,
  style: styleProp,
  provider: providerProp,
  fallbacks: fallbackProps,
  nativeFallback: nativeFallbackProp,
  size = "md",
  className = "",
  label: labelProp,
  alt,
  decorative = false,
  loading: loadingProp,
  lazy,
  fallback,
  onResolve,
  onFallback,
  onError,
}: EmojiComponentProps) {
  const context = useEmojiContext();
  const provider = providerProp ?? styleProp ?? context.defaultProvider;
  const fallbacks = fallbackProps
    ?? context.fallbacks
    ?? DEFAULT_FALLBACKS;
  const nativeFallback = nativeFallbackProp ?? fallback ?? context.nativeFallback ?? true;
  const hasNativeFallback = fallbacks.some((candidate) => providerId(candidate) === publicProviders.native.id);
  const resolutionFallbacks = useMemo<readonly EmojiProviderRef[]>(
    () => nativeFallback && !hasNativeFallback ? [...fallbacks, publicProviders.native] : fallbacks,
    [fallbacks, hasNativeFallback, nativeFallback],
  );
  const loading = loadingProp ?? (lazy === false ? "eager" : "lazy");
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;
  const metadata = getEmojiMetadata(emoji);
  const label = labelProp ?? alt ?? metadata?.label ?? emoji;
  const dimension = typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const syncChain = useMemo(
    () => getFallbackChain(emoji, provider, resolutionFallbacks),
    [emoji, provider, resolutionFallbacks],
  );
  const syncUrl = syncChain[0] ?? getEmojiUrl(emoji, provider);
  const resolutionKey = `${emoji}:${providerId(provider)}:${resolutionFallbacks.map(providerId).join(",")}:${nativeFallback}`;
  const [runtime, setRuntime] = useState<{
    key: string;
    chain: readonly string[];
    index: number;
    exhausted: boolean;
  }>(() => ({ key: resolutionKey, chain: syncChain, index: 0, exhausted: false }));

  const current = runtime.key === resolutionKey
    ? runtime
    : { key: resolutionKey, chain: syncChain, index: 0, exhausted: false };
  const currentUrl = current.chain[current.index] ?? syncUrl;
  const isNativeProvider = providerId(provider) === publicProviders.native.id;
  const allowNative = isNativeProvider || hasNativeFallback || nativeFallback;
  const showNative = isNativeProvider || (allowNative && (!currentUrl || current.exhausted));

  useEffect(() => {
    let active = true;
    setRuntime({ key: resolutionKey, chain: syncChain, index: 0, exhausted: false });
    resolveEmoji(emoji, { provider, fallbacks: resolutionFallbacks })
      .then((resolution) => {
        if (!active) return;
        onResolveRef.current?.(resolution);
        const selectedUrl = resolution.selected?.url;
        if (selectedUrl && !syncChain.includes(selectedUrl)) {
          setRuntime({
            key: resolutionKey,
            chain: [selectedUrl, ...syncChain],
            index: 0,
            exhausted: false,
          });
        }
      })
      .catch(() => {
        // Provider errors are represented by the runtime image fallback and callback.
      });
    return () => { active = false; };
  }, [emoji, provider, resolutionKey]);

  const handleError = useCallback(() => {
    if (!currentUrl) return;
    onError?.({
      emoji,
      url: currentUrl,
      providerId: providerId(provider),
      index: current.index,
    });
    const nextIndex = current.index + 1;
    const nextUrl = current.chain[nextIndex] ?? null;
    if (nextUrl) {
      setRuntime({ ...current, index: nextIndex });
      onFallback?.({ emoji, from: currentUrl, to: nextUrl, index: nextIndex, native: false });
      return;
    }
    setRuntime({ ...current, exhausted: true });
    onFallback?.({ emoji, from: currentUrl, to: null, index: nextIndex, native: allowNative });
  }, [allowNative, current, currentUrl, emoji, onError, onFallback, provider]);

  const rootClassName = [
    "emoji-styles",
    sizeClass(size),
    decorative ? "emoji-styles--decorative" : "",
    className,
  ].filter(Boolean).join(" ");

  if (showNative) {
    return (
      <span
        className={`${rootClassName} emoji-styles--native`}
        data-emoji={emoji}
        data-provider="native"
        data-size={dimension}
        role={!decorative && metadata ? "img" : undefined}
        aria-label={!decorative && metadata ? label : undefined}
        aria-hidden={decorative || undefined}
      >
        <NativeEmojiGlyph emoji={emoji} dimension={dimension} />
      </span>
    );
  }

  if ((!currentUrl || current.exhausted) && !allowNative) {
    return (
      <span
        className={`${rootClassName} emoji-styles--hidden`}
        data-emoji={emoji}
        data-provider={providerId(provider)}
        data-size={dimension}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={rootClassName}
      data-emoji={emoji}
      data-provider={providerId(provider)}
      data-size={dimension}
      aria-hidden={decorative || undefined}
    >
      <img
        src={currentUrl}
        alt={decorative ? "" : label}
        width={dimension}
        height={dimension}
        loading={loading}
        decoding="async"
        className="emoji-styles__image"
        draggable={false}
        onError={handleError}
      />
    </span>
  );
}
