# MCP delivery plan

## 1. Standalone distribution and explicit workspace

Bundle the internal private pipeline, depend on the published CLI, include
README/license/declarations, and verify executable tarball contents. Add
`--workspace` and validate it before transport startup. Keep STDIO clean.

Install one tarball outside the workspace and exercise real MCP initialize,
discovery and tool calls using the official SDK client. Verify read-only previews,
workspace errors, optional-analysis disabled behavior and native image tooling.
Run the install suite on Linux, macOS and Windows. Keep the MCP private during
this packaging delivery.

## 2. Client setup and end-to-end agent workflow

Validate at least one actual agent host configuration against the standalone
artifact. Walk through search/resolution and spec → plan → external generation →
validation → provider preview in a sample project. Document expected errors,
workspace selection and how the host reviews/applies returned artifacts.
Do not equate SDK protocol tests with coverage of a specific host UI.

## 3. First MCP release

Verify package-name ownership/availability and the version, remove the private
guard in a dedicated release change, and set up independent publication with
provenance. Reuse the CLI release lessons: exact tag/source, tested tarball,
registry propagation wait, byte verification and clean install after publication.
MCP must not silently join the renderer or CLI release train.

## 4. Quality and generation integration

Improve visual evaluation and review evidence before integrating a paid image
backend. Keep credentials and model calls outside deterministic tools. Existing
planning is no-spend; technical validation does not establish visual quality.
