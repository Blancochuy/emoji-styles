# emoji-styles

Framework-independent emoji resolution with typed providers, explicit fallback
chains, semantic themes, Unicode metadata, and deterministic asset policies.

## Install

```bash
npm install emoji-styles
```

## Usage

```ts
import {
  defineEmojiTheme,
  publicProviders,
  resolveEmoji,
  resolveEmojiToken,
} from "emoji-styles";

const theme = defineEmojiTheme({
  "action.deploy": {
    emoji: "🚀",
    label: "Deploy application",
  },
});

const resolved = await resolveEmoji("🚀", {
  provider: publicProviders.fluent3d,
  fallbacks: [publicProviders.twemoji],
  nativeFallback: false,
});

const deploy = await resolveEmojiToken("action.deploy", theme);
```

Use this package directly in any JavaScript framework, or pair it with
[`react-emoji-styles`](https://www.npmjs.com/package/react-emoji-styles) or
[`emoji-styles-web`](https://www.npmjs.com/package/emoji-styles-web).

Documentation and the interactive provider explorer are available at
[emoji-styles.space](https://emoji-styles.space).

## Exact custom assets

Exact token assets use their declared provider metadata. Without a `providerId`,
they are attributed to `theme-<theme id>` at the theme version, without an assumed
artwork license. Assets sharing an id but disagreeing on revision or license are
recorded as `mixed` without a license in compiled metadata.

When upgrading from 0.3.0 to 0.3.1, regenerate compiled themes containing exact
assets without `providerId`; `theme compile --check` detects their stale metadata.

## License

Source code is MIT licensed. Artwork returned by external providers retains its
own license and delivery terms; see the repository's
[license policy](https://github.com/Blancochuy/emoji-styles/blob/master/docs/LICENSE_POLICY.md).
