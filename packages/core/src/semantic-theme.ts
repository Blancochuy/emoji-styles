import { normalizeEmoji } from "emoji-styles-data";
import { publicProviders } from "./providers";
import { resolveEmoji, type ResolveEmojiOptions } from "./resolution";
import { tokenizeEmojiText } from "./tokenize";
import { resolveProvider } from "./url";
import { selectLocalizedLabel } from "./label";
import type {
  EmojiAssetFormat,
  EmojiAssetProvider,
  EmojiProviderRef,
  EmojiResolution,
  ProviderLicense,
  ProviderResolution,
  ResolvedEmojiAsset,
} from "./types";

export const EMOJI_THEME_SCHEMA_VERSION = 1 as const;
export const EMOJI_TOKEN_NAME_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;

const PROVIDER_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const THEME_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i;

export type EmojiThemeProviderRef = EmojiProviderRef | string;

export interface EmojiTokenAsset {
  url: string;
  format: EmojiAssetFormat;
  local?: boolean;
  providerId?: string;
  providerVersion?: string;
  width?: number;
  height?: number;
  checksum?: string;
  license?: ProviderLicense;
}

export interface EmojiTokenDefinitionInput {
  emoji: string;
  label: string;
  decorative?: boolean;
  labels?: Readonly<Record<string, string>>;
  provider?: EmojiThemeProviderRef;
  /** Stable semantic asset id resolved by a SemanticTokenProvider, or an exact asset. */
  asset?: string | EmojiTokenAsset;
}

export interface EmojiTokenDefinition extends EmojiTokenDefinitionInput {
  decorative: boolean;
}

export type EmojiTokenMapInput = Readonly<Record<string, EmojiTokenDefinitionInput>>;
export type EmojiTokenMap = Readonly<Record<string, EmojiTokenDefinition>>;

export interface EmojiTheme {
  schemaVersion: typeof EMOJI_THEME_SCHEMA_VERSION;
  id: string;
  version: string;
  tokens: EmojiTokenMap;
  defaultProvider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  /** Whether native OS emoji is appended as the terminal fallback. Defaults to true. */
  nativeFallback?: boolean;
  inherits: readonly string[];
}

export interface DefineEmojiThemeOptions {
  id?: string;
  version?: string;
  defaultProvider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  nativeFallback?: boolean;
  extends?: EmojiTheme | readonly EmojiTheme[];
  /** Preserved ancestry metadata when parsing a flattened serialized theme. */
  inherits?: readonly string[];
}

export interface EmojiThemeValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface EmojiThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: EmojiThemeValidationIssue[];
}

export interface ResolveEmojiTokenOptions {
  provider?: EmojiThemeProviderRef;
  fallbacks?: readonly EmojiThemeProviderRef[];
  nativeFallback?: boolean;
  locale?: string;
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
}

export interface ResolvedEmojiToken {
  token: string;
  themeId: string;
  themeVersion: string;
  emoji: string;
  label: string;
  decorative: boolean;
  locale?: string;
  asset: ResolvedEmojiAsset | null;
  emojiResolution: EmojiResolution | null;
  source: "custom-asset" | "semantic-provider" | "emoji-provider" | "native" | "unresolved";
}

export interface SemanticTokenResolveContext {
  token: string;
  definition: EmojiTokenDefinition;
  theme: EmojiTheme;
}

export interface SemanticTokenProvider extends EmojiAssetProvider {
  resolveToken(assetId: string, context: SemanticTokenResolveContext): ProviderResolution;
}

export interface SemanticTokenProviderOptions {
  id: string;
  label: string;
  version: string;
  assets: Readonly<Record<string, string | EmojiTokenAsset>>;
  fallback?: EmojiAssetProvider;
  format?: EmojiAssetFormat;
  local?: boolean;
  source?: string;
  license?: ProviderLicense;
  visibility?: "public" | "custom";
}

export interface SerializeEmojiThemeOptions {
  format?: "json" | "typescript";
  space?: number;
  variableName?: string;
}

function isEmojiGrapheme(input: string): boolean {
  const tokens = tokenizeEmojiText(input);
  return tokens.length === 1 && tokens[0]?.type === "emoji" && tokens[0].value === input;
}

function isSafeAssetUrl(url: string): boolean {
  if (typeof url !== "string" || !url.trim() || url.includes("\\")) return false;
  if (url.startsWith("//") || url.split(/[?#]/, 1)[0].split("/").includes("..")) return false;
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || scheme === "http" || scheme === "https";
}

function providerId(ref: EmojiThemeProviderRef | undefined): string | undefined {
  return typeof ref === "string" ? ref : ref?.id;
}

function normalizeDefinition(definition: EmojiTokenDefinitionInput): EmojiTokenDefinition {
  const normalized = normalizeEmoji(definition.emoji) ?? definition.emoji.normalize("NFC");
  return {
    ...definition,
    emoji: normalized,
    labels: definition.labels ? { ...definition.labels } : undefined,
    asset: typeof definition.asset === "object" ? { ...definition.asset } : definition.asset,
    decorative: definition.decorative ?? false,
  };
}

function createIssue(path: string, code: string, message: string): EmojiThemeValidationIssue {
  return { path, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unknownProviderId(ref: unknown): string | undefined {
  if (typeof ref === "string") return ref;
  return isRecord(ref) && typeof ref.id === "string" ? ref.id : undefined;
}

export function validateEmojiTheme(theme: unknown): EmojiThemeValidationResult {
  const issues: EmojiThemeValidationIssue[] = [];
  const warnings: string[] = [];
  const error = (path: string, code: string, message: string) => {
    issues.push(createIssue(path, code, message));
  };

  if (!isRecord(theme)) {
    error("$", "invalid-theme", "Theme must be an object");
    return {
      valid: false,
      errors: issues.map((issue) => `${issue.path}: ${issue.message}`),
      warnings,
      issues,
    };
  }

  if (theme.schemaVersion !== EMOJI_THEME_SCHEMA_VERSION) {
    error("schemaVersion", "unsupported-schema", `Theme schemaVersion must be ${EMOJI_THEME_SCHEMA_VERSION}`);
  }
  if (typeof theme.id !== "string" || !PROVIDER_ID_PATTERN.test(theme.id)) {
    error("id", "invalid-id", "Theme id must use lowercase letters, numbers, dots, underscores, or hyphens");
  }
  if (typeof theme.version !== "string" || !THEME_VERSION_PATTERN.test(theme.version)) {
    error("version", "invalid-version", "Theme version must be semantic versioning such as 1.0.0");
  }
  if (!isRecord(theme.tokens)) {
    error("tokens", "invalid-tokens", "Theme tokens must be an object");
  } else {
    for (const [token, definition] of Object.entries(theme.tokens)) {
      const path = `tokens.${token}`;
      if (!EMOJI_TOKEN_NAME_PATTERN.test(token)) {
        error(path, "invalid-token", "Token names require at least two lowercase dot-separated segments");
      }
      if (!isRecord(definition)) {
        error(path, "invalid-definition", "Token definition must be an object");
        continue;
      }
      if (typeof definition.emoji !== "string" || !isEmojiGrapheme(definition.emoji)) {
        error(`${path}.emoji`, "invalid-emoji", "Token emoji must contain exactly one emoji grapheme");
      }
      if (typeof definition.label !== "string" || !definition.label.trim()) {
        error(`${path}.label`, "missing-label", "Token label is required for accessible fallback");
      }
      if (typeof definition.decorative !== "boolean") {
        error(`${path}.decorative`, "invalid-decorative", "Token decorative must be boolean");
      }
      if (definition.labels !== undefined && !isRecord(definition.labels)) {
        error(`${path}.labels`, "invalid-labels", "Localized labels must be an object");
      } else {
        for (const [locale, label] of Object.entries(definition.labels ?? {})) {
          if (!LOCALE_PATTERN.test(locale)) {
            error(`${path}.labels.${locale}`, "invalid-locale", "Localized label keys must be BCP 47-like locale tags");
          }
          if (typeof label !== "string" || !label.trim()) {
            error(`${path}.labels.${locale}`, "empty-label", "Localized labels cannot be empty");
          }
        }
      }
      const definitionProviderId = unknownProviderId(definition.provider);
      if (definition.provider !== undefined && (!definitionProviderId || !PROVIDER_ID_PATTERN.test(definitionProviderId))) {
        error(`${path}.provider`, "invalid-provider", "Token provider reference is invalid");
      }
      if (typeof definition.asset === "string" && !EMOJI_TOKEN_NAME_PATTERN.test(definition.asset)) {
        error(`${path}.asset`, "invalid-asset-id", "Semantic asset ids use lowercase dot-separated segments");
      }
      if (definition.asset !== undefined && typeof definition.asset !== "string" && !isRecord(definition.asset)) {
        error(`${path}.asset`, "invalid-asset", "Token asset must be a semantic id or asset object");
      } else if (isRecord(definition.asset)) {
        if (typeof definition.asset.url !== "string" || !isSafeAssetUrl(definition.asset.url)) {
          error(`${path}.asset.url`, "unsafe-asset-url", "Asset URLs must be relative, HTTP, or HTTPS");
        }
        if (typeof definition.asset.format !== "string" || !(["png", "svg", "webp", "avif"] as string[]).includes(definition.asset.format)) {
          error(`${path}.asset.format`, "invalid-format", "Asset format must be png, svg, webp, or avif");
        }
        if (definition.asset.checksum !== undefined && (typeof definition.asset.checksum !== "string" || !/^[a-f0-9]{64}$/i.test(definition.asset.checksum))) {
          error(`${path}.asset.checksum`, "invalid-checksum", "Asset checksum must be SHA-256");
        }
        if (definition.asset.providerId !== undefined && (typeof definition.asset.providerId !== "string" || !PROVIDER_ID_PATTERN.test(definition.asset.providerId))) {
          error(`${path}.asset.providerId`, "invalid-provider", "Asset provider id is invalid");
        }
        if (definition.asset.width !== undefined && (typeof definition.asset.width !== "number" || !Number.isInteger(definition.asset.width) || definition.asset.width <= 0)) {
          error(`${path}.asset.width`, "invalid-dimension", "Asset width must be a positive integer");
        }
        if (definition.asset.height !== undefined && (typeof definition.asset.height !== "number" || !Number.isInteger(definition.asset.height) || definition.asset.height <= 0)) {
          error(`${path}.asset.height`, "invalid-dimension", "Asset height must be a positive integer");
        }
      }
      if (definition.decorative && isRecord(definition.labels) && Object.keys(definition.labels).length > 0) {
        warnings.push(`${path}: decorative tokens do not expose localized labels to assistive technology`);
      }
    }
  }

  const defaultProviderId = unknownProviderId(theme.defaultProvider);
  if (theme.defaultProvider !== undefined && (!defaultProviderId || !PROVIDER_ID_PATTERN.test(defaultProviderId))) {
    error("defaultProvider", "invalid-provider", "Theme default provider reference is invalid");
  }
  if (theme.fallbacks !== undefined && !Array.isArray(theme.fallbacks)) {
    error("fallbacks", "invalid-fallbacks", "Theme fallbacks must be an array");
  } else {
    for (const [index, fallback] of (theme.fallbacks ?? []).entries()) {
      const id = unknownProviderId(fallback);
      if (!id || !PROVIDER_ID_PATTERN.test(id)) {
        error(`fallbacks.${index}`, "invalid-provider", "Theme fallback provider reference is invalid");
      }
    }
  }
  if (theme.nativeFallback !== undefined && typeof theme.nativeFallback !== "boolean") {
    error("nativeFallback", "invalid-native-fallback", "Theme nativeFallback must be boolean");
  }
  if (!Array.isArray(theme.inherits)) {
    error("inherits", "invalid-inherits", "Theme inherits must be an array");
  } else {
    const seen = new Set<string>();
    for (const [index, inheritedTheme] of theme.inherits.entries()) {
      if (typeof inheritedTheme !== "string" || !PROVIDER_ID_PATTERN.test(inheritedTheme)) {
        error(`inherits.${index}`, "invalid-theme-id", "Inherited theme id is invalid");
      } else if (seen.has(inheritedTheme)) {
        error(`inherits.${index}`, "duplicate-theme-id", "Inherited theme ids must be unique");
      }
      if (typeof inheritedTheme === "string") seen.add(inheritedTheme);
    }
  }

  return {
    valid: issues.length === 0,
    errors: issues.map((issue) => `${issue.path}: ${issue.message}`),
    warnings,
    issues,
  };
}

function assertValidTheme(theme: EmojiTheme): EmojiTheme {
  const result = validateEmojiTheme(theme);
  if (!result.valid) throw new Error(result.errors.join("; "));
  return theme;
}

export function defineEmojiTheme(
  tokens: EmojiTokenMapInput,
  options: DefineEmojiThemeOptions = {},
): EmojiTheme {
  const parents: readonly EmojiTheme[] = options.extends
    ? (Array.isArray(options.extends) ? options.extends : [options.extends])
    : [];
  for (const parent of parents) assertValidTheme(parent);
  const inheritedTokens: Record<string, EmojiTokenDefinitionInput> = Object.assign(
    {},
    ...parents.map((theme) => theme.tokens),
  );
  const normalizedTokens = Object.fromEntries(
    Object.entries({ ...inheritedTokens, ...tokens }).map(([token, definition]) => [
      token,
      normalizeDefinition(definition),
    ]),
  );
  const lastParent = parents[parents.length - 1];
  return assertValidTheme({
    schemaVersion: EMOJI_THEME_SCHEMA_VERSION,
    id: options.id ?? "default",
    version: options.version ?? "1.0.0",
    tokens: normalizedTokens,
    defaultProvider: options.defaultProvider ?? lastParent?.defaultProvider,
    fallbacks: options.fallbacks ?? lastParent?.fallbacks,
    nativeFallback: options.nativeFallback ?? lastParent?.nativeFallback,
    inherits: [...new Set([
      ...(options.inherits ?? []),
      ...parents.flatMap((theme) => [...theme.inherits, theme.id]),
    ])],
  });
}

export function mergeEmojiThemes(...themes: readonly EmojiTheme[]): EmojiTheme {
  if (themes.length === 0) throw new Error("mergeEmojiThemes requires at least one theme");
  for (const theme of themes) assertValidTheme(theme);
  const overlay = themes[themes.length - 1]!;
  const tokens = Object.assign({}, ...themes.map((theme) => theme.tokens));
  return assertValidTheme({
    ...overlay,
    tokens,
    inherits: [...new Set(themes.flatMap((theme, index) => [
      ...theme.inherits,
      ...(index < themes.length - 1 ? [theme.id] : []),
    ]))],
  });
}

export function getEmojiTokenDefinition(theme: EmojiTheme, token: string): EmojiTokenDefinition | null {
  return theme.tokens[token] ?? null;
}

export function getEmojiTokenLabel(
  definition: EmojiTokenDefinition,
  locale?: string,
): string {
  return selectLocalizedLabel(definition.label, definition.labels, locale);
}

/** @internal Shared with the theme compiler; not part of the public API. */
export function resolveThemeProvider(
  ref: EmojiThemeProviderRef,
  providers?: Readonly<Record<string, EmojiAssetProvider>>,
): EmojiProviderRef {
  if (typeof ref !== "string") return ref;
  return providers?.[ref] ?? ref as EmojiProviderRef;
}

function isSemanticTokenProvider(provider: EmojiAssetProvider | undefined): provider is SemanticTokenProvider {
  return Boolean(provider && "resolveToken" in provider && typeof provider.resolveToken === "function");
}

function includesNativeProvider(refs: readonly EmojiThemeProviderRef[]): boolean {
  return refs.some((ref) => providerId(ref) === publicProviders.native.id);
}

function resolvedCustomAsset(
  theme: Pick<EmojiTheme, "id" | "version">,
  provider: EmojiAssetProvider | undefined,
  asset: EmojiTokenAsset,
): ResolvedEmojiAsset {
  return {
    providerId: asset.providerId ?? provider?.id ?? `theme-${theme.id}`,
    providerVersion: asset.providerVersion ?? provider?.version ?? theme.version,
    url: asset.url,
    format: asset.format,
    local: asset.local ?? !/^https?:\/\//i.test(asset.url),
    width: asset.width,
    height: asset.height,
    checksum: asset.checksum,
    license: asset.license ?? provider?.license,
  };
}

export async function resolveEmojiToken(
  token: string,
  theme: EmojiTheme,
  options: ResolveEmojiTokenOptions = {},
): Promise<ResolvedEmojiToken> {
  const definition = theme.tokens[token];
  if (!definition) throw new Error(`Unknown emoji token: ${token}`);
  const label = getEmojiTokenLabel(definition, options.locale);
  const providerRef = options.provider
    ?? definition.provider
    ?? theme.defaultProvider
    ?? publicProviders.twemoji;
  const resolvedProviderRef = resolveThemeProvider(providerRef, options.providers);
  const provider = typeof resolvedProviderRef === "string"
    ? resolveProvider(resolvedProviderRef)
    : resolvedProviderRef;

  if (definition.asset && typeof definition.asset === "object") {
    return {
      token,
      themeId: theme.id,
      themeVersion: theme.version,
      emoji: definition.emoji,
      label,
      decorative: definition.decorative,
      locale: options.locale,
      // The theme's rendering provider did not supply this file: attribute it to the asset's own
      // metadata, else to the theme, and never borrow that provider's id, revision or license.
      asset: resolvedCustomAsset(theme, undefined, definition.asset),
      emojiResolution: null,
      source: "custom-asset",
    };
  }

  const semanticProvider = provider ?? undefined;
  if (isSemanticTokenProvider(semanticProvider)) {
    const assetId = definition.asset ?? token;
    const asset = await semanticProvider.resolveToken(assetId, { token, definition, theme });
    if (asset) {
      return {
        token,
        themeId: theme.id,
        themeVersion: theme.version,
        emoji: definition.emoji,
        label,
        decorative: definition.decorative,
        locale: options.locale,
        asset,
        emojiResolution: null,
        source: "semantic-provider",
      };
    }
  }

  const requestedFallbacks = options.fallbacks ?? theme.fallbacks ?? [];
  const nativeFallback = options.nativeFallback ?? theme.nativeFallback ?? true;
  const configuredFallbacks = includesNativeProvider(requestedFallbacks) || !nativeFallback
    ? requestedFallbacks
    : [...requestedFallbacks, publicProviders.native];
  const resolutionOptions: ResolveEmojiOptions = {
    provider: resolvedProviderRef,
    fallbacks: configuredFallbacks.map((fallback) => resolveThemeProvider(fallback, options.providers)),
  };
  const emojiResolution = await resolveEmoji(definition.emoji, resolutionOptions);
  return {
    token,
    themeId: theme.id,
    themeVersion: theme.version,
    emoji: definition.emoji,
    label,
    decorative: definition.decorative,
    locale: options.locale,
    asset: emojiResolution.selected,
    emojiResolution,
    source: emojiResolution.selected
      ? "emoji-provider"
      : emojiResolution.nativeFallback ? "native" : "unresolved",
  };
}

export function createSemanticTokenProvider(
  options: SemanticTokenProviderOptions,
): SemanticTokenProvider {
  if (!PROVIDER_ID_PATTERN.test(options.id)) throw new Error(`Invalid semantic provider id: ${options.id}`);
  if (!THEME_VERSION_PATTERN.test(options.version)) throw new Error(`Invalid semantic provider version: ${options.version}`);
  const fallbackFormat = options.format ?? "svg";
  const assets = new Map<string, EmojiTokenAsset>();
  for (const [assetId, asset] of Object.entries(options.assets)) {
    if (!EMOJI_TOKEN_NAME_PATTERN.test(assetId)) throw new Error(`Invalid semantic asset id: ${assetId}`);
    const normalized = typeof asset === "string"
      ? { url: asset, format: fallbackFormat, local: options.local }
      : { ...asset };
    if (!isSafeAssetUrl(normalized.url)) throw new Error(`Unsafe semantic asset URL: ${assetId}`);
    if (!(["png", "svg", "webp", "avif"] as string[]).includes(normalized.format)) {
      throw new Error(`Invalid semantic asset format: ${assetId}`);
    }
    if (normalized.checksum && !/^[a-f0-9]{64}$/i.test(normalized.checksum)) {
      throw new Error(`Invalid semantic asset checksum: ${assetId}`);
    }
    assets.set(assetId, normalized);
  }
  const formats = [...new Set([
    ...[...assets.values()].map((asset) => asset.format),
    ...(options.fallback?.formats ?? []),
  ])];
  if (formats.length === 0) throw new Error("Semantic providers require at least one asset format");
  const provider: SemanticTokenProvider = {
    id: options.id,
    label: options.label,
    version: options.version,
    visibility: options.visibility ?? "custom",
    formats,
    local: options.local ?? [...assets.values()].every((asset) => asset.local ?? !/^https?:\/\//i.test(asset.url)),
    source: options.source,
    license: options.license,
    supportsUnknownEmoji: options.fallback?.supportsUnknownEmoji,
    getUrl(data, emoji) {
      return options.fallback?.getUrl?.(data, emoji) ?? null;
    },
    async resolve(emoji) {
      if (options.fallback?.resolve) return await options.fallback.resolve(emoji);
      const url = options.fallback?.getUrl?.(emoji.data, emoji.normalized);
      return url ? {
        providerId: options.fallback?.id ?? options.id,
        providerVersion: options.fallback?.version ?? options.version,
        url,
        format: options.fallback?.formats?.[0] ?? fallbackFormat,
        local: options.fallback?.local ?? false,
        license: options.fallback?.license,
      } : null;
    },
    resolveToken(assetId) {
      const asset = assets.get(assetId);
      return asset ? resolvedCustomAsset(
        { id: options.id, version: options.version },
        provider,
        asset,
      ) : null;
    },
  };
  return provider;
}

function serializableProvider(ref: EmojiThemeProviderRef | undefined): string | undefined {
  return providerId(ref);
}

function serializableTheme(theme: EmojiTheme) {
  return {
    schemaVersion: theme.schemaVersion,
    id: theme.id,
    version: theme.version,
    ...(theme.defaultProvider ? { defaultProvider: serializableProvider(theme.defaultProvider) } : {}),
    ...(theme.fallbacks ? { fallbacks: theme.fallbacks.map((fallback) => serializableProvider(fallback)) } : {}),
    ...(theme.nativeFallback !== undefined ? { nativeFallback: theme.nativeFallback } : {}),
    ...(theme.inherits.length > 0 ? { inherits: [...theme.inherits] } : {}),
    tokens: Object.fromEntries(Object.entries(theme.tokens).map(([token, definition]) => [token, {
      ...definition,
      ...(definition.provider ? { provider: serializableProvider(definition.provider) } : {}),
    }])),
  };
}

export function serializeEmojiTheme(
  theme: EmojiTheme,
  options: SerializeEmojiThemeOptions = {},
): string {
  assertValidTheme(theme);
  const space = options.space ?? 2;
  const document = serializableTheme(theme);
  if ((options.format ?? "json") === "json") return `${JSON.stringify(document, null, space)}\n`;
  const variableName = options.variableName ?? "emojiTheme";
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(variableName)) throw new Error("Invalid TypeScript variable name");
  const { tokens, schemaVersion: _schemaVersion, ...themeOptions } = document;
  return [
    'import { defineEmojiTheme } from "emoji-styles";',
    "",
    `export const ${variableName} = defineEmojiTheme(${JSON.stringify(tokens, null, space)}, ${JSON.stringify(themeOptions, null, space)});`,
    "",
  ].join("\n");
}

/** Migrate a schema-less v0 theme or parse a current serialized theme. */
export function migrateEmojiTheme(input: unknown): EmojiTheme {
  const value = typeof input === "string" ? JSON.parse(input) as unknown : input;
  if (!isRecord(value)) throw new Error("Emoji theme must be an object or JSON object string");
  const document = "tokens" in value ? value : { tokens: value };
  if (!isRecord(document.tokens)) throw new Error("Emoji theme tokens must be an object");
  const schemaVersion = document.schemaVersion ?? 0;
  if (schemaVersion !== 0 && schemaVersion !== EMOJI_THEME_SCHEMA_VERSION) {
    throw new Error(`Unsupported emoji theme schemaVersion: ${String(schemaVersion)}`);
  }
  return defineEmojiTheme(document.tokens as EmojiTokenMapInput, {
    id: typeof document.id === "string" ? document.id : "migrated",
    version: typeof document.version === "string" ? document.version : "1.0.0",
    defaultProvider: typeof document.defaultProvider === "string" ? document.defaultProvider : undefined,
    fallbacks: Array.isArray(document.fallbacks)
      ? document.fallbacks.filter((fallback): fallback is string => typeof fallback === "string")
      : undefined,
    nativeFallback: typeof document.nativeFallback === "boolean" ? document.nativeFallback : undefined,
    inherits: Array.isArray(document.inherits)
      ? document.inherits.filter((themeId): themeId is string => typeof themeId === "string")
      : undefined,
  });
}

export const parseEmojiTheme = migrateEmojiTheme;
