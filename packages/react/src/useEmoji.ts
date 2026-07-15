"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getEmojiUrl,
  hasEmoji,
  publicProviders,
  resolveEmoji,
  type EmojiProviderRef,
  type EmojiResolution,
} from "emoji-styles";

const DEFAULT_HOOK_FALLBACKS = [publicProviders.native] as const;

export interface UseEmojiResult {
  url: string | null;
  exists: boolean;
  resolution: EmojiResolution | null;
  loading: boolean;
  error: Error | null;
}

export function useEmoji(
  emoji: string,
  provider: EmojiProviderRef = publicProviders.twemoji,
  fallbacks: readonly EmojiProviderRef[] = DEFAULT_HOOK_FALLBACKS,
): UseEmojiResult {
  const fallbackKey = fallbacks.map((fallback) =>
    typeof fallback === "string" ? fallback : fallback.id
  ).join(",");
  const initial = useMemo(
    () => ({ url: getEmojiUrl(emoji, provider), exists: hasEmoji(emoji) }),
    [emoji, provider],
  );
  const [state, setState] = useState<Pick<UseEmojiResult, "resolution" | "loading" | "error">>({
    resolution: null,
    loading: initial.exists,
    error: null,
  });

  useEffect(() => {
    let active = true;
    if (!initial.exists) {
      setState({ resolution: null, loading: false, error: null });
      return () => { active = false; };
    }
    setState({ resolution: null, loading: true, error: null });
    resolveEmoji(emoji, { provider, fallbacks })
      .then((resolution) => {
        if (active) setState({ resolution, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({
          resolution: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    return () => { active = false; };
  }, [emoji, provider, fallbackKey, initial.exists]);

  return {
    url: state.resolution?.selected?.url ?? initial.url,
    exists: initial.exists,
    ...state,
  };
}
