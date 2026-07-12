# Emoji Styles — Multi-Style Emoji Library

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build an npm-published, multi-style emoji component library that renders emojis as images from CDN, supporting Apple, Google, Samsung, Microsoft Teams 3D, and Animated Noto styles.

**Architecture:** Monorepo with framework-agnostic core (`emoji-styles`) and React wrapper (`react-emoji-styles`). Uses `em-content.zobj.net` CDN for image assets. TypeScript, ESM, tree-shakable.

**Tech Stack:** TypeScript, tsup (bundler), React 18+, Vitest (testing), pnpm workspaces

---

## Verified CDN Providers

| Provider | Base URL | Ext | Notes |
|----------|----------|-----|-------|
| `microsoft-teams` | `em-content.zobj.net/source/microsoft-teams/400/` | .png | 3D, our current style |
| `apple` | `em-content.zobj.net/source/apple/453/` | .png | Native Apple look |
| `google` | `em-content.zobj.net/source/google/350/` | .png | Google Noto style |
| `samsung` | `em-content.zobj.net/source/samsung/320/` | .png | Samsung One UI |
| `animated` | `em-content.zobj.net/source/animated-noto-color-emoji/461/` | .gif | Animated Noto |
| `twemoji` | `cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/` | .png | Twitter/X style |

All verified working (HTTP 200) on 2026-07-09.

---

## Project Structure

```
/root/emoji-styles/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── packages/
│   ├── core/                       # emoji-styles (framework-agnostic)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts           # Public API barrel
│   │   │   ├── types.ts           # EmojiStyle, EmojiSize, EmojiData
│   │   │   ├── providers.ts       # CDN provider definitions
│   │   │   ├── data.ts            # Emoji char → filename mapping
│   │   │   ├── url.ts             # URL builder + fallback chain
│   │   │   └── fallback.ts        # onError fallback logic
│   │   └── tests/
│   │       └── url.test.ts
│   └── react/                      # react-emoji-styles
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── Emoji.tsx           # Main <Emoji /> component
│       │   ├── EmojiProvider.tsx   # Context provider for global defaults
│       │   └── useEmoji.ts         # Hook for programmatic usage
│       └── tests/
│           └── Emoji.test.tsx
└── demo/                           # Vite React demo app
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                 # Style switcher + emoji grid
    │   └── App.css
    └── vite.config.ts
```

---

## Task 1: Project Scaffolding

**Objective:** Create monorepo structure with pnpm workspaces, TypeScript configs, and package.json files.

**Files:**
- Create: `/root/emoji-styles/package.json`
- Create: `/root/emoji-styles/pnpm-workspace.yaml`
- Create: `/root/emoji-styles/tsconfig.base.json`
- Create: `/root/emoji-styles/packages/core/package.json`
- Create: `/root/emoji-styles/packages/core/tsconfig.json`
- Create: `/root/emoji-styles/packages/react/package.json`
- Create: `/root/emoji-styles/packages/react/tsconfig.json`

**Steps:**

1. Create root `package.json`:
```json
{
  "name": "emoji-styles-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm --filter demo dev"
  }
}
```

2. Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "demo"
```

3. Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

4. Create `packages/core/package.json`:
```json
{
  "name": "emoji-styles",
  "version": "0.1.0",
  "description": "Multi-style emoji images from CDN — Apple, Google, Samsung, Microsoft Teams, Animated",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "keywords": ["emoji", "icons", "microsoft-teams", "apple", "google", "animated"],
  "license": "MIT"
}
```

5. Create `packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

6. Create `packages/react/package.json`:
```json
{
  "name": "react-emoji-styles",
  "version": "0.1.0",
  "description": "React component for multi-style emoji images",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean --external react",
    "test": "vitest run",
    "dev": "tsup src/index.ts --format esm --dts --watch --external react"
  },
  "dependencies": {
    "emoji-styles": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "keywords": ["react", "emoji", "component", "icons"],
  "license": "MIT"
}
```

7. Create `packages/react/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

8. Create placeholder `src/index.ts` files in both packages.

9. Run `pnpm install` to set up workspaces.

**Verification:**
- `pnpm install` succeeds
- `ls packages/core/src/index.ts` exists
- `ls packages/react/src/index.ts` exists

---

## Task 2: Core Types & Provider Definitions

**Objective:** Define TypeScript types and CDN provider configurations.

**Files:**
- Create: `/root/emoji-styles/packages/core/src/types.ts`
- Create: `/root/emoji-styles/packages/core/src/providers.ts`

**types.ts content:**
```typescript
export type EmojiStyle =
  | "microsoft-teams"
  | "apple"
  | "google"
  | "samsung"
  | "animated"
  | "twemoji";

export type EmojiSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | number;

export interface EmojiData {
  /** CDN filename (without extension) e.g. "rocket_1f680" */
  name: string;
  /** Human-readable alt text */
  alt: string;
  /** Unicode codepoint(s) for Twemoji path e.g. "1f680" */
  codepoint: string;
  /** Styles that DON'T have this emoji (blacklist) */
  unsupported?: EmojiStyle[];
}

export interface ProviderConfig {
  name: EmojiStyle;
  baseUrl: string;
  extension: string;
  label: string;
}

export interface EmojiProps {
  /** Emoji character e.g. "🚀" */
  emoji: string;
  /** Visual style (default: "microsoft-teams") */
  style?: EmojiStyle;
  /** Size preset or pixel number (default: "md") */
  size?: EmojiSize;
  /** Custom className */
  className?: string;
  /** Alt text override */
  alt?: string;
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** Show fallback text emoji on error (default: true) */
  fallback?: boolean;
  /** Extra img attributes */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}
```

**providers.ts content:**
```typescript
import type { ProviderConfig, EmojiStyle } from "./types";

export const providers: Record<EmojiStyle, ProviderConfig> = {
  "microsoft-teams": {
    name: "microsoft-teams",
    baseUrl: "https://em-content.zobj.net/source/microsoft-teams/400",
    extension: "png",
    label: "Microsoft Teams 3D",
  },
  apple: {
    name: "apple",
    baseUrl: "https://em-content.zobj.net/source/apple/453",
    extension: "png",
    label: "Apple",
  },
  google: {
    name: "google",
    baseUrl: "https://em-content.zobj.net/source/google/350",
    extension: "png",
    label: "Google",
  },
  samsung: {
    name: "samsung",
    baseUrl: "https://em-content.zobj.net/source/samsung/320",
    extension: "png",
    label: "Samsung",
  },
  animated: {
    name: "animated",
    baseUrl: "https://em-content.zobj.net/source/animated-noto-color-emoji/461",
    extension: "gif",
    label: "Animated",
  },
  twemoji: {
    name: "twemoji",
    baseUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72",
    extension: "png",
    label: "Twitter/X",
  },
};

export const SIZE_MAP: Record<string, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-10 h-10",
  "3xl": "w-12 h-12",
};
```

**Verification:**
- TypeScript compiles without errors

---

## Task 3: Emoji Data Mapping

**Objective:** Create the emoji character to CDN filename mapping. Start with ~50 common emojis, expandable.

**Files:**
- Create: `/root/emoji-styles/packages/core/src/data.ts`

**data.ts content:**
```typescript
import type { EmojiData } from "./types";

/**
 * Emoji character → CDN metadata mapping.
 * To add emojis: find the name on emojipedia.org, use the Unicode codepoint as filename.
 * Format: "name_version" e.g. "rocket_1f680"
 */
export const emojiData: Record<string, EmojiData> = {
  // Hand gestures
  "👋": { name: "waving-hand_1f44b", alt: "Waving hand", codepoint: "1f44b" },
  "👍": { name: "thumbs-up_1f44d", alt: "Thumbs up", codepoint: "1f44d" },
  "👎": { name: "thumbs-down_1f44e", alt: "Thumbs down", codepoint: "1f44e" },
  "👏": { name: "clapping-hands_1f44f", alt: "Clapping", codepoint: "1f44f" },
  "🙌": { name: "raising-hands_1f64c", alt: "Raising hands", codepoint: "1f64c" },
  "🤝": { name: "handshake_1f91d", alt: "Handshake", codepoint: "1f91d" },
  "✌️": { name: "victory-hand_270c", alt: "Victory", codepoint: "270c" },
  "🤞": { name: "crossed-fingers_1f91e", alt: "Crossed fingers", codepoint: "1f91e" },

  // Faces
  "😀": { name: "grinning-face_1f600", alt: "Grinning", codepoint: "1f600" },
  "😂": { name: "face-with-tears-of-joy_1f602", alt: "Tears of joy", codepoint: "1f602" },
  "😍": { name: "smiling-face-with-heart-eyes_1f60d", alt: "Heart eyes", codepoint: "1f60d" },
  "🤔": { name: "thinking-face_1f914", alt: "Thinking", codepoint: "1f914" },
  "😎": { name: "smiling-face-with-sunglasses_1f60e", alt: "Cool", codepoint: "1f60e" },
  "🥳": { name: "partying-face_1f973", alt: "Partying", codepoint: "1f973" },
  "😢": { name: "crying-face_1f622", alt: "Crying", codepoint: "1f622" },
  "😡": { name: "angry-face_1f621", alt: "Angry", codepoint: "1f621" },

  // Objects
  "🚀": { name: "rocket_1f680", alt: "Rocket", codepoint: "1f680" },
  "💡": { name: "light-bulb_1f4a1", alt: "Light bulb", codepoint: "1f4a1" },
  "🔥": { name: "fire_1f525", alt: "Fire", codepoint: "1f525" },
  "⭐": { name: "star_2b50", alt: "Star", codepoint: "2b50" },
  "🏆": { name: "trophy_1f3c6", alt: "Trophy", codepoint: "1f3c6" },
  "🎯": { name: "direct-hit_1f3af", alt: "Target", codepoint: "1f3af" },
  "💰": { name: "money-bag_1f4b0", alt: "Money bag", codepoint: "1f4b0" },
  "📊": { name: "bar-chart_1f4ca", alt: "Bar chart", codepoint: "1f4ca" },
  "📋": { name: "clipboard_1f4cb", alt: "Clipboard", codepoint: "1f4cb" },
  "🎤": { name: "microphone_1f3a4", alt: "Microphone", codepoint: "1f3a4" },
  "✏️": { name: "pencil_270f", alt: "Pencil", codepoint: "270f" },
  "📅": { name: "calendar_1f4c5", alt: "Calendar", codepoint: "1f4c5" },
  "🔍": { name: "magnifying-glass_1f50d", alt: "Search", codepoint: "1f50d" },
  "✅": { name: "check-mark-button_2705", alt: "Check", codepoint: "2705" },
  "🎉": { name: "party-popper_1f389", alt: "Party", codepoint: "1f389" },
  "⚡": { name: "high-voltage_26a1", alt: "Lightning", codepoint: "26a1" },
  "✨": { name: "sparkles_2728", alt: "Sparkles", codepoint: "2728" },
  "❤️": { name: "red-heart_2764", alt: "Heart", codepoint: "2764" },
  "📣": { name: "megaphone_1f4e3", alt: "Megaphone", codepoint: "1f4e3" },
  "🔒": { name: "locked_1f512", alt: "Locked", codepoint: "1f512" },
  "🪙": { name: "coin_1fa99", alt: "Coin", codepoint: "1fa99" },
  "👀": { name: "eyes_1f440", alt: "Eyes", codepoint: "1f440" },
  "🧊": { name: "ice_1f9ca", alt: "Ice cube", codepoint: "1f9ca" },
  "🧮": { name: "abacus_1f9ee", alt: "Abacus", codepoint: "1f9ee" },
  "💳": { name: "credit-card_1f4b3", alt: "Credit card", codepoint: "1f4b3" },
  "🛒": { name: "shopping-cart_1f6d2", alt: "Cart", codepoint: "1f6d2" },
  "🎁": { name: "wrapped-gift_1f381", alt: "Gift", codepoint: "1f381" },
  "💧": { name: "droplet_1f4a7", alt: "Droplet", codepoint: "1f4a7" },
  "🐾": { name: "paw-prints_1f43e", alt: "Paw prints", codepoint: "1f43e" },
  "🗑️": { name: "wastebasket_1f5d1", alt: "Wastebasket", codepoint: "1f5d1" },
  "🎨": { name: "artist-palette_1f3a8", alt: "Palette", codepoint: "1f3a8" },
  "🔨": { name: "hammer_1f528", alt: "Hammer", codepoint: "1f528" },
  "⏰": { name: "alarm-clock_23f0", alt: "Alarm clock", codepoint: "23f0" },
  "💻": { name: "laptop_1f4bb", alt: "Laptop", codepoint: "1f4bb" },
  "🎓": { name: "graduation-cap_1f393", alt: "Graduation", codepoint: "1f393" },
  "🏫": { name: "school_1f3eb", alt: "School", codepoint: "1f3eb" },
  "🔎": { name: "magnifying-glass-right_1f50e", alt: "Search right", codepoint: "1f50e" },
  "🕵️": { name: "detective_1f575", alt: "Detective", codepoint: "1f575" },
  "🌟": { name: "glowing-star_1f31f", alt: "Glowing star", codepoint: "1f31f" },
  "🎟️": { name: "admission-tickets_1f39f", alt: "Tickets", codepoint: "1f39f" },
  "☑️": { name: "check-box-with-check_2611", alt: "Checkbox", codepoint: "2611" },
};
```

**Verification:**
- TypeScript compiles
- At least 50 emojis mapped

---

## Task 4: URL Builder & Fallback Chain

**Objective:** Build the URL construction logic with automatic fallback.

**Files:**
- Create: `/root/emoji-styles/packages/core/src/url.ts`
- Create: `/root/emoji-styles/packages/core/src/fallback.ts`
- Create: `/root/emoji-styles/packages/core/tests/url.test.ts`

**url.ts content:**
```typescript
import type { EmojiStyle } from "./types";
import { providers } from "./providers";
import { emojiData } from "./data";

/**
 * Get the image URL for an emoji character in a given style.
 * Returns null if the emoji is not mapped.
 */
export function getEmojiUrl(emoji: string, style: EmojiStyle): string | null {
  const data = emojiData[emoji];
  if (!data) return null;
  if (data.unsupported?.includes(style)) return null;

  const provider = providers[style];
  if (!provider) return null;

  // Twemoji uses codepoint-based paths: /72x72/1f680.png
  if (style === "twemoji") {
    return `${provider.baseUrl}/${data.codepoint}.${provider.extension}`;
  }

  // All others use name-based paths: /400/rocket_1f680.png
  return `${provider.baseUrl}/${data.name}.${provider.extension}`;
}

/**
 * Get the fallback chain for an emoji.
 * Returns URLs in priority order: requested style → static alternatives → null.
 */
export function getFallbackChain(emoji: string, style: EmojiStyle): string[] {
  const primary = getEmojiUrl(emoji, style);
  if (!primary) return [];

  const chain: string[] = [primary];

  // If requested style is animated, add static fallbacks
  if (style === "animated") {
    const staticFallbacks: EmojiStyle[] = ["microsoft-teams", "apple", "google"];
    for (const fallback of staticFallbacks) {
      const url = getEmojiUrl(emoji, fallback);
      if (url && url !== primary) chain.push(url);
    }
  }

  // If requested style failed (unsupported), try alternatives
  const data = emojiData[emoji];
  if (data?.unsupported?.includes(style)) {
    const alternatives: EmojiStyle[] = ["microsoft-teams", "apple", "google", "twemoji"];
    for (const alt of alternatives) {
      if (alt === style) continue;
      const url = getEmojiUrl(emoji, alt);
      if (url && !chain.includes(url)) chain.push(url);
    }
  }

  return chain;
}

/**
 * Check if an emoji exists in our data mapping.
 */
export function hasEmoji(emoji: string): boolean {
  return emoji in emojiData;
}

/**
 * Get all available emoji characters.
 */
export function getAvailableEmojis(): string[] {
  return Object.keys(emojiData);
}

/**
 * Get emoji metadata.
 */
export function getEmojiData(emoji: string) {
  return emojiData[emoji] ?? null;
}
```

**fallback.ts content:**
```typescript
import type { EmojiStyle } from "./types";
import { getFallbackChain } from "./url";

/**
 * Create an onError handler for <img> that tries fallback URLs.
 * Returns the handler function and a cleanup function.
 */
export function createFallbackHandler(
  emoji: string,
  style: EmojiStyle,
  onFallback?: (url: string) => void,
  onError?: () => void
) {
  const chain = getFallbackChain(emoji, style);
  let currentIndex = 0;

  return {
    handleError: (event: React.SyntheticEvent<HTMLImageElement>) => {
      currentIndex++;
      if (currentIndex < chain.length) {
        const nextUrl = chain[currentIndex];
        event.currentTarget.src = nextUrl;
        onFallback?.(nextUrl);
      } else {
        // All fallbacks exhausted — hide or show text emoji
        event.currentTarget.style.display = "none";
        onError?.();
      }
    },
    getAttemptCount: () => currentIndex,
  };
}
```

**tests/url.test.ts:**
```typescript
import { describe, it, expect } from "vitest";
import { getEmojiUrl, getFallbackChain, hasEmoji } from "../src/url";

describe("getEmojiUrl", () => {
  it("returns Microsoft Teams URL for 🚀", () => {
    const url = getEmojiUrl("🚀", "microsoft-teams");
    expect(url).toBe("https://em-content.zobj.net/source/microsoft-teams/400/rocket_1f680.png");
  });

  it("returns Apple URL for 🚀", () => {
    const url = getEmojiUrl("🚀", "apple");
    expect(url).toBe("https://em-content.zobj.net/source/apple/453/rocket_1f680.png");
  });

  it("returns animated URL for 🔥", () => {
    const url = getEmojiUrl("🔥", "animated");
    expect(url).toContain("animated-noto-color-emoji");
    expect(url).toContain(".gif");
  });

  it("returns null for unknown emoji", () => {
    expect(getEmojiUrl("🦄", "apple")).toBeNull();
  });
});

describe("hasEmoji", () => {
  it("returns true for mapped emoji", () => {
    expect(hasEmoji("🚀")).toBe(true);
  });

  it("returns false for unmapped emoji", () => {
    expect(hasEmoji("🦄")).toBe(false);
  });
});

describe("getFallbackChain", () => {
  it("returns primary URL for supported emoji", () => {
    const chain = getFallbackChain("🚀", "microsoft-teams");
    expect(chain[0]).toContain("microsoft-teams");
  });
});
```

**Verification:**
- `pnpm --filter emoji-styles test` passes
- URL construction matches verified CDN patterns

---

## Task 5: Core Package Barrel Export

**Objective:** Wire up the core package exports.

**Files:**
- Modify: `/root/emoji-styles/packages/core/src/index.ts`

**index.ts content:**
```typescript
export type { EmojiStyle, EmojiSize, EmojiData, EmojiProps, ProviderConfig } from "./types";
export { providers, SIZE_MAP } from "./providers";
export { emojiData } from "./data";
export { getEmojiUrl, getFallbackChain, hasEmoji, getAvailableEmojis, getEmojiData } from "./url";
export { createFallbackHandler } from "./fallback";
```

**Verification:**
- `pnpm --filter emoji-styles build` succeeds
- dist/index.d.ts exports all types and functions

---

## Task 6: React Emoji Component

**Objective:** Build the `<Emoji />` React component with style switching, sizes, lazy loading, and fallback.

**Files:**
- Create: `/root/emoji-styles/packages/react/src/Emoji.tsx`
- Create: `/root/emoji-styles/packages/react/src/EmojiProvider.tsx`
- Create: `/root/emoji-styles/packages/react/src/useEmoji.ts`
- Modify: `/root/emoji-styles/packages/react/src/index.ts`

**Emoji.tsx content:**
```tsx
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  getEmojiUrl,
  getFallbackChain,
  hasEmoji,
  SIZE_MAP,
  type EmojiStyle,
  type EmojiSize,
} from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

export interface EmojiComponentProps {
  emoji: string;
  style?: EmojiStyle;
  size?: EmojiSize;
  className?: string;
  alt?: string;
  lazy?: boolean;
  fallback?: boolean;
}

export function Emoji({
  emoji,
  style: styleProp,
  size = "md",
  className = "",
  alt,
  lazy = true,
  fallback = true,
}: EmojiComponentProps) {
  const ctx = useEmojiContext();
  const style = styleProp ?? ctx.defaultStyle;
  const [failed, setFailed] = useState(false);
  const fallbackIndex = useRef(0);

  const url = useMemo(() => getEmojiUrl(emoji, style), [emoji, style]);
  const fallbackChain = useMemo(() => getFallbackChain(emoji, style), [emoji, style]);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      fallbackIndex.current++;
      if (fallbackIndex.current < fallbackChain.length) {
        e.currentTarget.src = fallbackChain[fallbackIndex.current];
      } else if (fallback) {
        setFailed(true);
      } else {
        e.currentTarget.style.display = "none";
      }
    },
    [fallbackChain, fallback]
  );

  // Unknown emoji — render text fallback
  if (!hasEmoji(emoji) || !url) {
    return <span className={className}>{emoji}</span>;
  }

  // All fallbacks exhausted — show text emoji
  if (failed) {
    return <span className={className}>{emoji}</span>;
  }

  // Size class or custom pixel size
  const sizeClass = typeof size === "number" ? "" : SIZE_MAP[size] ?? "";
  const sizeStyle = typeof size === "number" ? { width: size, height: size } : undefined;

  return (
    <img
      src={url}
      alt={alt ?? `Emoji: ${emoji}`}
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      className={`inline-block object-contain ${sizeClass} ${className}`}
      style={sizeStyle}
      loading={lazy ? "lazy" : "eager"}
      draggable={false}
      onError={handleError}
    />
  );
}
```

**EmojiProvider.tsx content:**
```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { EmojiStyle } from "emoji-styles";

interface EmojiContextValue {
  defaultStyle: EmojiStyle;
}

const EmojiContext = createContext<EmojiContextValue>({
  defaultStyle: "microsoft-teams",
});

export function useEmojiContext() {
  return useContext(EmojiContext);
}

export interface EmojiProviderProps {
  defaultStyle?: EmojiStyle;
  children: ReactNode;
}

export function EmojiProvider({
  defaultStyle = "microsoft-teams",
  children,
}: EmojiProviderProps) {
  return (
    <EmojiContext.Provider value={{ defaultStyle }}>
      {children}
    </EmojiContext.Provider>
  );
}
```

**useEmoji.ts content:**
```typescript
import { useMemo } from "react";
import { getEmojiUrl, hasEmoji, type EmojiStyle } from "emoji-styles";

/**
 * Hook for programmatic emoji URL access.
 * Useful for custom rendering, OG images, etc.
 */
export function useEmoji(emoji: string, style: EmojiStyle = "microsoft-teams") {
  return useMemo(() => ({
    url: getEmojiUrl(emoji, style),
    exists: hasEmoji(emoji),
  }), [emoji, style]);
}
```

**index.ts content:**
```typescript
export { Emoji, type EmojiComponentProps } from "./Emoji";
export { EmojiProvider, type EmojiProviderProps, useEmojiContext } from "./EmojiProvider";
export { useEmoji } from "./useEmoji";

// Re-export core types for convenience
export type { EmojiStyle, EmojiSize, EmojiData } from "emoji-styles";
export { providers, getAvailableEmojis, hasEmoji } from "emoji-styles";
```

**Verification:**
- `pnpm --filter react-emoji-styles build` succeeds
- TypeScript compiles with React 18 types

---

## Task 7: Demo App

**Objective:** Build a Vite React demo that shows all styles and emojis with a live style switcher.

**Files:**
- Create: `/root/emoji-styles/demo/package.json`
- Create: `/root/emoji-styles/demo/index.html`
- Create: `/root/emoji-styles/demo/vite.config.ts`
- Create: `/root/emoji-styles/demo/src/main.tsx`
- Create: `/root/emoji-styles/demo/src/App.tsx`
- Create: `/root/emoji-styles/demo/src/App.css`

**Key features of App.tsx:**
- Style selector dropdown (all 6 providers)
- Size selector (xs through 3xl)
- Grid of all emojis rendered with current style
- Side-by-side comparison mode
- Dark/light theme toggle

**Verification:**
- `pnpm --filter demo dev` starts without errors
- Browser shows emoji grid with working style switcher

---

## Task 8: README & Publishing Prep

**Objective:** Write README with usage examples, add LICENSE, prep for npm publish.

**Files:**
- Create: `/root/emoji-styles/README.md`
- Create: `/root/emoji-styles/LICENSE`
- Create: `/root/emoji-styles/.npmrc`
- Create: `/root/emoji-styles/.gitignore`

**README sections:**
1. Hero banner with emoji grid
2. Installation (`npm install react-emoji-styles`)
3. Quick start (3 lines of code)
4. Props table
5. Style comparison table with images
6. Custom sizes
7. Provider context
8. Vanilla JS usage (core package only)
9. Available emojis list
10. Contributing

**Verification:**
- `pnpm build` succeeds at root
- README renders correctly on GitHub

---

## Risks & Tradeoffs

1. **CDN dependency** — Images load from em-content.zobj.net. If CDN goes down, emojis break. Mitigation: fallback chain + text emoji fallback.
2. **Bundle size** — emojiData mapping adds ~10KB to bundle. Acceptable for a component library.
3. **Rate limiting** — CDN may rate-limit high traffic. Mitigation: lazy loading reduces requests.
4. **Emoji coverage** — Only ~50 emojis initially. Users can request additions.

## Open Questions

1. Should we publish under a scope like `@emoji-styles/react` or bare `react-emoji-styles`?
2. Should we self-host emoji assets as a fallback CDN option?
3. Do we want a CLI tool to scan codebases and report which emojis are used?
