# Custom asset pipeline

`@emoji-styles/asset-pipeline` turns reviewed raster artwork into deterministic custom emoji providers. It processes outputs from any designer, export tool, or image generator; it does not generate artwork or infer who owns it.

For complete checked-in examples, inspect the [`Custom Emoji Lab`](../demo/src/custom-emoji): four original visual directions, each with its own asset specification, semantic mapping, normalized WebP, exact manifest, runtime registration, license notice, and provenance record created through `$emoji-asset-creator`. The demo also includes a Free Style brief builder so users can define an entirely original visual system instead of selecting a preset.

Free Style accepts natural-language art direction, but it does not remove production constraints. The resulting specification must still define repeatable visual rules, remain legible at small sizes, preserve one clear subject, use a transparent runtime background, and avoid unauthorized vendor imitation, text, logos, or trademarks.

## What the pipeline guarantees

- verifies PNG, WebP, AVIF, and JPEG signatures before decoding;
- rejects arbitrary SVG input and corrupt, oversized, animated, or fully transparent files;
- crops transparent bounds, centers visible content, and applies one configurable safe area;
- emits a square PNG, WebP, or AVIF with reproducible encoding and SHA-256 hashes;
- detects wrong dimensions, edge contact, poor centering, exact duplicates, and collection outliers;
- creates review-only contact sheets;
- generates a provider manifest, typed module, optional semantic theme, license notice, provenance record, and pack README.

The static normalizer deliberately rejects animation because silently flattening APNG or animated WebP would destroy frames. Existing official animated providers use their separate frame-preserving workflow.

## CLI workflow

Validate a versioned specification and inspect the request budget before image
generation:

```bash
emoji-styles assets spec-schema --json
emoji-styles assets validate-spec ./asset-spec.json --json
emoji-styles assets plan ./asset-spec.json --variants 1 --json
```

Planning returns per-token prompts, candidate IDs, request count, and a canonical
spec SHA-256 without calling an image model. Start with one reviewed anchor;
execute the rest only after approving its visual system. The exported
`EmojiGenerationBackend` interface is a contract for future optional adapters,
not an included remote executor or a guarantee of any provider's capabilities.

For built-in Codex `image_gen`, request `transparent_background: true` and retain
the generated alpha. Confirm `transparentPixelRatio > 0`, inspect `cornerAlpha`,
and review the edges. Skip background removal when transparency is already real;
older chroma-key demo provenance describes a historical workflow. Other tools
must be checked for native transparency support individually.

Commands preview changes unless `--yes` is present:

```bash
# Inspect untrusted exports without writing
emoji-styles assets inspect ./raw-emoji --json

# Preview, then normalize
emoji-styles assets normalize ./raw-emoji ./product-provider/assets \
  --size 256 --format webp --safe-area 0.76
emoji-styles assets normalize ./raw-emoji ./product-provider/assets \
  --size 256 --format webp --safe-area 0.76 --yes

# Validate the complete collection
emoji-styles assets validate ./product-provider/assets \
  --size 256 --format webp --safe-area 0.76

# Render a review artifact; never ship it as runtime artwork
emoji-styles assets contact-sheet ./product-provider/assets ./review/contact-sheet.png --yes

# Inspect actual-size legibility and alpha edges on white and dark backgrounds
emoji-styles assets contact-sheet ./product-provider/assets ./review/quality.png \
  --review --columns 3 --yes
```

`--review` renders each asset at exactly 24, 48, and 96 px on both backgrounds;
view the PNG at 100% zoom for a meaningful small-size check. Each review tile is
320×320 px (`--tile-size` and `--background` do not apply to this mode). These
previews help a person or a vision-capable agent evaluate silhouette, halos,
contrast, and detail. They do not automatically score visual quality or approve
artwork.

`assets build` and MCP packaging previews now run collection validation before
returning artifacts. They reject technical errors, exact duplicate artwork,
mixed canvas dimensions, missing mapping files, repeated emoji/token mappings,
and assets without a Unicode fallback. Safe-area and centering warnings still
require review; passing technical validation does not establish visual quality.

Use Unicode codepoint filenames such as `1f680.webp`. A mapping file can add semantic product tokens or map a differently named export:

```json
[
  {
    "file": "deploy.webp",
    "emoji": "🚀",
    "token": "action.deploy",
    "label": "Deploy application"
  }
]
```

Provenance is mandatory when packaging a provider:

```json
{
  "generated": true,
  "createdAt": "2026-07-15T18:00:00.000Z",
  "generator": {
    "type": "image-generation",
    "provider": "record-the-real-provider",
    "model": "record-the-real-model"
  },
  "humanDirection": "Friendly product icon, no text, transparent background",
  "referenceAssets": [],
  "modifications": ["Human review", "Color correction"],
  "source": "Internal design workflow",
  "ownership": "Example Inc.",
  "license": "Proprietary"
}
```

Package the reviewed assets into the standard provider structure:

```bash
emoji-styles assets build ./product-provider/assets \
  --output ./product-provider \
  --id product-icons \
  --mapping ./product-provider/mapping.json \
  --provenance ./product-provider/provenance-input.json

emoji-styles assets build ./product-provider/assets \
  --output ./product-provider \
  --id product-icons \
  --mapping ./product-provider/mapping.json \
  --provenance ./product-provider/provenance-input.json \
  --yes
```

The current source builder copies every packaged image into `<output>/assets/`.
This works with a separate input directory, with the default output directory,
and with images already at `<output>/assets/` (those are kept in place). Copy
targets participate in dry-run and overwrite checks; replacing an existing file
requires `--yes --force`. `--base-path` controls the deployment URL prefix and
does not change the local `assets/` directory. CLI 0.1.1 is published with this copy step; upgrade from 0.1.0, which
omits image copies when building packs.

Start with the [custom-pack quickstart](./QUICKSTART.md), including `assets init`
templates for the spec and provenance. The spec is optional when packaging
existing images; the provenance is required.

The output contains:

```text
product-provider/
├── assets/
├── emoji-provider.json
├── provider.ts
├── theme.ts                 # only when semantic tokens exist
├── LICENSE.md
├── PROVENANCE.json
└── README.md
```

Generated `theme.ts` exports a validated `defineEmojiTheme` instance, preserving
mapping labels (or falling back to the Unicode label) and using the generated
provider by default. This replaces the older plain token→string map: consume
`emojiTheme.tokens` and pass the theme directly to `<EmojiProvider>`.

## TypeScript API

```ts
import {
  normalizeEmojiAsset,
  validateEmojiAsset,
} from "@emoji-styles/asset-pipeline";

const normalized = await normalizeEmojiAsset({
  input: "./raw/deploy.png",
  output: "./product-provider/assets/1f680.webp",
  size: 256,
  format: "webp",
  safeArea: 0.76,
});

console.log(normalized.inspection.sha256);

const validation = await validateEmojiAsset(normalized.data, {
  size: 256,
  format: "webp",
  safeArea: 0.76,
});
```

## Security and licensing boundary

Treat every image as untrusted. Defaults limit input to 10 MB, 16,777,216 decoded pixels, and a 4,096 px side. Paths written by the main CLI must remain inside the current project. SVG is rejected because it can contain active or external content; rasterize it in a trusted workflow first.

A valid hash proves file integrity, not redistribution rights. The pack builder refuses to proceed without declared ownership or licensing and requires a model identifier for generated assets. Review the resulting `LICENSE.md` and `PROVENANCE.json` with the actual rights holder before publishing.
