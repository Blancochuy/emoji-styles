import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Emoji,
  EmojiProvider,
  getAvailableEmojis,
  getEmojiData,
} from "react-emoji-styles";
import type { EmojiStyle, EmojiSize } from "react-emoji-styles";

// ─── Constants ───

const STYLES: { key: EmojiStyle; label: string; emoji: string }[] = [
  { key: "microsoft-teams", label: "Microsoft Teams", emoji: "🏢" },
  { key: "apple", label: "Apple", emoji: "" },
  { key: "google", label: "Google", emoji: "🔵" },
  { key: "samsung", label: "Samsung", emoji: "📱" },
  { key: "animated", label: "Animated", emoji: "✨" },
  { key: "twemoji", label: "Twitter/X", emoji: "🐦" },
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

// ─── Lazy Emoji Cell ───

function LazyEmojiCell({
  emoji,
  size,
  emojiStyle,
}: {
  emoji: string;
  size: number;
  emojiStyle: EmojiStyle;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevStyleRef = useRef(emojiStyle);
  const data = getEmojiData(emoji);

  // Reset loaded state when style changes so fade-in plays again
  useEffect(() => {
    if (prevStyleRef.current !== emojiStyle) {
      prevStyleRef.current = emojiStyle;
      setLoaded(false);
    }
  }, [emojiStyle]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Watch for image load inside this cell
  useEffect(() => {
    if (!visible || loaded) return;
    const el = containerRef.current;
    if (!el) return;
    // Small delay to let the DOM paint the new image
    const timeout = setTimeout(() => {
      const img = el.querySelector("img");
      if (!img) {
        setLoaded(true);
        return;
      }
      if (img.complete) {
        setLoaded(true);
        return;
      }
      const handleLoad = () => setLoaded(true);
      img.addEventListener("load", handleLoad);
      return () => img.removeEventListener("load", handleLoad);
    }, 50);
    return () => clearTimeout(timeout);
  }, [visible, loaded, emojiStyle]);

  return (
    <div
      ref={containerRef}
      className="emoji-cell"
      title={data?.alt ?? emoji}
    >
      {!visible && <div className="skeleton" />}
      {visible && !loaded && <div className="skeleton" />}
      {visible && (
        <div className={`emoji-cell-inner ${loaded ? "fade-in" : ""}`}>
          <Emoji emoji={emoji} size={size} style={emojiStyle} lazy />
        </div>
      )}
      <span className="emoji-label">{data?.alt ?? emoji}</span>
    </div>
  );
}

// ─── Theme Toggle Icon ───

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Component ───

export default function App() {
  const [style, setStyle] = useState<EmojiStyle>("microsoft-teams");
  const [size, setSize] = useState<SizeOption>(SIZES[4]); // xl
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

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

  return (
    <EmojiProvider defaultStyle={style}>
      <div className="app" data-theme={theme}>
        {/* Floating Navbar */}
        <nav className="navbar">
          <div className="nav-brand">
            <Emoji emoji="🎨" size={20} /> <span>Emoji Styles</span>
          </div>
          <div className="nav-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="eyebrow">Open Source Emoji Library</div>
          <h1 className="hero-title">Emoji Styles</h1>
          <p className="hero-subtitle">
            Browse emojis in 8 different styles with smooth fallback chains.
            Choose your preferred look and size.
          </p>
          <div className="stats-row">
            <div className="stat-pill">
              <span className="stat-number">{allEmojis.length}</span>
              <span className="stat-label">Emojis</span>
            </div>
            <div className="stat-pill">
              <span className="stat-number">{STYLES.length}</span>
              <span className="stat-label">Styles</span>
            </div>
            <div className="stat-pill">
              <span className="stat-number">{filteredEmojis.length}</span>
              <span className="stat-label">Showing</span>
            </div>
          </div>
        </header>

        {/* Controls */}
        <section className="controls-section">
          {/* Style Selector */}
          <div className="control-card">
            <div className="eyebrow">Style</div>
            <div className="pill-group">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  className={`pill ${style === s.key ? "active" : ""}`}
                  onClick={() => setStyle(s.key)}
                >
                  {s.emoji && <span className="pill-emoji">{s.emoji}</span>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size + Theme + Search Row */}
          <div className="control-row">
            {/* Size Selector */}
            <div className="control-card compact">
              <div className="eyebrow">Size</div>
              <div className="pill-group compact">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    className={`pill size-pill ${size.label === s.label ? "active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="search-wrapper">
              <SearchIcon />
              <input
                type="text"
                className="search-input"
                placeholder="Search emojis…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Side-by-Side Comparison */}
        <section className="section">
          <div className="eyebrow">Preview</div>
          <h2 className="section-title">
            Side-by-Side — {STYLES.find((s) => s.key === style)?.label}
          </h2>
          <div className="comparison-grid">
            {SAMPLE_EMOJIS.map((emoji) => (
              <div className="comparison-card" key={emoji}>
                <div className="emoji-preview">
                  <Emoji emoji={emoji} size={48} />
                </div>
                <div className="card-label">{getEmojiData(emoji)?.alt ?? emoji}</div>
              </div>
            ))}
          </div>
        </section>

        {/* All Styles Comparison */}
        <section className="section">
          <div className="eyebrow">Compare</div>
          <h2 className="section-title">All Styles — 🚀 Rocket</h2>
          <div className="comparison-grid">
            {STYLES.map((s) => (
              <div className="comparison-card" key={s.key}>
                <div className="emoji-preview">
                  <Emoji emoji="🚀" style={s.key} size={48} />
                </div>
                <div className="card-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Emoji Grid */}
        <section className="section">
          <div className="eyebrow">Collection</div>
          <h2 className="section-title">
            All Emojis — {STYLES.find((s) => s.key === style)?.label}
          </h2>
          <div className="emoji-grid">
            {filteredEmojis.map((emoji) => (
              <LazyEmojiCell
                key={emoji}
                emoji={emoji}
                size={size.px}
                emojiStyle={style}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>
            Powered by{" "}
            <strong>react-emoji-styles</strong>{" "}
            · Built with React + Vite
          </p>
        </footer>
      </div>
    </EmojiProvider>
  );
}
