# Local emoji assets

This directory stores provider configuration. Approved snapshots live in their dedicated workspace packages; Twemoji is versioned under `packages/assets-twemoji`. Remote public providers, including the partial SerenityOS pixel-art catalog, record immutable upstream revisions and license metadata in `providers.json`.

The first supported pipeline targets Twemoji 15.1.0:

```bash
pnpm assets:check
pnpm assets:sync
```

`assets:check` validates configuration without downloading files. `assets:sync` downloads only codepoints present in the core catalog, applies strictly lossless optimization, and writes the versioned package manifest with SHA-256 checksums and format metadata.

Optimization is conservative:

- static PNG files are recompressed losslessly;
- animated GIF and WebP candidates retain frame count, delays, and loop metadata;
- APNG files are detected from their `acTL` chunk and preserved byte-for-byte;
- candidates are rejected when animation metadata changes or output size does not improve.

Do not place Apple, Samsung, or other proprietary artwork here without written redistribution permission and an update to [`docs/LICENSE_POLICY.md`](../docs/LICENSE_POLICY.md).
