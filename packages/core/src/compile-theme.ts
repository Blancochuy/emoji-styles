import { emojiDatasetInfo } from "emoji-styles-data";
import { COMPILED_EMOJI_THEME_SCHEMA_VERSION, type CompiledEmojiProvider, type CompiledEmojiSource, type CompiledEmojiTheme, type CompiledEmojiTokenEntry } from "./compiled";
import { publicProviders } from "./providers";
import { resolveEmoji } from "./resolution";
import { resolveEmojiToken, resolveThemeProvider, validateEmojiTheme, type EmojiTheme, type EmojiThemeProviderRef } from "./semantic-theme";
import { resolveProvider } from "./url";
import type { EmojiAssetProvider, ResolvedEmojiAsset } from "./types";

export interface CompileEmojiThemeOptions {
  /** Override every token's primary provider, as in `resolveEmojiToken`. */
  provider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  nativeFallback?: boolean;
  /** Registry for provider ids that are not built in. */
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
}

export interface RenderCompiledEmojiThemeOptions {
  /** Exported constant name. Defaults to `compiledEmojiTheme`. */
  exportName?: string;
  /** Exported string-literal union of token names. Defaults to `EmojiTokenName`. */
  typeName?: string;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Resolve every token of a theme to explicit, ordered artwork URLs with the existing resolver.
 * Runs in Node (or any environment that may load the catalog); computes URLs and never fetches.
 */
export async function compileEmojiTheme(theme: EmojiTheme, options: CompileEmojiThemeOptions = {}): Promise<CompiledEmojiTheme> {
  const validation = validateEmojiTheme(theme);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  const nativeFallback = options.nativeFallback ?? theme.nativeFallback ?? true;
  const fallbacks = options.fallbacks ?? theme.fallbacks ?? [];
  const providerById = new Map<string, EmojiAssetProvider>();
  const assetById = new Map<string, ResolvedEmojiAsset>();
  const tokens: Record<string, CompiledEmojiTokenEntry> = {};

  for (const token of Object.keys(theme.tokens).sort()) {
    const definition = theme.tokens[token];
    const primary = options.provider ?? definition.provider ?? theme.defaultProvider ?? publicProviders.twemoji;
    const sources: CompiledEmojiSource[] = [];
    let native = false;
    const add = (asset: ResolvedEmojiAsset) => {
      if (sources.some((source) => source.url === asset.url)) return;
      sources.push({ provider: asset.providerId, url: asset.url, format: asset.format });
      if (!assetById.has(asset.providerId)) assetById.set(asset.providerId, asset);
    };

    // Exact assets and semantic-provider ids lead the chain, as in resolveEmojiToken.
    const head = await resolveEmojiToken(token, theme, { provider: options.provider, fallbacks: [], nativeFallback: false, providers: options.providers });
    if ((head.source === "custom-asset" || head.source === "semantic-provider") && head.asset) add(head.asset);

    for (const ref of [primary, ...fallbacks]) {
      const resolved = resolveThemeProvider(ref, options.providers);
      const provider = resolveProvider(resolved);
      if (!provider) throw new Error(`Unknown provider "${typeof ref === "string" ? ref : ref.id}" for token ${token}. Pass it in the providers option.`);
      if (provider.id === publicProviders.native.id) { native = true; break; }
      providerById.set(provider.id, provider);
      const resolution = await resolveEmoji(definition.emoji, { provider: resolved });
      if (resolution.selected) add(resolution.selected);
    }

    tokens[token] = {
      emoji: definition.emoji,
      label: definition.label,
      ...(definition.labels && Object.keys(definition.labels).length > 0 ? { labels: { ...definition.labels } } : {}),
      decorative: definition.decorative,
      sources,
      unicode: native || nativeFallback ? definition.emoji : null,
    };
  }

  const providers: CompiledEmojiProvider[] = [...assetById.values()].map((asset) => {
    const provider = providerById.get(asset.providerId);
    const license = asset.license ?? provider?.license;
    return {
      id: asset.providerId,
      version: asset.providerVersion,
      ...(provider?.label ? { label: provider.label } : {}),
      ...(provider?.source ? { source: provider.source } : {}),
      ...(license ? { license } : {}),
    };
  }).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  return {
    schemaVersion: COMPILED_EMOJI_THEME_SCHEMA_VERSION,
    meta: {
      theme: { id: theme.id, version: theme.version },
      nativeFallback,
      dataset: { emojiVersion: emojiDatasetInfo.emojiVersion, unicodeVersion: emojiDatasetInfo.unicodeVersion, cldrVersion: emojiDatasetInfo.cldrVersion, sourceSha256: emojiDatasetInfo.sourceSha256 },
      providers,
    },
    tokens,
  };
}

/** Deterministic TypeScript module: the compiled object plus a union of its token names. */
export function renderCompiledEmojiThemeModule(compiled: CompiledEmojiTheme, options: RenderCompiledEmojiThemeOptions = {}): string {
  const exportName = options.exportName ?? "compiledEmojiTheme";
  const typeName = options.typeName ?? "EmojiTokenName";
  if (!IDENTIFIER.test(exportName)) throw new Error(`Invalid export name: ${exportName}`);
  if (!IDENTIFIER.test(typeName)) throw new Error(`Invalid type name: ${typeName}`);
  if (exportName === typeName) throw new Error("The export name and type name must differ");
  const names = Object.keys(compiled.tokens);
  return [
    `// Generated by \`emoji-styles theme compile\` from theme "${compiled.meta.theme.id}" ${compiled.meta.theme.version}. Do not edit; regenerate it.`,
    "// Artwork URLs were computed at compile time; no network requests were made. See meta.providers for revisions and licenses.",
    'import type { CompiledEmojiTheme } from "emoji-styles/compiled";',
    "",
    `export type ${typeName} = ${names.length ? names.map((name) => JSON.stringify(name)).join(" | ") : "never"};`,
    "",
    `export const ${exportName}: CompiledEmojiTheme<${typeName}> = ${JSON.stringify(compiled, null, 2)};`,
    "",
  ].join("\n");
}
