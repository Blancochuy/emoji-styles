# React integration

`react-emoji-styles` is a thin adapter over the framework-independent core. It renders complete deterministic markup during SSR, progressively resolves asynchronous providers after hydration, and keeps visual styling in a static optional stylesheet.

## Setup

For a project-wide policy, import [`emoji-styles.config.json`](./CONFIGURATION.md) once and pass it through `<EmojiProvider config={config}>`. Individual components then need no provider or fallback props.

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
      <Emoji emoji="🚀" label="Deploy application" size="lg" />
    </EmojiProvider>
  );
}
```

The stylesheet contains layout, size-preset, grid, and reduced-motion rules. The package never injects a `<style>` element and the component emits no inline `style` attributes, making strict CSP policies practical.

## SerenityOS pixel art

```tsx
<Emoji
  emoji="🚀"
  provider={publicProviders.serenityOS}
  fallbacks={[publicProviders.twemoji]}
  size={32}
/>
```

The bundled stylesheet applies `image-rendering: pixelated` only while the current image URL belongs to the pinned SerenityOS snapshot. It preserves the requested dimensions and stops applying the rule if runtime fallback changes the image to Twemoji. SerenityOS has partial exact-sequence coverage, so skin-tone or ZWJ variants without their own PNG fall back rather than silently reusing base artwork. Prefer integer scaling factors when visual fidelity matters.

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

When enabled, native fallback remains accessible through `role="img"` and the same label, so an image failure does not change the control's accessible name.

## Fallback policy

Provider fallback and OS fallback are independent:

```tsx
<Emoji
  emoji="🚀"
  provider={publicProviders.fluentAnimated}
  fallbacks={[publicProviders.fluent3d, publicProviders.twemoji]}
  nativeFallback={false}
/>
```

This tries Fluent Animated, Fluent 3D and Twemoji in order. If none resolves, it renders no OS-dependent glyph. Set `nativeFallback` once on `EmojiProvider` to enforce the same policy throughout an application. The older `fallback` boolean remains as a deprecated alias.

## Resolution events

```tsx
<Emoji
  emoji="🚀"
  provider={publicProviders.fluentAnimated}
  fallbacks={[publicProviders.fluent3d, publicProviders.twemoji]}
  nativeFallback={false}
  loading="eager"
  onResolve={(resolution) => console.log(resolution.attempts)}
  onFallback={({ from, to, native }) => console.log({ from, to, native })}
  onError={({ url, providerId }) => console.warn({ url, providerId })}
/>
```

`onResolve` receives the structured core v2 result. Runtime image errors continue through the configured URL chain and emit `onError` and `onFallback`; the final event reports whether native fallback was used.

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
- Named and numeric sizes apply equally to image providers and native OS emoji. Native glyphs use scalable SVG text with static presentation attributes, so custom dimensions remain compatible with strict CSP policies that disallow inline styles.
- `alt`, `lazy`, `style`, `defaultStyle`, and `fallback` remain available as deprecated compatibility props.
