# Emoji Styles GitHub Action

Source and tests for the bundled reusable action at [`.github/actions/emoji-styles-audit`](../../.github/actions/emoji-styles-audit). It adapts the deterministic `emoji-styles-cli/audit` entry point to GitHub annotations, job summaries, outputs, failure thresholds, and SARIF.

```bash
pnpm --filter emoji-styles-github-action typecheck
pnpm --filter emoji-styles-github-action test
pnpm --filter emoji-styles-github-action build
```

The generated `dist/main.js` is intentionally committed because JavaScript actions execute directly from the checked-out action. CI rebuilds it and rejects source/bundle drift.

See [GitHub Action and CI](../../docs/CI.md) for consumer configuration.
