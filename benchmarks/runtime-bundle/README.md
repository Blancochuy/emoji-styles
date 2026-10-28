# Published runtime bundle comparison

A reproducible React/Vite page renders the same 12 tokens from the CLI draft at
`0a1a662`. This is a size fixture, **not a reviewed product theme**; its original
review labels are preserved. Every variant now uses **npm packages only**:
core/data/React bindings 0.2.0 and CLI 0.3.0. No repository build or library alias
is needed. The fixture is outside the pnpm workspace and has its own npm lockfile.

Run from **this directory**, on Node 24:

```sh
npm ci --no-audit --no-fund
npm run verify
npm run measure
```

`verify` server-renders 0, 1, 12 and 12 resolved images, compares the compiled and
full-runtime artwork URLs, checks compiled-theme freshness with the **installed
npm CLI**, and inspects a real production Rollup graph for catalog/full-runtime
imports. SSR does not fetch images or prove browser image loading.

`measure` builds four pages with identical settings: Vite 6.4.1, React 19.2.7,
esbuild minification, ES2020 target, no source maps or manual chunks. Only the
application entry changes:

- `react-only`: common page shell and native Unicode, no emoji library imports.
- `single-emoji`: one real `<Emoji>`; other rows retain native Unicode.
- `theme-12`: 12 `<EmojiToken>` calls with a real `defineEmojiTheme` result.
- `theme-12-compiled`: the same rows, size and `lazy={false}`, using
  `<CompiledEmojiToken>` from `react-emoji-styles/compiled`.

## Published-package measurement

Decimal kB; full byte counts, module attribution, emitted-file hashes, dependency
versions and lockfile/theme hashes are committed in `published.json`.

| Variant (npm 0.2.0) | Minified JS | gzip JS | Additional gzip vs React |
| --- | ---: | ---: | ---: |
| React only | 196.116 kB | 61.297 kB | 0 |
| One Emoji | 658.217 kB | 139.966 kB | 78.669 kB |
| 12-token theme | 670.237 kB | 143.645 kB | 82.348 kB |
| 12-token theme, compiled | 203.547 kB | 62.964 kB | 1.667 kB |

The compiled page saves **80.681 kB gzip JS** compared with the full 0.2.0 theme.
The full runtime still includes `emoji-styles-data`; the compiled page's module
inventory excludes that package, the tokenizer and the full core/React entries.
A small theme alone does not remove the catalog: use the compiled entry for a
closed set. Arbitrary Unicode, `EmojiText` and live provider switching still need
the full runtime. Mixing it into the same browser graph can retain the catalog.

`reports/results.json` separates JS, CSS and HTML. gzip is **level 9 per emitted
file**, summed across files, so other compression settings may produce slightly
different numbers. CSS is separate; artwork transfer, headers, cache behavior,
CPU and load time are excluded. The result is one controlled fixture, not a
promise for every app, an accessibility evaluation or a visual-quality score.

`reports/*.html` contains rollup-plugin-visualizer treemaps. Module inventories
in `reports/*-modules.json` record rendered lengths before final minification;
these are diagnostic sizes, **not additive gzip attribution**. Report/output
directories are ignored. Use `npm run record` to deliberately update
`published.json` after reviewing dependency or fixture changes.

## Theme input and regeneration

`src/theme.ts` defines the full-runtime fixture; `src/theme.json` serializes that
same theme for the CLI, avoiding a TypeScript loader requirement for compilation.
The compiled artifact remains committed and is checked for staleness:

```sh
npx --no-install emoji-styles theme compile src/theme.json --output src/theme.compiled.ts --yes --force
```

Regenerate JSON when changing the source theme using `serializeEmojiTheme` from
the installed core. Theme metadata retains dataset/provider revisions and licenses.
Compilation computes URLs without fetching artwork.

## Historical records

- `baseline.json` freezes the three original **npm 0.1.1** variants. Their JS gzip
  sizes were 61.297 kB (React), 139.952 kB (one Emoji) and 143.592 kB (12 tokens).
- `prototype.json` preserves the original **unpublished local-build experiment**,
  including hashes of the aliased compiled entries and its 62.964 kB gzip result.
  It is historical evidence, not the current public-package measurement.
- `published.json` records the current four variants from npm, without replacing
  either earlier record. The current harness no longer rebuilds the old variants;
  their original fixture and lockfile remain recoverable from Git history.

CI installs only this fixture's npm lockfile, runs verification/measurement and
uploads reports. It does not build or resolve the monorepo packages.
