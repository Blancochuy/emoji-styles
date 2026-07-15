import type { EmojiAssetProvider, ProviderValidationResult } from "./types";

export function validateProvider(provider: EmojiAssetProvider): ProviderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!provider.id?.trim()) errors.push("Provider id is required");
  else if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(provider.id)) {
    errors.push("Provider id must use lowercase letters, numbers, dots, underscores, or hyphens");
  }
  if (!provider.label?.trim()) errors.push("Provider label is required");
  if (provider.visibility !== "public" && provider.visibility !== "custom") {
    errors.push("Provider visibility must be public or custom");
  }
  if (!provider.resolve && !provider.getUrl) errors.push("Provider must implement resolve or getUrl");
  if (!provider.version?.trim()) errors.push("Provider version is required for v2");
  if (!provider.formats) errors.push("Provider formats are required for v2");
  else if (provider.id !== "native" && provider.formats.length === 0) {
    errors.push("Non-native providers must declare at least one format");
  }
  if (typeof provider.local !== "boolean") errors.push("Provider local must be declared for v2");
  if (provider.visibility === "public" && provider.id !== "native" && !provider.license) {
    errors.push("Public providers must declare a license");
  }
  if (!provider.source) warnings.push("Provider source is not declared");
  if (provider.license && !provider.license.url && !provider.license.ownership) {
    warnings.push("Provider license should declare a URL or ownership");
  }

  return { valid: errors.length === 0, errors, warnings };
}
