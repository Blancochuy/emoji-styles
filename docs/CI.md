# GitHub Action and CI

Emoji Styles includes a bundled JavaScript action for enforcing the same project policy locally and in GitHub. It runs on Node 24 without installing project dependencies, emits line-level workflow annotations, writes SARIF 2.1.0, and exposes finding counts as outputs.

## Project policy

Commit `emoji-styles.config.json` at the project root:

```json
{
  "$schema": "./node_modules/emoji-styles-cli/schemas/emoji-styles-config.schema.json",
  "schemaVersion": 1,
  "provider": "fluent-3d",
  "fallbacks": ["twemoji"],
  "nativeFallback": false,
  "source": ["src"],
  "policy": {
    "allowRemoteAssets": true,
    "audit": {
      "emoji-styles/accessibility/missing-label": "error",
      "emoji-styles/semantic/raw-emoji": "warning"
    }
  }
}
```

Rule severity may be `error`, `warning`, `info`, or `off`. The action does not maintain a second policy format; it consumes the same file as the CLI, React provider, universal web package, skills, and MCP server.

## Workflow

```yaml
name: Emoji Styles

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Audit emoji policy
        id: emoji-audit
        continue-on-error: true
        uses: Blancochuy/emoji-styles/.github/actions/emoji-styles-audit@master
        with:
          config: emoji-styles.config.json
          fail-on: error
          sarif-file: reports/emoji-styles.sarif

      - name: Upload SARIF
        if: always() && steps.emoji-audit.outputs.sarif-file != ''
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: ${{ steps.emoji-audit.outputs.sarif-file }}
          category: emoji-styles

      - name: Enforce policy
        if: steps.emoji-audit.outcome == 'failure'
        run: exit 1
```

Pin the action to a release tag or full commit SHA in production. `master` is shown only while the packages and first action release are unpublished.

The separate enforcement step allows SARIF to upload even when policy errors are present. Code scanning availability and permissions depend on the repository and GitHub plan; workflow annotations and the job summary remain available without SARIF upload.

## Inputs

| Input | Default | Purpose |
| --- | --- | --- |
| `path` | project policy sources | Override the source path audited by the CLI |
| `config` | `emoji-styles.config.json` | Project-relative policy path |
| `sarif-file` | `emoji-styles.sarif` | Project-relative SARIF destination |
| `fail-on` | `error` | Fail on `error`, `warning`, or `none` |
| `max-annotations` | `50` | Bound line-level annotations while retaining every SARIF result |

## Outputs

`findings`, `errors`, `warnings`, and `sarif-file` are available through the action step ID. The action also writes a compact audit table to the GitHub job summary.

## Local parity

```bash
emoji-styles audit --format sarif > emoji-styles.sarif
```

The action is a bundled adapter over `emoji-styles-cli`; it does not reimplement scanning rules or execute target source code.
