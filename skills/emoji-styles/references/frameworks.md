# Framework integration

## React

For a reviewed closed token set, install `emoji-styles@^0.3.0` and
`react-emoji-styles@^0.3.0`, compile the theme with the installed CLI 0.3.3+, then render:

```tsx
import { CompiledEmojiToken } from "react-emoji-styles/compiled";
import "react-emoji-styles/styles.css";
import { compiledEmojiTheme } from "./emoji-theme.compiled";

<CompiledEmojiToken token="action.deploy" theme={compiledEmojiTheme} size={20} />;
```

This entry needs no `EmojiProvider` and supports theme labels, locales and image
fallbacks. For custom packs, construct the theme with `createManifestProvider`
in a trusted `.mjs`/supported `.ts` module and compile that module. Keep its
full-runtime imports in build-time source, outside the browser graph. Asset URLs
must be served by the app; compilation computes URLs without fetching images.

For dynamic Unicode or live provider switching, use `react-emoji-styles`, import
its static stylesheet, and provide policy near the application root.

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";
import "react-emoji-styles/styles.css";

<EmojiProvider provider={publicProviders.fluent3d} fallbacks={[publicProviders.twemoji]} nativeFallback={false}>
  <Emoji emoji="🚀" label="Deploy application" />
</EmojiProvider>
```

Use `EmojiToken` for product semantics and `EmojiText` for arbitrary strings containing complete grapheme sequences.

## Compiled web: Astro, templates, Vue, Svelte and plain HTML

For a reviewed, closed token set, install `emoji-styles@^0.3.0` and
`emoji-styles-web@^0.3.0`. Compile the theme outside the browser import graph.
Server/static templates can render the token synchronously:

```ts
import { renderCompiledEmojiTokenToHTML } from "emoji-styles-web/compiled";
import { compiledEmojiTheme } from "./emoji-theme.compiled";

const html = renderCompiledEmojiTokenToHTML("action.deploy", compiledEmojiTheme, { size: 20 });
```

Load the static CSS and install fallback handling once in the browser:

```ts
import { installCompiledEmojiFallbacks } from "emoji-styles-web/compiled";
import "emoji-styles-web/styles.css";

const uninstall = installCompiledEmojiFallbacks();
```

For client-only templates, call `defineCompiledEmoji(compiledEmojiTheme)` from
that same entry and render `<compiled-emoji token="action.deploy"></compiled-emoji>`.
Register one tag name per theme and configure the framework to accept that custom
element. Preserve the theme's labels and check missing-image fallback behavior.
Use the full web entry for arbitrary Unicode, text transformation or live provider
switching; mixing it into this graph can retain the catalog.

## Full runtime: Vue, Svelte, Angular, Astro, and vanilla HTML

Use the `emoji-styles-web` Web Component or the framework-agnostic core. Register `<styled-emoji>` once, then pass provider policy explicitly. Avoid framework-specific reimplementations of URL and fallback logic.

## SSR and CSP

- Emit complete initial markup on the server.
- Import static CSS; do not require runtime style injection.
- Use browser-native image loading as progressive enhancement.
- Verify no hydration mismatch with React 18 and 19.
- Keep provider asset origins compatible with `img-src`.
- Prefer local assets for the strictest content security policy.

## Tests

Test the configured primary provider, ordered fallbacks, terminal native policy, missing asset behavior, local path resolution, accessibility labels, reduced motion, SSR, and hydration.
