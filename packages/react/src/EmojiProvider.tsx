"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { EmojiStyle } from "emoji-styles";

interface EmojiContextValue { defaultStyle: EmojiStyle; }
const EmojiContext = createContext<EmojiContextValue>({ defaultStyle: "microsoft-teams" });
export function useEmojiContext() { return useContext(EmojiContext); }

export interface EmojiProviderProps { defaultStyle?: EmojiStyle; children: ReactNode; }
export function EmojiProvider({ defaultStyle = "microsoft-teams", children }: EmojiProviderProps) {
  return <EmojiContext.Provider value={{ defaultStyle }}>{children}</EmojiContext.Provider>;
}
