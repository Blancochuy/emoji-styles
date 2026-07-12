"use client";
import { createContext, useContext, type ReactNode } from "react";
import { publicProviders, type EmojiAssetProvider, type EmojiStyle } from "emoji-styles";

interface EmojiContextValue { defaultProvider: EmojiAssetProvider | EmojiStyle; }
const EmojiContext = createContext<EmojiContextValue>({ defaultProvider: publicProviders.twemoji });
export function useEmojiContext() { return useContext(EmojiContext); }

export interface EmojiProviderProps {
  provider?: EmojiAssetProvider;
  /** @deprecated Prefer provider for new integrations. */
  defaultStyle?: EmojiStyle;
  children: ReactNode;
}
export function EmojiProvider({ provider, defaultStyle, children }: EmojiProviderProps) {
  return <EmojiContext.Provider value={{ defaultProvider: provider ?? defaultStyle ?? publicProviders.twemoji }}>{children}</EmojiContext.Provider>;
}
