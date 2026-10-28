"use client";
import { useState } from "react";
import {
  SIZE_MAP,
  getCompiledEmojiDimension,
  getCompiledEmojiLabel,
  getCompiledEmojiToken,
  type CompiledEmojiTheme,
  type CompiledEmojiTokenName,
  type EmojiSize,
} from "emoji-styles/compiled";

export interface CompiledEmojiTokenProps<Theme extends CompiledEmojiTheme = CompiledEmojiTheme> {
  token: CompiledEmojiTokenName<Theme>;
  /** A theme produced by `emoji-styles theme compile`. */
  theme: Theme;
  size?: EmojiSize;
  className?: string;
  /** Locale used to pick one of the compiled `labels`. */
  locale?: string;
  /** Overrides the compiled accessible label. */
  label?: string;
  /** Overrides the compiled decorative flag. */
  decorative?: boolean;
  loading?: "lazy" | "eager";
  /** Same meaning as on `Emoji`: `lazy={false}` loads eagerly. */
  lazy?: boolean;
}

function sizeClass(size: EmojiSize): string {
  if (typeof size !== "number") return `emoji-styles--size-${size}`;
  const preset = Object.entries(SIZE_MAP).find(([, dimension]) => dimension === size)?.[0];
  return preset ? `emoji-styles--size-${preset}` : "emoji-styles--size-custom";
}

/**
 * Render a token of a compiled theme without the emoji catalog. Tries each compiled source in
 * order on image error, then the Unicode fallback if the theme allows it, otherwise nothing.
 * Server-rendered markup contains the first source; no browser API is used while rendering.
 */
export function CompiledEmojiToken<Theme extends CompiledEmojiTheme>({
  token,
  theme,
  size = "md",
  className = "",
  locale,
  label: labelProp,
  decorative: decorativeProp,
  loading: loadingProp,
  lazy,
}: CompiledEmojiTokenProps<Theme>) {
  const entry = getCompiledEmojiToken(theme, token);
  const key = `${theme.meta.theme.id}@${theme.meta.theme.version}:${token}:${entry?.sources.map((source) => source.url).join("|")}`;
  const [failed, setFailed] = useState({ key, count: 0 });
  // Restart from the first source when the token or its sources change (state adjusted during render).
  if (failed.key !== key) setFailed({ key, count: 0 });
  if (!entry) {
    return <span className={className || undefined} data-emoji-token={token} data-emoji-error="Unknown emoji token">{token}</span>;
  }

  const count = failed.key === key ? failed.count : 0;
  const source = entry.sources[count];
  const label = labelProp ?? getCompiledEmojiLabel(entry, locale);
  const decorative = decorativeProp ?? entry.decorative;
  const dimension = getCompiledEmojiDimension(size);
  const rootClassName = ["emoji-styles", sizeClass(size), decorative ? "emoji-styles--decorative" : "", className].filter(Boolean).join(" ");
  const common = { "data-emoji-token": token, "data-emoji-theme": theme.meta.theme.id, "data-emoji": entry.emoji, "data-size": dimension } as const;

  if (!source && entry.unicode) {
    return (
      <span
        className={`${rootClassName} emoji-styles--native`}
        {...common}
        data-provider="native"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
      >
        <svg className="emoji-styles__native-glyph" width={dimension} height={dimension} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <text className="emoji-styles__native-text" x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="88">{entry.unicode}</text>
        </svg>
      </span>
    );
  }
  if (!source) return <span className={`${rootClassName} emoji-styles--hidden`} {...common} aria-hidden="true" />;

  return (
    <span className={rootClassName} {...common} data-provider={source.provider} aria-hidden={decorative || undefined}>
      <img
        src={source.url}
        alt={decorative ? "" : label}
        width={dimension}
        height={dimension}
        loading={loadingProp ?? (lazy === false ? "eager" : "lazy")}
        decoding="async"
        className="emoji-styles__image"
        draggable={false}
        onError={() => setFailed({ key, count: count + 1 })}
      />
    </span>
  );
}
