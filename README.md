# emoji-styles

> Multi-style emoji component for React. Render emojis as images from CDN in Apple, Google, Samsung, Microsoft Teams 3D, Animated, or Twitter/X styles.

![Emoji Styles Demo](https://em-content.zobj.net/source/microsoft-teams/400/rocket_1f680.png)
![Emoji Styles Demo](https://em-content.zobj.net/source/apple/453/rocket_1f680.png)
![Emoji Styles Demo](https://em-content.zobj.net/source/google/350/rocket_1f680.png)
![Emoji Styles Demo](https://em-content.zobj.net/source/samsung/320/rocket_1f680.png)
![Emoji Styles Demo](https://em-content.zobj.net/source/animated-noto-color-emoji/461/rocket_1f680.gif)

## Install

```bash
npm install react-emoji-styles
# or
pnpm add react-emoji-styles
```

## Quick Start

```tsx
import { Emoji } from "react-emoji-styles";

function App() {
  return (
    <div>
      <Emoji emoji="🚀" style="microsoft-teams" size="xl" />
      <Emoji emoji="🔥" style="apple" size="lg" />
      <Emoji emoji="⭐" style="animated" size="2xl" />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `emoji` | `string` | **required** | Emoji character (e.g. `"🚀"`) |
| `style` | `EmojiStyle` | `"microsoft-teams"` | Visual style provider |
| `size` | `EmojiSize \| number` | `"md"` | Size preset or pixel value |
| `className` | `string` | `""` | Additional CSS classes |
| `alt` | `string` | Auto-generated | Alt text for the image |
| `lazy` | `boolean` | `true` | Enable lazy loading |
| `fallback` | `boolean` | `true` | Show text emoji on error |

## Styles

| Style | Provider | Format | Preview |
|-------|----------|--------|---------|
| `microsoft-teams` | Microsoft Teams 3D | PNG | ![Teams](https://em-content.zobj.net/source/microsoft-teams/400/fire_1f525.png) |
| `apple` | Apple iOS/macOS | PNG | ![Apple](https://em-content.zobj.net/source/apple/453/fire_1f525.png) |
| `google` | Google Android/Web | PNG | ![Google](https://em-content.zobj.net/source/google/350/fire_1f525.png) |
| `samsung` | Samsung One UI | PNG | ![Samsung](https://em-content.zobj.net/source/samsung/320/fire_1f525.png) |
| `animated` | Noto Animated | GIF | ![Animated](https://em-content.zobj.net/source/animated-noto-color-emoji/461/fire_1f525.gif) |
| `twemoji` | Twitter/X | PNG | ![Twemoji](https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png) |

## Sizes

```tsx
<Emoji emoji="🚀" size="xs" />   {/* 12px */}
<Emoji emoji="🚀" size="sm" />   {/* 16px */}
<Emoji emoji="🚀" size="md" />   {/* 20px */}
<Emoji emoji="🚀" size="lg" />   {/* 24px */}
<Emoji emoji="🚀" size="xl" />   {/* 32px */}
<Emoji emoji="🚀" size="2xl" />  {/* 40px */}
<Emoji emoji="🚀" size="3xl" />  {/* 48px */}
<Emoji emoji="🚀" size={64} />   {/* Custom px */}
```

## Global Default Style

Wrap your app with `EmojiProvider` to set a default style:

```tsx
import { EmojiProvider } from "react-emoji-styles";

function App() {
  return (
    <EmojiProvider defaultStyle="apple">
      {/* All <Emoji /> components use Apple style by default */}
      <Emoji emoji="🚀" /> {/* Apple style */}
      <Emoji emoji="🔥" style="google" /> {/* Override to Google */}
    </EmojiProvider>
  );
}
```

## Programmatic Usage (Vanilla JS)

The core package works without React:

```ts
import { getEmojiUrl, hasEmoji, getAvailableEmojis } from "emoji-styles";

// Get URL for any emoji in any style
const url = getEmojiUrl("🚀", "apple");
// → "https://em-content.zobj.net/source/apple/453/rocket_1f680.png"

// Check if an emoji is supported
hasEmoji("🚀"); // true
hasEmoji("🦄"); // false

// List all available emojis
const emojis = getAvailableEmojis(); // ["👋", "👍", "🚀", ...]
```

## Custom Sizes (Tailwind)

If you use Tailwind CSS, you can pass pixel values directly:

```tsx
<Emoji emoji="🚀" size={96} className="my-4" />
```

## Fallback Behavior

When an emoji image fails to load:
1. Tries the next style in the fallback chain (animated → microsoft-teams → apple → google)
2. If all fail, renders the text emoji as a `<span>`

To disable fallback:
```tsx
<Emoji emoji="🚀" fallback={false} /> {/* Hidden if image fails */}
```

## Available Emojis

Currently mapped: **53 emojis** across hand gestures, faces, objects, symbols, and more.

To generate the full emoji database:
```bash
cd scripts && npx tsx generate-emoji-data.ts --all
```

## License

MIT
