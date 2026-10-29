import { memo, useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Emoji,
  EmojiProvider,
  experimentalProviders,
  getAvailableEmojis,
  getEmojiData,
  providers,
  publicProviders,
} from "react-emoji-styles";
import type { EmojiAssetProvider, EmojiSize } from "react-emoji-styles";
import { localTwemojiProvider } from "emoji-styles-assets-twemoji";
import { agentReadyAssetUrl, customEmojiProvider } from "./custom-emoji/custom-emoji/runtime";
import { customGlossAssetUrl, customGlossProvider } from "./custom-emoji/custom-gloss/runtime";
import { customSoft3dAssetUrl, customSoft3dProvider } from "./custom-emoji/custom-soft-3d/runtime";
import { customClayAssetUrl, customClayProvider } from "./custom-emoji/custom-clay/runtime";
import { customDragonAssetUrl, customDragonProvider } from "./custom-emoji/custom-dragon/runtime";
import { EmojiPicker } from "./EmojiPicker";
import { CheckIcon, CopyButton, highlightCode } from "./ui";
import { CompiledEmojiToken } from "react-emoji-styles/compiled";
import { compiledEmojiTheme } from "./compiled/demo-theme.compiled";
import { BUNDLE_GROUPS, CompiledSection, SkillsSection } from "./Showcase";
import { createCatalogIndex, filterCatalog } from "./catalog";

// ─── Constants ───

const STYLES: { key: string; label: string; emoji: string; provider: EmojiAssetProvider }[] = [
  { key: "custom-emoji", label: "Custom Emoji", emoji: "✦", provider: customEmojiProvider },
  { key: "serenityos", label: "SerenityOS Pixel Art", emoji: "▦", provider: publicProviders.serenityOS },
  { key: "fluent-animated", label: "Fluent Animated", emoji: "▶", provider: publicProviders.fluentAnimated },
  { key: "noto-animated", label: "Noto Animated", emoji: "▶", provider: experimentalProviders.notoAnimated },
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
const CUSTOM_COVERAGE_NOTE = "Custom artwork covers the robot emoji only. Other entries use Fluent 3D, then Twemoji or native fallback when needed.";
const SERENITYOS_COVERAGE_NOTE = "Partial catalog · exact SerenityOS matches use pixel art; unsupported sequences fall back to Twemoji/native.";
const DEFAULT_FREE_STYLE = "A playful kinetic emoji made from translucent gel and brushed metal, with asymmetrical motion, one electric-cyan accent, and soft studio lighting.";
// Demo inputs stay as data so the product's own audit does not mistake
// configurable fallback values or decorative UI glyphs for raw semantic UI.
const ROCKET_EMOJI = String.fromCodePoint(0x1f680);
const EXTERNAL_LINK_GLYPH = String.fromCodePoint(0x2197);

const CUSTOM_EXAMPLES = [
  {
    id: "agent-core",
    style: "Agent Core",
    token: "agent.ready",
    emoji: "🤖",
    label: "AI agent ready",
    description: "Dark tech 3D",
    assetUrl: agentReadyAssetUrl,
    provider: customEmojiProvider,
    providerExport: "customEmojiProvider",
    providerPath: "./custom-emoji/custom-emoji/runtime",
  },
  {
    id: "classic-gloss",
    style: "Classic Gloss",
    token: "reaction.love",
    emoji: "😍",
    label: "Love this",
    description: "Glossy lacquer",
    assetUrl: customGlossAssetUrl,
    provider: customGlossProvider,
    providerExport: "customGlossProvider",
    providerPath: "./custom-emoji/custom-gloss/runtime",
  },
  {
    id: "soft-3d",
    style: "Soft 3D",
    token: "action.launch",
    emoji: "🚀",
    label: "Launch project",
    description: "Satin geometry",
    assetUrl: customSoft3dAssetUrl,
    provider: customSoft3dProvider,
    providerExport: "customSoft3dProvider",
    providerPath: "./custom-emoji/custom-soft-3d/runtime",
  },
  {
    id: "clay-pop",
    style: "Clay Pop",
    token: "status.idea",
    emoji: "💡",
    label: "New idea",
    description: "Sculpted clay",
    assetUrl: customClayAssetUrl,
    provider: customClayProvider,
    providerExport: "customClayProvider",
    providerPath: "./custom-emoji/custom-clay/runtime",
  },
  {
    id: "chinese-dragon",
    style: "Chinese Dragon",
    token: "dragon.emoji",
    emoji: "🐉",
    label: "Fierce Chinese flying dragon",
    description: "Jade serpentine 3D",
    assetUrl: customDragonAssetUrl,
    provider: customDragonProvider,
    providerExport: "customDragonProvider",
    providerPath: "./custom-emoji/custom-dragon/runtime",
  },
] as const;

type StudioTab = "theme" | "audit" | "proof";

const AUDIT_EXAMPLES = {
  before: `export function Launch() {
  return (
    <button>${ROCKET_EMOJI}</button>
  );
}`,
  after: `import { EmojiToken } from 'react-emoji-styles';

export function Launch() {
  return (
    <button aria-label="Launch project">
      <EmojiToken token="action.launch" decorative />
    </button>
  );
}`,
} as const;

const STUDIO_TABS: Array<{ id: StudioTab; index: string; label: string; detail: string }> = [
  { id: "theme", index: "01", label: "Theme Builder", detail: "Name intent once" },
  { id: "audit", index: "02", label: "Audit Flow", detail: "Catch policy drift" },
  { id: "proof", index: "03", label: "Reproducibility", detail: "Inspect the evidence" },
];

// ─── Framework code examples ───

const FRAMEWORK_EXAMPLES = [
  {
    id: "react",
    label: "React",
    language: "tsx",
    note: "Catalog-free component · SSR safe",
    code: `import { CompiledEmojiToken } from 'react-emoji-styles/compiled';
import 'react-emoji-styles/styles.css';
import { compiledEmojiTheme } from './emoji-theme.compiled';

<CompiledEmojiToken
  token="action.launch"
  theme={compiledEmojiTheme}
  size="lg"
/>`,
  },
  {
    id: "vue",
    label: "Vue",
    language: "vue",
    note: "SSR string · clean hydration",
    code: `<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { renderCompiledEmojiTokenToHTML, installCompiledEmojiFallbacks } from 'emoji-styles-web/compiled';
import 'emoji-styles-web/styles.css';
import { compiledEmojiTheme } from './emoji-theme.compiled';

const host = ref(null);
let stopFallbacks;
const html = renderCompiledEmojiTokenToHTML(
  'action.launch', compiledEmojiTheme, { size: 24 },
);
onMounted(() => {
  stopFallbacks = installCompiledEmojiFallbacks(host.value);
});
onBeforeUnmount(() => stopFallbacks?.());
</script>

<template><span ref="host" v-html="html" /></template>`,
  },
  {
    id: "astro",
    label: "Astro",
    language: "astro",
    note: "Static HTML · fallbacks across navigations",
    code: `---
import { renderCompiledEmojiTokenToHTML } from 'emoji-styles-web/compiled';
import { compiledEmojiTheme } from '../emoji-theme.compiled';
const html = renderCompiledEmojiTokenToHTML('action.launch', compiledEmojiTheme);
---
<Fragment set:html={html} />

<script>
  import { installCompiledEmojiFallbacks } from 'emoji-styles-web/compiled';
  installCompiledEmojiFallbacks();
</script>`,
  },
  {
    id: "svelte",
    label: "Svelte",
    language: "svelte",
    note: "Custom element · framework owns class",
    code: `<script>
  import { defineCompiledEmoji } from 'emoji-styles-web/compiled';
  import 'emoji-styles-web/styles.css';
  import { compiledEmojiTheme } from './emoji-theme.compiled';
  let active = false;
  defineCompiledEmoji(compiledEmojiTheme);
</script>

<compiled-emoji token="action.launch" size="24" class:active></compiled-emoji>`,
  },
  {
    id: "angular",
    label: "Angular",
    language: "ts",
    note: "Custom element · CUSTOM_ELEMENTS_SCHEMA",
    code: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { defineCompiledEmoji } from 'emoji-styles-web/compiled';
import { compiledEmojiTheme } from './emoji-theme.compiled';

defineCompiledEmoji(compiledEmojiTheme);

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<compiled-emoji token="action.launch" size="24" />\`,
})
export class LaunchButton {}`,
  },
];

// ─── Lazy Emoji Cell ───

const LazyEmojiCell = memo(function LazyEmojiCell({
  emoji, label, size, emojiProvider, selected, onSelect,
}: {
  emoji: string;
  label: string;
  size: number;
  emojiProvider: EmojiAssetProvider;
  selected: boolean;
  onSelect(emoji: string): void;
}) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

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
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      ref={containerRef}
      className="emoji-cell"
      title={label}
      aria-label={`Select ${label}`}
      aria-pressed={selected}
      onClick={() => onSelect(emoji)}
    >
      {!visible && <span className="skeleton" aria-hidden="true" />}
      {visible && <Emoji emoji={emoji} size={size} provider={emojiProvider} decorative loading="lazy" />}
      <span className="emoji-label" aria-hidden="true">{label}</span>
    </button>
  );
});

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
  if (id === "astro") {
    return (
      <svg className="framework-icon astro-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2.5 13.9 9 20.5 12 13.9 15 12 21.5 10.1 15 3.5 12 10.1 9Z" />
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

// ─── Component ───

export default function App() {
  const [style, setStyle] = useState("custom-emoji");
  const [size, setSize] = useState<SizeOption>(SIZES[4]); // xl
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [visibleCount, setVisibleCount] = useState(EMOJI_BATCH_SIZE);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = window.localStorage.getItem("emoji-styles-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [activeTab, setActiveTab] = useState("react");
  const [featuredEmoji, setFeaturedEmoji] = useState("🤖");
  const [customExampleId, setCustomExampleId] = useState("agent-core");
  const [freeStyleToken, setFreeStyleToken] = useState("brand.momentum");
  const [freeStyleEmoji, setFreeStyleEmoji] = useState("☄️");
  const [freeStyleDirection, setFreeStyleDirection] = useState(DEFAULT_FREE_STYLE);
  const [studioTab, setStudioTab] = useState<StudioTab>("theme");
  const [themeToken, setThemeToken] = useState("action.launch");
  const [themeEmoji, setThemeEmoji] = useState(ROCKET_EMOJI);
  const [themeLabel, setThemeLabel] = useState("Launch project");
  const [themeProviderKey, setThemeProviderKey] = useState("fluent-3d");
  const [auditView, setAuditView] = useState<"before" | "after">("before");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("emoji-styles-theme", theme);
  }, [theme]);

  const allEmojis = useMemo(() => getAvailableEmojis(), []);
  const activeStyle = STYLES.find((item) => item.key === style) ?? STYLES[0];
  const activeCustomExample = CUSTOM_EXAMPLES.find((item) => item.id === customExampleId) ?? CUSTOM_EXAMPLES[0];
  const isFreeStyle = customExampleId === "free-style";

  const catalog = useMemo(() => createCatalogIndex(), []);
  const categories = useMemo(() => [...new Set(catalog.map((entry) => entry.category))], [catalog]);
  const filteredEntries = useMemo(() => filterCatalog(catalog, search, category), [catalog, search, category]);
  const filteredEmojis = useMemo(() => filteredEntries.map((entry) => entry.emoji), [filteredEntries]);
  const coverageNote = style === "custom-emoji" ? CUSTOM_COVERAGE_NOTE
    : style === "serenityos" ? SERENITYOS_COVERAGE_NOTE : null;
  const visibleEmojis = useMemo(
    () => filteredEmojis.slice(0, visibleCount),
    [filteredEmojis, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(EMOJI_BATCH_SIZE);
  }, [search, category]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const showCustomEmoji = useCallback(() => {
    setStyle("custom-emoji");
    setFeaturedEmoji("🤖");
    document.querySelector("#custom-emoji")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const activeExample = FRAMEWORK_EXAMPLES.find((f) => f.id === activeTab) ?? FRAMEWORK_EXAMPLES[0];
  const themeProvider = STYLES.find((item) => item.key === themeProviderKey) ?? STYLES[3];
  const themeProviderCode = themeProviderKey === "custom-emoji"
    ? "customEmojiProvider"
    : ({
        "fluent-animated": "publicProviders.fluentAnimated",
        "noto-animated": "experimentalProviders.notoAnimated",
        "fluent-3d": "publicProviders.fluent3d",
        "fluent-color": "publicProviders.fluentColor",
        "fluent-flat": "publicProviders.fluentFlat",
        noto: "publicProviders.noto",
      } as Record<string, string>)[themeProviderKey] ?? "publicProviders.fluent3d";
  const themeImports = themeProviderKey === "custom-emoji"
    ? `import { EmojiToken, defineEmojiTheme } from 'react-emoji-styles';
import { customEmojiProvider } from './emoji/custom-emoji';`
    : themeProviderKey === "noto-animated"
      ? `import { EmojiToken, defineEmojiTheme, experimentalProviders } from 'react-emoji-styles';`
      : `import { EmojiToken, defineEmojiTheme, publicProviders } from 'react-emoji-styles';`;
  const providerCode = style === "twemoji-local"
    ? "localTwemojiProvider"
    : style === "custom-emoji"
      ? "customEmojiProvider"
      : ({
          "fluent-3d": "publicProviders.fluent3d",
          "fluent-animated": "publicProviders.fluentAnimated",
          "fluent-color": "publicProviders.fluentColor",
          "fluent-flat": "publicProviders.fluentFlat",
          "noto-animated": "experimentalProviders.notoAnimated",
          noto: "publicProviders.noto",
          serenityos: "publicProviders.serenityOS",
          "twemoji-cdn": "publicProviders.twemoji",
          native: "publicProviders.native",
        } as Record<string, string>)[style] ?? "publicProviders.twemoji";
  const providerImport = style === "twemoji-local"
    ? `import { Emoji } from 'react-emoji-styles';\nimport { localTwemojiProvider } from 'emoji-styles-assets-twemoji';`
    : style === "custom-emoji"
      ? `import { Emoji } from 'react-emoji-styles';\nimport { customEmojiProvider } from './emoji/custom-emoji';`
      : style === "noto-animated"
        ? `import { Emoji, experimentalProviders } from\n  'react-emoji-styles';`
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
  const customExampleCode = `import { ${activeCustomExample.providerExport} } from '${activeCustomExample.providerPath}';

<Emoji
  emoji="${activeCustomExample.emoji}"
  provider={${activeCustomExample.providerExport}}
  label="${activeCustomExample.label}"
  size="3xl"
/>`;
  const freeStylePrompt = `$emoji-asset-creator Create an original custom emoji and local provider.

Semantic token: ${freeStyleToken.trim() || "brand.momentum"}
Unicode fallback: ${freeStyleEmoji.trim() || "☄️"}
Visual direction: ${freeStyleDirection.trim() || DEFAULT_FREE_STYLE}

Keep it emoji-first: one clear subject, a strong silhouette at 24 px, transparent background, no text or logos, and a consistent visual system that can expand into a complete set. Do not imitate a proprietary vendor style.`;
  const themeCode = `${themeImports}

const productTheme = defineEmojiTheme({
  '${themeToken.trim() || "action.launch"}': {
    emoji: '${themeEmoji.trim() || ROCKET_EMOJI}',
    label: '${themeLabel.trim() || "Launch project"}',
  },
}, {
  id: 'product',
  version: '1.0.0',
  defaultProvider: ${themeProviderCode},
});

<EmojiToken token="${themeToken.trim() || "action.launch"}" size="3xl" />`;

  return (
    <EmojiProvider provider={activeStyle.provider}>
      <div className="app-shell">
        <nav className="navbar" aria-label="Main navigation">
          <a className="nav-brand" href="#top" aria-label="Emoji Styles home">
            <span className="brand-mark"><Emoji emoji="🙂" size={18} /></span>
            <span>Emoji <strong>Styles</strong></span>
          </a>
          <div className="nav-center">
            <a href="#custom-emoji">Custom Emoji</a>
            <a href="#skills">Skills</a>
            <a href="#studio">Studio</a>
            <a href="#compiled">Compiled</a>
            <a href="#playground">Explorer</a>
            <a href="#frameworks">Frameworks</a>
          </div>
          <div className="nav-actions">
            <a href="https://github.com/Blancochuy/emoji-styles" target="_blank" rel="noopener noreferrer" className="nav-link" aria-label="View on GitHub"><GitHubIcon /></a>
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>

        <main>
          <header className="hero" id="top">
            <div className="hero-noise" />
            <div className="hero-copy">
              <button className="hero-announcement" onClick={() => document.querySelector("#compiled")?.scrollIntoView({ behavior: "smooth" })}><span>0.3.1</span> Compiled themes · {(BUNDLE_GROUPS.web.rows[2].bytes / 1000).toFixed(1)} kB on the web <b>↘</b></button>
              <h1 className="hero-title">Your emoji.<br /><span>Your style.</span></h1>
              <p className="hero-subtitle">Create original emoji with your AI agent. Compare providers, inspect the artwork, and render it with a typed API.</p>
              <div className="hero-actions">
                <button className="primary-cta" onClick={showCustomEmoji}>
                  Create a custom emoji <span>↘</span>
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
                <span><i /> 3 agent skills</span>
                <span><i /> Typed fallbacks</span>
              </div>
            </div>

            <div className="hero-stage" aria-label="Same emoji rendered by multiple providers">
              <div className="stage-grid" />
              <div className="stage-caption"><span>Provider comparison</span><small>Select a style to preview</small></div>
              <div className="hero-core">
                <span className="hero-output-label">{activeStyle.label}</span>
                <Emoji emoji={featuredEmoji} provider={activeStyle.provider} size={104} className="motion-float motion-hero" />
              </div>
              <div className="provider-samples">
              {STYLES.slice(0, 6).map((s) => (
                <button
                  key={s.key}
                  className={`provider-sample ${style === s.key ? "active" : ""}`}
                  onClick={() => setStyle(s.key)}
                  aria-label={`Preview ${s.label}`}
                  aria-pressed={style === s.key}
                >
                  <span className="provider-dot" />
                  <Emoji emoji={featuredEmoji} provider={s.provider} size={40} />
                  <small>{s.label}</small>
                </button>
              ))}
              </div>
              <div className="stage-toolbar">
                <span><b>{activeStyle.label}</b> · {featuredEmoji}</span>
                <div className="emoji-switcher">
                  {["🚀", "🔥", "🤖", "💡", "🎉"].map((emoji) => (
                    <button key={emoji} className={featuredEmoji === emoji ? "active" : ""} aria-pressed={featuredEmoji === emoji} onClick={() => setFeaturedEmoji(emoji)} aria-label={`Try ${emoji}`}>{emoji}</button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <section className="trust-strip" aria-label="Product qualities">
            <span>3 agent skills</span><i />
            <span>TypeScript first</span><i />
            <span>SSR ready</span><i />
            <span>Catalog-free builds</span><i />
            <span>Accessible fallbacks</span>
          </section>

          <section className="section custom-emoji-section" id="custom-emoji">
            <div className="custom-emoji-intro">
              <div>
                <span className="section-kicker">Custom Asset Studio · $emoji-asset-creator</span>
                <h2>Describe it.<br /><em>Ship it as emoji.</em></h2>
              </div>
              <div className="custom-emoji-summary">
                <p>Give your agent an intent and a visual direction. The skill guides generation, preserves native transparency, normalizes the artwork, and records validation and provenance for review.</p>
                <button className="text-cta" onClick={() => document.querySelector("#playground")?.scrollIntoView({ behavior: "smooth" })}>Try it in the playground <span>↘</span></button>
              </div>
            </div>
            <div className="custom-workflow" aria-label="Custom emoji creation workflow">
              <article><span>01 · Describe</span><strong>Define intent + style</strong><p>“Create a dark 3D robot for <code>agent.ready</code> with one acid-lime spark.”</p></article>
              <i>→</i>
              <article><span>02 · Generate</span><strong>Create the anchor</strong><p>Codex generates and visually reviews an original high-resolution source.</p></article>
              <i>→</i>
              <article><span>03 · Validate</span><strong>Normalize + record</strong><p>Alpha, safe area, centering, format, hash, license status, and provenance.</p></article>
              <i>→</i>
              <article><span>04 · Render</span><strong>Use one typed API</strong><p>Map the asset to Unicode or a semantic token, with a configurable fallback.</p></article>
            </div>
            <div className="custom-lab-heading">
              <div><span className="section-kicker">Custom Emoji Lab</span><h3>One pipeline. Different visual languages.</h3></div>
              <p>Start from an original example or define your own visual language. The presets inspire; the pipeline stays completely open.</p>
            </div>
            <div className="custom-style-grid" aria-label="Generated custom emoji examples">
              {CUSTOM_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  className={customExampleId === example.id ? "active" : ""}
                  onClick={() => setCustomExampleId(example.id)}
                  aria-pressed={customExampleId === example.id}
                >
                  <span className="custom-style-visual"><img src={example.assetUrl} alt={example.label} data-provider={example.provider.id} /></span>
                  <span className="custom-style-copy"><strong>{example.style}</strong><small>{example.emoji} · {example.description}</small></span>
                  <i>↗</i>
                </button>
              ))}
              <button
                className={`free-style-card ${isFreeStyle ? "active" : ""}`}
                onClick={() => setCustomExampleId("free-style")}
                aria-pressed={isFreeStyle}
              >
                <span className="custom-style-visual free-style-icon"><b>+</b></span>
                <span className="custom-style-copy"><strong>Create your own</strong><small>Free Style · your visual language</small></span>
                <i>↗</i>
              </button>
            </div>
            {isFreeStyle ? (
              <div className="custom-emoji-showcase free-style-showcase">
                <div className="free-style-builder">
                  <div className="free-style-builder-heading">
                    <span>Define your visual language</span>
                    <strong>No fixed aesthetic. Emoji guardrails only.</strong>
                  </div>
                  <div className="free-style-fields">
                    <label>
                      <span>Semantic token</span>
                      <input value={freeStyleToken} onChange={(event) => setFreeStyleToken(event.target.value)} placeholder="brand.momentum" />
                    </label>
                    <div className="free-style-field free-style-emoji-field">
                      <label htmlFor="free-style-unicode-fallback">Unicode fallback</label>
                      <div className="free-style-emoji-control">
                        <input
                          id="free-style-unicode-fallback"
                          value={freeStyleEmoji}
                          onChange={(event) => setFreeStyleEmoji(event.target.value)}
                          placeholder="☄️"
                          maxLength={8}
                        />
                        <EmojiPicker value={freeStyleEmoji} onSelect={setFreeStyleEmoji} />
                      </div>
                    </div>
                    <label className="free-style-direction-field">
                      <span>Describe any original style</span>
                      <textarea value={freeStyleDirection} onChange={(event) => setFreeStyleDirection(event.target.value)} rows={5} placeholder="Materials, shape language, palette, lighting, mood, motion…" />
                    </label>
                  </div>
                  <div className="free-style-guardrails" aria-label="Emoji quality guardrails">
                    <span>Clear at 24 px</span><span>Transparent</span><span>One subject</span><span>Expandable system</span>
                  </div>
                </div>
                <div className="agent-console free-style-console" aria-label="Free style custom emoji prompt">
                  <div className="agent-console-bar">
                    <span>free-style/brief.txt</span>
                    <div><i>ready for Codex</i><CopyButton text={freeStylePrompt} label="Copy prompt" /></div>
                  </div>
                  <div className="agent-prompt"><span>›</span><p>Your description becomes the style specification. Choose your materials, palette, and shape language.</p></div>
                  <pre className="free-style-prompt"><code>{freeStylePrompt}</code></pre>
                  <div className="agent-result free-style-result"><span>your direction in</span><b>✦</b><strong>validated provider out</strong></div>
                </div>
              </div>
            ) : (
              <div className="custom-emoji-showcase">
                <div className="custom-asset-preview">
                  <span className="custom-orbit" />
                  <Emoji emoji={activeCustomExample.emoji} provider={activeCustomExample.provider} label={activeCustomExample.label} size={128} lazy={false} className="motion-float motion-hero" />
                  <div><small>{activeCustomExample.style}</small><strong>{activeCustomExample.token}</strong><span>256×256 · WebP · local</span></div>
                </div>
                <div className="agent-console" aria-label="Custom emoji provider code example">
                  <div className="agent-console-bar"><span>{activeCustomExample.id}/provider.ts</span><i>generated + validated</i></div>
                  <div className="agent-prompt"><span>›</span><p>$emoji-asset-creator Create <b>{activeCustomExample.token}</b> in an original {activeCustomExample.style} direction.</p></div>
                  <pre><code>{highlightCode(customExampleCode, "tsx")}</code></pre>
                  <div className="agent-result"><span>{activeCustomExample.emoji} Unicode in</span><Emoji emoji={activeCustomExample.emoji} provider={activeCustomExample.provider} label={activeCustomExample.label} size={64} lazy={false} className="motion-float motion-subtle" /><strong>{activeCustomExample.style} out</strong></div>
                </div>
              </div>
            )}
          </section>

          <section className="section ai-agents-section">
            <div className="agents-panel">
              <div className="agents-copy">
                <span className="section-kicker">Visual identity for AI-built UI</span>
                <h2>Familiar intent.<br />Original artwork.</h2>
                <p>Agents can keep using Unicode and semantic tokens. Map those familiar inputs to your own artwork without rewriting the interface.</p>
                <div className="agent-benefits">
                  <div><strong>01</strong><span><b>Replace generic defaults.</b> Map ordinary Unicode or semantic tokens to original artwork without rewriting generated UI.</span></div>
                  <div><strong>02</strong><span><b>Raise the design quality.</b> Give dashboards, landing pages, empty states, and status messages a coherent personality.</span></div>
                  <div><strong>03</strong><span><b>Keep agents productive.</b> AI continues using a simple typed primitive while your provider controls the final visual identity.</span></div>
                </div>
              </div>
              <div className="agent-console ai-style-console" aria-label="AI-generated interface upgraded with custom emoji">
                <div className="agent-console-bar"><span>agent/ui-output.tsx</span><i>same intent · branded output</i></div>
                <div className="agent-prompt"><span>›</span><p>Build a launch dashboard with clear status, action, and reaction cues.</p></div>
                <pre><code>{highlightCode(`const productTheme = {
  'agent.ready': '🤖',
  'action.launch': '🚀',
  'status.idea': '💡',
};

<EmojiToken token="action.launch" />`, "tsx")}</code></pre>
                <div className="ai-output-row">
                  <span>generic intent</span><i>→</i>
                  <div><Emoji emoji="🤖" provider={customEmojiProvider} label="Agent ready" size={52} lazy={false} /><Emoji emoji="🚀" provider={customSoft3dProvider} label="Launch" size={52} lazy={false} /><Emoji emoji="💡" provider={customClayProvider} label="Idea" size={52} lazy={false} /></div>
                  <strong>product identity</strong>
                </div>
              </div>
            </div>
          </section>

          <SkillsSection customAssets={CUSTOM_EXAMPLES.slice(0, 4).map((example) => ({ id: example.id, url: example.assetUrl, label: example.label }))} />

          <section className="section how-section" id="how">
            <div className="section-heading centered">
              <div className="eyebrow">How it works</div>
              <h2>From Unicode to your UI.</h2>
              <p>Three small decisions. One consistent visual language across your product.</p>
            </div>
            <div className="process-grid">
              <article className="process-card">
                <span className="process-number">01</span>
                <div className="process-visual provider-mini-grid">
                  {STYLES.slice(0, 4).map((s) => <span key={s.key}><Emoji emoji="✨" provider={s.provider} size={27} className="motion-sparkle" /></span>)}
                </div>
                <h3>Choose a provider</h3>
                <p>Pick a visual system. Switch at runtime with a single prop.</p>
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

          <section className="section product-studio-section" id="studio">
            <div className="studio-heading">
              <div>
                <div className="eyebrow">Developer product studio</div>
                <h2>Design the system.<br /><em>Prove the output.</em></h2>
              </div>
              <p>Define a semantic theme, inspect an audit example, and compare provider metadata.</p>
            </div>

            <div className="studio-shell">
              <div className="studio-tabs" role="tablist" aria-label="Product studio tools">
                {STUDIO_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    id={`studio-tab-${tab.id}`}
                    role="tab"
                    aria-selected={studioTab === tab.id}
                    aria-controls={studioTab === tab.id ? `studio-panel-${tab.id}` : undefined}
                    className={studioTab === tab.id ? "active" : ""}
                    onClick={() => setStudioTab(tab.id)}
                  >
                    <span>{tab.index}</span>
                    <strong>{tab.label}</strong>
                    <small>{tab.detail}</small>
                    <i />
                  </button>
                ))}
              </div>

              {studioTab === "theme" && (
                <div className="studio-panel theme-builder-panel" id="studio-panel-theme" role="tabpanel" aria-labelledby="studio-tab-theme">
                  <div className="studio-form">
                    <div className="studio-panel-title"><span>Semantic Theme Builder</span><strong>Intent survives every redesign.</strong></div>
                    <label><span>Token</span><input value={themeToken} onChange={(event) => setThemeToken(event.target.value)} placeholder="action.launch" /></label>
                    <div className="studio-form-row">
                      <label><span>Unicode fallback</span><input value={themeEmoji} onChange={(event) => setThemeEmoji(event.target.value)} maxLength={8} placeholder={ROCKET_EMOJI} /></label>
                      <label><span>Accessible label</span><input value={themeLabel} onChange={(event) => setThemeLabel(event.target.value)} placeholder="Launch project" /></label>
                    </div>
                    <label>
                      <span>Default provider</span>
                      <select value={themeProviderKey} onChange={(event) => setThemeProviderKey(event.target.value)}>
                        {STYLES.slice(0, 7).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </label>
                    <div className="theme-live-card">
                      <div><small>Live token</small><code>{themeToken || "action.launch"}</code></div>
                      <Emoji emoji={themeEmoji || "🚀"} provider={themeProvider.provider} label={themeLabel || "Launch project"} size={72} lazy={false} className="motion-float motion-subtle" />
                      <div><small>Accessible name</small><strong>{themeLabel || "Launch project"}</strong></div>
                    </div>
                  </div>
                  <div className="studio-code-pane">
                    <div className="studio-pane-bar"><span>product-theme.tsx</span><CopyButton text={themeCode} label="Copy" /></div>
                    <pre><code>{highlightCode(themeCode, "tsx")}</code></pre>
                    <div className="studio-pane-foot"><span><i /> Versioned theme</span><span><i /> Localized labels</span><span><i /> Typed token</span></div>
                  </div>
                </div>
              )}

              {studioTab === "audit" && (
                <div className="studio-panel audit-panel" id="studio-panel-audit" role="tabpanel" aria-labelledby="studio-tab-audit">
                  <div className="audit-workspace">
                    <div className="studio-pane-bar">
                      <span>src/Launch.tsx</span>
                      <div className="audit-toggle" aria-label="Audit example state">
                        <button className={auditView === "before" ? "active" : ""} onClick={() => setAuditView("before")}>Before</button>
                        <button className={auditView === "after" ? "active" : ""} onClick={() => setAuditView("after")}>Fixed</button>
                      </div>
                    </div>
                    <pre><code>{highlightCode(AUDIT_EXAMPLES[auditView], "tsx")}</code></pre>
                  </div>
                  <div className="audit-results">
                    <div className="studio-panel-title"><span>Deterministic Audit</span><strong>{auditView === "before" ? "2 findings need attention." : "Policy clean. Ready to merge."}</strong></div>
                    {auditView === "before" ? (
                      <div className="finding-list">
                        <article className="finding error"><span>error</span><div><strong>Missing accessible label</strong><p>Emoji-only button has no accessible name.</p><code>emoji-styles/accessibility/missing-label</code></div><b>3:5</b></article>
                        <article className="finding warning"><span>warning</span><div><strong>Raw semantic emoji</strong><p>Unicode bypasses the configured provider and theme.</p><code>emoji-styles/semantic/raw-emoji</code></div><b>3:13</b></article>
                      </div>
                    ) : (
                      <div className="audit-success"><span><CheckIcon /></span><strong>0 errors · 0 warnings</strong><p>The semantic token, accessible label, provider policy, and fallback contract are explicit.</p></div>
                    )}
                    <div className="audit-pipeline">
                      <span><b>01</b> AST scan</span><i>→</i><span><b>02</b> Line annotations</span><i>→</i><span><b>03</b> SARIF 2.1</span>
                    </div>
                    <div className="audit-command"><code>npx emoji-styles audit ./src --format sarif</code><CopyButton text="npx emoji-styles audit ./src --format sarif" /></div>
                  </div>
                </div>
              )}

              {studioTab === "proof" && (
                <div className="studio-panel proof-panel" id="studio-panel-proof" role="tabpanel" aria-labelledby="studio-tab-proof">
                  <div className="proof-summary">
                    <div className="studio-panel-title"><span>Reproducibility View</span><strong>Every visual choice leaves evidence.</strong></div>
                    <div className="proof-score"><span>Build contract</span><strong>100%</strong><i><b /></i><small>Provider · version · license · fallback · hash</small></div>
                    <div className="proof-facts">
                      <article><span>Dataset</span><strong>Unicode 17.0</strong><small>CLDR 48 · 3,953 RGI</small></article>
                      <article><span>Fallback</span><strong>Explicit chain</strong><small>Provider → Twemoji → no OS drift</small></article>
                      <article><span>CI evidence</span><strong>React 18 + 19</strong><small>SSR · CSP · SARIF</small></article>
                      <article><span>Custom assets</span><strong>SHA-256</strong><small>Manifest + provenance</small></article>
                    </div>
                  </div>
                  <div className="provider-ledger">
                    <div className="ledger-head"><span>Same input</span><strong>{featuredEmoji}</strong><small>Inspectable provider output</small></div>
                    {STYLES.slice(1, 6).map((item) => (
                      <button key={item.key} onClick={() => { setStyle(item.key); setStudioTab("proof"); }}>
                        <span className="ledger-emoji"><Emoji emoji={featuredEmoji} provider={item.provider} size={34} /></span>
                        <span><strong>{item.label}</strong><small>{item.provider.version ?? "system"}</small></span>
                        <span><small>Delivery</small><b>{item.provider.local ? "local" : "pinned"}</b></span>
                        <span><small>License</small><b>{item.provider.license?.name ?? "OS"}</b></span>
                        <i aria-hidden="true">{EXTERNAL_LINK_GLYPH}</i>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <CompiledSection />

          <section className="section playground-section" id="playground">
            <div className="section-heading playground-heading">
              <div><div className="eyebrow">Provider explorer</div><h2>One input. Every style.</h2></div>
              <p>Choose a provider, check the output size, and search the Unicode collection. Copy the code for your selection.</p>
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
                      <button key={s.key} className={style === s.key ? "active" : ""} aria-pressed={style === s.key} onClick={() => setStyle(s.key)}>
                        <span><Emoji emoji="✨" provider={s.provider} size={18} /> {s.label}</span><i />
                      </button>
                    ))}
                  </div>
                  <label>Output size <span>{size.px}px</span></label>
                  <div className="size-options">
                    {SIZES.map((s) => <button key={s.label} className={size.label === s.label ? "active" : ""} aria-pressed={size.label === s.label} onClick={() => setSize(s)}>{s.label}</button>)}
                  </div>
                </aside>

                <div className="playground-preview">
                  <div className="preview-topbar">
                    <div className="search-wrapper"><SearchIcon /><input className="search-input" type="search" aria-label="Search emoji collection" placeholder="Search the collection…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <span role="status">{filteredEmojis.length.toLocaleString("en-US")} results</span>
                  </div>
                  {coverageNote && <p className="provider-coverage-note">{coverageNote}</p>}
                  <div className="featured-output">
                    <div className="output-glow" />
                    <Emoji emoji={featuredEmoji} provider={activeStyle.provider} size={Math.max(size.px * 2, 64)} className="motion-float motion-subtle" />
                    <div><span>Current output</span><strong>{featuredEmoji} · {activeStyle.label}</strong></div>
                  </div>
                  <div className="quick-grid">
                    {visibleEmojis.slice(0, 18).map((emoji) => (
                      <button key={emoji} className={featuredEmoji === emoji ? "active" : ""} aria-pressed={featuredEmoji === emoji} onClick={() => setFeaturedEmoji(emoji)} title={getEmojiData(emoji)?.alt ?? emoji}>
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

          <section className="section frameworks-section" id="frameworks">
            <div className="section-heading"><div className="eyebrow">Framework agnostic · catalog-free</div><h2>One compiled theme. Every stack.</h2><p>The same generated module renders in React, server templates, islands and custom elements, with the same labels and fallbacks.</p></div>
            <div className="framework-tabs">
              {FRAMEWORK_EXAMPLES.map((fw) => <button key={fw.id} className={`${fw.id} ${activeTab === fw.id ? "active" : ""}`} aria-pressed={activeTab === fw.id} onClick={() => setActiveTab(fw.id)}><FrameworkIcon id={fw.id} /><span>{fw.label}</span></button>)}
            </div>
            <div className="framework-content-new">
              <div className="framework-result"><span>Rendered output</span><CompiledEmojiToken token="action.launch" theme={compiledEmojiTheme} size={96} lazy={false} className="motion-float motion-subtle" /><strong>{activeExample.note}</strong></div>
              <div className="code-block"><div className="code-header"><span className="code-lang">{activeExample.language}</span><CopyButton text={activeExample.code} label="Copy code" /></div><pre className="code-content"><code>{highlightCode(activeExample.code, activeTab)}</code></pre></div>
            </div>
          </section>

          <section className="section collection-section" id="collection">
            <div className="section-heading collection-heading"><div><div className="eyebrow">The collection</div><h2>Browse {allEmojis.length.toLocaleString("en-US")} emoji.</h2></div><span>Rendering in <b>{activeStyle.label}</b></span></div>
            <div className="catalog-toolbar">
              <label className="catalog-search"><span>Search emoji</span><input type="search" aria-label="Filter emoji collection" placeholder="Name, emoji, or U+1F680" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <button type="button" className="catalog-clear" disabled={!search && !category} onClick={() => { setSearch(""); setCategory(""); }}>Clear filters</button>
            </div>
            <div className="catalog-summary"><span role="status">Showing {Math.min(visibleCount, filteredEmojis.length).toLocaleString("en-US")} of {filteredEmojis.length.toLocaleString("en-US")} matching emoji</span><a href="#playground">Preview: {getEmojiData(featuredEmoji)?.alt ?? featuredEmoji} ↗</a></div>
            {coverageNote && <p className="provider-coverage-note collection-coverage-note">{coverageNote}</p>}
            {filteredEmojis.length > 0 ? (
              <div className="emoji-grid">{visibleEmojis.map((emoji) => <LazyEmojiCell key={emoji} emoji={emoji} label={getEmojiData(emoji)?.alt ?? emoji} size={size.px} emojiProvider={activeStyle.provider} selected={featuredEmoji === emoji} onSelect={setFeaturedEmoji} />)}</div>
            ) : <div className="empty-state" role="status"><span className="empty-state-title">No matching emojis</span><span className="empty-state-copy">Try a broader name, Unicode codepoint, or another category.</span></div>}
            {visibleEmojis.length < filteredEmojis.length && <div className="load-more-row"><button className="load-more-button" onClick={() => setVisibleCount((count) => count + EMOJI_BATCH_SIZE)}>Load more <span>{visibleEmojis.length} / {filteredEmojis.length}</span></button></div>}
          </section>

          <section className="cta-section">
            <div><span className="eyebrow">Ready when you are</span><h2>Give every reaction<br /><em>the right expression.</em></h2></div>
            <div className="cta-actions"><div className="install-inline"><span className="terminal-glyph">›_</span><code className="install-code">npm i react-emoji-styles</code><CopyButton text="npm install react-emoji-styles" /></div><a href="https://github.com/Blancochuy/emoji-styles" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a></div>
            <div className="cta-emoji"><Emoji emoji="🤩" provider={publicProviders.fluent3d} size={150} className="motion-celebrate" /></div>
          </section>
        </main>

        <footer className="footer"><div className="footer-left"><span className="brand-mark"><Emoji emoji="🙂" size={16} /></span><span className="footer-brand">Emoji Styles</span></div><div className="footer-links"><a href="https://github.com/Blancochuy/emoji-styles" target="_blank" rel="noopener noreferrer"><GitHubIcon /> GitHub</a><a href="https://github.com/Blancochuy/emoji-styles/blob/master/docs/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">Asset licenses</a><span>MIT code</span></div><span className="footer-right">Built by Blancochuy.</span></footer>
      </div>
    </EmojiProvider>
  );
}
