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

# README demo

`readme-demo.gif` shows one `🚀` with the label "Deploy" rendered through native
Unicode, Twemoji, Fluent 3D and the demo's Soft 3D pack. The last frame removes
the pack image: the component shows the native glyph and keeps the label.
Each frame is a screenshot of the compiled workspace `<styled-emoji>` Web Component from `packages/web` in
Chromium; it uses the same core resolution and fallback as React `<Emoji>`,
whose syntax the frame shows. No frame is drawn by hand.

Regenerate from the repository root:

```sh
pnpm --filter emoji-styles-web... build
node scripts/render-readme-demo.mjs
```

The script uses Playwright and Sharp from `scripts/`. Twemoji and Fluent load
from their pinned CDN URLs, so it needs network access. The native glyph and
fonts depend on the host OS (the checked-in GIF was captured on macOS). The Soft
3D rocket reuses `demo/src/custom-emoji/custom-soft-3d/assets/1f680.webp` with
its existing provenance and unconfirmed artwork-license status.
No image-model requests were made to produce this GIF.

The capture tool requires Node.js 20+ and a Playwright Chromium installation.
After installing workspace dependencies, install its browser when needed with
`pnpm --filter emoji-styles-scripts exec playwright install chromium`.
The GIF illustrates the workspace build, not an independent npm consumer test.
