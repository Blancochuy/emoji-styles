# emoji-styles-assets-twemoji

A self-hosted Twemoji 15.1 provider for Emoji Styles, including a verified local
manifest and 3,782 supported RGI PNG assets.

## Install

```bash
npm install emoji-styles emoji-styles-assets-twemoji
```

## Usage

Copy the package's `public/emoji` directory into your application's public
assets directory, then use the default provider:

```ts
import { localTwemojiProvider } from "emoji-styles-assets-twemoji";

localTwemojiProvider.getUrl(/* EmojiData */);
```

If assets are served from another path, create a provider with an explicit base
URL:

```ts
import { createLocalTwemojiProvider } from "emoji-styles-assets-twemoji";

const provider = createLocalTwemojiProvider("/assets/emoji/twemoji/15.1.0");
```

The package exports its manifest at
`emoji-styles-assets-twemoji/manifest` and individual files through
`emoji-styles-assets-twemoji/assets/*`.

## License

Provider source code is MIT licensed. Twemoji graphics are licensed under
CC BY 4.0 and require attribution to Twitter and contributors. See
[`LICENSE-GRAPHICS`](./LICENSE-GRAPHICS) for the artwork terms.
