# Contributing

Start with a focused issue or pull request explaining the user problem and a
small example. Useful contributions include incorrect provider resolution,
missing fallback evidence, accessibility regressions, reproducible asset
validation failures, and agent workflows that require guessing undocumented steps.

## Local development

Use Node.js 20 (the main CI version) or Node.js 24 (the release version), Python 3
for skill helpers, and pnpm 10.13.1 from `packageManager`.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

`pnpm test` builds shared dependencies before running package tests. The demo
runs at the Vite URL printed in the terminal. See [AGENTS.md](./AGENTS.md) for
package boundaries and [MCP setup](./docs/MCP.md) for a local agent integration.
CLI, MCP, and the asset pipeline are private workspace packages; clone and build
them rather than relying on an unpublished registry command.

## Before opening a PR

- Explain the trigger, expected behavior, and resulting change. Include a small
  reproduction or relevant test for behavior changes.
- Run `pnpm test` and `pnpm typecheck`; run `pnpm build` when changing production
  bundles or package contents. Include screenshots for visible demo changes.
- Keep generated indexes reproducible. Change `scripts/unicode-data.ts`, then
  run `pnpm generate` and `pnpm generate:check`; both fetch the pinned official
  Unicode source and check its SHA-256. Do not hand-edit generated records.
- Run `pnpm benchmark:catalog` after changing the data representation. It compares
  every public metadata field and alias against a pinned Git baseline. Fetch full
  history if a shallow clone is missing that commit.
- For artwork providers, document licenses and redistribution terms in
  `assets/providers.json`, then run `pnpm assets:check`. Source code's MIT license
  does not replace artwork licenses.

Keep rendering and asset processing deterministic. A new image-generation
backend belongs outside the renderer, with explicit cost, provenance, native
transparency support, and review boundaries. Technical asset validation cannot
establish visual quality; show actual-size review evidence for artwork changes.

For publishing, use the [release process](./docs/RELEASING.md).
For priorities and verified limitations, see [project readiness](./docs/READINESS.md).
