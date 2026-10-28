# Provider packaging

Keep normalized runtime assets under one provider directory:

```text
custom-emoji/<provider-id>/
├── assets/
├── emoji-provider.json
├── provider.ts
├── theme.ts
├── LICENSE.md
├── PROVENANCE.json
└── README.md
```

Use one raster format per provider. Unicode assets use codepoint sequence filenames; token-only assets use stable semantic identifiers.

## Mapping file

```json
[
  {
    "file": "action.deploy.webp",
    "emoji": "🚀",
    "token": "action.deploy",
    "label": "Deploy application"
  }
]
```

Every mapping needs an exact normalized filename and a Unicode fallback, explicit
or inferable from a codepoint filename. A semantic token supplements that fallback;
it does not replace it. With `assets pack`, use the output extension in mappings
(for example `.webp` for PNG inputs normalized to WebP).

## Package command

For raw artwork, prefer `npx --no-install emoji-styles assets pack` as shown in
the skill. The following alternative is for already-normalized files. Browser
URLs resolve from the served document; files copied to `public/emoji/acme/assets`
can use `--base-path /emoji/acme/assets`. The same manifest's root-relative browser
URL is not a disk path for CLI `doctor`/`test` checks. Use the app's integration
and actual image responses to verify browser deployment.

```bash
npx --no-install emoji-styles assets build ./custom-emoji/acme/assets \
  --output ./custom-emoji/acme \
  --id acme \
  --mapping ./custom-emoji/acme/mapping.json \
  --provenance ./custom-emoji/acme/provenance-input.json
```

Preview first, then add `--yes`. Existing output requires `--force` as well. Inspect the generated manifest, module, theme, notice, and provenance before registering.

The manifest must use safe relative paths, exact dimensions and hashes, one normalized emoji grapheme per Unicode key, a provider version, asset source, and truthful license fields. Never add API keys or local absolute paths.
