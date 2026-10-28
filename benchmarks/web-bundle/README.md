# Web bundle comparison (prototype)

A plain-JS Vite page, with no framework, renders the same 12 tokens and rows as
[`../runtime-bundle`](../runtime-bundle/README.md). Like that fixture, the theme is an
**unreviewed size fixture**, not a product theme. `emoji-styles-web/compiled` is
**not published yet**: that one entry is aliased to this repository's local build.
`emoji-styles` 0.2.0, its data, `emoji-styles-web` 0.2.0 and Vite 6.4.1 come from npm
through this directory's own lockfile, outside the pnpm workspace.

Run on Node 24 from **this directory**, after building the prototype:

```sh
pnpm --filter emoji-styles-web build   # from the repository root
npm ci --no-audit --no-fund
npm run measure
```

`measure` first checks that all 12 compiled tokens render the same first artwork URL,
fallback URLs and labels as the published `renderEmojiTokenToHTMLResult`. It then builds
three pages with identical settings (esbuild minification, ES2020 target, no source maps)
and inspects each Rollup module graph:

- `web-none`: page shell and native Unicode, no emoji library imports.
- `web-full`: published `emoji-styles-web` 0.2.0 `renderEmojiTokenToHTML` with the
  parsed `theme.json`, resolved in the browser.
- `web-compiled`: local `renderCompiledEmojiTokenToHTML` and
  `installCompiledEmojiFallbacks` with the committed `theme.compiled.ts`.

## Prototype measurement

Recorded in `prototype.json` with the local build's hash; `npm run record` rewrites it.

| Variant | Minified JS | gzip JS | Additional gzip vs none | Catalog |
| --- | ---: | ---: | ---: | --- |
| No emoji library | 2.080 kB | 1.029 kB | 0 | no |
| `emoji-styles-web` 0.2.0, 12 tokens | 473.556 kB | 81.370 kB | 80.341 kB | yes |
| `emoji-styles-web/compiled`, 12 tokens | 11.181 kB | 3.371 kB | 2.342 kB | no |

The compiled page sends **77.999 kB less gzip JS** than the full web renderer; most of
its remaining 2.3 kB is the compiled theme itself (URLs, labels, provider metadata).
Both emoji variants add the same 0.377 kB gzip stylesheet. This measures JS and CSS
bytes for one fixture. It does not cover artwork transfer, CPU, hydration or your own
theme. A real browser check rendered all 12 images and followed Fluent → Twemoji →
hidden on forced image errors; that check is manual and not part of `measure`.
