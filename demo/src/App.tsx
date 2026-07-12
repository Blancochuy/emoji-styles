import { useState, useMemo, useCallback } from "react";
import {
  Emoji,
  EmojiProvider,
  getAvailableEmojis,
  getEmojiData,
} from "react-emoji-styles";
import type { EmojiStyle, EmojiSize } from "react-emoji-styles";

// ─── Constants ───

const STYLES: { key: EmojiStyle; label: string }[] = [
  { key: "microsoft-teams", label: "Microsoft Teams" },
  { key: "apple", label: "Apple" },
  { key: "google", label: "Google" },
  { key: "samsung", label: "Samsung" },
  { key: "animated", label: "Animated" },
  { key: "twemoji", label: "Twitter/X" },
];

type SizeOption = { label: string; value: EmojiSize; px: number };
const SIZES: SizeOption[] = [
  { label: "xs", value: "xs", px: 12 },
  { label: "sm", value: "sm", px: 16 },
  { label: "md", value: "md", px: 20 },
  { label: "lg", value: "lg", px: 24 },
  { label: "xl", value: "xl", px: 32 },
  { label: "2xl", value: "2xl", px: 40 },
  { label: "3xl", value: "3xl", px: 48 },
];

const SAMPLE_EMOJIS = ["😀", "🎉", "🚀", "❤️", "🔥", "🌈"];

// ─── Component ───

export default function App() {
  const [style, setStyle] = useState<EmojiStyle>("microsoft-teams");
  const [size, setSize] = useState<SizeOption>(SIZES[4]); // xl
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const allEmojis = useMemo(() => getAvailableEmojis(), []);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return allEmojis;
    const q = search.toLowerCase();
    return allEmojis.filter((emoji) => {
      const data = getEmojiData(emoji);
      return (
        data?.alt.toLowerCase().includes(q) ||
        data?.name.toLowerCase().includes(q) ||
        emoji.includes(q)
      );
    });
  }, [allEmojis, search]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const themeIcon = theme === "dark" ? "🌙" : "☀️";

  return (
    <EmojiProvider defaultStyle={style}>
      <div className="app" data-theme={theme}>
        {/* Header */}
        <header className="header">
          <h1>Emoji Styles</h1>
          <p>
            Browse emojis in 6 different styles with smooth fallback chains.
            Choose your preferred look and size.
          </p>
        </header>

        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{allEmojis.length}</div>
            <div className="stat-label">Emojis</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{STYLES.length}</div>
            <div className="stat-label">Styles</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredEmojis.length}</div>
            <div className="stat-label">Showing</div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          {/* Style Selector */}
          <div className="control-group">
            <h3>Emoji Style</h3>
            <div className="style-buttons">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  className={`style-btn${style === s.key ? " active" : ""}`}
                  onClick={() => setStyle(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="control-group">
            <h3>Size</h3>
            <div className="size-buttons">
              {SIZES.map((s) => (
                <button
                  key={s.label}
                  className={`size-btn${size.label === s.label ? " active" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s.label} ({s.px}px)
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div
            className="theme-toggle"
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleTheme();
            }}
          >
            <span>{themeIcon}</span>
            <label>{theme === "dark" ? "Dark" : "Light"}</label>
          </div>
        </div>

        {/* Search */}
        <div className="control-group" style={{ marginBottom: "2rem" }}>
          <h3>Search Emojis</h3>
          <input
            type="text"
            className="search-input"
            placeholder="Type to filter emojis… (e.g. rocket, heart, fire)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Side-by-Side Comparison */}
        <section className="section">
          <h2 className="section-title">Side-by-Side Comparison</h2>
          <div className="comparison-grid">
            {SAMPLE_EMOJIS.map((emoji) => (
              <div className="comparison-card" key={emoji}>
                <div className="emoji-preview">
                  <Emoji emoji={emoji} size={48} />
                </div>
                <div className="style-name">
                  {STYLES.find((s) => s.key === style)?.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Styles Comparison */}
        <section className="section">
          <h2 className="section-title">
            All Styles — <Emoji emoji="🚀" size={24} /> Rocket
          </h2>
          <div className="comparison-grid">
            {STYLES.map((s) => (
              <div className="comparison-card" key={s.key}>
                <div className="emoji-preview">
                  <Emoji emoji="🚀" style={s.key} size={48} />
                </div>
                <div className="style-name">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Emoji Grid */}
        <section className="section">
          <h2 className="section-title">
            All Emojis — {STYLES.find((s) => s.key === style)?.label}
          </h2>
          <div className="emoji-grid">
            {filteredEmojis.map((emoji) => {
              const data = getEmojiData(emoji);
              return (
                <div
                  className="emoji-cell"
                  key={emoji}
                  title={data?.alt ?? emoji}
                >
                  <Emoji emoji={emoji} size={size.px} />
                  <span className="emoji-label">{data?.alt ?? emoji}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </EmojiProvider>
  );
}
