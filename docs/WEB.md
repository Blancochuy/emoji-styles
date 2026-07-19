# Universal web package

`emoji-styles-web` exposes the same core resolution and semantic-theme contracts without requiring React. It provides an explicit Web Component registration, a Node-safe SSR renderer, and a reversible DOM text transformer.

`configureEmojiStyles()` accepts the shared [project configuration](./CONFIGURATION.md), allowing elements and SSR calls to inherit one provider and fallback policy.

## Install and register

```ts
import "emoji-styles-web/styles.css";
import { defineStyledEmoji } from "emoji-styles-web";

defineStyledEmoji();
```

```html
<styled-emoji
  emoji="🚀"
  provider="fluent-animated"
  fallbacks="fluent-3d,twemoji"
  native-fallback="false"
  label="Deploy application"
  size="24"
></styled-emoji>
```

`fallbacks` is an ordered comma-separated provider chain. `native-fallback="false"` prevents the component from revealing an OS-dependent Unicode glyph after that chain is exhausted.

Registration is explicit, so importing the package during SSR does not access `window`, `document`, or `customElements`.

SerenityOS pixel art is available as a built-in partial provider:

```html
<styled-emoji
  emoji="🚀"
  provider="serenityos"
  fallbacks="twemoji"
  size="32"
></styled-emoji>
```

`emoji-styles-web/styles.css` pixelates only the current SerenityOS image URL and preserves the requested size. Unsupported exact sequences continue through `fallbacks`. Consumers that use only `getEmojiUrl()` from the core package must add `image-rendering: pixelated` to their own SerenityOS `<img>` rule.

## Semantic tokens

Register themes once and reference stable product intent from markup:

```ts
import { defineEmojiTheme } from "emoji-styles";
import { configureEmojiStyles } from "emoji-styles-web";

const productTheme = defineEmojiTheme({
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
  },
}, {
  id: "product",
  version: "1.0.0",
  defaultProvider: "fluent-3d",
});

configureEmojiStyles({
  themes: { product: productTheme },
  defaultTheme: "product",
});
```

```html
<styled-emoji token="action.deploy" theme="product"></styled-emoji>
```

Custom providers can be registered through `configureEmojiStyles({ providers })` or assigned directly to an element through its `providerObject` property.

## Server rendering and hydration

The SSR renderer escapes text and attributes, emits no scripts or inline styles, and produces deterministic markup:

```ts
import { renderEmojiToHTML, renderEmojiToHTMLResult } from "emoji-styles-web";

const html = await renderEmojiToHTML("🚀", {
  provider: "fluent-3d",
  fallbacks: ["noto", "twemoji"],
  nativeFallback: false,
  label: "Deploy application",
  size: 24,
});

const componentHTML = await renderEmojiToHTML("🚀", {
  provider: "fluent-3d",
  element: "styled-emoji",
  size: 24,
});

const { preload } = await renderEmojiToHTMLResult("🚀", {
  provider: "fluent-3d",
});
```

When the custom element registers in the browser, it reuses a matching server-rendered `<img>` rather than replacing it. Import the static stylesheet to remain compatible with strict CSP.

## Transform existing text

```ts
import {
  defineStyledEmoji,
  transformEmojiText,
  undoEmojiTextTransform,
} from "emoji-styles-web";

defineStyledEmoji();

const metrics = transformEmojiText(document.querySelector("main")!, {
  provider: "twemoji",
  fallbacks: ["noto"],
  nativeFallback: false,
  size: 20,
});

undoEmojiTextTransform(document.querySelector("main")!);
```

The transformer processes text nodes without `innerHTML`. It skips `script`, `style`, `textarea`, `input`, `code`, `pre`, `noscript`, contenteditable regions, and previously transformed content by default. It preserves each original Unicode grapheme for deterministic undo.

## Framework recipes

### Vue

Configure Vue to treat the element as custom and use it directly in templates:

```ts
// vite.config.ts
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === "styled-emoji" } } })
```

```vue
<styled-emoji emoji="🚀" provider="fluent-3d" label="Deploy" size="24" />
```

### Svelte and Astro

Both accept standards-based custom elements without an adapter:

```svelte
<styled-emoji emoji="🚀" provider="fluent-3d" label="Deploy" size="24" />
```

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the consuming module or standalone component, then use:

```html
<styled-emoji emoji="🚀" provider="fluent-3d" label="Deploy" size="24"></styled-emoji>
```

## Events

The component emits bubbling `emoji-resolved`, `emoji-fallback`, and `emoji-error` custom events. Event details contain provider and fallback information; the terminal fallback event includes `native: true|false`. Events never execute or inject markup.
