# MCP server

`emoji-styles-mcp` gives coding agents a local, structured interface to Emoji Styles. It exposes the same pinned Unicode data, provider resolver, audit engine, asset validator, and license policy used by the packages and CLI instead of asking a model to guess filenames, provider support, or fallback behavior.

The server uses local STDIO transport. It does not open a port, write project files, execute target code, or upload source by default.

## Installation

`emoji-styles-mcp@0.1.0` is published on [npm](https://www.npmjs.com/package/emoji-styles-mcp), independently of the CLI and renderer packages.

```sh
npm install emoji-styles-mcp@0.1.0
npx --no-install emoji-styles-mcp --workspace /absolute/path/to/your-project
```

The second command starts the STDIO server for a compatible client; it is not an interactive shell. For client configuration, use the Node launch example below with the installed package path. See [MCP release](./MCP_RELEASE.md) for release verification.

## Verify a source build

```bash
pnpm install --frozen-lockfile
pnpm mcp:pack
npm run mcp:smoke
```

`mcp:pack` builds and verifies `.release-mcp/emoji-styles-mcp-0.1.0.tgz`.
The internal asset pipeline is included in the build. Runtime dependencies use
public npm packages, including `emoji-styles-cli@0.1.0`, core, the MCP SDK, Zod and
sharp. `mcp:smoke` installs that artifact into a clean temporary npm project and
uses the official SDK client to initialize a real child process over STDIO,
discover tools and call local operations. No monorepo links are substituted.

CI installs the same tarball on Linux/macOS/Windows under Node 22 and 24, plus
Linux on Node 18.17.0 and 20. It verifies protocol output, explicit workspace
selection, rejected traversal, read-only previews and native raster validation.
This is protocol validation, not a claim of testing every agent desktop host.

Install the tarball into a tools directory:

```bash
npm install /absolute/path/to/emoji-styles-mcp-0.1.0.tgz
```

A client can then launch it with Node, independent of the project's dependencies:

```json
{
  "mcpServers": {
    "emoji-styles": {
      "command": "node",
      "args": [
        "/absolute/path/to/tools/node_modules/emoji-styles-mcp/dist/stdio.js",
        "--workspace",
        "/absolute/path/to/your-project"
      ]
    }
  }
}
```

Use absolute paths. `--workspace` is an existing directory, resolved to its real
path before transport startup. Omission preserves the process working directory
as the default. Unknown flags, duplicate options and missing values exit with
code 2. An unreadable/non-directory workspace exits with code 1. Startup errors
use stderr without stack traces; stdout stays empty on startup failure.
`--help` prints usage and exits before any server or workspace is opened.

The server closes on input EOF (0), SIGINT (130) or SIGTERM (143). Credentials
are optional and are never needed for local deterministic operations.

## Run from this repository

Requirements: Node `^18.17.0 || ^20.3.0 || >=21.0.0` (matching sharp), pnpm 10,
and native optional dependencies enabled.

```bash
pnpm install
pnpm --filter emoji-styles-data build
pnpm --filter emoji-styles build
pnpm --filter @emoji-styles/asset-pipeline build
pnpm --filter emoji-styles-cli build
pnpm --filter emoji-styles-mcp build
node packages/mcp/dist/stdio.js --workspace /absolute/path/to/your-project
```

For Codex, register the built local server from the project root:

```bash
codex mcp add emoji-styles -- node packages/mcp/dist/stdio.js
codex mcp list
```

Restart the client after changing its MCP configuration. The commands in this section use a source build; for the published `emoji-styles-mcp@0.1.0` package, use the installation and absolute-path configuration above.

Generic MCP clients can use the equivalent configuration:

```json
{
  "mcpServers": {
    "emoji-styles": {
      "command": "node",
      "args": ["/absolute/path/to/emoji-styles/packages/mcp/dist/stdio.js"],
      "cwd": "/absolute/path/to/your-project"
    }
  }
}
```

The selected workspace is the boundary for project paths. Prefer `--workspace`
with an absolute path when the client does not support `cwd` or launches from an
unrelated directory. Never point it at an unnecessarily broad parent directory.

## Tools

### Deterministic discovery and resolution

| Tool | Result |
| --- | --- |
| `search_emoji` | Search the pinned Unicode/CLDR catalog by glyph, name, label, group, or subgroup |
| `get_emoji_metadata` | Normalized sequence, codepoints, labels, category, and Unicode versions |
| `resolve_emoji` | Selected provider plus the complete ordered attempt history |
| `compare_providers` | Resolution, version, format, locality, and license metadata side by side |
| `explain_fallback` | Human-readable explanation backed by the actual resolver result |

### Project quality

| Tool | Result |
| --- | --- |
| `validate_provider` | Provider manifest validation without loading or executing its runtime module |
| `validate_theme` | Semantic theme schema and policy validation |
| `audit_project` | Stable source findings with rule IDs, severity, paths, and locations |
| `generate_migration_patch` | Dry-run unified diff; never applies the patch |
| `generate_license_report` | Structured attribution report from project policy |

### Custom emoji workflow

| Tool | Result |
| --- | --- |
| `create_asset_spec` | Provider-neutral specification from any original emoji art direction |
| `validate_asset_spec` | Shared spec schema validation plus square canvases, Unicode fallbacks, and collision checks |
| `plan_asset_generation` | Deterministic prompts, spec hash, and bounded request count; never generates images or spends credits |
| `validate_generated_assets` | Signature, dimensions, alpha, safe area, centering, duplicates, and outliers |
| `generate_provider_manifest` | Preview of provider, theme, license, provenance, and documentation artifacts |

`create_asset_spec` validates its result with the shared asset-pipeline validator
before returning it. `validate_asset_spec` returns `data.valid` and path-specific
issues; a successfully executed validator can report an invalid specification.
`plan_asset_generation` rejects invalid specs with `ASSET_SPEC_INVALID` and
structured issue details. Supply `variants` from 1 to 4 (default 1); the plan is
read-only and must be executed separately through an authorized image tool.

### Optional semantic analysis

`suggest_semantic_token` is the only non-deterministic tool. It uses GPT-5.6 with strict structured output to suggest product meaning, a semantic token, an accessible label, decoration state, confidence, and whether human review is required.

It is disabled unless the server receives an API key:

```bash
OPENAI_API_KEY=... node packages/mcp/dist/stdio.js
```

`EMOJI_STYLES_OPENAI_MODEL` may override the default model. Source context is capped, common credential patterns are redacted, API response storage is disabled, and the tool is never used to invent providers, URLs, licenses, or asset provenance. Avoid sending secrets even with these safeguards.

## Result contract

Every tool returns machine-readable `structuredContent` and an equivalent text payload:

```json
{
  "ok": true,
  "tool": "resolve_emoji",
  "data": {},
  "meta": {
    "deterministic": true,
    "workspace": "/project"
  }
}
```

Failures use a stable envelope and set the MCP tool result as an error:

```json
{
  "ok": false,
  "tool": "validate_theme",
  "error": {
    "code": "PATH_OUTSIDE_WORKSPACE",
    "message": "Path must stay inside the workspace",
    "retryable": false
  }
}
```

## Safety model

- All registered operations are read-only and idempotent.
- File arguments are resolved beneath the configured workspace; traversal, null bytes, and symlinks that escape the real workspace are rejected.
- Generated migrations and provider artifacts are previews. A coding environment or developer must review and apply them.
- Raster validation accepts PNG, WebP, and AVIF only and applies byte/pixel constraints in the asset pipeline.
- Semantic output is schema-validated and reports its model; deterministic tools never call an AI API.
- License and provenance reports expose recorded evidence. They do not provide legal clearance or infer ownership.

## Validate the server

```bash
pnpm --filter emoji-styles-mcp typecheck
pnpm --filter emoji-styles-mcp test
pnpm --filter emoji-styles-mcp build
```

The test suite connects an official MCP client and server through an in-memory transport, verifies all advertised tools, calls a tool through the protocol, tests path isolation, and mocks the semantic API boundary without transmitting a real key.

## Verified agent host

Codex CLI `0.164.0-alpha.11.1` was exercised against the installed distribution
artifact in an ephemeral, read-only session with an explicit workspace and user
configuration disabled. Six MCP calls succeeded: search, resolution, project
audit, migration preview, spec creation, and generation planning. The test used
synthetic source files, did not change them, and did not generate images.
[Evidence](../benchmarks/mcp-host/codex-stdio.json) records the artifact integrity
and tool outcomes without account/session credentials. This does not establish
coverage of the Codex desktop UI or every MCP client.

Official [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
and [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
describe the host-side setup. The standalone server remains usable through any
compatible STDIO MCP client.
