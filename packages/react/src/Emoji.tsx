"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { getEmojiUrl, getFallbackChain, SIZE_MAP, type EmojiAssetProvider, type EmojiStyle, type EmojiSize } from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

export interface EmojiComponentProps {
  emoji: string;
  style?: EmojiStyle;
  provider?: EmojiAssetProvider;
  size?: EmojiSize;
  className?: string;
  alt?: string;
  lazy?: boolean;
  fallback?: boolean;
}

const SKELETON_KEYFRAMES = `
@keyframes emoji-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
`;

let injectedStyles = false;
function ensureStyles() {
  if (!injectedStyles) {
    const style = document.createElement("style");
    style.textContent = SKELETON_KEYFRAMES;
    document.head.appendChild(style);
    injectedStyles = true;
  }
}

export function Emoji({ emoji, style: styleProp, provider: providerProp, size = "md", className = "", alt, lazy = true, fallback = true }: EmojiComponentProps) {
  const ctx = useEmojiContext();
  const provider = providerProp ?? styleProp ?? ctx.defaultProvider;
  const [failed, setFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fallbackIndex = useRef(0);

  const url = useMemo(() => getEmojiUrl(emoji, provider), [emoji, provider]);
  const fallbackChain = useMemo(() => getFallbackChain(emoji, provider), [emoji, provider]);
  const initialUrl = fallbackChain[0] ?? url;

  // Reset loaded state when url changes (style switch)
  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
    fallbackIndex.current = 0;
  }, [initialUrl]);

  // Set up IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    ensureStyles();

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [lazy, isVisible]);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      fallbackIndex.current++;
      if (fallbackIndex.current < fallbackChain.length) {
        e.currentTarget.src = fallbackChain[fallbackIndex.current];
      } else if (fallback) {
        setFailed(true);
      } else {
        e.currentTarget.style.display = "none";
      }
    },
    [fallbackChain, fallback]
  );

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const dimension = typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const isNative = provider === "native" || (typeof provider !== "string" && provider.id === "native");

  if (isNative) {
    return (
      <span
        className={className}
        aria-label={alt}
        style={{
          width: dimension,
          height: dimension,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: dimension,
          lineHeight: 1,
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        {emoji}
      </span>
    );
  }

  if (!initialUrl) return <span className={className}>{emoji}</span>;
  if (failed) return <span className={className}>{emoji}</span>;

  const sizeStyle = { width: dimension, height: dimension };

  return (
    <span
      ref={containerRef}
      className={`inline-block align-middle ${className}`}
      style={{
        width: dimension,
        height: dimension,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "4px",
            backgroundColor: "#e5e7eb",
            animation: "emoji-skeleton-pulse 1.5s ease-in-out infinite",
            ...sizeStyle,
          }}
        />
      )}

      {/* Actual emoji image */}
      {isVisible && (
        <img
          ref={imgRef}
          src={initialUrl}
          alt={alt ?? `Emoji: ${emoji}`}
          width={dimension}
          height={dimension}
          className="inline-block object-contain"
          style={{
            ...sizeStyle,
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? "scale(1)" : "scale(0.9)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
            position: "relative",
          }}
          draggable={false}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
    </span>
  );
}
