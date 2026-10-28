# Emoji Styles CLI

The CLI turns an emoji policy into reproducible project checks and local provider artifacts. Its foundation commands are deterministic and do not call an AI model.

## Run from the monorepo

```bash
pnpm --filter emoji-styles-cli build
node packages/cli/dist/cli.js help
```

The package currently uses the publish candidate name `emoji-styles-cli` and exposes the `emoji-styles` binary. The final public package name and `npx` command will be verified during the publication phase.

## Safe write model

Commands that can change a project first produce a preview. Add `--yes` only after reviewing the proposed files.

```bash
emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback
emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback --yes
```

An existing configuration is never replaced unless both `--yes` and `--force` are supplied.

## Argument and automation contract

The CLI is currently a private workspace package. From a built checkout, replace
`emoji-styles` in these examples with `node packages/cli/dist/cli.js`.

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

## Preview and apply codemods

`fix` never changes source code by default. It produces a unified patch from source locations returned by the parsers:

```bash
emoji-styles fix ./src --dry-run
emoji-styles fix ./src --yes
```

Only fixes classified as `safe` are eligible for automatic application. The current safe codemod adds accessible labels to emoji-only JSX and HTML buttons. Raw-emoji migrations are emitted as `unsafe` proposals because choosing a semantic token, renderer, import strategy, or product label requires human judgment.

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

`normalize`, `contact-sheet`, and `build` preview writes first. Static normalization rejects animated input so it cannot silently discard frames. Packaging requires provenance and declared asset rights; generated packs also require the real generator model.

## Structured output

Every command supports `--json` for CI and agent workflows. Audit additionally supports `--format json` and SARIF 2.1.0:

```bash
emoji-styles doctor --json
emoji-styles audit ./src --format sarif
```

Results use stable check IDs, `ok`, `summary`, optional `checks`, and explicit `applied` state.

## Security boundaries

Write targets must stay inside the project. Audit never executes source code, ignores dependency/build directories, follows only supported source extensions, and rejects source files above 2 MB. Asset downloads require explicit approval, respect the remote-assets policy, time out, retry once, enforce image MIME types and a 5 MB limit, and record hashes. Custom provider input also has a 5 MB per-file limit. The asset pipeline verifies raster signatures, limits encoded bytes and decoded pixels, and rejects arbitrary SVG entirely; rasterize it in a trusted workflow first.
