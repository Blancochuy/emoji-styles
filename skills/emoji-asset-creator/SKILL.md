---
name: emoji-asset-creator
description: Create or package coherent custom emoji artwork for web apps. Use for original visual directions, agent-generated emoji, local asset packs and semantic-token artwork, including normalization, small-size review and integration.
---

# Emoji Asset Creator

Turn existing images or an original visual direction into a reviewed local pack.
Run CLI commands from the user's application root. Resolve this skill's linked
references/templates relative to its installed directory. Keep generated files
in the app, not the skill. No repository checkout or Python is required.

## Setup and scope

Inspect the framework, existing assets/policy, intended tokens, output sizes and
backgrounds. Use locally installed CLI **0.3.0+**; install/upgrade if needed with
the app's package manager (npm example):

```sh
npm install --save-dev emoji-styles-cli@0.3.0
```

Inspect with `npm ls emoji-styles-cli`. `npx --no-install emoji-styles` selects the
local executable; pnpm users may use `pnpm exec emoji-styles`. Do not install a
private asset-pipeline package or compile this project's monorepo in another app.

Existing artwork can go straight to inspection/packaging. For new generation,
first define the spec and an approved style anchor as described below. CLI
planning and packaging never call an image model or spend generation credits.

## New artwork: define, plan, then generate

Use `assets init ./artwork --generated` to scaffold a spec and provenance record.
Adapt `asset-spec.json` to the actual direction, tokens and Unicode fallbacks;
record the real tool/model in `provenance-input.json`. If the tool hides its
model identifier, record an explicit unknown-model explanation, not a guess.
Read [asset specification](references/asset-specification.md) for the contract.

```sh
npx --no-install emoji-styles assets validate-spec ./artwork/asset-spec.json --json
npx --no-install emoji-styles assets plan ./artwork/asset-spec.json --variants 1 --json
```

A plan is not permission to run a generator. Use the available authorized image
tool within a finite request budget; no particular host, SDK or API key is
required by this skill. Read [licensing/provenance](references/licensing-and-provenance.md)
and [prompt patterns](references/prompt-patterns.md) before generating.

Preserve the user's freeform direction in measurable shape, camera, material,
palette and lighting rules. Presets are optional; freeform styles are first-class.
Generate one representative anchor and review it at 24/48 px on both backgrounds
before expanding the set. Use it as the shared reference when supported; record
when visual references are unavailable. Follow the [review checklist](references/review-checklist.md).

Each request returns one subject with a strong silhouette, safe-area spacing,
no text/logos/background plate and transparent output. Prefer native alpha and
inspect actual transparent pixels/corners. For tools exposing
`transparent_background`, request true. Skip background removal when real alpha
already exists. Record any necessary removal stage and recheck edges.

Save every attempt, prompt, actual dimensions/settings, reference/output hashes
and model provenance. Never use a contact sheet as the source asset or upload a
private repository. Keep raw outputs separate from packaged runtime images.

## Existing or generated images: inspect and pack

Put raw raster images in `./raw`. Use Unicode codepoint names such as `1f680.png`,
or provide an explicit mapping for semantic filenames. The static pipeline rejects
animation; SVG must be rasterized in a trusted workflow first.

```sh
npx --no-install emoji-styles assets inspect ./raw --json
```

For **non-generated** artwork, scaffold editable records with its truthful origin:

```sh
npx --no-install emoji-styles assets init ./artwork --no-generated --source "Original project artwork" --yes
```

Use this branch only when the images actually are non-generated. For generated
artwork retain the record from generation. Review source, license, ownership,
modifications and model fields before packaging; unknown rights stay unconfirmed.
Never relabel generated images as non-generated to bypass a provenance check.

The example below creates a candidate pack in `public/emoji/product`, with its
browser prefix inferred as `/emoji/product/assets`, an importable manifest and a
review sheet. Keep an existing working pack intact until its replacement passes.
Change these paths/ID to the app's conventions. Outside `public/`, set the browser
`--base-path` explicitly. [Provider packaging](references/provider-manifest.md)
explains mappings and URL resolution; mapping filenames refer to normalized
outputs (for example `action.deploy.webp`, even when the raw input is PNG).

```sh
npx --no-install emoji-styles assets pack ./raw ./public/emoji/product --id product --provenance ./artwork/provenance-input.json --manifest-out ./src/emoji-provider.json --review-sheet ./review/product.png --json
```

This previews normalization, validation, copies and side outputs. Apply that same
command with `--yes` after reviewing the preview. Existing files require an
intentional `--force` too; overlapping targets are rejected even with force.
For already-normalized files, `assets build` is also available. Keep only one
format and a Unicode fallback for every semantic mapping.

## Review, integrate and report

Inspect `review/product.png` at 100% zoom: 24/48/96 px on light and dark. Use the
[review protocol](references/review-protocol.md) and
[consistency guide](references/visual-consistency.md) to record accept/revise/uncertain
with evidence. Technical validity does not approve meaning, legibility, visual
quality or rights. Preserve uncertain results and separate assisted assessments
from independent human reviews. Target only the failed property in a repair,
preserve style invariants and stay inside the authorized attempt budget.

For a closed semantic token set, compile the reviewed theme using CLI 0.3.0
(`theme compile <theme-module> --output src/emoji-theme.compiled.ts`, preview
first, then `--yes`; `--check` detects staleness). Use a trusted `.mjs` or a `.ts`
module on Node 22.18+ to construct the theme with `createManifestProvider` and
the pack manifest. A serialized `.json` theme is also supported. Keep these
full-core imports in the build-time module; render through
`CompiledEmojiToken` from `react-emoji-styles/compiled` with runtime 0.2.0+.
A small token map passed to the full renderer still loads the Unicode catalog.
Use the full renderer for arbitrary Unicode or live provider switching. For
integration details, use the integration skill if installed or the public
[compiled-theme guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/SEMANTIC_TOKENS.md#compiled-themes).

Register reviewed artwork through the app's public renderer API. A manifest URL
prefix is relative to the served page, not the source import location. Confirm
image responses contain the actual artwork (not HTML served with 200), test
missing-image fallback and accessible labels, then run the app's tests/build.
Use `doctor`/`test` when the app has a corresponding CLI policy; distinguish disk
paths used by local checks from public browser URLs. Do not rewrite policy just
to silence an unrelated check. Report output paths, mappings, hashes, technical
and visual decisions, actual generator provenance and remaining uncertainties.

Do not closely imitate proprietary vendor artwork, invent legal clearance,
restrict original directions to presets, or store credentials in generated files.
