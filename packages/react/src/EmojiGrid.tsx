"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { getEmojiUrl, getFallbackChain, hasEmoji, SIZE_MAP, type EmojiAssetProvider, type EmojiProviderRef, type EmojiStyle, type EmojiSize } from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

export interface EmojiGridProps {
  emojis: string[];
  style?: EmojiStyle;
  provider?: EmojiAssetProvider;
  size?: EmojiSize;
  className?: string;
  gap?: number;
}

const GRID_SKELETON_KEYFRAMES = `
@keyframes emoji-grid-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
`;

let gridStylesInjected = false;
function ensureGridStyles() {
  if (!gridStylesInjected) {
    const style = document.createElement("style");
    style.textContent = GRID_SKELETON_KEYFRAMES;
    document.head.appendChild(style);
    gridStylesInjected = true;
  }
}

interface EmojiItemState {
  visible: boolean;
  loaded: boolean;
  failed: boolean;
  fallbackIndex: number;
}

export function EmojiGrid({ emojis, style: styleProp, provider: providerProp, size = "md", className = "", gap = 4 }: EmojiGridProps) {
  const ctx = useEmojiContext();
  const provider = providerProp ?? styleProp ?? ctx.defaultProvider;
  const gridRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<EmojiItemState[]>(() =>
    emojis.map(() => ({ visible: false, loaded: false, failed: false, fallbackIndex: 0 }))
  );

  // Reset items when emojis change
  useEffect(() => {
    setItems(emojis.map(() => ({ visible: false, loaded: false, failed: false, fallbackIndex: 0 })));
  }, [emojis]);

  // Single IntersectionObserver for the entire grid
  useEffect(() => {
    ensureGridStyles();

    if (typeof IntersectionObserver === "undefined") {
      setItems((prev) => prev.map((item) => ({ ...item, visible: true })));
      return;
    }

    const grid = gridRef.current;
    if (!grid) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Batch-update: mark all newly visible items
        const newlyVisible = new Set<number>();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.emojiIndex);
            if (!isNaN(idx)) {
              newlyVisible.add(idx);
            }
          }
        }

        if (newlyVisible.size > 0) {
          setItems((prev) => {
            let changed = false;
            const next = prev.map((item, i) => {
              if (newlyVisible.has(i) && !item.visible) {
                changed = true;
                return { ...item, visible: true };
              }
              return item;
            });
            return changed ? next : prev;
          });
        }
      },
      { rootMargin: "200px" }
    );

    // Observe all emoji children
    const children = grid.querySelectorAll<HTMLElement>("[data-emoji-index]");
    for (const child of children) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, [emojis]);

  const dim = typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const sizeStyle: React.CSSProperties = { width: dim, height: dim };

  return (
    <div
      ref={gridRef}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${dim}px, 1fr))`,
        gap,
      }}
    >
      {emojis.map((emoji, idx) => {
        const item = items[idx] ?? { visible: false, loaded: false, failed: false, fallbackIndex: 0 };

        if (!hasEmoji(emoji)) {
          return (
            <span
              key={`${emoji}-${idx}`}
              data-emoji-index={idx}
              className="inline-flex items-center justify-center"
              style={sizeStyle}
            >
              {emoji}
            </span>
          );
        }

        if (item.failed) {
          return (
            <span
              key={`${emoji}-${idx}`}
              data-emoji-index={idx}
              className="inline-flex items-center justify-center"
              style={sizeStyle}
            >
              {emoji}
            </span>
          );
        }

        return (
          <EmojiGridCell
            key={`${emoji}-${idx}`}
            emoji={emoji}
            provider={provider}
            size={size}
            sizeStyle={sizeStyle}
            dim={dim}
            visible={item.visible}
            loaded={item.loaded}
            failed={item.failed}
            fallbackIndex={item.fallbackIndex}
            onLoaded={() => {
              setItems((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], loaded: true };
                return next;
              });
            }}
            onFailed={(newFallbackIndex) => {
              setItems((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], failed: true, fallbackIndex: newFallbackIndex };
                return next;
              });
            }}
          />
        );
      })}
    </div>
  );
}

interface EmojiGridCellProps {
  emoji: string;
  provider: EmojiProviderRef;
  size: EmojiSize;
  sizeStyle: React.CSSProperties;
  dim: number;
  visible: boolean;
  loaded: boolean;
  failed: boolean;
  fallbackIndex: number;
  onLoaded: () => void;
  onFailed: (fallbackIndex: number) => void;
}

function EmojiGridCell({
  emoji,
  provider,
  size,
  sizeStyle,
  dim,
  visible,
  loaded,
  onLoaded,
  onFailed,
}: EmojiGridCellProps) {
  const fallbackChain = useMemo(() => getFallbackChain(emoji, provider), [emoji, provider]);
  const [currentFallbackIndex, setCurrentFallbackIndex] = useState(0);
  const url = useMemo(() => getEmojiUrl(emoji, provider), [emoji, provider]);
  const currentUrl = currentFallbackIndex < fallbackChain.length ? fallbackChain[currentFallbackIndex] : url;

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const nextIndex = currentFallbackIndex + 1;
      if (nextIndex < fallbackChain.length) {
        setCurrentFallbackIndex(nextIndex);
        e.currentTarget.src = fallbackChain[nextIndex];
      } else {
        onFailed(nextIndex);
      }
    },
    [currentFallbackIndex, fallbackChain, onFailed]
  );

  return (
    <span
      data-emoji-index
      className="inline-flex items-center justify-center relative"
      style={{
        ...sizeStyle,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Skeleton placeholder */}
      {!loaded && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "4px",
            backgroundColor: "#e5e7eb",
            animation: "emoji-grid-skeleton-pulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Actual emoji image */}
      {visible && (
        <img
          src={currentUrl ?? undefined}
          alt={`Emoji: ${emoji}`}
          width={dim}
          height={dim}
          className="inline-block object-contain"
          style={{
            ...sizeStyle,
            opacity: loaded ? 1 : 0,
            transform: loaded ? "scale(1)" : "scale(0.9)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
            position: "relative",
          }}
          draggable={false}
          onError={handleError}
          onLoad={onLoaded}
        />
      )}
    </span>
  );
}
