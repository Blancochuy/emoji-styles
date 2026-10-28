# Working on Emoji Styles

This is a pnpm 10 / TypeScript ESM monorepo. Install with `pnpm install --frozen-lockfile`.
Use the Node version in `.github/workflows/ci.yml` when reproducing CI.

## Architecture

- `packages/data`: pinned Unicode/CLDR data; use the generators instead of hand-editing generated indexes.
- `packages/core`: provider resolution, semantic themes, schemas, and Unicode fallback.
- `packages/react`, `packages/web`: framework bindings; retain accessibility and SSR behavior.
- `packages/asset-pipeline`: deterministic raster normalization, validation, review sheets, and packaging.
- `packages/cli`: project tooling and asset commands. Writes generally require `--yes`.
- `packages/mcp`: local read-only tools and packaging previews for agents.
- `skills/emoji-asset-creator`: provider-neutral artwork creation workflow.

An artwork provider resolves existing assets. A future generation backend creates
new artwork. Keep generation credentials, network requests, model SDKs, and paid
jobs out of the core renderer and deterministic asset pipeline.

## Verification

Run `pnpm test` and `pnpm typecheck` for shared behavior changes. These commands
build workspace dependencies first. Run `pnpm build` for packaging or production
build changes, and `pnpm assets:check` when changing upstream asset configuration.
See `docs/RELEASING.md` and `docs/CLI_RELEASE.md` before changing publication
settings. CLI releases are independent; MCP and the asset pipeline remain private.
Do not document a CLI registry installation as available without verifying its release.

## Custom artwork

Read `skills/emoji-asset-creator/SKILL.md` and `docs/CUSTOM_ASSETS.md`. Keep raw
generation outputs, runtime assets, and review artifacts separate. Record actual
model provenance; never invent ownership or licensing. Every packaged asset
needs a Unicode fallback, including semantic-token mappings.

Use the built CLI for an actual-size quality review:

```sh
node packages/cli/dist/cli.js assets contact-sheet ./provider/assets ./review/quality.png --review --columns 3 --yes
```

Review the PNG at 100% zoom on both backgrounds. Technical validation checks
files, transparency, bounds, and mappings; it does not establish legibility,
semantic correctness, style consistency, or legal clearance.

Build custom raster packs through `assets build` or `buildProviderArtifacts`.
The older `provider create` command creates manifests for existing assets and
does not provide the custom-artwork validation gate.

Before generation, use `assets validate-spec <file> --json` and
`assets plan <file> --json`. These commands are deterministic and do not spend
credits. Prefer native transparency and preserve it; `hasAlpha` alone is
insufficient evidence of a transparent background. The benchmark commands
`pnpm benchmark:emoji-quality` and `pnpm benchmark:emoji-visual` replay technical
fixtures and frozen image outputs without calling image models. The technical
benchmark needs its pinned baseline commit in local Git history.
