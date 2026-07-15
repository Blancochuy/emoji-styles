# React integration

`react-emoji-styles` is a thin adapter over the framework-independent core. It renders complete deterministic markup during SSR, progressively resolves asynchronous providers after hydration, and keeps visual styling in a static optional stylesheet.

## Setup

```tsx
import { Emoji, EmojiProvider, publicProviders } from "react-emoji-styles";
import "react-emoji-styles/styles.css";

export function App() {
  return (
    <EmojiProvider
      provider={publicProviders.fluent3d}
      fallbacks={[publicProviders.twemoji, publicProviders.native]}
    >
      <Emoji emoji="🚀" label="Deploy application" size="lg" />
    </EmojiProvider>
  );
}
```

The stylesheet contains layout, size-preset, grid, and reduced-motion rules. The package never injects a `<style>` element and the component emits no inline `style` attributes, making strict CSP policies practical.

## Accessibility

Meaningful emoji use their CLDR label automatically:

```tsx
<Emoji emoji="🚀" />
```

Use an explicit product label when the intended meaning differs from the Unicode name:

```tsx
<Emoji emoji="🚀" label="Deploy application" />
```

Decorative emoji are removed from the accessibility tree:

```tsx
<Emoji emoji="✨" decorative />
```

Native fallback remains accessible through `role="img"` and the same label, so an image failure does not change the control's accessible name.

## Resolution events

```tsx
<Emoji
  emoji="🚀"
  provider={publicProviders.fluentAnimated}
  fallbacks={[publicProviders.fluent3d, publicProviders.twemoji, publicProviders.native]}
  loading="eager"
  onResolve={(resolution) => console.log(resolution.attempts)}
  onFallback={({ from, to, native }) => console.log({ from, to, native })}
  onError={({ url, providerId }) => console.warn({ url, providerId })}
/>
```

`onResolve` receives the structured core v2 result. Runtime image errors continue through the URL chain and emit `onError` and `onFallback` without disabling accessible native fallback.

## SSR and hydration

`Emoji` includes the resolved `<img>` in the initial server render and uses the native `loading` attribute. Server and client start from the same URL, label, loading state, dimensions, and classes. Effects are used only for asynchronous v2 providers and callbacks after hydration.

```tsx
import { renderToString } from "react-dom/server";
import { Emoji } from "react-emoji-styles";

const html = renderToString(<Emoji emoji="🚀" provider="fluent-3d" size="lg" />);
```

No browser global is read during render.

## Next.js App Router

Import the static stylesheet once from the root layout. Client components can use callbacks, while Server Components can include `Emoji` and receive deterministic prerendered output through the client boundary.

See the [Next.js example](../examples/next/README.md).

## Compatibility

- React 18.3 and React 19.2 are exercised independently in CI.
- Named sizes are fully defined in static CSS.
- Numeric image sizes use HTML `width` and `height` attributes. For custom numeric native-emoji sizing under strict CSP, attach a project class with the desired static font size.
- `alt`, `lazy`, `style`, and `defaultStyle` remain available as deprecated compatibility props.
