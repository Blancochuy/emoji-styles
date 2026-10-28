# Your images to a custom emoji pack

Goal: use two of your own transparent images in a React app, keep a Unicode
fallback, and verify the pack contains the actual artwork. No image generation
or API key is needed. This guide assumes an existing React/Vite app with `src/`
and `public/`, Node.js 18+ and two images you are authorized to use.

## 1. Install

CLI **0.1.1** is published on [npm](https://www.npmjs.com/package/emoji-styles-cli),
with the portable-pack fix and `assets init`. In your application directory:

```sh
npm install --save-dev emoji-styles-cli@0.1.1
npm install emoji-styles@0.1.1 react-emoji-styles@0.1.1
npx --no-install emoji-styles --help
```

No repository checkout, pnpm or local tarball is required. If you previously
installed CLI 0.1.0, upgrade: that version omits image copies when building packs.
The package is `emoji-styles-cli`; its executable is `emoji-styles`.

## 2. Initialize and normalize

Put your rocket and padlock PNGs in `raw/1f680.png` and `raw/1f512.png`. The names
are their Unicode codepoints. Other filenames need an explicit mapping; see
[custom assets](./CUSTOM_ASSETS.md). SVG input must first be rasterized in a
trusted workflow. Normalization preserves alpha; it does not remove opaque backgrounds.

The following origin declaration is for **non-generated artwork**. Replace the
source and owner with truthful values. For AI artwork, use `--generated` and
record the real tool/model or an explicit explanation that it is unknown.

```sh
npx --no-install emoji-styles assets init ./artwork --no-generated --source "My original illustrations" --ownership "Your name or organization" --yes
npx --no-install emoji-styles assets normalize ./raw ./normalized --format webp
npx --no-install emoji-styles assets normalize ./raw ./normalized --format webp --yes
```

`artwork/` now has an editable `asset-spec.json` and `provenance-input.json`.
The spec is for future generation and is optional for this existing-image flow.
Review provenance before packaging. Unknown ownership/license remain marked as
unconfirmed; template creation is not permission to redistribute artwork.
If origin is omitted, the template uses `generated: null` and build refuses it
until you explicitly choose true or false. Dates are unknown, not fabricated.

## 3. Build and review the actual pack

```sh
npx --no-install emoji-styles assets build ./normalized --output ./public/emoji/product --id product --base-path /emoji/product/assets --provenance ./artwork/provenance-input.json
npx --no-install emoji-styles assets build ./normalized --output ./public/emoji/product --id product --base-path /emoji/product/assets --provenance ./artwork/provenance-input.json --yes
npx --no-install emoji-styles assets contact-sheet ./public/emoji/product/assets ./review/quality.png --review --yes
```

The output contains `assets/1f680.webp`, `assets/1f512.webp`, `emoji-provider.json`,
`provider.ts`, `PROVENANCE.json`, `LICENSE.md` and `README.md`. Images are copied,
so moving the pack or removing the normalized inputs does not break it.
`--base-path` is the browser URL prefix; the local image folder is always `assets/`.
An existing output is protected unless you supply both `--yes --force`.

Inspect `review/quality.png` at 100% zoom on both backgrounds, especially at
24 px. Technical validity alone does not establish recognition or style quality.

## 4. Render in React

Copy the manifest to the app's source directory as build-time configuration.
Keep the complete pack under `public/` so its assets are served by Vite:

```sh
cp public/emoji/product/emoji-provider.json src/emoji-provider.json
```

In `src/App.tsx`:

```tsx
import { createManifestProvider, type EmojiProviderManifest } from "emoji-styles";
import { Emoji } from "react-emoji-styles";
import "react-emoji-styles/styles.css";
import manifest from "./emoji-provider.json";

const artwork = createManifestProvider(manifest as EmojiProviderManifest);

export default function App() {
  return <Emoji emoji="🚀" provider={artwork} label="Launch" size={32} fallbacks={[]} nativeFallback />;
}
```

Run your app. Open `/emoji/product/assets/1f680.webp` directly and check it shows
your image. In DevTools → Network, the request must have **`Content-Type: image/webp`**
and its Preview must be your artwork.

A status of 200 alone is not enough: the Vite dev and preview servers answer a
missing file with `index.html` (`200 text/html`). The image then fails to decode
and the Unicode fallback hides it. If you see `text/html`, the path or
`--base-path` is wrong.

Rename that image temporarily and reload to check the Unicode fallback; restore
it afterward. Repeat for the padlock.

## Tell us where you got stuck

Have two or three people unfamiliar with the repository attempt this guide.
Record OS/Node, CLI artifact/version, elapsed time, the first confusing step,
commands/errors, and whether the real image and failed-image fallback worked.
Use [a bug report](https://github.com/Blancochuy/emoji-styles/issues/new) and omit
private artwork or credentials. A ten-minute completion time is a goal to test,
not an outcome established by our automated checks.
