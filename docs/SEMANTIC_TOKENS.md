# Semantic emoji tokens

Semantic tokens name product intent independently from Unicode and artwork. Application code uses `action.deploy`; a versioned theme decides whether that intent renders as 🚀, a licensed provider asset, a product icon, or a generated custom asset.

Use semantic tokens for interface meaning such as statuses, actions, navigation, and system feedback. Continue using ordinary Unicode text for conversational emoji and user-authored content.

## Define a theme

```ts
import { defineEmojiTheme, publicProviders } from "emoji-styles";

export const productTheme = defineEmojiTheme({
  "status.success": {
    emoji: "✅",
    label: "Operation succeeded",
    labels: {
      es: "Operación exitosa",
      "es-MX": "Operación completada",
    },
  },
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
    asset: {
      url: "/icons/deploy.svg",
      format: "svg",
    },
  },
  "reaction.fire": {
    emoji: "🔥",
    label: "Fire",
    decorative: true,
  },
}, {
  id: "product",
  version: "1.0.0",
  defaultProvider: publicProviders.fluent3d,
  fallbacks: [publicProviders.twemoji],
  nativeFallback: false,
});
```

Token names require at least two lowercase dot-separated segments. Every token records a Unicode fallback and label. `decorative` defaults to `false`; decorative tokens remain hidden from assistive technology in the React adapter.

## Render in React

```tsx
import { EmojiProvider, EmojiToken } from "react-emoji-styles";
import { productTheme } from "./product-theme";

<EmojiProvider theme={productTheme} locale="es-MX">
  <button>
    <EmojiToken token="action.deploy" size="lg" />
    Deploy
  </button>
</EmojiProvider>
```

`useEmojiToken` exposes asynchronous structured resolution for custom renderers. `useEmojiTheme` reads the active theme, locale, and custom-provider registry.

## Theme inheritance and composition

```ts
const darkTheme = defineEmojiTheme({
  "status.success": {
    emoji: "🎉",
    label: "Celebration",
    decorative: true,
  },
}, {
  id: "product-dark",
  version: "1.1.0",
  extends: productTheme,
});

const tenantTheme = mergeEmojiThemes(productTheme, darkTheme);
```

Inheritance produces a flattened theme and records ancestry metadata. Composition uses last-theme-wins precedence while retaining all untouched tokens.

## Generated and product-owned assets

Themes may embed an exact structured asset, or reference a stable asset id resolved by a semantic provider:

```ts
const icons = createSemanticTokenProvider({
  id: "acme-icons",
  label: "Acme product icons",
  version: "1.0.0",
  assets: {
    "action.deploy": "/assets/action.deploy.webp",
  },
  format: "webp",
  local: true,
  license: {
    name: "Proprietary",
    ownership: "Acme",
  },
});

const theme = defineEmojiTheme({
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
    asset: "action.deploy",
    provider: icons,
  },
});
```

Generated artwork should still be distributed through a provider manifest with ownership, generator provenance, checksums, and licensing metadata. A semantic theme describes meaning and selection; it does not grant rights to an asset.

## Serialize and validate

```ts
const validation = validateEmojiTheme(productTheme);
if (!validation.valid) throw new Error(validation.errors.join("; "));

const json = serializeEmojiTheme(productTheme);
const source = serializeEmojiTheme(productTheme, {
  format: "typescript",
  variableName: "productTheme",
});
```

Serialized themes use schema version `1`. The JSON Schema ships as `emoji-styles/schema/theme`. Provider objects serialize to stable provider IDs so JSON remains portable. Register custom IDs when rendering:

```tsx
<EmojiProvider
  theme={parsedTheme}
  providers={{ "acme-icons": icons }}
>
  <EmojiToken token="action.deploy" />
</EmojiProvider>
```

`parseEmojiTheme` reads schema v1 JSON. `migrateEmojiTheme` also accepts the schema-less token-map shape used during early development and returns a normalized v1 theme.

## Compiled themes (prototype, unreleased)

`EmojiToken` resolves artwork in the browser with the full Unicode catalog, which a 12-token
theme still bundles ([measurement](../benchmarks/runtime-bundle/README.md)). For a **closed token
set**, such as the output of `theme draft`, you can instead resolve every token once in Node and
ship only the result:

```sh
emoji-styles theme compile ./emoji-theme.json --output src/emoji-theme.compiled.ts --yes
```

```tsx
import { CompiledEmojiToken } from "react-emoji-styles/compiled";
import "react-emoji-styles/styles.css";
import { compiledEmojiTheme } from "./emoji-theme.compiled";

<CompiledEmojiToken token="action.deploy" theme={compiledEmojiTheme} size={20} />;
```

The generated module exports the compiled object and a union of token names
(`EmojiTokenName`), so unknown tokens are type errors. Each token carries its `emoji`, `label`,
optional `labels`, `decorative` flag, the ordered `sources` (`provider`, `url`, `format`) from the
theme's default provider and fallbacks, and the Unicode fallback (`unicode`, `null` when
`nativeFallback` is off). `meta` records the theme, the Unicode/CLDR dataset and the revision and
license of each provider. URLs are computed by the existing resolver; nothing is fetched.

`<CompiledEmojiToken>` renders the first source as an `<img>` with the same class names, label or
`alt`, locale label and decorative behavior as `EmojiToken`, and is safe to server-render. On an image error it
tries the next source, then the Unicode glyph (when allowed), then renders nothing. The
`emoji-styles/compiled` and `react-emoji-styles/compiled` entry points do not import the
catalog, tokenizer, provider tables, the package root or `EmojiProvider`; the build tests assert it.

**Use it when** the token set is known at build time and every emoji you render is a token.

**Do not use it** for arbitrary Unicode or user content (`EmojiText`, `Emoji` with a runtime
emoji), for tokens chosen at runtime that are not in the compiled set, or when you need a live
`EmojiProvider`/provider-registry switch. Keep the full runtime for those.

Compiled output is a build artifact. Regenerate it when the theme, `emoji-styles` data or a
provider revision changes; `theme compile ... --check` exits 1 when the committed file is stale,
so it can run in CI. Details and flags: [CLI](CLI.md#compile-a-theme-prototype).

Measured on the benchmark page (12 tokens, `lazy={false}`, local unpublished builds): 62.964 kB
gzip JS versus 143.592 kB for `EmojiToken` and 61.297 kB for no emoji library. That is one fixture
and JS/CSS bytes only; artwork transfer, CPU and your own theme are not covered.

## Resolution order

`resolveEmojiToken` uses this deterministic order:

1. exact structured asset declared by the token;
2. stable asset id resolved by a semantic provider;
3. token-level provider override;
4. theme or caller provider;
5. ordered theme or caller fallbacks;
6. native Unicode when configured.

Unsafe URL schemes, path traversal, invalid token/provider IDs, malformed checksums, missing labels, invalid emoji graphemes, and unsupported schema versions fail validation before rendering.
