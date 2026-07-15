import type { EmojiAssetProvider, EmojiTheme } from "emoji-styles";

export interface EmojiStylesWebConfig {
  providers?: Readonly<Record<string, EmojiAssetProvider>>;
  themes?: Readonly<Record<string, EmojiTheme>>;
  defaultTheme?: string | EmojiTheme;
}

const providers = new Map<string, EmojiAssetProvider>();
const themes = new Map<string, EmojiTheme>();
let defaultTheme: string | EmojiTheme | undefined;

export function registerEmojiProvider(provider: EmojiAssetProvider): void {
  providers.set(provider.id, provider);
}

export function registerEmojiTheme(theme: EmojiTheme): void {
  themes.set(theme.id, theme);
}

export function configureEmojiStyles(config: EmojiStylesWebConfig): void {
  for (const provider of Object.values(config.providers ?? {})) registerEmojiProvider(provider);
  for (const theme of Object.values(config.themes ?? {})) registerEmojiTheme(theme);
  if (config.defaultTheme !== undefined) defaultTheme = config.defaultTheme;
}

export function getRegisteredProvider(id: string): EmojiAssetProvider | undefined {
  return providers.get(id);
}

export function getRegisteredTheme(id?: string): EmojiTheme | undefined {
  const ref = id ?? defaultTheme;
  if (!ref) return undefined;
  return typeof ref === "string" ? themes.get(ref) : ref;
}

export function getRegisteredProviders(): Readonly<Record<string, EmojiAssetProvider>> {
  return Object.fromEntries(providers);
}
