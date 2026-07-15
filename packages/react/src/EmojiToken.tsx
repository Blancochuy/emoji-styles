"use client";
import { useMemo } from "react";
import {
  createMappedProvider,
  publicProviders,
  type EmojiAssetProvider,
  type EmojiProviderRef,
  type EmojiSize,
  type EmojiTheme,
  type EmojiThemeProviderRef,
} from "emoji-styles";
import { Emoji } from "./Emoji";
import { useEmojiContext } from "./EmojiProvider";
import { useEmojiToken } from "./useEmojiToken";

export interface EmojiTokenProps {
  token: string;
  theme?: EmojiTheme;
  provider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
  locale?: string;
  label?: string;
  decorative?: boolean;
  size?: EmojiSize;
  className?: string;
  lazy?: boolean;
  fallback?: boolean;
}

function providerForEmoji(
  provider: EmojiThemeProviderRef | undefined,
  registry: Readonly<Record<string, EmojiAssetProvider>> | undefined,
) : EmojiProviderRef | undefined {
  if (!provider || typeof provider !== "string") return provider as EmojiProviderRef | undefined;
  return registry?.[provider] ?? provider as EmojiProviderRef;
}

/** Render a design-system token through its theme without coupling UI copy to artwork. */
export function EmojiToken({
  token,
  theme,
  provider,
  fallbacks,
  providers,
  locale,
  label,
  decorative,
  size = "md",
  className = "",
  lazy = true,
  fallback = true,
}: EmojiTokenProps) {
  const context = useEmojiContext();
  const effectiveTheme = theme ?? context.theme;
  const registry = providers ?? context.providers;
  const { definition, result, error } = useEmojiToken(token, {
    theme: effectiveTheme,
    provider,
    fallbacks,
    providers: registry,
    locale,
  });
  const resolvedLabel = label ?? result?.label ?? definition?.label ?? token;
  const isDecorative = decorative ?? result?.decorative ?? definition?.decorative ?? false;
  const emoji = result?.emoji ?? definition?.emoji;
  const fallbackProvider = providerForEmoji(
    provider ?? definition?.provider ?? effectiveTheme?.defaultProvider ?? context.defaultProvider,
    registry,
  );
  const assetProvider = useMemo(() => {
    if (!result?.asset || !emoji) return null;
    return createMappedProvider({
      id: `token-${token.replace(/\./g, "-")}`,
      label: resolvedLabel,
      version: result.themeVersion,
      assets: { [emoji]: result.asset.url },
      format: result.asset.format,
      local: result.asset.local,
      license: result.asset.license,
      fallback: typeof fallbackProvider === "object" ? fallbackProvider : undefined,
    });
  }, [result, emoji, token, resolvedLabel, fallbackProvider]);

  if (!emoji) {
    return (
      <span className={className} data-emoji-token={token} data-emoji-error={error?.message}>
        {token}
      </span>
    );
  }

  const renderProvider = result?.source === "native"
    ? publicProviders.native
    : assetProvider ?? fallbackProvider ?? publicProviders.native;

  return (
    <span
      className={className}
      data-emoji-token={token}
      data-emoji-theme={effectiveTheme?.id}
      data-emoji-source={result?.source ?? "pending"}
      aria-hidden={isDecorative || undefined}
    >
      <Emoji
        emoji={emoji}
        provider={renderProvider}
        size={size}
        alt={isDecorative ? "" : resolvedLabel}
        lazy={lazy}
        fallback={fallback}
      />
    </span>
  );
}
