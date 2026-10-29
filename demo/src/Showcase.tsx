import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { CompiledEmojiToken } from "react-emoji-styles/compiled";
import type { CompiledEmojiTheme } from "react-emoji-styles/compiled";
import runtimeBundle from "../../benchmarks/runtime-bundle/published.json";
import webBundle from "../../benchmarks/web-bundle/published.json";
import { compiledEmojiTheme, type EmojiTokenName } from "../generated/demo-theme.compiled";
import { CopyButton } from "./ui";

// ─── Measured bundle weight (committed benchmark records, never hand-typed) ───

type BenchmarkRecord = { variants: Array<{ variant: string; js: { gzipBytes: number } }> };
const gzip = (record: BenchmarkRecord, variant: string) => record.variants.find((item) => item.variant === variant)?.js.gzipBytes ?? 0;
const kB = (bytes: number) => (bytes / 1000).toFixed(1);

export const BUNDLE_GROUPS = {
  react: {
    label: "React page",
    caption: `React 19 · npm ${runtimeBundle.environment.versions["react-emoji-styles"]}`,
    rows: [
      { id: "none", label: "React only, no emoji library", bytes: gzip(runtimeBundle, "react-only") },
      { id: "full", label: "EmojiToken · full runtime", bytes: gzip(runtimeBundle, "theme-12") },
      { id: "compiled", label: "CompiledEmojiToken", bytes: gzip(runtimeBundle, "theme-12-compiled") },
    ],
  },
  web: {
    label: "Plain JS page",
    caption: `No framework · npm ${webBundle.environment.versions["emoji-styles-web"]}`,
    rows: [
      { id: "none", label: "Page shell, no emoji library", bytes: gzip(webBundle, "web-none") },
      { id: "full", label: "emoji-styles-web · full renderer", bytes: gzip(webBundle, "web-full") },
      { id: "compiled", label: "emoji-styles-web/compiled", bytes: gzip(webBundle, "web-compiled") },
    ],
  },
} as const;
type BundleGroup = keyof typeof BUNDLE_GROUPS;

// ─── Fallback simulator ───

type Scenario = "healthy" | "primary" | "all";
const SCENARIOS: Array<{ id: Scenario; label: string; detail: string }> = [
  { id: "healthy", label: "All healthy", detail: "Every CDN answers" },
  { id: "primary", label: "Fluent CDN down", detail: "First source fails" },
  { id: "all", label: "Every CDN down", detail: "All sources fail" },
];
const CHAIN = [
  { id: "fluent-3d", label: "Fluent 3D", via: "jsDelivr" },
  { id: "twemoji", label: "Twemoji", via: "jsDelivr" },
  { id: "native", label: "Unicode glyph", via: "system font" },
] as const;
const TOKENS: EmojiTokenName[] = ["action.launch", "status.success", "status.warning", "status.idea"];

/** Breaks real URLs so the browser genuinely fails to load them; nothing is mocked. */
function withOutage(theme: typeof compiledEmojiTheme, scenario: Scenario): typeof compiledEmojiTheme {
  if (scenario === "healthy") return theme;
  const broken = (provider: string) => `${import.meta.env.BASE_URL}__simulated-outage__/${provider}.png`;
  const tokens = { ...theme.tokens };
  for (const token of Object.keys(tokens) as EmojiTokenName[]) {
    const entry = tokens[token];
    tokens[token] = {
      ...entry,
      sources: entry.sources.map((source, index) => scenario === "all" || index === 0 ? { ...source, url: broken(source.provider) } : source),
    };
  }
  return { ...theme, tokens };
}

function useServedProviders(root: RefObject<HTMLElement>, reset: unknown): string[] {
  const [served, setServed] = useState<string[]>([]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const read = () => setServed([...element.querySelectorAll("[data-emoji-token]")].map((node) => node.getAttribute("data-provider") ?? "hidden"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-provider"] });
    return () => observer.disconnect();
  }, [root, reset]);
  return served;
}

export function CompiledSection() {
  const [group, setGroup] = useState<BundleGroup>("web");
  const [scenario, setScenario] = useState<Scenario>("primary");
  const [locale, setLocale] = useState<"en" | "es">("en");
  const theme = useMemo(() => withOutage(compiledEmojiTheme, scenario), [scenario]);
  const tokensRef = useRef<HTMLDivElement>(null);
  const served = useServedProviders(tokensRef, theme);

  const rows = BUNDLE_GROUPS[group].rows;
  const max = Math.max(...rows.map((row) => row.bytes));
  const [none, full, compiled] = rows.map((row) => row.bytes);
  const current = served[0];
  const currentIndex = CHAIN.findIndex((step) => step.id === current);
  const allSame = served.length > 0 && served.every((provider) => provider === current);

  return (
    <section className="section compiled-section" id="compiled">
      <div className="studio-heading">
        <div>
          <div className="eyebrow">Compiled themes · runtime 0.3.1</div>
          <h2>Ship the tokens.<br /><em>Not the catalog.</em></h2>
        </div>
        <p>
          A reviewed theme compiles to a typed module of resolved URLs. Your page imports the
          tokens it uses, keeps the full fallback chain, and leaves the 3,953-emoji catalog behind.
        </p>
      </div>

      <div className="compiled-grid">
        <article className="compiled-card weight-card" aria-label="Measured bundle weight">
          <div className="compiled-card-head">
            <div><span>Measured JS · gzip</span><strong>{BUNDLE_GROUPS[group].label}</strong></div>
            <div className="segmented" role="group" aria-label="Benchmark page">
              {(Object.keys(BUNDLE_GROUPS) as BundleGroup[]).map((key) => (
                <button key={key} className={group === key ? "active" : ""} aria-pressed={group === key} onClick={() => setGroup(key)}>
                  {key === "react" ? "React" : "Plain JS"}
                </button>
              ))}
            </div>
          </div>
          <div className="weight-bars">
            {rows.map((row) => (
              <div key={row.id} className={`weight-row ${row.id}`}>
                <div className="weight-label"><span>{row.label}</span><b>{kB(row.bytes)} kB</b></div>
                <div className="weight-track"><i style={{ width: `${Math.max(2, (row.bytes / max) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="weight-deltas">
            <div><small>vs. full runtime</small><strong className="good">−{kB(full - compiled)} kB</strong></div>
            <div><small>over no emoji at all</small><strong>+{kB(compiled - none)} kB</strong></div>
          </div>
          <p className="compiled-footnote">
            12 tokens · {BUNDLE_GROUPS[group].caption}. Level-9 gzip per file, recorded in
            {" "}<code>benchmarks/{group === "react" ? "runtime-bundle" : "web-bundle"}/published.json</code>. Artwork transfer excluded.
          </p>
        </article>

        <article className="compiled-card outage-card" aria-label="Fallback chain simulator">
          <div className="compiled-card-head">
            <div><span>Live fallback chain</span><strong>Break a CDN. Watch it recover.</strong></div>
            <div className="segmented" role="group" aria-label="Label locale">
              {(["en", "es"] as const).map((value) => (
                <button key={value} className={locale === value ? "active" : ""} aria-pressed={locale === value} onClick={() => setLocale(value)}>{value.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="scenario-list" role="group" aria-label="Network scenario">
            {SCENARIOS.map((item) => (
              <button key={item.id} className={scenario === item.id ? "active" : ""} aria-pressed={scenario === item.id} onClick={() => setScenario(item.id)}>
                <strong>{item.label}</strong><small>{item.detail}</small>
              </button>
            ))}
          </div>
          <div className="outage-tokens" ref={tokensRef}>
            {TOKENS.map((token) => (
              <figure key={`${scenario}-${token}`}>
                <CompiledEmojiToken token={token} theme={theme as CompiledEmojiTheme<EmojiTokenName>} size={52} locale={locale} lazy={false} />
                <figcaption><code>{token}</code><span>{compiledEmojiTheme.tokens[token].labels?.[locale] ?? compiledEmojiTheme.tokens[token].label}</span></figcaption>
              </figure>
            ))}
          </div>
          <ol className="chain" aria-label="Fallback order">
            {CHAIN.map((step, index) => {
              const state = currentIndex < 0 ? "standby" : index < currentIndex ? "failed" : index === currentIndex ? "serving" : "standby";
              return (
                <li key={step.id} className={state}>
                  <i aria-hidden="true" />
                  <div><strong>{step.label}</strong><small>{step.via}</small></div>
                  <span>{state === "serving" ? "serving" : state === "failed" ? "failed" : "standby"}</span>
                </li>
              );
            })}
          </ol>
          <div className="chain-readout" role="status">
            <code>data-provider="{current ?? "…"}"</code>
            <span>{served.length ? `${allSame ? served.length : served.filter((provider) => provider === current).length}/${TOKENS.length} tokens` : "waiting for images"}</span>
          </div>
        </article>
      </div>

      <div className="compile-pipeline" aria-label="Compile workflow">
        {[
          { step: "01 · Draft", title: "Inventory to theme", body: "Audit roles become a reviewable theme with REVIEW: labels.", command: "emoji-styles theme draft ./src --yes" },
          { step: "02 · Review", title: "Drafts can't ship", body: "Unreviewed ids and placeholder labels are refused in every mode.", command: "THEME_DRAFT_UNREVIEWED" },
          { step: "03 · Compile", title: "Resolve once, offline", body: "URLs, fallbacks, labels and licenses become a typed module.", command: "emoji-styles theme compile ./emoji-theme.ts --output ./src/emoji-theme.compiled.ts --yes" },
          { step: "04 · Guard", title: "Stale builds fail CI", body: "A changed theme, dataset or provider revision exits 1.", command: "emoji-styles theme compile ./emoji-theme.ts --output ./src/emoji-theme.compiled.ts --check" },
        ].map((item) => (
          <article key={item.step}>
            <span>{item.step}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <code>{item.command}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Agent skills ───

/** Illustrates the skill's rules (projection, three-tone light, palette); not generated artwork. */
function IsometricSystemArt() {
  return (
    <svg className="iso-art" viewBox="0 0 200 180" role="img" aria-label="Isometric style rules: a parcel with a light top face, mid left face, dark right face and a tangerine accent">
      <g className="iso-guides" stroke="currentColor" strokeOpacity=".1">
        <path d="M100 160 L184 111.5 M100 160 L16 111.5 M100 160 V8" />
      </g>
      <g transform="translate(0 6)">
        <polygon points="100,38 152,68 100,98 48,68" fill="#F4EFE6" />
        <polygon points="48,68 100,98 100,152 48,122" fill="#E3D8C5" />
        <polygon points="100,98 152,68 152,122 100,152" fill="#C7B99F" />
        <polygon points="79.2,50 131.2,80 120.8,86 68.8,56" fill="#F5AE6B" />
        <polygon points="131.2,80 120.8,86 120.8,112 131.2,106" fill="#D9813A" />
      </g>
      <g className="iso-light" transform="translate(26 24)">
        <circle r="7" fill="#F09A4A" fillOpacity=".25" />
        <circle r="3" fill="#F09A4A" />
        <path d="M8 6 L22 16" stroke="#F09A4A" strokeWidth="1.4" strokeDasharray="2 3" />
      </g>
    </svg>
  );
}

const ISOMETRIC_PALETTE = [
  { name: "Sand", value: "#E8DFD0" },
  { name: "Sage", value: "#8DB8A6" },
  { name: "Dusty blue", value: "#7D96B8" },
  { name: "Slate", value: "#55607A" },
  { name: "Tangerine", value: "#F09A4A", accent: true },
];

function SkillActions({ name, prompt }: { name: string; prompt: string }) {
  const repository = "https://github.com/Blancochuy/emoji-styles/blob/master";
  return (
    <div className="skill-actions">
      <CopyButton text={prompt} label="Copy prompt" />
      <div className="skill-links">
        <a href={`${repository}/docs/SKILLS.md#install-the-complete-skill-folders`} aria-label={`Install ${name}`}>Install skill <span aria-hidden="true">↗</span></a>
        <a href={`${repository}/skills/${name}/SKILL.md`} aria-label={`Read ${name} instructions`}>Read instructions <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  );
}

export function SkillsSection({ customAssets }: { customAssets: Array<{ id: string; url: string; label: string }> }) {
  return (
    <section className="section skills-section" id="skills">
      <div className="studio-heading">
        <div>
          <div className="eyebrow">Agent skills · Codex · Claude Code · Cursor</div>
          <h2>Three skills.<br /><em>One reviewed pipeline.</em></h2>
        </div>
        <p>
          Portable <code>SKILL.md</code> folders that run the published CLI inside your app. Planning,
          validation and packaging never spend generation credits; review stays with people.
        </p>
      </div>
      <div className="skills-grid">
        <article className="skill-card">
          <div className="skill-head"><span>Integrate</span><code>/emoji-styles</code></div>
          <h3>Audit, theme, compile</h3>
          <p>Inventories every emoji by role, drafts a semantic theme for review, then compiles the reviewed copy for React or the web entry.</p>
          <ul className="skill-steps">
            <li><b>audit</b> roles + accessibility</li>
            <li><b>theme draft</b> review sheet</li>
            <li><b>theme compile</b> typed module</li>
          </ul>
          <SkillActions name="emoji-styles" prompt="/emoji-styles audit this app and propose a semantic theme" />
        </article>
        <article className="skill-card">
          <div className="skill-head"><span>Create</span><code>/emoji-asset-creator</code></div>
          <h3>Original artwork, packed</h3>
          <p>Turns a freeform direction into a spec, an approved anchor and a hashed local pack with provenance and a small-size review sheet.</p>
          <div className="skill-assets" aria-label="Custom Emoji Lab assets made with this skill">
            {customAssets.map((asset) => <img key={asset.id} src={asset.url} alt={asset.label} width={44} height={44} />)}
          </div>
          <SkillActions name="emoji-asset-creator" prompt="/emoji-asset-creator Create agent.ready as a dark 3D robot with one acid-lime spark" />
        </article>
        <article className="skill-card isometric">
          <div className="skill-head"><span>New · Style</span><code>/emoji-isometric-style</code></div>
          <h3>Isometric, brand-safe</h3>
          <div className="iso-stage">
            <IsometricSystemArt />
            <ul className="iso-rules">
              <li><b>Projection</b> true isometric, one 45° turn</li>
              <li><b>Light</b> top · left · right in three tones</li>
              <li><b>Contrast</b> no edge lost on white or near-black</li>
              <li><b>Brands</b> genre traits only, never logos or colors</li>
            </ul>
          </div>
          <div className="iso-palette" aria-label="Template palette">
            {ISOMETRIC_PALETTE.map((swatch) => (
              <span key={swatch.name} className={swatch.accent ? "accent" : ""}><i style={{ background: swatch.value }} />{swatch.name}</span>
            ))}
          </div>
          <small className="iso-note">Diagram of the skill's rules, not generated artwork.</small>
          <SkillActions name="emoji-isometric-style" prompt="/emoji-isometric-style plan an original isometric emoji set for my product's tokens" />
        </article>
      </div>
    </section>
  );
}
