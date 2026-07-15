"use client";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import {
  getEmojiData,
  tokenizeEmojiText,
  type EmojiAssetProvider,
  type EmojiSize,
} from "emoji-styles";
import { Emoji } from "./Emoji";

export interface EmojiTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: string;
  provider?: EmojiAssetProvider;
  size?: EmojiSize;
  emojiClassName?: string;
  lazy?: boolean;
  fallback?: boolean;
  getAlt?: (emoji: string) => string;
  /** Replace selected tokens with design-system components while retaining the default renderer. */
  renderEmoji?: (emoji: string, fallback: ReactElement, index: number) => ReactNode;
}

/** Render every supported emoji inside a text string through the provider system. */
export function EmojiText({
  children,
  provider,
  size = "md",
  emojiClassName,
  lazy = true,
  fallback = true,
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
            size={size}
            className={emojiClassName}
            alt={getAlt?.(token.value) ?? getEmojiData(token.value)?.alt ?? token.value}
            lazy={lazy}
            fallback={fallback}
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
