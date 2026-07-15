"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getEmojiTokenDefinition,
  resolveEmojiToken,
  type EmojiAssetProvider,
  type EmojiTheme,
  type EmojiThemeProviderRef,
  type ResolvedEmojiToken,
} from "emoji-styles";
import { useEmojiContext } from "./EmojiProvider";

export interface UseEmojiTokenOptions {
  theme?: EmojiTheme;
  provider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  locale?: string;
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
}

export interface UseEmojiTokenResult {
  definition: ReturnType<typeof getEmojiTokenDefinition>;
  result: ResolvedEmojiToken | null;
  loading: boolean;
  error: Error | null;
}

export function useEmojiToken(
  token: string,
  options: UseEmojiTokenOptions = {},
): UseEmojiTokenResult {
  const context = useEmojiContext();
  const theme = options.theme ?? context.theme;
  const locale = options.locale ?? context.locale;
  const provider = options.provider;
  const fallbacks = options.fallbacks;
  const providers = options.providers ?? context.providers;
  const definition = useMemo(
    () => theme ? getEmojiTokenDefinition(theme, token) : null,
    [theme, token],
  );
  const [state, setState] = useState<Omit<UseEmojiTokenResult, "definition">>({
    result: null,
    loading: Boolean(theme && definition),
    error: null,
  });

  useEffect(() => {
    let active = true;
    if (!theme || !definition) {
      setState({
        result: null,
        loading: false,
        error: new Error(!theme ? "EmojiToken requires an EmojiTheme" : `Unknown emoji token: ${token}`),
      });
      return () => { active = false; };
    }
    setState({ result: null, loading: true, error: null });
    resolveEmojiToken(token, theme, { provider, fallbacks, locale, providers })
      .then((result) => {
        if (active) setState({ result, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({
          result: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    return () => { active = false; };
  }, [theme, definition, token, provider, fallbacks, locale, providers]);

  return { definition, ...state };
}
