import type { AuditRuleId, AuditSeverity } from "../types";

export interface AuditRuleDefinition {
  id: AuditRuleId;
  title: string;
  description: string;
  defaultSeverity: AuditSeverity;
}

export const AUDIT_RULES: readonly AuditRuleDefinition[] = [
  { id: "emoji-styles/semantic/raw-emoji", title: "Raw semantic emoji", description: "Raw Unicode emoji bypasses the configured provider and semantic token policy.", defaultSeverity: "warning" },
  { id: "emoji-styles/accessibility/missing-label", title: "Missing accessible label", description: "An emoji-only control or emoji image needs an explicit accessible label.", defaultSeverity: "error" },
  { id: "emoji-styles/determinism/native-critical-ui", title: "Native emoji in deterministic UI", description: "Native emoji in snapshots or visual-test files can render differently across operating systems.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/direct-url", title: "Direct provider URL", description: "Provider assets should resolve through the provider registry instead of direct URLs.", defaultSeverity: "warning" },
  { id: "emoji-styles/provider/unpinned-url", title: "Unpinned provider URL", description: "Remote provider URLs must use immutable versions or commit hashes.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/unknown", title: "Unknown provider", description: "Provider references must resolve to a built-in or configured local provider.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/missing-fallback", title: "Missing fallback", description: "Projects should configure a deterministic fallback or explicitly allow native fallback.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/remote-forbidden", title: "Remote assets forbidden", description: "Project policy forbids remote emoji assets.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/custom-asset-bypass", title: "Custom asset bypasses registry", description: "Custom emoji images should be registered through a manifest-backed provider.", defaultSeverity: "warning" },
  { id: "emoji-styles/provider/invalid-manifest", title: "Invalid provider manifest", description: "Custom and generated providers require a valid, reproducible manifest.", defaultSeverity: "error" },
  { id: "emoji-styles/provider/missing-hash", title: "Missing asset hash", description: "Manifest assets require SHA-256 hashes for reproducible validation.", defaultSeverity: "error" },
  { id: "emoji-styles/licensing/missing-provider-license", title: "Missing provider license", description: "Configured artwork providers must declare license metadata.", defaultSeverity: "error" },
  { id: "emoji-styles/unicode/unsupported-sequence", title: "Unsupported Unicode sequence", description: "The sequence is emoji-like but is not part of the configured RGI dataset.", defaultSeverity: "error" },
  { id: "emoji-styles/parser/invalid-source", title: "Invalid source", description: "The source file could not be parsed reliably.", defaultSeverity: "error" },
] as const;

const RULES_BY_ID = new Map(AUDIT_RULES.map((rule) => [rule.id, rule]));

export function getRule(id: AuditRuleId): AuditRuleDefinition {
  const rule = RULES_BY_ID.get(id);
  if (!rule) throw new Error(`Unknown audit rule: ${id}`);
  return rule;
}
