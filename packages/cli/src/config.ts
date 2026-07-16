import { resolve } from "node:path";
import { createManifestProvider, providers, validateProviderManifest, type EmojiAssetProvider, type EmojiProviderManifest } from "emoji-styles";
import { CONFIG_FILENAME, CONFIG_SCHEMA_VERSION, type CliCheck, type EmojiStylesConfig, type LoadedConfig, type LoadedManifest } from "./types";
import { AUDIT_RULES } from "./audit/rules";
import { exists, readJson, safeProjectPath } from "./files";

export function defaultConfig(options: Partial<EmojiStylesConfig> = {}): EmojiStylesConfig {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    provider: options.provider ?? "fluent-3d",
    fallbacks: options.fallbacks ?? ["twemoji"],
    nativeFallback: options.nativeFallback ?? true,
    source: options.source ?? ["src"],
    ...(options.localAssets ? { localAssets: options.localAssets } : {}),
    ...(options.semanticTokens ? { semanticTokens: options.semanticTokens } : {}),
    policy: options.policy ?? { allowRemoteAssets: true },
  };
}

export function validateConfig(config: EmojiStylesConfig): CliCheck[] {
  const checks: CliCheck[] = [];
  checks.push({ id: "config/schema", status: config.schemaVersion === CONFIG_SCHEMA_VERSION ? "pass" : "fail", message: config.schemaVersion === CONFIG_SCHEMA_VERSION ? "Configuration schema v1" : `Unsupported schema version: ${String(config.schemaVersion)}` });
  const providerValid = typeof config.provider === "string" && Boolean(config.provider.trim());
  const fallbacksValid = Array.isArray(config.fallbacks) && config.fallbacks.every((value) => typeof value === "string" && Boolean(value.trim()));
  const sourcesValid = Array.isArray(config.source) && config.source.length > 0 && config.source.every((value) => typeof value === "string" && Boolean(value.trim()));
  checks.push({ id: "config/provider", status: providerValid ? "pass" : "fail", message: providerValid ? `Primary provider: ${config.provider}` : "A primary provider is required" });
  checks.push({ id: "config/fallback", status: !fallbacksValid ? "fail" : config.fallbacks.length ? "pass" : "warn", message: fallbacksValid && config.fallbacks.length ? `Fallback chain: ${config.fallbacks.join(" -> ")}` : fallbacksValid ? "No fallback provider configured" : "Fallbacks must be an array of provider IDs" });
  checks.push({ id: "config/source", status: sourcesValid ? "pass" : "fail", message: sourcesValid ? `Source roots: ${config.source.join(", ")}` : "At least one valid source root is required" });
  checks.push({ id: "config/native-fallback", status: config.nativeFallback === undefined || typeof config.nativeFallback === "boolean" ? "pass" : "fail", message: config.nativeFallback === false ? "Native OS fallback is disabled" : "Native OS fallback is enabled" });
  const knownAuditRules = new Set(AUDIT_RULES.map((rule) => rule.id));
  const auditPolicyValid = config.policy?.audit === undefined || Object.entries(config.policy.audit).every(([id, value]) => knownAuditRules.has(id as typeof AUDIT_RULES[number]["id"]) && ["off", "info", "warning", "error"].includes(value));
  checks.push({ id: "config/audit-policy", status: auditPolicyValid ? "pass" : "fail", message: auditPolicyValid ? "Audit severity overrides are valid" : "Audit severities must be off, info, warning, or error" });
  if (config.policy?.allowRemoteAssets === false && !config.localAssets) checks.push({ id: "policy/offline", status: "fail", message: "Remote assets are disabled but no local asset manifest is configured" });
  return checks;
}

export async function loadConfig(cwd: string, explicitPath?: string): Promise<LoadedConfig> {
  const path = safeProjectPath(cwd, explicitPath ?? CONFIG_FILENAME);
  if (!await exists(path)) throw new Error(`Configuration not found: ${path}`);
  return { config: await readJson<EmojiStylesConfig>(path), path };
}

export async function loadManifest(cwd: string, config: EmojiStylesConfig): Promise<LoadedManifest | null> {
  if (!config.localAssets) return null;
  const path = safeProjectPath(cwd, config.localAssets.manifest);
  const manifest = await readJson<EmojiProviderManifest>(path);
  const validation = validateProviderManifest(manifest);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  return { manifest, path };
}

export async function configuredProviders(cwd: string, config: EmojiStylesConfig): Promise<Map<string, EmojiAssetProvider>> {
  const output = new Map<string, EmojiAssetProvider>(Object.values(providers).map((provider) => [provider.id, provider]));
  const loaded = await loadManifest(cwd, config);
  if (loaded) output.set(loaded.manifest.id, createManifestProvider(loaded.manifest));
  return output;
}
