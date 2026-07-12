<div align="center">

# Emoji Styles

**One emoji API. Six visual styles. React-ready and framework-agnostic.**

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![CI](https://github.com/JarvisBotBlanco/emoji-styles/actions/workflows/ci.yml/badge.svg)](https://github.com/JarvisBotBlanco/emoji-styles/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-149eca?logo=react&logoColor=white)](https://react.dev/)
[![ESM](https://img.shields.io/badge/module-ESM-f7df1e?logo=javascript&logoColor=111)](https://nodejs.org/api/esm.html)
[![Status](https://img.shields.io/badge/status-pre--release-f59e0b)](#project-status)

[Features](#features) · [Quick start](#quick-start) · [API](#react-api) · [Core package](#framework-agnostic-core) · [Contributing](#contributing)

<p>
  <img src="https://em-content.zobj.net/source/microsoft-teams/400/rocket_1f680.png" alt="Microsoft Teams rocket" width="64" />
  <img src="https://em-content.zobj.net/source/apple/453/rocket_1f680.png" alt="Apple rocket" width="64" />
  <img src="https://em-content.zobj.net/source/google/350/rocket_1f680.png" alt="Google rocket" width="64" />
  <img src="https://em-content.zobj.net/source/samsung/320/rocket_1f680.png" alt="Samsung rocket" width="64" />
  <img src="https://em-content.zobj.net/source/animated-noto-color-emoji/461/rocket_1f680.gif" alt="Animated Noto rocket" width="64" />
</p>

</div>

Emoji Styles provides typed URL utilities plus accessible React components for rendering Unicode emoji through interchangeable asset providers. The internal demo retains a broad experimental catalog, while the future public build will include only providers with explicit redistribution terms.

> [!IMPORTANT]
> This project is private and pre-release. Every workspace package is blocked from npm publication while the asset boundary and license notices are being completed.

## Features

- Injectable provider API with public and experimental catalogs
- 893 mapped emoji entries
- React 18 and 19 support, including client-component environments
- Preset or custom pixel sizes with no CSS framework dependency
- Twemoji-only licensed default with graceful native-text fallback
- Framework-agnostic core for Vue, Svelte, vanilla JavaScript, or server usage
- ESM output and TypeScript declarations

## Packages

| Package | Purpose |
| --- | --- |
| `react-emoji-styles` | React components, provider, hook, and re-exported core helpers |
| `emoji-styles` | Framework-agnostic metadata and URL utilities |

## Quick start

```bash
npm install react-emoji-styles
# pnpm add react-emoji-styles
```

```tsx
import { Emoji, publicProviders } from "react-emoji-styles";

export function Celebration() {
  return <Emoji emoji="🚀" provider={publicProviders.twemoji} size="xl" alt="Launch" />;
}
```

Set an application-wide default while retaining per-emoji overrides:

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";

<EmojiProvider provider={publicProviders.twemoji}>
  <Emoji emoji="🔥" />
  <Emoji emoji="✨" size={48} />
</EmojiProvider>;
```

## Internal experimental styles

| Value | Artwork | Format | Preview |
| --- | --- | --- | --- |
| `microsoft-teams` | Microsoft Teams 3D | PNG | <img src="https://em-content.zobj.net/source/microsoft-teams/400/fire_1f525.png" alt="Teams fire" width="32" /> |
| `apple` | Apple | PNG | <img src="https://em-content.zobj.net/source/apple/453/fire_1f525.png" alt="Apple fire" width="32" /> |
| `google` | Google | PNG | <img src="https://em-content.zobj.net/source/google/350/fire_1f525.png" alt="Google fire" width="32" /> |
| `samsung` | Samsung | PNG | <img src="https://em-content.zobj.net/source/samsung/320/fire_1f525.png" alt="Samsung fire" width="32" /> |
| `animated` | Animated Noto | GIF | <img src="https://em-content.zobj.net/source/animated-noto-color-emoji/461/fire_1f525.gif" alt="Animated fire" width="32" /> |
| `twemoji` | Twemoji | PNG | <img src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1f525.png" alt="Twemoji fire" width="32" /> |

Only `twemoji` is currently classified under `publicProviders`. The other rows are retained in `experimentalProviders` for private comparison and must not be interpreted as production-ready or licensed by this project. See [LICENSE_POLICY.md](./LICENSE_POLICY.md) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## React API

### `Emoji`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `emoji` | `string` | required | Unicode emoji to render |
| `style` | `EmojiStyle` | provider default | Artwork provider |
| `provider` | `EmojiAssetProvider` | provider default | Injectable provider; preferred over `style` |
| `size` | preset or `number` | `"md"` | Preset size or pixels |
| `alt` | `string` | `Emoji: {emoji}` | Accessible image text |
| `className` | `string` | `""` | Additional container class |
| `lazy` | `boolean` | `true` | Render near the viewport |
| `fallback` | `boolean` | `true` | Render native emoji after image failures |

Presets are `xs` (12), `sm` (16), `md` (20), `lg` (24), `xl` (32), `2xl` (40), and `3xl` (48 pixels).

### Other exports

- `EmojiProvider` injects the default asset provider for descendants.
- `EmojiGrid` efficiently observes and renders a collection.
- `useEmoji(emoji, provider)` returns `{ url, exists }` for custom UI.
- Core metadata and helpers are re-exported for convenience.

## Framework-agnostic core

```bash
npm install emoji-styles
```

```ts
import {
  createCdnProvider,
  getAvailableEmojis,
  getEmojiData,
  getEmojiUrl,
  hasEmoji,
} from "emoji-styles";

const companyProvider = createCdnProvider({
  id: "company-assets",
  label: "Company assets",
  baseUrl: "https://assets.example.com/emoji/v1",
  extension: "png",
  visibility: "custom",
});

getEmojiUrl("🚀", "apple");
hasEmoji("🚀");
getEmojiData("🚀");
getAvailableEmojis();
```

Unknown emoji return `null` from `getEmojiUrl` and can be rendered as native Unicode by the consumer.

## Development

Requirements: Node.js 18+ and pnpm 10.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

The workspace contains `packages/core`, `packages/react`, and a Vite app in `demo`.

## Project status

The broad catalog is intentionally private. Before a reduced public release, the project still needs locally hosted open assets, automated React component tests, CI, provenance, and verification of every third-party notice.

## Contributing

Issues and pull requests are welcome. For provider or emoji-data changes, include the affected Unicode sequence, expected provider URL, and a reproducible example. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before opening a pull request.

## License

Source code is available under the [MIT License](./LICENSE). Emoji artwork is provided by external services and may have separate licenses or usage terms.
