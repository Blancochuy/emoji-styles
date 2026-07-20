<div align="center">

<img src="./demo/src/assets/favicon.svg" alt="Emoji Styles" width="72" height="72" />

# Emoji Styles

**Your emoji. Your style.**

A typed toolkit for creating original product emoji with Codex—or choosing an open provider—then rendering them consistently with smart fallbacks.

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![CI](https://github.com/Blancochuy/emoji-styles/actions/workflows/ci.yml/badge.svg)](https://github.com/Blancochuy/emoji-styles/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Custom Emoji](#create-original-emoji-with-codex) · [Product demo](./docs/DEMO.md) · [Quick start](#quick-start) · [Features](#features) · [Providers](#providers) · [Project config](./docs/CONFIGURATION.md) · [Semantic tokens](./docs/SEMANTIC_TOKENS.md) · [Custom assets](./docs/CUSTOM_ASSETS.md) · [Codex skills](./docs/SKILLS.md) · [MCP](./docs/MCP.md) · [GitHub Action](./docs/CI.md) · [Universal web](./docs/WEB.md) · [CLI](./docs/CLI.md) · [AI agents](#why-ai-agents-benefit) · [Build Week](./docs/BUILD_WEEK.md)

</div>

---

## Create original emoji with Codex

The included **`$emoji-asset-creator` skill** turns a visual direction into a validated local emoji provider. This is a first-class product workflow, not a mockup or a hard-coded image.

<p align="center">
  <img src="./demo/src/custom-emoji/custom-emoji/assets/1f916.webp" alt="Original dark 3D AI agent core with an acid-lime spark" width="160" height="160" />
</p>

| 1. Describe | 2. Generate | 3. Validate | 4. Render |
| --- | --- | --- | --- |
| Intent, semantic token, and visual direction | Original style anchor reviewed by Codex | Alpha, bounds, centering, format, hash, and provenance | Typed provider with configurable fallback |

```text
$emoji-asset-creator Create a dark 3D robot emoji for agent.ready with one acid-lime spark.
```

The demo includes a **Custom Asset Studio** with four original, independently packaged visual directions plus a fifth **Create your own / Free Style** mode:

| Agent Core | Classic Gloss | Soft 3D | Clay Pop |
| --- | --- | --- | --- |
| <img src="./demo/src/custom-emoji/custom-emoji/assets/1f916.webp" alt="Dark 3D agent core" width="96" /> | <img src="./demo/src/custom-emoji/custom-gloss/assets/1f60d.webp" alt="Classic glossy love reaction" width="96" /> | <img src="./demo/src/custom-emoji/custom-soft-3d/assets/1f680.webp" alt="Soft 3D launch rocket" width="96" /> | <img src="./demo/src/custom-emoji/custom-clay/assets/1f4a1.webp" alt="Clay idea bulb" width="96" /> |
| `agent.ready` · 🤖 | `reaction.love` · 😍 | `action.launch` · 🚀 | `status.idea` · 💡 |

Each example maps ordinary Unicode to a generated local asset and falls back to Fluent 3D for the rest of Unicode. The styles are original directions rather than reproductions of proprietary vendor artwork. See the [live implementation](./demo/src/custom-emoji), [complete skill workflow](./skills/emoji-asset-creator/SKILL.md), and [custom asset guide](./docs/CUSTOM_ASSETS.md).

Free Style is not another preset. Enter any original art direction in natural language—materials, shape language, palette, lighting, mood, or motion—together with a semantic token and Unicode fallback. The lab produces a copy-ready `$emoji-asset-creator` prompt while retaining only the technical guardrails that make the result work as emoji.

```text
$emoji-asset-creator Create brand.momentum for ☄️ as translucent gel and brushed metal,
with asymmetrical motion, one electric-cyan accent, and soft studio lighting.
```

## What is Emoji Styles?

Emoji Styles separates emoji meaning from emoji artwork. Your UI keeps ordinary Unicode characters while the renderer decides how they should look. Switch providers without rewriting product copy, preserve accessible fallback text, and share the same URL-resolution core across React, Vue, Svelte, Angular, or vanilla JavaScript.

Every built-in image provider uses artwork with documented redistribution terms and an immutable upstream version. Native mode renders the actual Unicode glyph from the current operating system; it never substitutes a CDN image. See the [asset licensing policy](./docs/LICENSE_POLICY.md).

## Features

- ✅ **Interchangeable providers** — Fluent Emoji, Noto Emoji, SerenityOS pixel art, Twemoji, local assets, and native Unicode
- ✅ **Official animation** — Microsoft Fluent Animated APNG and opt-in Noto Animated WebP with automatic static fallback
- ✅ **Automatic fallback chain** — gracefully degrades through providers when images fail to load
- ✅ **SSR-safe native lazy loading** — complete server markup, browser-native loading, and static styling without hydration drift
- ✅ **React component (`<Emoji>`)** — drop-in component with props for provider, size, alt text, and lazy loading
- ✅ **Hooks (`useEmoji`)** — get emoji URLs and metadata for custom UI
- ✅ **Provider system (`EmojiProvider`)** — set a default provider at the app level, override per-emoji
- ✅ **Versioned semantic themes** — map stable product intent to localized, accessible emoji or custom icons
- ✅ **Automatic text rendering (`<EmojiText>`)** — transform complete strings, including ZWJ and skin-tone sequences
- ✅ **Unicode Emoji 17.0 data** — 3,953 RGI entries, canonical aliases, and complete sequence metadata from the official Unicode dataset
- ✅ **Framework-agnostic core** — URL generation, emoji data, and fallback logic work in Vue, Svelte, Angular, or vanilla JS
- ✅ **Universal web package** — Web Component, CSP-friendly SSR markup, semantic tokens, and reversible DOM transformation
- ✅ **Project auditor and safe codemods** — AST-based JS/TS/JSX/TSX/HTML findings with terminal, JSON, SARIF, dry-run patches, and validated rollback
- ✅ **Deterministic custom-asset pipeline** — crop, center, normalize, hash, validate, review, and package product-owned or generated artwork
- ✅ **Codex-ready workflows** — repository integration and custom asset creation skills with deterministic CLI wrappers
- ✅ **Local MCP server** — 14 structured tools for resolution, audits, migrations, custom assets, licensing, and opt-in GPT-5.6 semantic analysis
- ✅ **Reusable GitHub Action** — enforce project policy with line annotations, bounded outputs, job summaries, and SARIF 2.1.0
- ✅ **Interactive product studio** — build semantic themes, inspect audit fixes, compare providers, and verify reproducibility without rebuilding the repository
- ✅ **Self-hosted Twemoji assets** — bundle Twemoji PNGs with your app, no CDN dependency
- ✅ **TypeScript strict mode** — full type safety across all packages
- ✅ **ESM output** — works with modern bundlers (Vite, Webpack, esbuild)

## Explore the product demo

The demo is an interactive developer workspace rather than a static landing page. It connects six product surfaces in one judge-friendly flow:

1. **Custom Asset Studio** — see original emoji become validated local providers, or write a free-form visual direction.
2. **Semantic Theme Builder** — turn product intent, fallback Unicode, accessible labels, and provider policy into copy-ready code.
3. **Audit Flow** — compare a raw emoji implementation with the accessible, policy-compliant semantic-token fix.
4. **Reproducibility View** — inspect dataset versions, delivery mode, provider licenses, hashes, and CI evidence.
5. **Provider Explorer** — compare real renderer output across the complete Emoji 17 dataset and copy integration code.
6. **Framework Examples** — review equivalent React, Vue, Svelte, and Angular usage.

See the [demo guide](./docs/DEMO.md) for local commands and a concise walkthrough suitable for the Build Week video.

## Providers

| Provider | Reference | Availability | Format |
| --- | --- | --- | --- |
| Fluent Emoji Animated | `publicProviders.fluentAnimated` | Public · MIT · pinned revision | Animated PNG |
| Fluent Emoji 3D | `publicProviders.fluent3d` | Public · MIT | PNG |
| Fluent Emoji Color | `publicProviders.fluentColor` | Public · MIT | SVG |
| Fluent Emoji Flat | `publicProviders.fluentFlat` | Public · MIT | SVG |
| Noto Emoji | `publicProviders.noto` | Public · Apache 2.0 | PNG |
| Noto Animated (preview) | `experimentalProviders.notoAnimated` | Public · CC BY 4.0 · rolling CDN | Animated WebP |
| SerenityOS Pixel Art | `publicProviders.serenityOS` | Public · BSD-2-Clause · pinned revision · partial | PNG |
| Twemoji CDN | `publicProviders.twemoji` | Public · CC BY 4.0 | PNG |
| Twemoji Local | `localTwemojiProvider` | Public · separate asset package | PNG |
| Native Unicode | `publicProviders.native` | Current OS/browser | Native |

```ts
import { Emoji, publicProviders } from "react-emoji-styles";

<Emoji emoji="🔥" provider={publicProviders.fluent3d} />
<Emoji emoji="🚀" provider={publicProviders.fluentAnimated} />
<Emoji emoji="🚀" provider={publicProviders.noto} />
<Emoji emoji="🚀" provider={publicProviders.serenityOS} size={32} />
<Emoji emoji="✨" provider={publicProviders.native} />
```

SerenityOS resolves only exact PNG matches from its pinned upstream snapshot: 1,800 of the current 3,953 RGI sequences. Missing variants, including skin-tone sequences without their own artwork, continue through the configured fallback chain instead of reusing semantically different base artwork. React and Web package styles apply `image-rendering: pixelated` while preserving the requested dimensions. For sharper source-pixel scaling, prefer integer multiples of the original glyph dimensions.

Core-only consumers control their own image markup and should opt into pixel rendering explicitly:

```css
.serenityos-emoji {
  image-rendering: pixelated;
}
```

Fluent Animated uses Microsoft's official MIT-licensed APNG collection at a pinned revision. Its catalog is intentionally partial, so unsupported emoji continue through the normal fallback chain. Animated Noto assets are a separate preview opt-in because Google serves that collection from a rolling `latest` endpoint:

```tsx
import { Emoji, experimentalProviders } from "react-emoji-styles";

<Emoji emoji="🚀" provider={experimentalProviders.notoAnimated} size="3xl" />
```

When an animation is unavailable, the React component continues through its normal fallback chain.

## Quick Start

```bash
npm install react-emoji-styles
```

```tsx
import { Emoji, publicProviders } from "react-emoji-styles";
import "react-emoji-styles/styles.css";

export function Celebration() {
  return <Emoji emoji="🎉" provider={publicProviders.twemoji} size="xl" label="Celebration" />;
}
```

That's it. The `<Emoji>` component renders a Twemoji PNG image with proper alt text, automatic lazy loading, and fallback to native Unicode if the image fails.

### Set a default provider for your app

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";

<EmojiProvider provider={publicProviders.fluent3d}>
  <Emoji emoji="🔥" />  {/* Uses Fluent 3D by default */}
  <Emoji emoji="✨" size={48} />
  <Emoji emoji="🚀" provider={publicProviders.noto} />  {/* Override per emoji */}
</EmojiProvider>
```

## Advanced Usage

### Use the generated Custom Emoji provider

The repository's `$emoji-asset-creator` skill produced this original `agent.ready` asset as a real end-to-end example—not a mockup:

<p align="center">
  <img src="./demo/src/custom-emoji/custom-emoji/assets/1f916.webp" alt="Original dark 3D AI agent core with an acid-lime spark" width="144" height="144" />
</p>

Codex defined the [asset specification](./demo/src/custom-emoji/custom-emoji/asset-spec.json), generated and reviewed one style anchor, removed its chroma background, normalized it to a centered 256×256 lossless WebP, validated alpha and safe-area occupancy, calculated its SHA-256 hash, and generated the [provider manifest](./demo/src/custom-emoji/custom-emoji/emoji-provider.json) plus [provenance](./demo/src/custom-emoji/custom-emoji/PROVENANCE.json).

```tsx
import { Emoji } from "react-emoji-styles";
import { customEmojiProvider } from "./custom-emoji/custom-emoji/runtime";

<Emoji
  emoji="🤖"
  provider={customEmojiProvider}
  label="AI agent ready"
  size="3xl"
/>
```

The provider maps `🤖` to the custom artwork and delegates every unmapped emoji to Fluent 3D. The demo also exposes it as the semantic token `agent.ready`. Its generated-artwork ownership and redistribution status deliberately remain marked **user confirmation required**; generation and technical validation do not establish legal clearance.

### Name intent with semantic tokens

Keep interface meaning stable while themes control the Unicode fallback, provider, localization, or exact product asset:

```tsx
import {
  EmojiProvider,
  EmojiToken,
  defineEmojiTheme,
  publicProviders,
} from "react-emoji-styles";

const productTheme = defineEmojiTheme({
  "status.success": {
    emoji: "✅",
    label: "Operation succeeded",
    labels: { es: "Operación exitosa" },
  },
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
    asset: { url: "/icons/deploy.svg", format: "svg" },
  },
}, {
  id: "product",
  version: "1.0.0",
  defaultProvider: publicProviders.fluent3d,
});

<EmojiProvider theme={productTheme} locale="es">
  <EmojiToken token="action.deploy" size="lg" />
</EmojiProvider>
```

Themes support inheritance, composition, provider registries, JSON/TypeScript serialization, schema validation, and schema-less v0 migration. See [Semantic emoji tokens](./docs/SEMANTIC_TOKENS.md).

### Turn emoji into product icons

Override only the tokens your product owns. Every other emoji uses the selected fallback provider:

```tsx
import {
  EmojiText,
  createMappedProvider,
  publicProviders,
} from "react-emoji-styles";

const productIcons = createMappedProvider({
  assets: {
    "🚀": "/icons/deploy.svg",
    "✅": "/icons/passed.svg",
  },
  fallback: publicProviders.fluent3d,
});

<EmojiText provider={productIcons} size="lg">
  Build passed ✅ — shipping now 🚀
</EmojiText>
```

`EmojiText` parses the complete string and preserves ZWJ sequences, variation selectors, and skin tones as single graphemes. A custom mapping can resolve emoji that are not part of the bundled catalog.

For components from a React design system, use the renderer escape hatch:

```tsx
<EmojiText
  renderEmoji={(emoji, fallback) =>
    emoji === "🚀" ? <DeployIcon aria-label="Deploy" /> : fallback
  }
>
  Deploy 🚀 safely 🔥
</EmojiText>
```

### Convention-based custom providers

Build your own provider for proprietary emoji assets:

```ts
import { createCdnProvider } from "emoji-styles";

const companyProvider = createCdnProvider({
  id: "company-emoji",
  label: "Company Assets",
  baseUrl: "https://assets.example.com/emoji/v1",
  extension: "png",
  visibility: "custom",
});

getEmojiUrl("🚀", companyProvider);
```

### Resolve assets with evidence

For new integrations, `resolveEmoji` returns the selected asset, provider version, format, license, and every fallback attempt. An unsupported emoji is represented explicitly instead of producing a URL that may 404:

```ts
import { publicProviders, resolveEmoji } from "emoji-styles";

const result = await resolveEmoji("🫪", {
  provider: publicProviders.twemoji,
  fallbacks: [publicProviders.native],
});

result.selected;       // null — Twemoji 15.1 predates this Emoji 17 sequence
result.nativeFallback; // true
result.attempts;       // Twemoji: unsupported, Native: native
```

Custom and generated packs can use exact, validated manifests with checksums, dimensions, licensing, and generator provenance. See [Provider manifests](./docs/PROVIDER_MANIFESTS.md).

For raw artwork, the asset pipeline first normalizes transparent bounds and safe-area spacing, then validates the collection and generates the manifest, typed provider, optional semantic theme, license notice, and provenance record. See [Custom assets](./docs/CUSTOM_ASSETS.md).

### Inspect the fallback chain

Build an ordered URL chain for custom renderers or preloaders:

```ts
import { getFallbackChain, publicProviders } from "emoji-styles";

const urls = getFallbackChain(
  "🔥",
  publicProviders.fluent3d,
  [publicProviders.twemoji],
);
```

### Lazy loading with skeleton placeholders

Lazy loading is **enabled by default**. Emoji images load only when they scroll into the viewport:

```tsx
<Emoji emoji="🚀" lazy={true} />   {/* Default behavior */}
<Emoji emoji="🚀" lazy={false} />  {/* Load immediately */}
```

While loading, a lightweight skeleton placeholder is rendered to prevent layout shift.

## Why AI agents benefit

AI-generated UI is more reliable when visual output is explicit instead of depending on the machine that renders it. Emoji Styles gives coding agents a small, typed primitive with predictable behavior:

- **From generic output to product identity** — agents can keep reaching for expressive emoji while your custom provider turns those defaults into a distinctive visual language for landing pages, dashboards, empty states, and status UI.
- **Deterministic screenshots and tests** — pin an image provider so macOS, Linux CI, and a judge's browser produce the same artwork.
- **One safe API surface** — agents choose a documented provider instead of inventing brittle vendor URLs.
- **Stable product vocabulary** — agents can emit `action.deploy` or `status.warning` without choosing artwork or rewriting accessibility labels.
- **Accessible fallback** — the original Unicode character remains available when an asset fails.
- **Local-first delivery** — use the Twemoji asset package for private networks, offline demos, or strict content-security policies.
- **Reusable Codex workflows** — `$emoji-styles` handles integration and auditing, while `$emoji-asset-creator` turns an approved visual direction into a validated local provider.
- **Structured agent tools** — the local MCP server lets agents search Unicode, inspect fallbacks, audit projects, preview migrations, validate generated artwork, and report licensing through schemas instead of prose guesses.

```tsx
<EmojiProvider theme={productTheme}>
  <EmojiToken token="action.deploy" />
</EmojiProvider>
```

## Framework Examples

### React (recommended)

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";

function ChatMessage({ text }) {
  return (
    <EmojiProvider provider={publicProviders.twemoji}>
      <p>{text}</p>
    </EmojiProvider>
  );
}
```

### Vue

```vue
<script setup>
import { getEmojiUrl } from "emoji-styles";
</script>

<template>
  <img
    v-for="emoji in ['🚀', '🔥', '✨']"
    :key="emoji"
    :src="getEmojiUrl(emoji, 'twemoji')"
    :alt="emoji"
    width="32"
    height="32"
  />
</template>
```

### Svelte

```svelte
<script>
  import { getEmojiUrl } from "emoji-styles";

  const emojis = ["🚀", "🔥", "✨"];
</script>

{#each emojis as emoji}
  <img src={getEmojiUrl(emoji, "twemoji")} alt={emoji} width="32" height="32" />
{/each}
```

### Angular

```typescript
import { Component } from "@angular/core";
import { getEmojiUrl } from "emoji-styles";

@Component({
  selector: "app-emoji",
  template: `
    <img *ngFor="let emoji of emojis" [src]="getUrl(emoji)" [alt]="emoji" width="32" height="32" />
  `,
})
export class EmojiComponent {
  emojis = ["🚀", "🔥", "✨"];
  getUrl(e: string) {
    return getEmojiUrl(e, "twemoji");
  }
}
```

## API Reference

### `<Emoji>` Component

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `emoji` | `string` | *(required)* | Unicode emoji character to render |
| `provider` | `EmojiAssetProvider` | app default | Asset provider to use for this emoji |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl" \| number` | `"md"` | Preset size (`xs`=12px to `3xl`=48px) or exact pixel value |
| `label` | `string` | CLDR label | Accessible label for image or native fallback |
| `decorative` | `boolean` | `false` | Emit empty alt text and hide output from assistive technology |
| `fallbacks` | `EmojiProviderRef[]` | Twemoji | Ordered image-provider fallback policy |
| `nativeFallback` | `boolean` | `true` | Append native OS emoji after the provider chain |
| `className` | `string` | `""` | Additional CSS class on the container |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Browser-native image loading strategy |
| `fallback` | `boolean` | `true` | Deprecated alias for `nativeFallback` |
| `onResolve` | `(resolution) => void` | — | Receive the structured core v2 resolution |
| `onFallback` | `(event) => void` | — | Observe provider or native fallback transitions |
| `onError` | `(event) => void` | — | Observe failed image URLs without suppressing fallback |

### `<EmojiText>` Component

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | *(required)* | Text whose emoji tokens should be resolved automatically |
| `provider` | `EmojiAssetProvider` | app default | Provider or partial mapped provider |
| `size` | `EmojiSize` | `"md"` | Size used for every resolved emoji |
| `getAlt` | `(emoji) => string` | CLDR label | Customize accessible labels |
| `renderEmoji` | `(emoji, fallback, index) => ReactNode` | default renderer | Replace selected emoji with React components |

### `<EmojiToken>` Component

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `token` | `string` | *(required)* | Semantic token such as `action.deploy` |
| `theme` | `EmojiTheme` | context theme | Versioned theme containing the token |
| `provider` | `EmojiThemeProviderRef` | token/theme provider | Override asset resolution |
| `locale` | `string` | context locale | Resolve a localized accessible label |
| `label` | `string` | theme label | Override the accessible label |
| `decorative` | `boolean` | theme definition | Hide decorative output from assistive technology |
| `size` | `EmojiSize` | `"md"` | Rendered dimensions |

`useEmojiToken` returns the definition, structured resolution, loading state, and error. `useEmojiTheme` reads the active theme context.

### `useEmoji` Hook

```ts
const { url, exists, resolution, loading, error } = useEmoji(
  "🚀",
  publicProviders.twemoji,
  [publicProviders.native],
);
```

Returns an object with:
- **`url`** — the resolved image URL, or `null` if no provider handles the emoji
- **`exists`** — boolean indicating whether the emoji is available in the provider's catalog
- **`resolution`** — structured core v2 result with attempts and fallback evidence
- **`loading` / `error`** — asynchronous provider-resolution state

### Core Functions

```ts
import {
  getEmojiMetadata,
  getEmojiUrl,
  getProviderCoverage,
  isEmoji,
  resolveEmojiToken,
  resolveEmoji,
  tokenizeEmojiText,
} from "emoji-styles";

getEmojiUrl("🚀", "twemoji");          // "https://cdn.jsdelivr.net/.../1f680.png"
isEmoji("👨‍💻");                       // true
getEmojiMetadata("🚀");                // normalized sequence and Unicode metadata
await resolveEmoji("🚀", { provider: "twemoji" });
await getProviderCoverage("twemoji");  // coverage for the bundled Unicode dataset
await resolveEmojiToken("action.deploy", productTheme);
tokenizeEmojiText("Ship 🚀 now");       // Text/emoji tokens for any framework
```

The synchronous `getEmojiUrl`, `hasEmoji`, `getEmojiData`, and `getAvailableEmojis` APIs remain available for backward compatibility.

## Packages

| Package | Purpose |
| --- | --- |
| [`emoji-styles`](./packages/core) | Framework-agnostic: resolution, semantic themes, schemas, Unicode data, providers, and fallbacks |
| [`emoji-styles-data`](./packages/data) | Versioned Unicode 17.0 / CLDR 48 RGI metadata and normalization aliases |
| [`react-emoji-styles`](./packages/react) | React: `<Emoji>`, `<EmojiToken>`, `<EmojiText>`, providers, grids, and hooks |
| [`emoji-styles-web`](./packages/web) | Universal `<styled-emoji>`, SSR renderer, and safe DOM text transformer |
| [`emoji-styles-assets-twemoji`](./packages/assets-twemoji) | Self-hosted Twemoji PNG assets with local provider |
| [`@emoji-styles/asset-pipeline`](./packages/asset-pipeline) | Deterministic normalization, validation, contact sheets, manifests, and provenance for custom raster artwork |
| [`emoji-styles-mcp`](./packages/mcp) | Local MCP server for agent-safe resolution, project audits, migration previews, custom assets, and semantic token suggestions |
| [`emoji-styles-github-action`](./packages/github-action) | Bundled Node 24 GitHub Action adapter for policy annotations, thresholds, summaries, and SARIF |

## Supported platforms

- **React:** 18 and 19
- **Browsers:** current Chrome, Edge, Firefox, and Safari releases
- **Rendering:** client-side React, Vite, React SSR, Next.js, and hydration-safe client boundaries
- **Core package:** framework-agnostic ESM for Vue, Svelte, Angular, or vanilla JavaScript
- **Development:** Node.js 18+ and pnpm 10

## Built with Codex

Codex accelerated the project across the full development loop:

- designed the typed provider abstraction and fallback chain;
- implemented the React components, lazy loading, and accessibility behavior;
- generated and verified the Twemoji asset pipeline and checksum workflow;
- created and validated the original `agent.ready` demo asset using the repository's own asset-creator skill;
- built the interactive demo and responsive visual system;
- added regression tests, monorepo validation, and a production-safe licensing boundary for every built-in provider.

For the OpenAI Build Week submission, the demo video should show these decisions in the running project and name the GPT-5.6 Codex session used for the core implementation. The corresponding `/feedback` session ID must be entered in the Devpost submission form.

The reproducible starting point, validation results, and known gaps are recorded in the [Build Week baseline](./docs/BUILD_WEEK.md). This keeps verified pre-hardening behavior separate from subsequent implementation work.

## Development

Requirements: Node.js 18+ and pnpm 10.

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Build all packages
pnpm build

# Verify emoji assets are present
pnpm assets:check

# Start the Vite demo
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173).

Maintainers can validate the complete npm release surface with
`pnpm release:check`; the authenticated publication process is documented in
the [release guide](./docs/RELEASING.md).

The workspace contains:
- `packages/core` — framework-agnostic emoji logic
- `packages/react` — React bindings
- `packages/web` — universal Web Component, SSR renderer, and DOM transformer
- `packages/asset-pipeline` — reusable custom-artwork normalization and packaging APIs
- `packages/mcp` — local read-only MCP tools for coding agents and IDE integrations
- `packages/github-action` — source, tests, and reproducible bundle for the reusable CI action
- `skills/emoji-styles` — Codex workflow for integration, auditing, migration, and testing
- `skills/emoji-asset-creator` — Codex workflow for visual asset creation and provider packaging
- `demo/` — Vite-powered demo application

## License

Source code is available under the [MIT License](./LICENSE).

Emoji artwork is provided by external services and may have separate licenses or usage terms. See the [asset licensing policy](./docs/LICENSE_POLICY.md) and [third-party notices](./docs/THIRD_PARTY_NOTICES.md).

## Contributing

Issues and focused pull requests are welcome. Before adding a provider, document its asset license and redistribution terms in `assets/providers.json` and run the full validation suite.

---

Built for consistent expression across products, operating systems, CI environments, and agent-generated interfaces.
