"use client";
import { useEmojiContext } from "./EmojiProvider";

export function useEmojiTheme() {
  const context = useEmojiContext();
  return {
    theme: context.theme,
    locale: context.locale,
    providers: context.providers,
  };
}
