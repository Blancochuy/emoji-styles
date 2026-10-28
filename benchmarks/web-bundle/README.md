# Published web bundle comparison

A plain-JS Vite page with no framework renders the same 12 tokens and rows as
[`../runtime-bundle`](../runtime-bundle/README.md). The theme remains an
**unreviewed size fixture**, not a product theme. Every library comes from pinned
npm packages: `emoji-styles`, its data and `emoji-styles-web` at **0.3.0**, with
Vite 6.4.1. No workspace library builds or library aliases are used. The fixture
has its own npm lockfile outside the pnpm workspace.

Run on Node 24 from **this directory**:

```sh
npm ci --no-audit --no-fund
npm run measure
```

`measure` checks that all 12 tokens render the same first artwork URL, fallback
URLs and labels through the full and compiled public SSR renderers. It then
builds three pages with identical settings: esbuild minification, ES2020 target,
no source maps. Each Rollup graph is checked for catalog presence and workspace
library leakage:

- `web-none`: page shell and native Unicode, no emoji library imports.
- `web-full`: published `renderEmojiTokenToHTML` with the parsed `theme.json`.
- `web-compiled`: published `renderCompiledEmojiTokenToHTML` and
  `installCompiledEmojiFallbacks` with the committed `theme.compiled.ts`.

The report is written to `reports/results.json`. Use `npm run record` to
intentionally update `published.json`, including dependency versions, lockfile
and compiled-theme hashes, emitted sizes and module counts. gzip is level 9 per
emitted file, summed across files. JS and CSS are reported separately. Artwork
transfer, runtime CPU, hydration and cache behavior are excluded.

## Published-package measurement

Decimal kB; full counts and versions are recorded in `published.json`.

| Variant (npm 0.3.0) | Minified JS | gzip JS | Additional gzip vs none | Catalog |
| --- | ---: | ---: | ---: | --- |
| No emoji library | 2.080 kB | 1.029 kB | 0 | no |
| Full web renderer, 12 tokens | 473.631 kB | 81.401 kB | 80.372 kB | yes |
| Compiled web renderer, 12 tokens | 11.224 kB | 3.380 kB | 2.351 kB | no |

Both emoji variants add 0.377 kB gzip CSS. The compiled variant saves
**78.021 kB gzip JS** against the full 0.3.0 web renderer for this fixture.

## Historical prototype

`prototype.json` preserves the original local-build experiment against public
web/core 0.2.0. It recorded 1.029 kB gzip JS without the library, 81.370 kB with
the full renderer and 3.380 kB with the local compiled renderer. Its local build
hash remains evidence of that experiment; it is not the public-package record.

The initial manual browser check loaded all 12 images and followed Fluent →
Twemoji → hidden on forced errors. That check is separate from automated byte
measurement. The package's jsdom tests cover fallback behavior and token events.

The `Published web bundle` CI workflow installs this npm lockfile, verifies SSR
parity and actual Rollup graphs, and uploads its report. It does not build the
monorepo or claim real-browser image-loading verification.
