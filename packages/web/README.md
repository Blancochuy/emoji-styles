# emoji-styles-web

A framework-independent Web Component, SSR renderer, and reversible DOM text
transformer powered by Emoji Styles.

## Install

```bash
npm install emoji-styles-web
```

## Web Component

```ts
import { defineStyledEmoji } from "emoji-styles-web";
import "emoji-styles-web/styles.css";

defineStyledEmoji();
```

```html
<styled-emoji
  emoji="🚀"
  provider="fluent-3d"
  fallbacks="twemoji"
  native-fallback="false"
  label="Launch project"
  size="32"
></styled-emoji>
```

Registration is explicit and safe to import during SSR. The same package
exports `renderEmojiToHTML`, `transformEmojiText`, semantic-theme
configuration, and provider registration.

### Compiled themes

`emoji-styles-web/compiled` renders reviewed themes from `emoji-styles theme compile`
without the Unicode catalog. Use its synchronous SSR renderer, browser fallback
installer or custom element with the existing static stylesheet. The full runtime
remains available for arbitrary Unicode and live provider switching.
In 0.3.1, `<compiled-emoji>` leaves its `class` attribute under framework/author
control. Upgrade the static stylesheet too: compiled hosts are styled through
`[data-emoji-compiled]`, including after dynamic class changes.
See [compiled themes](https://github.com/Blancochuy/emoji-styles/blob/master/docs/WEB.md#compiled-themes).

See the [universal web guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/WEB.md)
for Vue, Svelte, Angular, Astro, SSR, CSP, and hydration examples.

## License

Source code is MIT licensed. Provider artwork may use separate licenses; review
the project's
[third-party notices](https://github.com/Blancochuy/emoji-styles/blob/master/docs/THIRD_PARTY_NOTICES.md).
