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
