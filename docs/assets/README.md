# README banner

`readme-banner.png` is the GitHub-facing 2560 × 960 export (displayed at up to
1280 × 480 CSS pixels). Its dark background is intentional in both GitHub themes.
`readme-banner.svg` is a self-contained vector composition with embedded artwork.

Regenerate from the repository root:

```sh
node scripts/render-readme-banner.mjs
```

Install workspace dependencies first. The script uses the existing Sharp
installation in `scripts/`; font rendering can vary by the fonts available on
the host. The checked-in PNG freezes the reviewed appearance for GitHub.

Sources:

- Logo: `demo/src/assets/favicon.svg`, included without altering its geometry.
- Soft 3D rocket: `demo/src/custom-emoji/custom-soft-3d/assets/1f680.webp`.
- Agent Core: `demo/src/custom-emoji/custom-emoji/assets/1f916.webp`.

The two artwork examples are reused from the existing demo, with their existing
provenance and unconfirmed artwork-license status. This composition does not
change their ownership/license declarations or establish redistribution rights.
See each pack's `PROVENANCE.json` and `LICENSE.md`, and `docs/LICENSE_POLICY.md`.
No new image-model requests were made to produce this banner.
