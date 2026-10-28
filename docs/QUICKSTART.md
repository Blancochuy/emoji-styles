# Your images to a custom emoji pack

Show your own emoji artwork in a React app, with a Unicode fallback. You need
Node.js 22.12+ and a React/Vite app (`npm create vite@latest my-app -- --template react-ts`
creates one). No image generation or API key is needed.

## 1. Build the pack

In your app's folder, paste this block. It uses two sample images; to use your
own, see [your own images](#your-own-images).

```sh
npm install --save-dev emoji-styles-cli@0.2.1
npm install emoji-styles@0.1.1 react-emoji-styles@0.1.1
mkdir raw
curl -fsSL -o raw/1f680.png https://raw.githubusercontent.com/Blancochuy/emoji-styles/master/docs/assets/quickstart/1f680.png -o raw/1f512.png https://raw.githubusercontent.com/Blancochuy/emoji-styles/master/docs/assets/quickstart/1f512.png
npx --no-install emoji-styles assets pack ./raw ./public/emoji/product --id product --no-generated --source "Emoji Styles quickstart samples" --ownership "Emoji Styles contributors" --license MIT --manifest-out ./src/emoji-provider.json --review-sheet ./review.png --yes
```

The pack is in `public/emoji/product/`: images, manifest, hashes and provenance.
The command also creates `src/emoji-provider.json` and `review.png`.

## 2. Render it

Replace `src/App.tsx`:

```tsx
import { createManifestProvider, type EmojiProviderManifest } from "emoji-styles";
import { Emoji } from "react-emoji-styles";
import "react-emoji-styles/styles.css";
import manifest from "./emoji-provider.json";

const artwork = createManifestProvider(manifest as EmojiProviderManifest);

export default function App() {
  return <Emoji emoji="🚀" provider={artwork} label="Launch" size={64} fallbacks={[]} nativeFallback />;
}
```

Run `npm run dev`. You should see the purple sample rocket, not your system's 🚀.
Open `/emoji/product/assets/1f680.webp` once to confirm it shows your sample.

**Done.** [Tell us how long it took](https://github.com/Blancochuy/emoji-styles/issues/43).

## Optional checks

- **Real artwork:** open `/emoji/product/assets/1f680.webp`. In DevTools → Network it
  must be `image/webp`. Vite answers a missing file with `200 text/html`, and the
  fallback would hide it.
- **Fallback:** rename that file, reload, and the native 🚀 appears with the same label; restore the file afterward.
- **Small sizes:** open the generated `review.png` at 100% zoom. It shows
  24/48/96 px on light and dark backgrounds.

## Your own images

Use transparent PNGs named by Unicode codepoint (`1f680.png` is 🚀; other names
need a [mapping](./CUSTOM_ASSETS.md)). In the `pack` command, set `--source` and
`--ownership` to the truth. For AI artwork, use `--generated --model "<model>"`
instead of `--no-generated`, and replace `--license MIT` with your artwork's actual
license or an explicit unconfirmed status. The sample license does not apply to your own images.

<details>
<summary>Why the pack asks for provenance</summary>

The CLI refuses to package artwork without a declared origin, and records it in
`PROVENANCE.json` and `LICENSE.md`. Unknown licenses stay marked as unconfirmed.
A valid pack proves file integrity, not redistribution rights. Normalization keeps
real transparency; it does not remove opaque backgrounds. Commands preview their
writes when you omit `--yes`, and refuse to overwrite without `--force`.

</details>
