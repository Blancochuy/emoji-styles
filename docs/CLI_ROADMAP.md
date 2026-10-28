# CLI delivery plan

Build the terminal experience in small reviewable releases. Each release must
preserve the noninteractive interface used by scripts and agents.

## 1. Argument and automation foundation

Deliver strict typed argument parsing, command-specific help, stable usage errors,
JSON output on failure, and executable-level exit-code and no-write regression
checks. Preserve the existing preview/apply operations and raster pipeline.

Merged in PR #32.

## 2. Explicit interactive workspace

PR #33 adds `studio [input] [output]` as an explicit interactive command.
Scripts continue to use the existing headless commands. Design a quiet, compact TUI with keyboard
navigation, clear focus, useful empty states, and predictable back/cancel actions.

The first local workflow covers: choose input, inspect transparency and
geometry, preview normalization, apply deliberately, validate, and show output
paths. Reuse the existing command handlers and pipeline. Show useful errors with
recovery actions. Do not imply that technical validation establishes visual quality.

Require an interactive terminal. Piped input and JSON invocations stay deterministic.
Tests cover navigation, cancellation, terminal restoration, small windows, and write
confirmation. Start without network generation or credentials.

## 3. Standalone installation

PR #34 bundles the private pipeline into the CLI build, declares
sharp as a runtime dependency, verifies the tarball contents and executable, and
adds independent clean npm consumers on Linux, macOS, and Windows. `pnpm cli:pack`
produces the candidate; `npm run cli:smoke` installs and exercises it outside the
workspace. Public dependencies are fetched from npm, not substituted with local tarballs.

The first independent release is published as `emoji-styles-cli@0.1.0`, using tag
`cli-v0.1.0` and workflow `npm-cli-release.yml`. The private guard is removed in
this dedicated release change. The renderer release train remains separate.
See [CLI release](./CLI_RELEASE.md) for initial browser authentication and later
OIDC configuration. A registry smoke check is required before claiming availability.

## 4. Agent integrations and generation backends

Make MCP configuration reproducible after the CLI contract and packaging stabilize.
Evaluate generation backends separately, using provider capabilities, actual alpha
inspection, recorded provenance, costs, and a repeatable visual benchmark. Keep
model SDKs and credentials outside the deterministic pipeline and renderer.
