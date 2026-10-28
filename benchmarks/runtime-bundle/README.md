# Runtime bundle baseline

A reproducible client-side React/Vite production page renders the 12 actual tokens
from the CLI draft at `0a1a662`. The draft is a size fixture, **not a reviewed
product theme**: it intentionally retains its original review labels. It is now
wired to real renderer calls, rather than imported into an unreachable component.
No code from the temporary audit app is executed.

The fixture is outside the pnpm workspace. Its own npm lockfile pins the public
packages, independent of repository links. Run from **this directory** on Node 24:

```sh
npm ci --no-audit --no-fund
npm run verify
npm run measure
```

`verify` renders the actual components through Vite SSR and checks 0, 1 and 12
resolved image elements. It does not fetch image URLs or claim browser image
loading from SSR. `measure` builds the three complete browser pages with identical
settings: Vite 6.4.1, esbuild minification, ES2020 target, no source maps or manual
chunks, and the same React 19.2.7 version. Each variant has its own entry alias;
unused variants and the theme are not reachable from the baseline.

- `react-only`: the common page shell and native Unicode, no library imports.
- `single-emoji`: one real `<Emoji>`; the other rows keep native Unicode.
- `theme-12`: all 12 rows use `<EmojiToken>` and the real `defineEmojiTheme` result.

Core, data and React bindings are **0.1.1**, the current npm versions measured on
2026-10-28. CLI versions do not affect these browser packages. This is a controlled
consumer fixture, not the demo-site bundle or a measurement of the scratchpad app.

## Observed baseline

Sizes in decimal kB; full byte counts, emitted-file hashes and dependency versions
are in `baseline.json`.

| Variant | Minified JS | gzip JS | Additional gzip vs React |
| --- | ---: | ---: | ---: |
| React only | 196.116 kB | 61.297 kB | 0 |
| One Emoji | 658.213 kB | 139.952 kB | 78.655 kB |
| 12-token theme | 670.199 kB | 143.592 kB | 82.295 kB |

The 12-token build adds only **3.640 kB gzip** beyond the single-emoji build. Both
include the same full data module: **519,703 rendered bytes** in Rollup's module
inventory (before final chunk minification). The theme build also retains 107,788
rendered bytes of core and 11,233 of React bindings. These diagnostic module sizes
are not the minified bundle sizes and are **not additive gzip attribution**.

`reports/results.json` separates emitted JS, CSS and HTML; gzip is level 9 per file,
summed across files. The extra renderer CSS is reported separately (867 bytes
compressed total vs 396 for the common page). Artwork is fetched separately at
runtime and is excluded, as are response headers, cache behavior, runtime CPU and
load time. The report is not an accessibility or visual-quality evaluation.

`reports/*.html` contains treemaps from rollup-plugin-visualizer.
`reports/*-modules.json` records rendered/original module lengths and chunk IDs;
raw visualizer JSON is also available. Paths are normalized to `<fixture>` in the
module inventory. The generated output is ignored; `baseline.json` freezes this
observation. Repeated local builds had identical sizes and emitted-file hashes.

## What the evidence supports

A small semantic theme does not currently limit the bundled Unicode data. The
public runtime normalizer/resolver depends on `emojiData`; tokenization additionally
constructs an index over the complete data and aliases at module initialization.
Providers also retain lookup tables. Dynamic key lookups and those initialization
paths keep the full catalog reachable despite a 12-token application.

Next, prototype an **opt-in compiled theme runtime** with explicit per-token assets,
labels and Unicode fallback, then compare it with these frozen variants. Keep the
existing catalog/text-tokenization API for apps that need arbitrary Unicode input.
Removing exports or adding `sideEffects: false` alone cannot remove data still
used by the resolver. Do not promise a target size before measuring that prototype.
No runtime optimization is implemented in this benchmark PR.
