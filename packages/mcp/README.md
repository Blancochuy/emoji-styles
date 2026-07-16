# emoji-styles-mcp

Local read-only MCP server for Emoji Styles. It exposes deterministic emoji discovery, provider resolution, project audits, migration previews, custom-asset validation, provider packaging previews, and license reports to coding agents. An optional GPT-5.6 adapter can suggest semantic tokens through strict structured output.

This workspace package is not published to npm yet. Build and run it from the repository root:

```bash
pnpm --filter emoji-styles-mcp build
node packages/mcp/dist/stdio.js
```

See the [complete setup, tool catalog, result contract, and safety model](../../docs/MCP.md).
