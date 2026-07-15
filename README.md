<div align="center">

<img src="./demo/public/favicon.svg" alt="Emoji Styles" width="72" height="72" />

# Emoji Styles

**One emoji. Every style.**

A typed, multi-provider emoji toolkit for React with smart fallbacks, lazy loading, and a framework-agnostic core.

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![CI](https://github.com/JarvisBotBlanco/emoji-styles/actions/workflows/ci.yml/badge.svg)](https://github.com/JarvisBotBlanco/emoji-styles/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Quick start](#quick-start) · [Features](#features) · [Providers](#providers) · [AI agents](#why-ai-agents-benefit) · [API](#api-reference) · [Development](#development)

</div>

---

## What is Emoji Styles?

Emoji Styles separates emoji meaning from emoji artwork. Your UI keeps ordinary Unicode characters while the renderer decides how they should look. Switch providers without rewriting product copy, preserve accessible fallback text, and share the same URL-resolution core across React, Vue, Svelte, Angular, or vanilla JavaScript.

Every built-in image provider uses artwork with documented redistribution terms and an immutable upstream version. Native mode renders the actual Unicode glyph from the current operating system; it never substitutes a CDN image. See [LICENSE_POLICY.md](./LICENSE_POLICY.md).

## Features

- ✅ **Interchangeable providers** — Fluent Emoji, Noto Emoji, Twemoji, local assets, and native Unicode
- ✅ **Automatic fallback chain** — gracefully degrades through providers when images fail to load
- ✅ **IntersectionObserver lazy loading** — emoji load only when they enter the viewport, with skeleton placeholders
- ✅ **React component (`<Emoji>`)** — drop-in component with props for provider, size, alt text, and lazy loading
- ✅ **Hooks (`useEmoji`)** — get emoji URLs and metadata for custom UI
- ✅ **Provider system (`EmojiProvider`)** — set a default provider at the app level, override per-emoji
- ✅ **Semantic asset mappings** — turn selected emoji into product icons with automatic provider fallback
- ✅ **Automatic text rendering (`<EmojiText>`)** — transform complete strings, including ZWJ and skin-tone sequences
- ✅ **Framework-agnostic core** — URL generation, emoji data, and fallback logic work in Vue, Svelte, Angular, or vanilla JS
- ✅ **Self-hosted Twemoji assets** — bundle Twemoji PNGs with your app, no CDN dependency
- ✅ **TypeScript strict mode** — full type safety across all packages
- ✅ **ESM output** — works with modern bundlers (Vite, Webpack, esbuild)

## Providers

| Provider | Reference | Availability | Format |
| --- | --- | --- | --- |
| Fluent Emoji 3D | `publicProviders.fluent3d` | Public · MIT | PNG |
| Fluent Emoji Color | `publicProviders.fluentColor` | Public · MIT | SVG |
| Fluent Emoji Flat | `publicProviders.fluentFlat` | Public · MIT | SVG |
| Noto Emoji | `publicProviders.noto` | Public · Apache 2.0 | PNG |
| Twemoji CDN | `publicProviders.twemoji` | Public · CC BY 4.0 | PNG |
| Twemoji Local | `localTwemojiProvider` | Public · separate asset package | PNG |
| Native Unicode | `publicProviders.native` | Current OS/browser | Native |

```ts
import { Emoji, publicProviders } from "react-emoji-styles";

<Emoji emoji="🔥" provider={publicProviders.fluent3d} />
<Emoji emoji="🚀" provider={publicProviders.noto} />
<Emoji emoji="✨" provider={publicProviders.native} />
```

## Quick Start

> [!NOTE]
> The packages are not published to npm yet. For judging and local evaluation, run the workspace directly using the instructions below. The package names shown here are the intended public install interface.

```bash
npm install react-emoji-styles
```

```tsx
import { Emoji, publicProviders } from "react-emoji-styles";

export function Celebration() {
  return <Emoji emoji="🎉" provider={publicProviders.twemoji} size="xl" alt="Celebration" />;
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

- **Deterministic screenshots and tests** — pin an image provider so macOS, Linux CI, and a judge's browser produce the same artwork.
- **One safe API surface** — agents choose a documented provider instead of inventing brittle vendor URLs.
- **Accessible fallback** — the original Unicode character remains available when an asset fails.
- **Local-first delivery** — use the Twemoji asset package for private networks, offline demos, or strict content-security policies.

```tsx
<EmojiProvider provider={publicProviders.fluent3d}>
  <Emoji emoji="🚀" alt="Launch" />
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
| `alt` | `string` | `"Emoji: {emoji}"` | Accessible alt text for the image |
| `className` | `string` | `""` | Additional CSS class on the container |
| `lazy` | `boolean` | `true` | Use IntersectionObserver for viewport-based loading |
| `fallback` | `boolean` | `true` | Render native emoji if image fails to load |

### `<EmojiText>` Component

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | *(required)* | Text whose emoji tokens should be resolved automatically |
| `provider` | `EmojiAssetProvider` | app default | Provider or partial mapped provider |
| `size` | `EmojiSize` | `"md"` | Size used for every resolved emoji |
| `getAlt` | `(emoji) => string` | CLDR label | Customize accessible labels |
| `renderEmoji` | `(emoji, fallback, index) => ReactNode` | default renderer | Replace selected emoji with React components |

### `useEmoji` Hook

```ts
const { url, exists } = useEmoji("🚀", publicProviders.twemoji);
```

Returns an object with:
- **`url`** — the resolved image URL, or `null` if no provider handles the emoji
- **`exists`** — boolean indicating whether the emoji is available in the provider's catalog

### Core Functions

```ts
import { getEmojiUrl, hasEmoji, getEmojiData, getAvailableEmojis, tokenizeEmojiText } from "emoji-styles";

getEmojiUrl("🚀", "twemoji");          // "https://cdn.jsdelivr.net/.../1f680.png"
hasEmoji("🚀");                         // true
getEmojiData("🚀");                     // { unicode, name, ... }
getAvailableEmojis();                   // All mapped emoji entries
tokenizeEmojiText("Ship 🚀 now");       // Text/emoji tokens for any framework
```

## Packages

| Package | Purpose |
| --- | --- |
| [`emoji-styles`](./packages/core) | Framework-agnostic: URL generation, emoji data, provider abstraction, fallback logic |
| [`react-emoji-styles`](./packages/react) | React: `<Emoji>`, `<EmojiText>`, `<EmojiProvider>`, `<EmojiGrid>`, `useEmoji` hook |
| [`emoji-styles-assets-twemoji`](./packages/assets-twemoji) | Self-hosted Twemoji PNG assets with local provider |

## Supported platforms

- **React:** 18 and 19
- **Browsers:** current Chrome, Edge, Firefox, and Safari releases
- **Rendering:** client-side React, Vite, and SSR-capable frameworks with client hydration
- **Core package:** framework-agnostic ESM for Vue, Svelte, Angular, or vanilla JavaScript
- **Development:** Node.js 18+ and pnpm 10

## Built with Codex

Codex accelerated the project across the full development loop:

- designed the typed provider abstraction and fallback chain;
- implemented the React components, lazy loading, and accessibility behavior;
- generated and verified the Twemoji asset pipeline and checksum workflow;
- built the interactive demo and responsive visual system;
- added regression tests, monorepo validation, and a production-safe licensing boundary for every built-in provider.

For the OpenAI Build Week submission, the demo video should show these decisions in the running project and name the GPT-5.6 Codex session used for the core implementation. The corresponding `/feedback` session ID must be entered in the Devpost submission form.

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

The workspace contains:
- `packages/core` — framework-agnostic emoji logic
- `packages/react` — React bindings
- `demo/` — Vite-powered demo application

## License

Source code is available under the [MIT License](./LICENSE).

Emoji artwork is provided by external services and may have separate licenses or usage terms. See [LICENSE_POLICY.md](./LICENSE_POLICY.md) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Contributing

Issues and focused pull requests are welcome. Before adding a provider, document its asset license and redistribution terms in `assets/providers.json` and run the full validation suite.

---

Built for consistent expression across products, operating systems, CI environments, and agent-generated interfaces.
