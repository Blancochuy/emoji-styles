---
name: emoji-styles
description: Integrate, configure, audit and migrate Emoji Styles in web applications. Use for provider and fallback policy, semantic emoji themes, accessibility, licensing checks or inconsistent cross-platform emoji rendering.
---

# Emoji Styles

Apply an explicit emoji policy in the user's application. All commands below run
from that application's root, regardless of where this skill is installed.
Resolve linked references and templates relative to this skill's own directory,
not the app's working directory. No Emoji Styles checkout or Python is required.

## CLI setup

Inspect the app's package manager, dependencies, framework, source roots, SSR,
CSP and existing emoji policy before changing files. Use its local CLI **0.3.2+**.
If absent or older, install/upgrade with the project's package manager; for npm:

```sh
npm install --save-dev emoji-styles-cli@0.3.2
```

Run `npm ls emoji-styles-cli` to inspect the installed version. These instructions
use `npx --no-install emoji-styles` to select the local binary without downloading
an unrelated package named `emoji-styles`. With pnpm use `pnpm exec emoji-styles`.
Only contributors developing Emoji Styles itself need its monorepo build commands.

## Audit and integrate

Read `emoji-styles.config.json`, themes, provider manifests and notices if present.
If the policy is missing, preview and initialize an appropriate one. Example:

```sh
npx --no-install emoji-styles init --provider fluent-3d --fallback twemoji
npx --no-install emoji-styles init --provider fluent-3d --fallback twemoji --yes
```

Adapt provider, fallback and source options to the app; never replace an existing
policy without inspecting it. The config is CLI policy, not automatic runtime
wiring. Read [configuration](references/configuration.md) when changing it.

Run a read-only baseline:

```sh
npx --no-install emoji-styles audit ./src --json
npx --no-install emoji-styles doctor --json
npx --no-install emoji-styles test --json
```

Audit/check failures exit 1 with structured findings; usage errors exit 2. Read
the JSON instead of treating a finding as a missing or broken command. A clean
report proves only the checks implemented by the tool, not complete accessibility
or design quality. Audit never needs to execute the app's source files.

Group findings by severity, rule ID, file and line. Audit `data.usages` includes
roles, context, evidence and accessible-name state. Keep static facts, English
status heuristics and unknown runtime behavior distinct. Read the
[migration guide](references/migration.md) for context-dependent choices.

For design-system work, preview a theme and provider comparison from the actual UI:

```sh
npx --no-install emoji-styles theme draft ./src --output ./emoji-review --json
npx --no-install emoji-styles theme draft ./src --output ./emoji-review --yes
```

Review `emoji-theme.ts`, `review.json` and `token-sheet.html` at 100% zoom. The sheet
compares Fluent/Twemoji at 16, 20 and 24 px in light/dark; the migration guide covers
custom packs. All token names, labels and meanings are proposals, including
content candidates. Review them in product context before integration. Drafting
does not migrate source or resolve accessibility findings. Dynamic children,
custom components and unresolved label references need runtime review.

## Choose the runtime after reviewing the theme

For a closed set of product tokens, prefer `theme compile` and the framework's
catalog-free entry: `react-emoji-styles/compiled` for React, or
`emoji-styles-web/compiled` for SSR templates, Astro, Vue, Svelte and plain HTML.
Install `emoji-styles@^0.3.0` and the matching public renderer at `^0.3.0` in the app;
the CLI's dependency alone does not wire application imports. Keep the full renderer for arbitrary Unicode/user content,
`EmojiText`, or live provider switching. Mixing in a full-runtime import can
bring the catalog back; measure the production bundle.

Never compile `emoji-review/emoji-theme.ts` itself; its labels become accessible
names in production. Copy it to `./emoji-theme.ts` at the project root, outside the
browser import graph. With the user, confirm every token, emoji and meaning, replace
each `REVIEW:` placeholder label, set the product's own theme `id`, and remove the
`DRAFT` header. CLI 0.3.1+ refuses a theme that still has the `review-draft` id or
a `REVIEW:` label; do not bypass it with `--allow-draft` for application code.
Then preview, write and check freshness:

```sh
npx --no-install emoji-styles theme compile ./emoji-theme.ts --output ./src/emoji-theme.compiled.ts --json
npx --no-install emoji-styles theme compile ./emoji-theme.ts --output ./src/emoji-theme.compiled.ts --yes
npx --no-install emoji-styles theme compile ./emoji-theme.ts --output ./src/emoji-theme.compiled.ts --check
```

Loading a `.ts` theme requires Node **22.18+** with native TypeScript
support (the consumer check uses Node 24). On older supported Node versions,
use a serialized theme `.json` or executable `.mjs`; do not merely rename a
TypeScript file. If `package.json` sets `"type": "commonjs"`, name it `emoji-theme.mts`
or set `"type": "module"`, or the import fails. Compilation does not approve a theme; the review above does.
Use `--check` in CI; regenerate when the theme, data or provider revisions change.
See [framework integration](references/frameworks.md) for the React import and
custom-provider compilation.

## Apply and verify

Preview safe changes:

```sh
npx --no-install emoji-styles fix ./src --dry-run --json
```

Apply supported changes with `fix ./src --yes` within the requested scope. Zero
safe fixes is a valid outcome; it does not mean the site needs no manual changes.
Read [framework integration](references/frameworks.md) and
[accessibility and licensing](references/accessibility-and-licensing.md) before
editing runtime integration, accessible labels or provider choices. Install the
appropriate public renderer package in the app, not private workspace packages.

Show the diff and run the app's focused tests/typecheck/build plus the checks
above. Report actual findings, provider chain, native fallback state, licensing
status and remaining limitations. Do not call manual or suggested changes safe
codemods unless the tool actually produced them.

## Decision rules

- Use an image provider for consistent artwork across systems; native glyphs vary.
- Keep image fallbacks ordered and configure terminal `nativeFallback` separately.
- Preserve Unicode as terminal fallback unless the product explicitly disables it.
- Prefer semantic tokens for stable product intent such as `status.warning`;
  preserve ordinary expressive content. Do not infer meaning from a glyph alone.
- Give emoji-only controls a meaningful accessible name; keep decoration silent.
- Use exact manifests/hashes for reviewed local assets. A checksum proves
  integrity, not artwork ownership or redistribution permission.
- For creating or processing artwork, use `emoji-asset-creator` if available.
  Otherwise use the app's CLI asset workflow; another skill is not required.
- Preserve unrelated changes, CSP, SSR and accessibility. Preview writes and do
  not publish or change external systems without the user's authorization.
