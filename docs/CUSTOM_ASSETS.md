# Custom asset pipeline

`@emoji-styles/asset-pipeline` turns reviewed raster artwork into deterministic custom emoji providers. It processes outputs from any designer, export tool, or image generator; it does not generate artwork or infer who owns it.

For a complete checked-in example, inspect the [`custom-emoji` demo provider](../demo/src/custom-emoji/custom-emoji): it includes an asset specification, semantic mapping, normalized WebP, exact manifest, runtime registration, license notice, and provenance record created through `$emoji-asset-creator`.

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
```

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
