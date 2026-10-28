# MCP delivery plan

## 1. Standalone distribution and explicit workspace

Bundle the internal private pipeline, depend on the published CLI, include
README/license/declarations, and verify executable tarball contents. Add
`--workspace` and validate it before transport startup. Keep STDIO clean.

Install one tarball outside the workspace and exercise real MCP initialize,
discovery and tool calls using the official SDK client. Verify read-only previews,
workspace errors, optional-analysis disabled behavior and native image tooling.
The packaging delivery in PR #37 passed the install suite on Linux, macOS and
Windows while preserving its private guard.

## 2. Client setup and end-to-end agent workflow

Validate at least one actual agent host configuration against the standalone
artifact. Walk through search/resolution and spec → plan → external generation →
validation → provider preview in a sample project. Document expected errors,
workspace selection and how the host reviews/applies returned artifacts.
Codex CLI validation of the installed tarball is recorded in
[`benchmarks/mcp-host/codex-stdio.json`](../benchmarks/mcp-host/codex-stdio.json):
six real MCP calls succeeded in an ephemeral read-only session, and the synthetic
project stayed unchanged. This establishes CLI host integration, not desktop UI
coverage or visual image quality. No image-generation call was made.

## 3. First MCP release

The dedicated release change removes the private guard for `emoji-styles-mcp@0.1.0`
and introduces `npm-mcp-release.yml` with tag `mcp-v0.1.0`. Verify package-name
ownership/availability before bootstrap and registry installation after publication.
See [MCP release](./MCP_RELEASE.md). Reuse the CLI release lessons: exact tag/source, tested tarball,
registry propagation wait, byte verification and clean install after publication.
MCP must not silently join the renderer or CLI release train.

## 4. Quality and generation integration

Improve visual evaluation and review evidence before integrating a paid image
backend. Keep credentials and model calls outside deterministic tools. Existing
planning is no-spend; technical validation does not establish visual quality.
