"use client";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import {
  getEmojiData,
  tokenizeEmojiText,
  type EmojiProviderRef,
  type EmojiSize,
} from "emoji-styles";
import { Emoji, type EmojiComponentProps } from "./Emoji";

export interface EmojiTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onError"> {
  children: string;
  provider?: EmojiProviderRef;
  fallbacks?: readonly EmojiProviderRef[];
  size?: EmojiSize;
  emojiClassName?: string;
  lazy?: boolean;
  loading?: "lazy" | "eager";
  fallback?: boolean;
  decorative?: boolean;
  onResolve?: EmojiComponentProps["onResolve"];
  onFallback?: EmojiComponentProps["onFallback"];
  onError?: EmojiComponentProps["onError"];
  getAlt?: (emoji: string) => string;
  /** Replace selected tokens with design-system components while retaining the default renderer. */
  renderEmoji?: (emoji: string, fallback: ReactElement, index: number) => ReactNode;
}

/** Render every supported emoji inside a text string through the provider system. */
export function EmojiText({
  children,
  provider,
  fallbacks,
  size = "md",
  emojiClassName,
  lazy = true,
  loading,
  fallback = true,
  decorative = false,
  onResolve,
  onFallback,
  onError,
  getAlt,
  renderEmoji,
  ...spanProps
}: EmojiTextProps) {
  const tokens = tokenizeEmojiText(children);

  return (
    <span {...spanProps}>
      {tokens.map((token, index) => {
        if (token.type === "text") return token.value;

        const defaultRenderer = (
          <Emoji
            emoji={token.value}
            provider={provider}
            fallbacks={fallbacks}
            size={size}
            className={emojiClassName}
            alt={getAlt?.(token.value) ?? getEmojiData(token.value)?.alt ?? token.value}
            lazy={lazy}
            loading={loading}
            fallback={fallback}
            decorative={decorative}
            onResolve={onResolve}
            onFallback={onFallback}
            onError={onError}
          />
        );

        return (
          <span key={`${token.value}-${index}`} data-emoji-token={token.value}>
            {renderEmoji?.(token.value, defaultRenderer, index) ?? defaultRenderer}
          </span>
        );
      })}
    </span>
  );
}
