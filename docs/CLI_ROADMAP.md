# CLI delivery plan

Build the terminal experience in small reviewable releases. Each release must
preserve the noninteractive interface used by scripts and agents.

## 1. Argument and automation foundation

Deliver strict typed argument parsing, command-specific help, stable usage errors,
JSON output on failure, and executable-level exit-code and no-write regression
checks. Preserve the existing preview/apply operations and raster pipeline.

Merged in PR #32. The CLI remains private until distribution is verified.

## 2. Explicit interactive workspace

The current delivery adds `studio [input] [output]` as an explicit interactive command.
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

The current delivery bundles the private pipeline into the CLI build, declares
sharp as a runtime dependency, verifies the tarball contents and executable, and
adds independent clean npm consumers on Linux, macOS, and Windows. `pnpm cli:pack`
produces the candidate; `npm run cli:smoke` installs and exercises it outside the
workspace. Public dependencies are fetched from npm, not substituted with local tarballs.

Before first publication, select an available package name/version, remove the
private guard in a dedicated release change, and perform the maintainer-led npm
bootstrap. Configure a dedicated trusted publishing workflow and provenance for
future releases. The existing five-package workflow must remain separate until
CLI publication is deliberately integrated.

Do not advertise an available npx install before the published artifact is verified.

## 4. Agent integrations and generation backends

Make MCP configuration reproducible after the CLI contract and packaging stabilize.
Evaluate generation backends separately, using provider capabilities, actual alpha
inspection, recorded provenance, costs, and a repeatable visual benchmark. Keep
model SDKs and credentials outside the deterministic pipeline and renderer.
