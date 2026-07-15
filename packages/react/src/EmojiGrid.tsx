"use client";
import type { EmojiProviderRef, EmojiSize, EmojiStyle } from "emoji-styles";
import { Emoji, type EmojiComponentProps } from "./Emoji";

export interface EmojiGridProps {
  emojis: string[];
  style?: EmojiStyle;
  provider?: EmojiProviderRef;
  fallbacks?: readonly EmojiProviderRef[];
  size?: EmojiSize;
  className?: string;
  gap?: number;
  loading?: "lazy" | "eager";
  decorative?: boolean;
  getLabel?: (emoji: string, index: number) => string | undefined;
  onResolve?: EmojiComponentProps["onResolve"];
  onFallback?: EmojiComponentProps["onFallback"];
  onError?: EmojiComponentProps["onError"];
}

/** A thin grid adapter that delegates all rendering and fallback behavior to Emoji. */
export function EmojiGrid({
  emojis,
  style,
  provider,
  fallbacks,
  size = "md",
  className = "",
  gap = 4,
  loading = "lazy",
  decorative = false,
  getLabel,
  onResolve,
  onFallback,
  onError,
}: EmojiGridProps) {
  return (
    <div
      className={["emoji-styles-grid", className].filter(Boolean).join(" ")}
      data-gap={gap}
      role="list"
    >
      {emojis.map((emoji, index) => (
        <span className="emoji-styles-grid__cell" role="listitem" key={`${emoji}-${index}`}>
          <Emoji
            emoji={emoji}
            style={style}
            provider={provider}
            fallbacks={fallbacks}
            size={size}
            label={getLabel?.(emoji, index)}
            decorative={decorative}
            loading={loading}
            onResolve={onResolve}
            onFallback={onFallback}
            onError={onError}
          />
        </span>
      ))}
    </div>
  );
}
