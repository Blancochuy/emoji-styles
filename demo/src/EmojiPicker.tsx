import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getAvailableEmojis, getEmojiData } from "react-emoji-styles";

const COMPACT_EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤔", "🙌",
  "👋", "👍", "👎", "🎉", "❤️", "🔥",
  "✨", "🚀", "💡", "✅", "⚠️", "🍌",
  "🌈", "🎨", "🤖", "💎", "🌟", "☄️",
] as const;

const ALL_EMOJIS = getAvailableEmojis();
const GRID_COLUMNS = 6;
const SEARCH_RESULT_LIMIT = 60;

export interface EmojiPickerProps {
  value: string;
  onSelect(emoji: string): void;
}

export function EmojiPicker({ value, onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [...COMPACT_EMOJIS];
    return ALL_EMOJIS.filter((emoji) => {
      const data = getEmojiData(emoji);
      return (
        emoji.includes(normalizedQuery) ||
        data?.alt.toLowerCase().includes(normalizedQuery) ||
        data?.name.toLowerCase().includes(normalizedQuery) ||
        data?.codepoint.toLowerCase().includes(normalizedQuery)
      );
    }).slice(0, SEARCH_RESULT_LIMIT);
  }, [query]);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  };

  const selectEmoji = (emoji: string) => {
    onSelect(emoji);
    closeAndRestoreFocus();
  };

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeAndRestoreFocus();
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    optionRefs.current = optionRefs.current.slice(0, results.length);
  }, [results.length, query]);

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, results.length - 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
    else if (event.key === "ArrowDown") nextIndex = Math.min(index + GRID_COLUMNS, results.length - 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(index - GRID_COLUMNS, 0);
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectEmoji(results[index]);
      return;
    } else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="emoji-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="emoji-picker-trigger"
        aria-label="Choose Unicode emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => {
          if (open) closeAndRestoreFocus();
          else setOpen(true);
        }}
      >
        <span aria-hidden="true">{value || "☄️"}</span>
      </button>
      {open && (
        <div
          id={dialogId}
          className="emoji-picker-popover"
          role="dialog"
          aria-label="Choose a Unicode fallback"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndRestoreFocus();
            }
          }}
        >
          <input
            ref={searchRef}
            className="emoji-picker-search"
            type="search"
            aria-label="Search Unicode emoji"
            placeholder="Search emoji…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && results.length) {
                event.preventDefault();
                optionRefs.current[0]?.focus();
              }
            }}
          />
          <div className="emoji-picker-grid" aria-label="Unicode emoji results">
            {results.map((emoji, index) => (
              <button
                type="button"
                key={emoji}
                ref={(element) => { optionRefs.current[index] = element; }}
                aria-label={getEmojiData(emoji)?.alt ?? emoji}
                aria-pressed={value === emoji}
                tabIndex={activeIndex === index ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                onClick={() => selectEmoji(emoji)}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
          {results.length === 0 && <p className="emoji-picker-empty" role="status">No emoji found</p>}
        </div>
      )}
    </div>
  );
}
