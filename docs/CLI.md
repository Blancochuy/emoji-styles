# Emoji Styles CLI

The CLI turns an emoji policy into reproducible project checks and local provider artifacts. Its foundation commands are deterministic and do not call an AI model.

## Installation

The standalone `emoji-styles-cli@0.2.1` is published on [npm](https://www.npmjs.com/package/emoji-styles-cli). Its executable is `emoji-styles`.

```sh
npm install --save-dev emoji-styles-cli@0.2.1
npx --no-install emoji-styles --help
```

For a portable custom pack, start with the [one-page quickstart](./QUICKSTART.md). CLI 0.1.2 includes one-step `assets pack`; upgrade from earlier CLI versions to use it.

## Run from the monorepo

```bash
pnpm --filter emoji-styles-cli build
node packages/cli/dist/cli.js help
```

The source build includes the private asset pipeline; no separate pipeline installation is required.

## Safe write model

Commands that can change a project first produce a preview. Add `--yes` only after reviewing the proposed files.

```bash
emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback
emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback --yes
```

An existing configuration is never replaced unless both `--yes` and `--force` are supplied.

## Argument and automation contract

The standalone CLI `0.2.1` is published on [npm](https://www.npmjs.com/package/emoji-styles-cli)
with provenance. Its package name is `emoji-styles-cli`; its binary is `emoji-styles`.

```bash
npm install --save-dev emoji-styles-cli@0.2.1
npx --no-install emoji-styles --help
npx --no-install emoji-styles studio ./raw ./emoji-assets
```

The [CLI release workflow](./CLI_RELEASE.md) is separate from the five-package
renderer release train. The build includes the internal asset pipeline and uses
a normal runtime dependency on sharp. To verify a source build:

```bash
pnpm cli:pack
npm run cli:smoke
```

The tarball is written to `.release-cli/emoji-styles-cli-0.2.1.tgz`. Install it in
another project with `npm install --save-dev /absolute/path/to/the/tarball.tgz`,
then use `npx --no-install emoji-styles`. No workspace links or private packages
are required at runtime. Packing a source build does not publish it to npm. The five-package renderer release workflow deliberately excludes the CLI.

The distribution workflow installs the same tarball on Linux, macOS, and Windows
under Node 22 and 24. Linux additionally checks Node 18.17.0 (the declared minimum)
and Node 20. The declared Node range matches sharp: `^18.17.0 || ^20.3.0 || >=21.0.0`.
These jobs run without installing workspace dependencies and exercise
the npm binary shim, public entry points, JSON errors, native raster normalization,
validation, a review sheet, and provider packaging. Studio help, rejection of headless invocation, and an opening/cancellation session
with simulated TTY capabilities are checked on each platform. Compatibility with
real terminal applications is a separate check. Keep npm optional dependencies enabled for native image support.

In a built checkout, replace `emoji-styles` in the examples below with
`node packages/cli/dist/cli.js`. In an installed consumer, prefix it with
`npx --no-install`.
- `emoji-styles help assets` lists asset commands. `emoji-styles assets normalize --help`
  and `emoji-styles help assets normalize` show the same command-specific help.
- Boolean options do not consume positional arguments: `emoji-styles --json doctor`
  works. Use `--yes=false` or `--no-yes` to disable a boolean explicitly.
- Unknown options, options unsupported by a command, missing values, extra arguments,
  invalid formats, and repeated options fail before command execution.
- Use `--` before a literal path starting with a dash, such as `emoji-styles audit -- --draft`.
  Values starting with `--` can use `--ownership=--example`. Inline values preserve `=`.
- Exit codes: `0` for success (including previews and help), `1` for a failed check or
  operation, `2` for invalid command syntax or options.
- `--json` writes one JSON result to stdout, including usage failures. Audit and
  licenses also support `--format json`. Raster commands use `--format` for the
  image encoding, so use `--json` for their result envelope.
- Failed results include `error.kind` (`usage` or `operation`) and `error.code`.
  Usage codes are `UNKNOWN_COMMAND`, `UNKNOWN_OPTION`, `MISSING_OPTION_VALUE`,
  `INVALID_OPTION_VALUE`, `DUPLICATE_OPTION`, `INVALID_ARGUMENTS`, and
  `INTERACTIVE_REQUIRED` (Studio invoked without an interactive terminal or with JSON). Operational
  failures use `COMMAND_FAILED`; inspect checks and result data for details.

Run `pnpm test` from the repository root to build dependencies and test both the
library entry point and compiled executable. A direct CLI package test expects
those workspace builds to exist.

See [CLI delivery plan](./CLI_ROADMAP.md) for the interactive interface and distribution work.

## Interactive image workspace

From a built checkout, start the explicit terminal interface:

```bash
node packages/cli/dist/cli.js studio
node packages/cli/dist/cli.js studio ./raw ./emoji-assets --format webp --size 256
```

Studio requires interactive stdin and stdout. It never starts automatically and
rejects JSON mode; scripts and agents should use `assets inspect`, `assets normalize`,
and `assets validate` with `--json`. No new runtime dependencies are needed.

Enter source and output paths inside the current project. Use Up/Down or Tab to
navigate, Enter to select, Esc to go back, and Ctrl+C to exit. In a path field,
Ctrl+U clears the value. Paths with spaces work without shell quoting inside the UI.
The minimum terminal size is 40 columns by 12 rows; smaller windows show a resize prompt.

The workflow is:

1. Inspect source dimensions, file size, actual transparent-pixel ratio, and animation status.
2. Preview normalization in memory. Review the planned output paths and normalized metadata.
3. Choose **Apply reviewed preview**, then explicitly select **Write files and validate**.
   The default is **Keep preview; do not write**. There is no overwrite shortcut.
4. Studio rechecks the preview. Changed image content or output targets require another review.
5. Write the files, validate the output, and show the destination and technical issues.

Format and canvas size can be changed from the menu. `--safe-area` sets the initial
safe area; size must be an integer from 16 to 4096, and safe area must be greater
than 0.1 and at most 1. Changing paths or settings invalidates the previous preview.
If files already exist, choose a different output path. Empty folders and failed
operations show an error with a route back to the menu.

Studio shows metadata, not inline artwork. Normalization preserves existing alpha;
it does not remove opaque backgrounds. Use `assets contact-sheet ... --review --yes`
and inspect the exported PNG on light and dark backgrounds for visual approval.
Technical validation cannot establish legibility, semantic correctness, or style consistency.

Esc exits normally from the first screen or menu. Ctrl+C/Ctrl+D exit with code 130;
SIGTERM exits with 143. A stop requested during an operation waits for that operation
to finish and restores raw mode, the cursor, and the original terminal screen. Completed
writes are retained. Studio does not claim rollback or interrupt a partially written batch.

## Configuration

`emoji-styles.config.json` is the project-level policy:

```json
{
  "schemaVersion": 1,
  "provider": "fluent-3d",
  "fallbacks": ["twemoji"],
  "nativeFallback": true,
  "source": ["src"],
  "policy": { "allowRemoteAssets": true }
}
```

`fallbacks` is the ordered provider chain. `nativeFallback` is a separate terminal policy: set it to `false` when the UI must never depend on the current OS glyph. Explicitly including `"native"` in `fallbacks` still opts into OS rendering.

The same file can be imported once by React or the universal web package, so runtime components and CLI checks share one policy. See [Project configuration](./CONFIGURATION.md).

`init` detects npm, pnpm, Yarn, or Bun and recognizes React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, and Astro projects.

## Validation

```bash
emoji-styles doctor
emoji-styles test
```

`doctor` validates configuration, dependencies, providers, fallback policy, local manifests, asset presence, hashes, licensing metadata, and SSR/CSP guidance. `test` scans configured sources, resolves every used emoji, and verifies local assets and checksums.

## Audit source code

`audit` parses JavaScript, TypeScript, JSX, TSX, and HTML without executing project code:

```bash
emoji-styles audit
emoji-styles audit ./src
emoji-styles audit ./src --format json
emoji-styles audit ./src --format sarif > emoji-styles.sarif
```

The audit reports stable rule IDs, severity, file, line, column, explanation, and an optional migration suggestion. Current deterministic rules cover:

- raw Unicode that bypasses the project emoji policy;
- emoji-only controls and emoji images without accessible labels;
- native emoji in snapshot, story, specification, test, or visual-regression sources;
- direct or unpinned provider URLs;
- unknown providers and missing fallback policy;
- remote assets forbidden by project policy;
- custom emoji images that bypass a manifest-backed provider, invalid manifests, and missing asset hashes;
- configured artwork providers without license metadata;
- unsupported emoji-like Unicode sequences;
- source files that cannot be parsed safely.

`audit` exits unsuccessfully when at least one finding has `error` severity. Warnings and informational findings remain machine-readable but do not fail the command.

### Configure severity

Rules can be disabled or changed to `info`, `warning`, or `error` in the shared project policy:

```json
{
  "policy": {
    "allowRemoteAssets": false,
    "audit": {
      "emoji-styles/semantic/raw-emoji": "warning",
      "emoji-styles/accessibility/missing-label": "error",
      "emoji-styles/determinism/native-critical-ui": "error"
    }
  }
}
```

<a name="from-an-audit-to-a-design-draft-source-build-not-in-cli-012"></a>

## From an audit to a design draft (CLI 0.2.0)

CLI 0.2.0 adds `data.usages` to audit JSON: one record per literal emoji,
with source location, role (`control`, `status`, `decorative`, `content`, `unknown`),
evidence (`explicit`, `heuristic`, `unknown`) and context. Intrinsic controls and
explicit ARIA roles are static evidence. Status wording is an **English-only
heuristic**, never proof of product meaning. Known `Emoji`/`styled-emoji` literal
props also enter the inventory; dynamic tokens, arbitrary images and computed
values are not resolved.

`aria-hidden`/`hidden` decoration stays in the inventory without a raw-policy
warning. Intrinsic emoji-only buttons, links with `href`, and explicit ARIA
controls without an action name produce an accessibility error. Dynamic names,
spreads, custom children and unresolved `aria-labelledby` remain uncertain.
CSS, external labels, host rendering and runtime behavior need separate review.
This is not a complete accessibility audit.

Run from an application that already has `emoji-styles.config.json`, using
locally installed CLI 0.2.0 or newer:

```bash
npx --no-install emoji-styles theme draft ./src --output ./emoji-review --json
npx --no-install emoji-styles theme draft ./src --output ./emoji-review --yes
```

The preview lists proposed files without writing. `--yes` writes:

- `emoji-theme.ts`: a valid `defineEmojiTheme` **draft** with Unicode mappings;
- `review.json`: all occurrences, evidence, findings and token proposals;
- `token-sheet.html`: tokens next to text at **16, 20 and 24 px**, in light and dark,
  using Fluent 3D and Twemoji (or select one with `--providers twemoji`).

Open the HTML at 100% zoom. Built-in images load pinned public provider URLs when
opened, so viewing them needs internet; the CLI itself makes no network calls.
`allowRemoteAssets: false` disables those images. Missing artwork is shown
explicitly; the sheet does not substitute native glyphs. Attribution is included.

To compare your own pack too, add these options to `theme draft`:

```text
--manifest ./public/emoji/product/emoji-provider.json
--asset-root ./public/emoji/product/assets
```

Both options are required together. `--asset-root` is the actual disk directory
containing the manifest's asset filenames, independent of its browser `basePath`.
The sheet embeds static raster images, checks declared hashes, and rejects SVG,
animation, escaping paths and oversized inputs. Missing entries remain visible.
An existing draft needs `--force --yes` to replace its three output files.

Names such as `action.deploy`, `status.success` and `status.warning` are proposals.
Collisions remain separate candidates. Unknown and decorative occurrences are
retained in `review.json` but do not become tokens. Content candidates are
optional: do not mechanically turn expressive text into design tokens. Review
all labels, meaning, visual quality and licensing, then integrate the selected
tokens using [semantic themes](./SEMANTIC_TOKENS.md). This command neither rewrites
the application nor reduces the Unicode bundle; bundle work is separate.

### Draft-quality refinements in CLI 0.2.1

CLI 0.2.1 separates `status.error` (failed/failure/error wording)
from `status.warning`. In an explicit status region, conventional glyphs such as
❌, ⚠️ and ✅ can also suggest severity without recognizing the text language.
These are review proposals, not proof of meaning or automatic accessibility fixes.
Token names normalize Latin diacritics (`Configuración` becomes `configuracion`),
while original labels and source contexts remain available for review.

Wording and glyph evidence that disagree, such as `✅ 0 failed checks`, produce a
neutral review row and a structured `statusConflicts` entry. No severity is chosen.
`statusHints` groups competing glyphs under their possible canonical state, including
conflicted evidence explicitly marked with `conflictedTokens`. Choose one icon
after resolving those conflicts. These rows have `themeIncluded: false` and are
omitted from `emoji-theme.ts`; the full evidence and artwork remain in the report
and sheet. The export summary states how many candidates were included.

Messages with the same unambiguous state and glyph share one token with a generic
label to review/localize; `sourceLabels` and `usages` retain every original message
and location. Add the chosen canonical definitions to the application's reviewed
theme, rather than treating numbered review variants as separate product states.

`review.json` and the HTML sheet include `reuseHints` when one emoji appears in
multiple control-token candidates. Review those contexts together before choosing
one canonical token. Sharing a glyph does not prove the actions are equivalent;
content and decorative usages do not trigger control consolidation hints.

The sheet opens with a compact 20 px matrix of every token against each selected
provider, on both backgrounds. Token links jump to the full 16/20/24 px samples.
Custom artwork and unavailable assets use the same resolution and policy in both
views. CLI 0.2.0 retains its original suggestions and layout; upgrade to 0.2.1
to use these refinements.

On the six-occurrence Pricing/Deploy/status/decoration/settings-link fixture,
a clean npm consumer comparison against published CLI 0.1.2 produced:

| Observable result | npm 0.1.2 | Source design draft |
| --- | --- | --- |
| Raw-policy warnings | 6 identical warnings | 5 with role context; decoration excluded |
| Unnamed settings-link errors | 0 | 1; product action label required |
| Role inventory | None | Content, control, status, status, decorative, control |
| Draft output | Unavailable | 5 review candidates and a provider comparison sheet |

This is a regression example, not a general accuracy benchmark. The status
classification and every proposed token still need human review. The packaged
consumer smoke check replays this workflow outside the monorepo and imports the
generated theme using the public core package.

## Compile a theme (prototype)

> Unreleased. `theme compile` exists in the repository source; it is not in the published
> CLI 0.2.1, and the `compiled` entries are not in the published 0.1.1 packages.

```bash
emoji-styles theme compile <theme-module> --output <file> [--yes] [--force] [--check]
                           [--export-name compiledEmojiTheme] [--type-name EmojiTokenName]
```

Resolves every token of a semantic theme with the existing resolver and writes a TypeScript
module for `react-emoji-styles/compiled`: the compiled object plus a string-literal union of
token names. See [Semantic tokens](SEMANTIC_TOKENS.md#compiled-themes-prototype-unreleased) for
the output and when to use it. The command is offline: URLs are computed from pinned provider
tables and never fetched.

- Without `--yes` it previews (`applied: false`) and writes nothing.
- `--yes` writes `--output`. If the file exists and differs it refuses unless `--force` is also
  given; identical output is reported as up to date.
- `--check` never writes and cannot be combined with `--yes`/`--force`. It exits **1** when the
  output is missing or differs from what would be compiled now (changed theme, Unicode data or
  provider revision), naming the reason, and exits 0 when it is current. Usage errors, such as a
  missing `--output`, exit **2**.
- `--json` returns the usual result with `data.tokens`, `data.providers`, `data.warnings` (tokens
  that would render nothing) and the generated `data.source`.
- Theme and output paths must stay inside the project; the output path may not traverse symlinks.

`<theme-module>` is loaded without bundling a TypeScript runtime:

| Input | Behavior |
| --- | --- |
| `.json` | Code-free. The output of `serializeEmojiTheme` (or a schema-less token map). Preferred for CI. |
| `.mjs`, `.js`, `.cjs` | Imported with Node, so **the file is executed**. Export the theme as `default`, as `emojiTheme`, or as the only theme-like export. |
| `.ts`, `.mts` | Imported only when your Node strips types natively (22.18+/23.6+; the `theme draft` output works there). Otherwise the command fails with instructions; no transpiler is added. |

Only built-in provider ids and providers embedded in the theme module are resolved; a theme that
names an unknown provider fails instead of guessing.

## Preview and apply codemods

`fix` never changes source code by default. It produces a unified patch from source locations returned by the parsers:

```bash
emoji-styles fix ./src --dry-run
emoji-styles fix ./src --yes
```

Only fixes classified as `safe` are eligible for automatic application. In CLI 0.2.0, emoji-only controls require a product-specific action name; the CLI no longer inserts CLDR glyph names as automatic button labels. CLI 0.1.2 still has that older codemod. Raw-emoji migrations remain `unsafe` proposals because choosing a token, renderer, import strategy or product label requires human judgment. Zero safe fixes is a valid result.

Before writing, the CLI applies edits in memory and parses the result again. After writing, it re-runs the audit. If the generated source no longer parses or the targeted safe findings do not decrease, every touched file is restored from its in-memory original. The CLI never runs arbitrary project commands as part of rollback validation.

## Local asset sync

The foundation release intentionally requires `--used-only`:

```bash
emoji-styles sync --used-only
emoji-styles sync --used-only --output public/emoji --yes
```

Sync validates HTTP status and image content type, writes normalized Unicode filenames, records SHA-256 hashes, and preserves provider version, source, and license metadata.

## License reports

```bash
emoji-styles licenses --format markdown --output THIRD_PARTY_NOTICES.md
emoji-styles licenses --format json --output emoji-licenses.json
```

Without `--output`, the report is printed and no file is changed.

## Create a provider

Use Unicode codepoint filenames such as `1f680.png` or `emoji_u1f680.png`. A provider uses one normalized image format.

```bash
emoji-styles provider create ./public/product-emoji --id product --ownership "Example Inc."
emoji-styles provider create ./public/product-emoji --id product --ownership "Example Inc." --yes
```

The command maps supported filenames, hashes every asset, validates the manifest and generates a typed `provider.ts`. For resizing, safe-area normalization, validation, contact sheets, provenance, and semantic mappings, use the dedicated [custom asset pipeline](./CUSTOM_ASSETS.md).

## Custom asset pipeline

```bash
emoji-styles assets inspect ./raw-emoji --json
emoji-styles assets normalize ./raw-emoji ./provider/assets --size 256 --format webp --safe-area 0.76
emoji-styles assets normalize ./raw-emoji ./provider/assets --size 256 --format webp --safe-area 0.76 --yes
emoji-styles assets validate ./provider/assets --size 256 --format webp --safe-area 0.76
emoji-styles assets contact-sheet ./provider/assets ./review/assets.png --yes
emoji-styles assets build ./provider/assets --output ./provider --id product --provenance ./provider/provenance-input.json --yes
```

`assets pack` runs normalization, validation and packaging in one step, with the
image origin declared as flags instead of a provenance file:

```bash
emoji-styles assets pack ./raw-emoji ./public/emoji/product --id product \
  --no-generated --source "Our illustrations" --ownership "Example Inc." --license Proprietary \
  --manifest-out ./src/emoji-provider.json --review-sheet ./review/assets.png --yes
```

It normalizes into a temporary folder, applies the same validation gate as `build`,
and copies the results into `<output>/assets`. Under `public/`, the browser base
path is inferred (`/emoji/product/assets` above); otherwise pass `--base-path`.
`--manifest-out` writes an importable copy of the manifest, and `--review-sheet`
renders 24/48/96 px on light and dark backgrounds. For AI artwork, use
`--generated --model "<model>"`; `--provenance <file>` accepts a full record instead.
Output files must be distinct: the manifest copy and review sheet cannot overlap
each other, packaged artwork or pack metadata, even with `--force`.

`assets pack` is available in published CLI 0.1.2. Earlier versions support the
multi-command flow; upgrade to use one-step packaging.

`normalize`, `contact-sheet`, `build`, and `pack` preview writes first. Static normalization rejects animated input so it cannot silently discard frames. Packaging requires provenance and declared asset rights; generated packs also require the real generator model.

## Structured output

Every command supports `--json` for CI and agent workflows. Audit additionally supports `--format json` and SARIF 2.1.0:

```bash
emoji-styles doctor --json
emoji-styles audit ./src --format sarif
```

Results use stable check IDs, `ok`, `summary`, optional `checks`, and explicit `applied` state.

## Security boundaries

Write targets must stay inside the project. Audit never executes source code, ignores dependency/build directories, follows only supported source extensions, and rejects source files above 2 MB. Asset downloads require explicit approval, respect the remote-assets policy, time out, retry once, enforce image MIME types and a 5 MB limit, and record hashes. Custom provider input also has a 5 MB per-file limit. The asset pipeline verifies raster signatures, limits encoded bytes and decoded pixels, and rejects arbitrary SVG entirely; rasterize it in a trusted workflow first.
