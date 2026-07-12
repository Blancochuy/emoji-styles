"use client";
import { useState, useCallback, useMemo, useRef } from "react";
import { getEmojiUrl, getFallbackChain, hasEmoji, SIZE_MAP, type EmojiStyle, type EmojiSize } from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

export interface EmojiComponentProps {
  emoji: string;
  style?: EmojiStyle;
  size?: EmojiSize;
  className?: string;
  alt?: string;
  lazy?: boolean;
  fallback?: boolean;
}

export function Emoji({ emoji, style: styleProp, size = "md", className = "", alt, lazy = true, fallback = true }: EmojiComponentProps) {
  const ctx = useEmojiContext();
  const style = styleProp ?? ctx.defaultStyle;
  const [failed, setFailed] = useState(false);
  const fallbackIndex = useRef(0);

  const url = useMemo(() => getEmojiUrl(emoji, style), [emoji, style]);
  const fallbackChain = useMemo(() => getFallbackChain(emoji, style), [emoji, style]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    fallbackIndex.current++;
    if (fallbackIndex.current < fallbackChain.length) {
      e.currentTarget.src = fallbackChain[fallbackIndex.current];
    } else if (fallback) {
      setFailed(true);
    } else {
      e.currentTarget.style.display = "none";
    }
  }, [fallbackChain, fallback]);

  if (!hasEmoji(emoji) || !url) return <span className={className}>{emoji}</span>;
  if (failed) return <span className={className}>{emoji}</span>;

  const sizeClass = typeof size === "number" ? "" : SIZE_MAP[size] ?? "";
  const sizeStyle = typeof size === "number" ? { width: size, height: size } : undefined;

  return (
    <img
      src={url}
      alt={alt ?? `Emoji: ${emoji}`}
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      className={`inline-block object-contain ${sizeClass} ${className}`}
      style={sizeStyle}
      loading={lazy ? "lazy" : "eager"}
      draggable={false}
      onError={handleError}
    />
  );
}
