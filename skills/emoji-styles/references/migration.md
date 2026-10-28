# Migration guide

## Classify before changing

Distinguish:

- expressive user content: preserve Unicode and render through the configured provider;
- product intent: introduce a semantic token such as `status.success` or `action.deploy`;
- decorative output: retain no accessible announcement;
- emoji-only controls: require a visible or assistive label;
- tests and snapshots: avoid native rendering when visual determinism matters.

## Workflow

1. Run `npx --no-install emoji-styles audit ./src --format json`.
2. Group findings by stable rule ID and source location.
3. Preview safe codemods with `npx --no-install emoji-styles fix ./src --dry-run`.
4. Apply only fixes classified safe.
5. Define semantic tokens manually when meaning depends on product context.
6. Preserve Unicode fallback and accessible labels.
7. Re-run audit, doctor, test, typecheck, tests, and build.

Do not mechanically turn every raw emoji into a semantic token. Do not infer whether `🔥` means an incident, streak, popularity, or decoration without local product context.

## Semantic token example

```ts
const productTheme = defineEmojiTheme({
  "status.success": {
    emoji: "✅",
    label: "Operation succeeded",
  },
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
  },
}, { id: "product", version: "1.0.0" });
```

Use stable intent names. Keep localized labels in the theme rather than scattering them across components.
