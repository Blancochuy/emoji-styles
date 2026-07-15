import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Emoji,
  EmojiText,
  EmojiProvider,
  createMappedProvider,
  getAvailableEmojis,
  getEmojiData,
  providers,
  publicProviders,
} from "react-emoji-styles";
import type { EmojiAssetProvider, EmojiSize } from "react-emoji-styles";
import { localTwemojiProvider } from "emoji-styles-assets-twemoji";

// ─── Constants ───

const STYLES: { key: string; label: string; emoji: string; provider: EmojiAssetProvider }[] = [
  { key: "fluent-3d", label: "Fluent 3D", emoji: "◉", provider: publicProviders.fluent3d },
  { key: "fluent-color", label: "Fluent Color", emoji: "◐", provider: publicProviders.fluentColor },
  { key: "fluent-flat", label: "Fluent Flat", emoji: "◇", provider: publicProviders.fluentFlat },
  { key: "noto", label: "Noto", emoji: "N", provider: publicProviders.noto },
  { key: "twemoji-local", label: "Twemoji Local", emoji: "📦", provider: localTwemojiProvider },
  { key: "twemoji-cdn", label: "Twemoji CDN", emoji: "☁️", provider: providers.twemoji },
  { key: "native", label: "Native (OS)", emoji: "Aa", provider: publicProviders.native },
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

const EMOJI_BATCH_SIZE = 180;

const PRODUCT_PROVIDER = createMappedProvider({
  id: "product-language",
  label: "Product icons",
  assets: { "🚀": "/custom/deploy.svg" },
  fallback: publicProviders.fluent3d,
});

// ─── Framework code examples ───

const FRAMEWORK_EXAMPLES = [
  {
    id: "react",
    label: "React",
    code: `import { Emoji, EmojiProvider, publicProviders } from 'react-emoji-styles';

<EmojiProvider provider={publicProviders.fluent3d}>
  <Emoji emoji="🚀" size="lg" />
</EmojiProvider>`,
  },
  {
    id: "vue",
    label: "Vue",
    code: `<template>
  <img :src="rocketUrl" alt="Rocket" width="32" height="32" />
</template>

<script setup>
import { getEmojiUrl } from 'emoji-styles';
const rocketUrl = getEmojiUrl('🚀', 'noto');
</script>`,
  },
  {
    id: "svelte",
    label: "Svelte",
    code: `<script>
  import { getEmojiUrl } from 'emoji-styles';
  const rocketUrl = getEmojiUrl('🚀', 'twemoji');
</script>

<img src={rocketUrl} alt="Rocket" width="32" height="32" />`,
  },
  {
    id: "angular",
    label: "Angular",
    code: `import { Component } from '@angular/core';
import { getEmojiUrl } from 'emoji-styles';

@Component({
  standalone: true,
  template: \`<img [src]="rocketUrl" alt="Rocket" />\`,
})
export class Reaction {
  rocketUrl = getEmojiUrl('🚀', 'fluent-color');
}`,
  },
];

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

  useEffect(() => {
    if (!visible || loaded) return;
    const el = containerRef.current;
    if (!el) return;
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

// ─── SVG Icons ───

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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function FrameworkIcon({ id }: { id: string }) {
  if (id === "react") {
    return (
      <svg className="framework-icon react-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" />
      </svg>
    );
  }
  if (id === "vue") {
    return (
      <svg className="framework-icon vue-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#42b883" d="M1.5 3.5h5L12 13l5.5-9.5h5L12 21z" />
        <path fill="#35495e" d="M6.5 3.5h3L12 8l2.5-4.5h3L12 13z" />
      </svg>
    );
  }
  if (id === "svelte") {
    return (
      <svg className="framework-icon svelte-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.8 3.1a6 6 0 0 0-7.2-.2L5.2 6.3a4.1 4.1 0 0 0-1.7 2.5 4 4 0 0 0 .5 2.8 4 4 0 0 0-.7 1.7 4.2 4.2 0 0 0 .6 3.1 6 6 0 0 0 8.3 1.9l5.4-3.4a4.1 4.1 0 0 0 1.7-2.5 4 4 0 0 0-.5-2.8 4 4 0 0 0 .7-1.7 4.2 4.2 0 0 0-1.7-4.8Zm-5.9 13.1a3.2 3.2 0 0 1-4.4-1l-.1-.2.7-.4.1.2a2.4 2.4 0 0 0 3.3.7l5.4-3.4a1.7 1.7 0 0 0 .5-2.4 1.8 1.8 0 0 0-2.4-.6l-5.4 3.4a3.3 3.3 0 0 1-4.5-1 3.2 3.2 0 0 1 1-4.5l5.4-3.4a3.2 3.2 0 0 1 4.4 1l.1.2-.7.4-.1-.2a2.4 2.4 0 0 0-3.3-.7L6.5 7.7a1.7 1.7 0 0 0-.5 2.4 1.8 1.8 0 0 0 2.4.6l5.4-3.4a3.3 3.3 0 0 1 4.5 1 3.2 3.2 0 0 1-1 4.5l-5.4 3.4Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="framework-icon angular-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 1.5 21 4.7l-1.4 12.1L12 22.5l-7.6-5.7L3 4.7 12 1.5Z" />
      <path fill="var(--surface)" d="m12 5-5 11h2l1-2.3h4L15 16h2L12 5Zm-.8 6.8L12 9.7l.8 2.1h-1.6Z" />
    </svg>
  );
}

// ─── Copy Button Component ───

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      className="copy-button"
      onClick={handleCopy}
      title={label ?? "Copy to clipboard"}
      aria-label={label ?? "Copy to clipboard"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

// ─── Syntax Highlighter (CSS-based) ───

function highlightCode(code: string, language: string): React.ReactNode {
  const lines = code.split("\n");
  const tokenPattern = /(\/\/.*$|\/\*.*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][^>]*>|\b(?:import|export|from|const|let|function|return|class|new|default|true|false|null|undefined|standalone|template|setup)\b|\b\d+\b|\b(?:Emoji|EmojiProvider|getEmojiUrl|providers)\b)/g;

  const renderLine = (line: string) => {
    const output: React.ReactNode[] = [];
    let cursor = 0;
    for (const match of line.matchAll(tokenPattern)) {
      const index = match.index ?? 0;
      if (index > cursor) output.push(line.slice(cursor, index));
      const token = match[0];
      let className = "hl-keyword";
      if (token.startsWith("//") || token.startsWith("/*")) className = "hl-comment";
      else if (/^['"`]/.test(token)) className = "hl-string";
      else if (token.startsWith("<")) className = "hl-tag";
      else if (/^\d+$/.test(token)) className = "hl-number";
      else if (/^(Emoji|EmojiProvider|getEmojiUrl|providers)$/.test(token)) className = "hl-component";
      output.push(<span className={className} key={`${index}-${token}`}>{token}</span>);
      cursor = index + token.length;
    }
    if (cursor < line.length) output.push(line.slice(cursor));
    return output.length ? output : " ";
  };

  return lines.map((line, i) => (
    <span key={`${language}-${i}`} className="code-line">
      <span className="line-number">{i + 1}</span>
      <span className="code-line-source">{renderLine(line)}</span>
    </span>
  ));
}

// ─── Component ───

export default function App() {
  const [style, setStyle] = useState("fluent-3d");
  const [size, setSize] = useState<SizeOption>(SIZES[4]); // xl
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(EMOJI_BATCH_SIZE);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = window.localStorage.getItem("emoji-styles-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [activeTab, setActiveTab] = useState("react");
  const [featuredEmoji, setFeaturedEmoji] = useState("🚀");

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

  const activeExample = FRAMEWORK_EXAMPLES.find((f) => f.id === activeTab) ?? FRAMEWORK_EXAMPLES[0];
  const providerCode = style === "twemoji-local"
    ? "localTwemojiProvider"
    : ({
        "fluent-3d": "publicProviders.fluent3d",
        "fluent-color": "publicProviders.fluentColor",
        "fluent-flat": "publicProviders.fluentFlat",
        noto: "publicProviders.noto",
        "twemoji-cdn": "publicProviders.twemoji",
        native: "publicProviders.native",
      } as Record<string, string>)[style] ?? "publicProviders.twemoji";
  const providerImport = style === "twemoji-local"
    ? `import { Emoji } from 'react-emoji-styles';\nimport { localTwemojiProvider } from 'emoji-styles-assets-twemoji';`
    : `import { Emoji, publicProviders } from\n  'react-emoji-styles';`;
  const playgroundCode = `${providerImport}

export function Reaction() {
  return (
    <Emoji
      emoji="${featuredEmoji}"
      provider={${providerCode}}
      size="${size.label}"
    />
  );
}`;

  return (
    <EmojiProvider provider={activeStyle.provider}>
      <div className="app-shell">
        <nav className="navbar" aria-label="Main navigation">
          <a className="nav-brand" href="#top" aria-label="Emoji Styles home">
            <span className="brand-mark"><Emoji emoji="🙂" size={18} /></span>
            <span>Emoji <strong>Styles</strong></span>
          </a>
          <div className="nav-center">
            <a href="#playground">Playground</a>
            <a href="#how">How it works</a>
            <a href="#agents">For agents</a>
            <a href="#collection">Collection</a>
          </div>
          <div className="nav-actions">
            <a href="https://github.com/JarvisBotBlanco/emoji-styles" target="_blank" rel="noopener noreferrer" className="nav-link" aria-label="View on GitHub"><GitHubIcon /></a>
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>

        <main>
          <header className="hero" id="top">
            <div className="hero-noise" />
            <div className="hero-copy">
              <h1 className="hero-title">One emoji.<br /><span>Every style.</span></h1>
              <p className="hero-subtitle">Beautiful emoji, without the vendor lock-in. A tiny, typed React API for consistent expression across every interface.</p>
              <div className="hero-actions">
                <button className="primary-cta" onClick={() => document.querySelector("#playground")?.scrollIntoView({ behavior: "smooth" })}>
                  Try the playground <span>↘</span>
                </button>
                <div className="install-inline">
                  <span className="terminal-glyph">›_</span>
                  <code className="install-code">npm i react-emoji-styles</code>
                  <CopyButton text="npm install react-emoji-styles" />
                </div>
              </div>
              <div className="hero-meta">
                <span><i /> {allEmojis.length}+ emoji</span>
                <span><i /> {STYLES.length} providers</span>
                <span><i /> Zero runtime deps</span>
              </div>
            </div>

            <div className="hero-stage" aria-label="Same emoji rendered by multiple providers">
              <div className="stage-grid" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-core">
                <span className="core-pulse" />
                <Emoji emoji={featuredEmoji} provider={activeStyle.provider} size={104} />
              </div>
              {STYLES.slice(0, 6).map((s, i) => (
                <button
                  key={s.key}
                  className={`provider-float provider-float-${i + 1} ${style === s.key ? "active" : ""}`}
                  onClick={() => setStyle(s.key)}
                  aria-label={`Preview ${s.label}`}
                >
                  <span className="provider-dot" />
                  <Emoji emoji={featuredEmoji} provider={s.provider} size={i === 0 ? 48 : 40} />
                  <small>{s.label}</small>
                </button>
              ))}
              <div className="stage-toolbar">
                <span><b>{activeStyle.label}</b> · {featuredEmoji}</span>
                <div className="emoji-switcher">
                  {["🚀", "🔥", "💡", "🎉"].map((emoji) => (
                    <button key={emoji} className={featuredEmoji === emoji ? "active" : ""} onClick={() => setFeaturedEmoji(emoji)} aria-label={`Try ${emoji}`}>{emoji}</button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <section className="trust-strip" aria-label="Product qualities">
            <span>TypeScript first</span><i />
            <span>Tree-shakeable</span><i />
            <span>SSR ready</span><i />
            <span>Accessible fallbacks</span>
          </section>

          <section className="section how-section" id="how">
            <div className="section-heading centered">
              <div className="eyebrow">How it works</div>
              <h2>From Unicode to unforgettable UI.</h2>
              <p>Three small decisions. One consistent visual language across your product.</p>
            </div>
            <div className="process-grid">
              <article className="process-card">
                <span className="process-number">01</span>
                <div className="process-visual provider-mini-grid">
                  {STYLES.slice(0, 4).map((s) => <span key={s.key}><Emoji emoji="✨" provider={s.provider} size={27} /></span>)}
                </div>
                <h3>Choose a provider</h3>
                <p>Pick one visual system—or switch at runtime with a single prop.</p>
              </article>
              <article className="process-card featured">
                <span className="process-number">02</span>
                <div className="process-visual code-mini">
                  <span><em>const</em> mood = <b>"🚀"</b></span>
                  <span>&lt;<strong>Emoji</strong> emoji=mood /&gt;</span>
                </div>
                <h3>Drop in the component</h3>
                <p>Typed props, semantic alt text and smart fallbacks included.</p>
              </article>
              <article className="process-card">
                <span className="process-number">03</span>
                <div className="process-visual device-mini">
                  <span className="device desktop"><Emoji emoji="🚀" size={25} /></span>
                  <span className="device tablet"><Emoji emoji="🚀" size={20} /></span>
                  <span className="device phone"><Emoji emoji="🚀" size={16} /></span>
                </div>
                <h3>Ship everywhere</h3>
                <p>Consistent output across screens, platforms and user devices.</p>
              </article>
            </div>
          </section>

          <section className="section agents-section" id="agents">
            <div className="agents-panel">
              <div className="agents-copy">
                <span className="section-kicker">Semantic asset layer</span>
                <h2>Turn emoji into your product language.</h2>
                <p>Keep Unicode as the portable token, then resolve it to licensed emoji, brand artwork, or components from your design system. Humans and agents author the same simple text while the product controls the result.</p>
                <div className="agent-benefits">
                  <div><strong>01</strong><span><b>Partial mappings</b> override only the emoji your product owns.</span></div>
                  <div><strong>02</strong><span><b>Automatic text parsing</b> handles adjacent emoji, skin tones, and ZWJ sequences.</span></div>
                  <div><strong>03</strong><span><b>Safe fallback chains</b> keep everything else complete and accessible.</span></div>
                </div>
              </div>
              <div className="agent-console" aria-label="Agent-generated component example">
                <div className="agent-console-bar"><span>agent / ui-task</span><i>verified</i></div>
                <div className="agent-prompt"><span>›</span><p>Map 🚀 to our deploy icon. Keep every other emoji on Fluent.</p></div>
                <pre><code>{highlightCode(`const product = createMappedProvider({\n  assets: { '🚀': '/icons/deploy.svg' },\n  fallback: publicProviders.fluent3d,\n});\n\n<EmojiText provider={product}>\n  Shipping now 🚀\n</EmojiText>`, "tsx")}</code></pre>
                <div className="agent-result"><span>Output</span><EmojiText provider={PRODUCT_PROVIDER} size={56}>🚀</EmojiText><strong>unicode in · brand asset out</strong></div>
              </div>
            </div>
          </section>

          <section className="section playground-section" id="playground">
            <div className="section-heading playground-heading">
              <div><div className="eyebrow">Live playground</div><h2>Make it yours.</h2></div>
              <p>Everything below is live. Change the renderer, scale the output, and search the full collection.</p>
            </div>
            <div className="playground-window">
              <div className="window-bar">
                <div className="window-dots"><i /><i /><i /></div>
                <span>emoji-styles / playground</span>
                <span className="live-badge"><i /> Live</span>
              </div>
              <div className="playground-layout">
                <aside className="playground-controls">
                  <label>Provider <span>{activeStyle.label}</span></label>
                  <div className="provider-list">
                    {STYLES.map((s) => (
                      <button key={s.key} className={style === s.key ? "active" : ""} onClick={() => setStyle(s.key)}>
                        <span><Emoji emoji="✨" provider={s.provider} size={18} /> {s.label}</span><i />
                      </button>
                    ))}
                  </div>
                  <label>Output size <span>{size.px}px</span></label>
                  <div className="size-options">
                    {SIZES.map((s) => <button key={s.label} className={size.label === s.label ? "active" : ""} onClick={() => setSize(s)}>{s.label}</button>)}
                  </div>
                </aside>

                <div className="playground-preview">
                  <div className="preview-topbar">
                    <div className="search-wrapper"><SearchIcon /><input className="search-input" placeholder="Search the collection…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <span>{filteredEmojis.length} results</span>
                  </div>
                  <div className="featured-output">
                    <div className="output-glow" />
                    <Emoji emoji={featuredEmoji} provider={activeStyle.provider} size={Math.max(size.px * 2, 64)} />
                    <div><span>Current output</span><strong>{featuredEmoji} · {activeStyle.label}</strong></div>
                  </div>
                  <div className="quick-grid">
                    {visibleEmojis.slice(0, 18).map((emoji) => (
                      <button key={emoji} className={featuredEmoji === emoji ? "active" : ""} onClick={() => setFeaturedEmoji(emoji)} title={getEmojiData(emoji)?.alt ?? emoji}>
                        <Emoji emoji={emoji} size={size.px} provider={activeStyle.provider} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="playground-code">
                  <div className="code-tabs"><span className="active">React</span><span>JSX</span><CopyButton text={playgroundCode} /></div>
                  <pre className="playground-code-content"><code>{highlightCode(playgroundCode, "tsx")}</code></pre>
                  <div className="code-note">Typed, lazy-loaded and ready to ship.</div>
                </div>
              </div>
            </div>
          </section>

          <section className="section frameworks-section">
            <div className="section-heading"><div className="eyebrow">Framework agnostic</div><h2>One core. Your stack.</h2></div>
            <div className="framework-tabs">
              {FRAMEWORK_EXAMPLES.map((fw) => <button key={fw.id} className={`${fw.id} ${activeTab === fw.id ? "active" : ""}`} onClick={() => setActiveTab(fw.id)}><FrameworkIcon id={fw.id} /><span>{fw.label}</span></button>)}
            </div>
            <div className="framework-content-new">
              <div className="framework-result"><span>Rendered output</span><Emoji emoji={featuredEmoji} size={96} /><strong>{activeStyle.label}</strong></div>
              <div className="code-block"><div className="code-header"><span className="code-lang">{activeTab === "react" ? "tsx" : activeTab}</span><CopyButton text={activeExample.code} label="Copy code" /></div><pre className="code-content"><code>{highlightCode(activeExample.code, activeTab)}</code></pre></div>
            </div>
          </section>

          <section className="section collection-section" id="collection">
            <div className="section-heading collection-heading"><div><div className="eyebrow">The collection</div><h2>{allEmojis.length} reasons to express yourself.</h2></div><span>Rendering in <b>{activeStyle.label}</b></span></div>
            {filteredEmojis.length > 0 ? (
              <div className="emoji-grid">{visibleEmojis.map((emoji) => <LazyEmojiCell key={emoji} emoji={emoji} size={size.px} emojiProvider={activeStyle.provider} />)}</div>
            ) : <div className="empty-state" role="status"><span className="empty-state-title">No matching emojis</span><span className="empty-state-copy">Try a broader English name or Unicode character.</span></div>}
            {visibleEmojis.length < filteredEmojis.length && <div className="load-more-row"><button className="load-more-button" onClick={() => setVisibleCount((count) => count + EMOJI_BATCH_SIZE)}>Load more <span>{visibleEmojis.length} / {filteredEmojis.length}</span></button></div>}
          </section>

          <section className="cta-section">
            <div><span className="eyebrow">Ready when you are</span><h2>Give every reaction<br /><em>the right expression.</em></h2></div>
            <div className="cta-actions"><div className="install-inline"><span className="terminal-glyph">›_</span><code className="install-code">npm i react-emoji-styles</code><CopyButton text="npm install react-emoji-styles" /></div><a href="https://github.com/JarvisBotBlanco/emoji-styles" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a></div>
            <div className="cta-emoji"><Emoji emoji="🤩" provider={publicProviders.fluent3d} size={150} /></div>
          </section>
        </main>

        <footer className="footer"><div className="footer-left"><span className="brand-mark"><Emoji emoji="🙂" size={16} /></span><span className="footer-brand">Emoji Styles</span></div><div className="footer-links"><a href="https://github.com/JarvisBotBlanco/emoji-styles" target="_blank" rel="noopener noreferrer"><GitHubIcon /> GitHub</a><a href="https://github.com/JarvisBotBlanco/emoji-styles/blob/master/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">Asset licenses</a><span>MIT code</span></div><span className="footer-right">Built for expressive interfaces.</span></footer>
      </div>
    </EmojiProvider>
  );
}
