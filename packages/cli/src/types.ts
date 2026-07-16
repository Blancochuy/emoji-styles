import type { EmojiProviderManifest } from "emoji-styles";

export const CONFIG_FILENAME = "emoji-styles.config.json";
export const CONFIG_SCHEMA_VERSION = 1;

export interface EmojiStylesConfig {
  schemaVersion: 1;
  provider: string;
  fallbacks: string[];
  nativeFallback?: boolean;
  source: string[];
  localAssets?: {
    directory: string;
    manifest: string;
  };
  semanticTokens?: string;
  policy?: {
    allowRemoteAssets?: boolean;
    audit?: Partial<Record<AuditRuleId, AuditSeverity | "off">>;
  };
}

export type AuditSeverity = "info" | "warning" | "error";

export type AuditRuleId =
  | "emoji-styles/semantic/raw-emoji"
  | "emoji-styles/accessibility/missing-label"
  | "emoji-styles/determinism/native-critical-ui"
  | "emoji-styles/provider/direct-url"
  | "emoji-styles/provider/unpinned-url"
  | "emoji-styles/provider/unknown"
  | "emoji-styles/provider/missing-fallback"
  | "emoji-styles/provider/remote-forbidden"
  | "emoji-styles/provider/custom-asset-bypass"
  | "emoji-styles/provider/invalid-manifest"
  | "emoji-styles/provider/missing-hash"
  | "emoji-styles/licensing/missing-provider-license"
  | "emoji-styles/unicode/unsupported-sequence"
  | "emoji-styles/parser/invalid-source";

export interface AuditLocation {
  line: number;
  column: number;
  offset: number;
}

export interface AuditEdit {
  start: number;
  end: number;
  text: string;
}

export interface AuditFix {
  description: string;
  safety: "safe" | "unsafe";
  edits: AuditEdit[];
}

export interface AuditFinding {
  ruleId: AuditRuleId;
  severity: AuditSeverity;
  message: string;
  path: string;
  start: AuditLocation;
  end: AuditLocation;
  emoji?: string;
  suggestion?: string;
  fix?: AuditFix;
}

export interface AuditSummary {
  files: number;
  findings: number;
  info: number;
  warnings: number;
  errors: number;
  fixable: number;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface CliCheck {
  id: string;
  status: CheckStatus;
  message: string;
}

export interface ProposedChange {
  path: string;
  action: "create" | "update";
  description: string;
}

export interface CommandResult<T = unknown> {
  command: string;
  ok: boolean;
  applied?: boolean;
  summary: string;
  checks?: CliCheck[];
  changes?: ProposedChange[];
  data?: T;
}

export interface LoadedConfig {
  config: EmojiStylesConfig;
  path: string;
}

export interface LoadedManifest {
  manifest: EmojiProviderManifest;
  path: string;
}

export interface CommandContext {
  cwd: string;
  fetch: typeof globalThis.fetch;
}

export type FlagValue = string | boolean;
export type ParsedFlags = Record<string, FlagValue>;
