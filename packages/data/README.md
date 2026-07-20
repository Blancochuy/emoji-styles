# emoji-styles-data

Versioned Unicode 17.0 and CLDR 48 RGI emoji metadata used by Emoji Styles.

## Install

```bash
npm install emoji-styles-data
```

## Usage

```ts
import {
  emojiData,
  emojiDatasetInfo,
  getEmojiData,
  normalizeEmoji,
} from "emoji-styles-data";

console.log(emojiDatasetInfo);
console.log(getEmojiData(normalizeEmoji("🚀")));
console.log(emojiData.length);
```

The generated dataset records its upstream source, checksum, Unicode version,
Emoji version, CLDR version, and generator version for reproducible builds.

## License

The Unicode-derived data is distributed under the Unicode License v3. See
[`LICENSE`](./LICENSE). Package source and documentation are maintained in
[Blancochuy/emoji-styles](https://github.com/Blancochuy/emoji-styles).
