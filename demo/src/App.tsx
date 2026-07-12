import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Emoji,
  EmojiProvider,
  getAvailableEmojis,
  getEmojiData,
  providers,
} from "react-emoji-styles";
import type { EmojiAssetProvider, EmojiSize } from "react-emoji-styles";
import { localTwemojiProvider } from "emoji-styles-assets-twemoji";

// ─── Constants ───

const nativeProvider: EmojiAssetProvider = {
  id: "native",
  label: "Native Unicode",
  visibility: "custom",
  getUrl: () => null,
};

const STYLES: { key: string; label: string; emoji: string; provider: EmojiAssetProvider }[] = [
  { key: "microsoft-teams", label: "Microsoft Teams", emoji: "🏢", provider: providers["microsoft-teams"] },
  { key: "apple", label: "Apple", emoji: "", provider: providers.apple },
  { key: "google", label: "Google", emoji: "🔵", provider: providers.google },
  { key: "samsung", label: "Samsung", emoji: "📱", provider: providers.samsung },
  { key: "animated", label: "Animated", emoji: "✨", provider: providers.animated },
  { key: "twemoji-local", label: "Twemoji Local", emoji: "📦", provider: localTwemojiProvider },
  { key: "twemoji-cdn", label: "Twemoji CDN", emoji: "☁️", provider: providers.twemoji },
  { key: "native", label: "Native", emoji: "Aa", provider: nativeProvider },
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
const EMOJI_BATCH_SIZE = 180;

// ─── Lazy Emoji Cell ───

function LazyEmojiCell({
  emoji,
  size,
  emojiProvider,
}: {
  emoji: string;
  size: number;
  emojiProvider: EmojiAssetProvider;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevStyleRef = useRef(emojiProvider);
  const data = getEmojiData(emoji);

  // Reset loaded state when style changes so fade-in plays again
  useEffect(() => {
    if (prevStyleRef.current !== emojiProvider) {
      prevStyleRef.current = emojiProvider;
      setLoaded(false);
    }
  }, [emojiProvider]);

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
  }, [visible, loaded, emojiProvider]);

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
          <Emoji emoji={emoji} size={size} provider={emojiProvider} lazy />
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
  const [style, setStyle] = useState("microsoft-teams");
  const [size, setSize] = useState<SizeOption>(SIZES[4]); // xl
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(EMOJI_BATCH_SIZE);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = window.localStorage.getItem("emoji-styles-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("emoji-styles-theme", theme);
  }, [theme]);

  const allEmojis = useMemo(() => getAvailableEmojis(), []);
  const activeStyle = STYLES.find((item) => item.key === style) ?? STYLES[0];

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

  const visibleEmojis = useMemo(
    () => filteredEmojis.slice(0, visibleCount),
    [filteredEmojis, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(EMOJI_BATCH_SIZE);
  }, [search]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <EmojiProvider provider={activeStyle.provider}>
      <div className="app">
        {/* Floating Navbar */}
        <nav className="navbar">
          <div className="nav-brand">
            <Emoji emoji="🎨" size={20} /> <span>Emoji Styles</span>
          </div>
          <div className="nav-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              aria-pressed={theme === "dark"}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="eyebrow">Private provider laboratory</div>
          <h1 className="hero-title">Emoji Styles</h1>
          <p className="hero-subtitle">
            Inspect 893 mapped emojis across experimental, local, CDN, and native
            rendering modes before public release.
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
              <span className="stat-number">{visibleEmojis.length}</span>
              <span className="stat-label">Rendered</span>
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
                  aria-pressed={style === s.key}
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
                    aria-pressed={size.label === s.label}
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
            Preview — {activeStyle.label}
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
                  <Emoji emoji="🚀" provider={s.provider} size={48} />
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
            All Emojis — {activeStyle.label}
          </h2>
          {filteredEmojis.length > 0 ? (
            <div className="emoji-grid">
              {visibleEmojis.map((emoji) => (
                <LazyEmojiCell
                  key={emoji}
                  emoji={emoji}
                  size={size.px}
                  emojiProvider={activeStyle.provider}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <span className="empty-state-title">No matching emojis</span>
              <span className="empty-state-copy">
                Try a Unicode character or a broader English name.
              </span>
            </div>
          )}
          {visibleEmojis.length < filteredEmojis.length && (
            <div className="load-more-row">
              <button
                className="load-more-button"
                type="button"
                onClick={() => setVisibleCount((count) => count + EMOJI_BATCH_SIZE)}
              >
                Load {Math.min(EMOJI_BATCH_SIZE, filteredEmojis.length - visibleEmojis.length)} more
                <span>{visibleEmojis.length} of {filteredEmojis.length}</span>
              </button>
            </div>
          )}
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
