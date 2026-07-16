# MCP server

`emoji-styles-mcp` gives coding agents a local, structured interface to Emoji Styles. It exposes the same pinned Unicode data, provider resolver, audit engine, asset validator, and license policy used by the packages and CLI instead of asking a model to guess filenames, provider support, or fallback behavior.

The server uses local STDIO transport. It does not open a port, write project files, execute target code, or upload source by default.

## Run from this repository

Requirements: Node.js 18.17+ and pnpm 10.

```bash
pnpm install
pnpm --filter emoji-styles-data build
pnpm --filter emoji-styles build
pnpm --filter @emoji-styles/asset-pipeline build
pnpm --filter emoji-styles-cli build
pnpm --filter emoji-styles-mcp build
node packages/mcp/dist/stdio.js
```

For Codex, register the built local server from the project root:

```bash
codex mcp add emoji-styles -- node packages/mcp/dist/stdio.js
codex mcp list
```

Restart the client after changing its MCP configuration. Until the package is published, do not use an `npx` command that implies a registry release.

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

The process working directory is the security boundary for project paths. Point `cwd` at the project the agent may inspect.

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
| `validate_generated_assets` | Signature, dimensions, alpha, safe area, centering, duplicates, and outliers |
| `generate_provider_manifest` | Preview of provider, theme, license, provenance, and documentation artifacts |

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
