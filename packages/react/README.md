# react-emoji-styles

React 18 and 19 primitives for consistent, accessible emoji across operating
systems, providers, themes, SSR, and hydration.

## Install

```bash
npm install react-emoji-styles
```

## Quick start

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";
import "react-emoji-styles/styles.css";

export function App() {
  return (
    <EmojiProvider
      provider={publicProviders.fluent3d}
      fallbacks={[publicProviders.twemoji]}
      nativeFallback={false}
    >
      <Emoji emoji="🚀" label="Launch project" size="xl" />
    </EmojiProvider>
  );
}
```

The package also exports `EmojiToken`, `EmojiText`, `EmojiGrid`, provider
configuration, semantic themes, and resolution hooks.

- [Interactive demo](https://emoji-styles.space)
- [React documentation](https://github.com/Blancochuy/emoji-styles/blob/master/docs/REACT.md)
- [Source repository](https://github.com/Blancochuy/emoji-styles)

## License

Source code is MIT licensed. Provider artwork may use separate licenses; review
the project's
[third-party notices](https://github.com/Blancochuy/emoji-styles/blob/master/docs/THIRD_PARTY_NOTICES.md).
