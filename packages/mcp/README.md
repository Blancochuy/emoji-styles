# Emoji Styles MCP

A local STDIO interface for agents to resolve emoji, audit source, plan artwork,
validate raster images and preview provider packages using deterministic tools.

## Distribution status

The first release is prepared as `0.1.0`, using the independent tag `mcp-v0.1.0`.
See the [release guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/MCP_RELEASE.md)
for verified publication status. Removing the private guard alone does not make
the package available through a registry install. The published Emoji Styles CLI
is a separate package; this server uses it and includes the internal asset pipeline
in its build, without a private runtime dependency.

From a source checkout:

```sh
pnpm install --frozen-lockfile
pnpm mcp:pack
npm run mcp:smoke
```

The check installs the actual tarball into a temporary npm consumer and connects
an official MCP client over STDIO. No local workspace links are substituted.

Install the generated tarball in a dedicated tools directory:

```sh
npm install /absolute/path/to/emoji-styles-mcp-0.1.0.tgz
```

Configure a generic STDIO MCP client with absolute paths:

```json
{
  "mcpServers": {
    "emoji-styles": {
      "command": "node",
      "args": [
        "/absolute/path/to/tools/node_modules/emoji-styles-mcp/dist/stdio.js",
        "--workspace",
        "/absolute/path/to/project"
      ]
    }
  }
}
```

`--workspace` selects one existing project directory. If omitted, the process
working directory is used for backwards compatibility. Prefer explicit absolute
paths because desktop clients may launch servers from another directory. Startup
rejects unknown arguments and missing or invalid workspace directories. Use
`emoji-styles-mcp --help` for the executable contract.

## Capabilities

- Search metadata, resolve emoji and explain fallback/provider choices.
- Audit a project and return migration patches without applying them.
- Create and validate artwork specs; plan prompts without generating images or spending credits.
- Validate PNG/WebP/AVIF files and preview provider artifacts with recorded provenance.
- Return machine-readable structured content and stable tool errors.

Project operations are read-only. File paths must stay within the workspace, and
explicit symlinks outside it are rejected. There is no listening network port.
stdout is reserved for MCP JSON-RPC while serving; startup diagnostics use stderr.
EOF closes the server; Ctrl+C and SIGTERM close it with codes 130 and 143.

No API key is needed for deterministic tools. Optional `suggest_semantic_token`
uses the configured remote semantic analyzer only when explicitly called and an
API key is provided. Never place credentials in command arguments or committed
configuration. This package does not include an image-generation executor.

The Node range follows sharp: `^18.17.0 || ^20.3.0 || >=21.0.0`. Native image
support requires optional npm dependencies. Distribution CI checks Linux, macOS
and Windows; passing protocol tests does not establish compatibility with every
agent host's configuration interface.

[Full MCP guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/MCP.md)
· [Custom assets](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CUSTOM_ASSETS.md)

MIT licensed. External dependencies retain their own licenses.
