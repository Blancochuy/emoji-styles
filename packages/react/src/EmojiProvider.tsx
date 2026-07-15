"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  publicProviders,
  type EmojiAssetProvider,
  type EmojiProviderRef,
  type EmojiStyle,
  type EmojiTheme,
} from "emoji-styles";

export interface EmojiContextValue {
  defaultProvider: EmojiProviderRef;
  theme?: EmojiTheme;
  locale?: string;
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
}
const EmojiContext = createContext<EmojiContextValue>({ defaultProvider: publicProviders.twemoji });
export function useEmojiContext() { return useContext(EmojiContext); }

export interface EmojiProviderProps {
  provider?: EmojiProviderRef;
  theme?: EmojiTheme;
  locale?: string;
  /** Registry used by serialized themes that reference custom providers by id. */
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
  /** @deprecated Prefer provider for new integrations. */
  defaultStyle?: EmojiStyle;
  children: ReactNode;
}
export function EmojiProvider({ provider, theme, locale, providers, defaultStyle, children }: EmojiProviderProps) {
  const themeProvider = typeof theme?.defaultProvider === "string"
    ? providers?.[theme.defaultProvider] ?? theme.defaultProvider as EmojiProviderRef
    : theme?.defaultProvider;
  const value = useMemo<EmojiContextValue>(() => ({
    defaultProvider: provider ?? defaultStyle ?? themeProvider ?? publicProviders.twemoji,
    theme,
    locale,
    providers,
  }), [provider, theme, locale, providers, defaultStyle, themeProvider]);
  return <EmojiContext.Provider value={value}>{children}</EmojiContext.Provider>;
}
