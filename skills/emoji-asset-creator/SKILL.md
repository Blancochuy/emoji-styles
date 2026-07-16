---
name: emoji-asset-creator
description: Create, normalize, validate and integrate coherent custom emoji asset sets for Emoji Styles using an AI agent with image-generation capabilities. Use when the user asks to generate custom emoji, invent a freeform emoji visual language, create a branded emoji pack, turn semantic tokens into visual assets, build a local custom provider, match an authorized existing style, or add AI-generated emoji assets to an application or design system.
---

# Emoji Asset Creator

Create one reviewed visual system, then use deterministic tooling to turn its assets into a local Emoji Styles provider. Keep generation provider-agnostic and keep generated files in the user's project, never inside this skill.

## Workflow

### 1. Inspect

Read the project configuration, semantic themes, existing providers, brand references, sample assets, requested tokens, framework, output sizes, and background requirements. Determine whether mappings are Unicode-based, semantic-token-based, or mixed.

Record safe assumptions instead of blocking on non-critical questions. Confirm rights before using third-party visual references, logos, or trademarks. Read [references/licensing-and-provenance.md](references/licensing-and-provenance.md) before generating.

### 2. Define the specification

Create `custom-emoji/<provider-id>/asset-spec.json` before generation. Start from [assets/asset-spec.template.json](assets/asset-spec.template.json) and use [references/asset-specification.md](references/asset-specification.md) for the schema and defaults. Include style, perspective, lighting, materials, background, safe area, output format, target sizes, mappings, and accessibility labels.

Treat named styles and bundled examples as optional starting points, never as a closed catalog. When the user supplies a freeform direction, preserve their language and translate it into measurable shape, material, palette, edge, camera, and lighting rules. Ask only for a missing decision that would materially change the visual system. Do not silently map an original direction to a proprietary vendor style.

### 3. Approve one style anchor

Generate one representative asset first. Choose a recognizable, medium-complexity subject that exercises the requested materials and lighting. Inspect it at full size, 48 px, and 24 px. Reject text, logos, borders, background residue, weak silhouettes, and cropped shadows.

Do not generate the full set until the anchor satisfies [references/review-checklist.md](references/review-checklist.md).

### 4. Generate one asset at a time

Use the approved anchor and one consistent prompt template. Read [references/prompt-patterns.md](references/prompt-patterns.md). Each generation must represent exactly one emoji or token, use a transparent background, keep visible content inside the safe area, and exclude text, letters, logos, borders, and extra objects.

Never use a contact sheet or sprite sheet as the canonical source. Never send an entire private repository or sensitive project data to an image model.

### 5. Normalize deterministically

Keep raw outputs separate from runtime assets. Build the CLI when working in this monorepo, then preview and apply:

```bash
python3 skills/emoji-asset-creator/scripts/inspect_assets.py ./raw
python3 skills/emoji-asset-creator/scripts/normalize_asset.py ./raw ./custom-emoji/<provider-id>/assets --size 256 --format webp --safe-area 0.76
python3 skills/emoji-asset-creator/scripts/normalize_asset.py ./raw ./custom-emoji/<provider-id>/assets --size 256 --format webp --safe-area 0.76 --yes
```

Use Unicode codepoint filenames such as `1f680.webp` or semantic identifiers such as `action.deploy.webp`. Do not use translated display names as canonical filenames. The static pipeline must reject animation rather than silently flatten frames.

### 6. Validate and review the set

Run technical validation and create a review-only contact sheet:

```bash
python3 skills/emoji-asset-creator/scripts/validate_set.py ./custom-emoji/<provider-id>/assets --size 256 --format webp --safe-area 0.76
python3 skills/emoji-asset-creator/scripts/generate_contact_sheet.py ./custom-emoji/<provider-id>/assets ./review/<provider-id>.png --yes
```

Inspect consistency using [references/visual-consistency.md](references/visual-consistency.md). Fix the individual outlier; do not hide it with collection-wide post-processing.

### 7. Package and register

Create a mapping file and a truthful provenance file from [assets/mapping.template.json](assets/mapping.template.json) and [assets/provenance.template.json](assets/provenance.template.json). Read [references/provider-manifest.md](references/provider-manifest.md). Preview provider generation before applying:

```bash
python3 skills/emoji-asset-creator/scripts/generate_manifest.py \
  ./custom-emoji/<provider-id>/assets \
  --output ./custom-emoji/<provider-id> \
  --id <provider-id> \
  --mapping ./custom-emoji/<provider-id>/mapping.json \
  --provenance ./custom-emoji/<provider-id>/provenance-input.json
```

Apply with `--yes`, inspect every generated file, then register the provider through official Emoji Styles APIs. Preserve a Unicode fallback. Update project configuration only after asset and manifest validation pass.

### 8. Test and report

Run `emoji-styles doctor`, `emoji-styles test`, project typecheck/tests/build, and focused checks for fallback, missing assets, SSR, local paths, light/dark backgrounds, and 24/48 px rendering.

Report provider ID, asset count, mappings, format, dimensions, output paths, validation status, provenance/license status, assumptions, warnings, and commands used.

## Non-negotiable rules

- Never copy or closely imitate proprietary Apple, Samsung, or other vendor emoji artwork.
- Never restrict the user to preset aesthetics; freeform styles are first-class when they retain emoji legibility and set-level consistency.
- Never use logos or trademarks without authorization.
- Never claim generated assets are legally safe.
- Always record the real generator/model when known; otherwise mark confirmation required.
- Never infer ownership or mark unknown licensing as approved.
- Never generate a provider before validating all assets.
- Never store API keys in prompts, assets, manifests, or provider code.
- Never auto-apply generated assets without showing the result.
- Treat visual review and deterministic validation as separate required gates.
