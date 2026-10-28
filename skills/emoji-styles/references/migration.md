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

## Design draft capability (source build)

CLI 0.1.2 does not include `theme draft`. Check `npx --no-install emoji-styles
help theme draft` before using this path; unsupported commands are usage errors.
Do not upgrade to an invented registry version. A contributor-built CLI can be
installed from its verified tarball without requiring a monorepo inside the app.

With a supporting local CLI, preview `npx --no-install emoji-styles theme draft
./src --output ./emoji-review --json`, then write with `--yes`. Open
`token-sheet.html` at 100% zoom to compare Fluent 3D/Twemoji at 16, 20 and 24 px
beside actual context text on light/dark backgrounds. Add `--manifest <file>
--asset-root <disk-assets-directory>` to embed a custom raster pack; browser
basePath is not a disk path. Built-in sheet images need internet and respect the
project's remote-assets policy. Missing assets are explicit, never silently native.

Use `review.json` to distinguish static roles from English status heuristics and
unknown runtime behavior. Review `emoji-theme.ts` as a draft, including names,
labels and collisions, and integrate only selected tokens. Decoration and unknown
occurrences stay in the inventory without draft tokens. Ordinary expressive
content does not automatically need tokens.

The source build deliberately stops inserting glyph names as automatic action
labels: “Rocket” does not establish whether a button deploys, launches or opens
a page. A missing accessible name needs a product decision. Dynamic children,
custom components, unresolved label references and CSS need runtime review.
A successful draft does not mean the audit has no errors. Report remaining
findings; draft creation never fixes them or reduces the runtime bundle.

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
