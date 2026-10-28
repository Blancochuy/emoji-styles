# Project configuration

Use `emoji-styles.config.json` as the single project policy shared by runtime packages and the CLI.

```json
{
  "schemaVersion": 1,
  "provider": "fluent-3d",
  "fallbacks": ["noto", "twemoji"],
  "nativeFallback": false,
  "source": ["src"],
  "policy": {
    "allowRemoteAssets": true,
    "audit": {
      "emoji-styles/accessibility/missing-label": "error",
      "emoji-styles/determinism/native-critical-ui": "error"
    }
  }
}
```

## Selection rules

- Choose an image provider for deterministic UI, screenshots, documentation, and cross-platform tests.
- Choose native only when OS-specific appearance is intentional.
- Keep image fallbacks in `fallbacks`; set terminal OS behavior with `nativeFallback`.
- Set `nativeFallback: false` when visual output may never depend on the judge's or CI machine's OS.
- Prefer a local provider for offline environments, strict origin policy, or immutable artifacts.
- Record the source, version, format, coverage, and artwork license for every image provider.

## Safe setup

Preview initialization first:

```bash
npx --no-install emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback
npx --no-install emoji-styles init --provider fluent-3d --fallback noto,twemoji --no-native-fallback --yes
```

Do not replace an existing config without reading it and using both `--yes` and `--force` intentionally.
