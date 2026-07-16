# Project configuration

`emoji-styles.config.json` is the single emoji policy for a project. The CLI, React adapter, Web Component, SSR renderer and validation commands can consume the same file.

```json
{
  "schemaVersion": 1,
  "provider": "fluent-animated",
  "fallbacks": ["fluent-3d", "twemoji"],
  "nativeFallback": false,
  "source": ["src"],
  "policy": {
    "allowRemoteAssets": true,
    "audit": {
      "emoji-styles/semantic/raw-emoji": "warning",
      "emoji-styles/accessibility/missing-label": "error"
    }
  }
}
```

The resolution order is primary provider, each configured fallback in order, then native OS rendering only when `nativeFallback` is enabled. Explicitly placing `native` in `fallbacks` always opts into it.

## React

Import the file once at the application root:

```tsx
import emojiConfig from "../emoji-styles.config.json";
import { EmojiProvider } from "react-emoji-styles";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EmojiProvider config={emojiConfig}>{children}</EmojiProvider>;
}
```

Every descendant can now stay focused on meaning:

```tsx
<Emoji emoji="🚀" label="Deploy application" />
<EmojiToken token="action.deploy" />
```

Direct props still override the project config for exceptional cases. Custom provider IDs are resolved through the `providers` registry on `EmojiProvider`.

## Web Component and SSR

Configure the universal package once before defining or rendering elements:

```ts
import emojiConfig from "../emoji-styles.config.json";
import { configureEmojiStyles, defineStyledEmoji } from "emoji-styles-web";

configureEmojiStyles(emojiConfig);
defineStyledEmoji();
```

```html
<styled-emoji emoji="🚀" label="Deploy application"></styled-emoji>
```

`renderEmojiToHTML` and `renderEmojiTokenToHTML` use the same configured defaults. Function options and element attributes remain higher-priority overrides.

## Typed configuration

Projects that prefer TypeScript can validate and freeze the runtime subset:

```ts
import { defineEmojiConfig } from "emoji-styles";

export default defineEmojiConfig({
  provider: "fluent-animated",
  fallbacks: ["fluent-3d", "twemoji"],
  nativeFallback: false,
});
```

The JSON form remains recommended when the same file is also consumed by `emoji-styles doctor`, `test`, `sync`, and other CLI workflows.

## Audit policy

`policy.audit` maps stable rule IDs to `off`, `info`, `warning`, or `error`. Unspecified rules use their documented default severity. An audit fails only when an enabled rule produces an `error` finding.

`allowRemoteAssets: false` is enforced by `doctor`, `audit`, and asset synchronization. It does not silently rewrite remote URLs: `audit` reports each violation and `fix` leaves provider selection for human review.
