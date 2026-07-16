import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { getEmojiMetadata, providers as builtInProviders } from "emoji-styles";
import { configuredProviders, loadConfig, loadManifest } from "../config";
import { displayPath, safeProjectPath, walkFiles } from "../files";
import { stringFlag } from "../flags";
import type { AuditFinding, AuditRuleId, AuditSeverity, AuditSummary, CommandContext, ParsedFlags } from "../types";
import { getRule } from "./rules";
import { scanSource, type ScanSourceOptions } from "./scanner";

const AUDIT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".html"]);
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

export interface AuditedFile {
  absolutePath: string;
  displayPath: string;
  source: string;
  scanOptions: Omit<ScanSourceOptions, "source">;
}

export interface ProjectAudit {
  findings: AuditFinding[];
  files: AuditedFile[];
  summary: AuditSummary;
  configPath: string;
}

export async function auditProject(context: CommandContext, flags: ParsedFlags, target?: string): Promise<ProjectAudit> {
  const loaded = await loadConfig(context.cwd, stringFlag(flags, "config"));
  const severity = (ruleId: AuditRuleId): AuditSeverity | "off" => loaded.config.policy?.audit?.[ruleId] ?? getRule(ruleId).defaultSeverity;
  const configSource = await readFile(loaded.path, "utf8");
  const configDisplayPath = displayPath(context.cwd, loaded.path).split("\\").join("/");
  let providerLoadError: string | null = null;
  let providerMap;
  try {
    providerMap = await configuredProviders(context.cwd, loaded.config);
  } catch (error) {
    providerLoadError = error instanceof Error ? error.message : String(error);
    providerMap = new Map(Object.values(builtInProviders).map((provider) => [provider.id, provider]));
  }
  const knownProviders = new Set(providerMap.keys());
  const roots = target ? [target] : loaded.config.source;
  const paths = (await Promise.all(roots.map((root) => walkFiles(safeProjectPath(context.cwd, root), AUDIT_EXTENSIONS)))).flat();
  const uniquePaths = [...new Set(paths)].sort();
  const files: AuditedFile[] = [];
  const findings: AuditFinding[] = [];

  const scanned = await Promise.all(uniquePaths.map(async (absolutePath) => {
    const details = await stat(absolutePath);
    const display = displayPath(context.cwd, absolutePath).split("\\").join("/");
    if (details.size > MAX_SOURCE_BYTES) {
      const ruleId = "emoji-styles/parser/invalid-source" as const;
      const configuredSeverity = severity(ruleId);
      return {
        file: { absolutePath, displayPath: display, source: "", scanOptions: { absolutePath, displayPath: display, knownProviders, allowRemoteAssets: loaded.config.policy?.allowRemoteAssets !== false, severity } } satisfies AuditedFile,
        findings: configuredSeverity === "off" ? [] : [{
          ruleId,
          severity: configuredSeverity,
          message: `Source exceeds the ${MAX_SOURCE_BYTES / 1024 / 1024} MB audit limit.`,
          path: display,
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        } satisfies AuditFinding],
      };
    }
    const source = await readFile(absolutePath, "utf8");
    const baseOptions = {
      absolutePath,
      displayPath: display,
      knownProviders,
      allowRemoteAssets: loaded.config.policy?.allowRemoteAssets !== false,
      severity,
    };
    return {
      file: { absolutePath, displayPath: baseOptions.displayPath, source, scanOptions: baseOptions } satisfies AuditedFile,
      findings: scanSource({ ...baseOptions, source }),
    };
  }));
  for (const result of scanned) {
    files.push(result.file);
    findings.push(...result.findings);
  }

  if (providerLoadError) {
    addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/provider/invalid-manifest", `Local provider manifest is invalid: ${providerLoadError}`, loaded.config.localAssets?.manifest ?? "localAssets");
  } else if (loaded.config.localAssets) {
    const loadedManifest = await loadManifest(context.cwd, loaded.config);
    for (const [emoji, asset] of Object.entries(loadedManifest?.manifest.assets ?? {})) {
      if (!asset.sha256) addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/provider/missing-hash", `Manifest asset ${asset.file} for ${emoji} has no SHA-256 hash.`, loaded.config.localAssets.manifest);
    }
  }
  const configuredIds = [loaded.config.provider, ...loaded.config.fallbacks];
  if (!loaded.config.fallbacks.length && loaded.config.nativeFallback === false) {
    addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/provider/missing-fallback", "No fallback provider is configured and native fallback is disabled.", "fallbacks");
  }
  for (const id of configuredIds) {
    const provider = providerMap.get(id);
    if (!provider) {
      addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/provider/unknown", `Unknown configured provider \"${id}\".`, id);
      continue;
    }
    if (provider.id !== "native" && !provider.license) {
      addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/licensing/missing-provider-license", `Provider \"${id}\" has no license metadata.`, id);
    }
    if (loaded.config.policy?.allowRemoteAssets === false && !provider.local && provider.id !== "native") {
      addConfigFinding(findings, configSource, configDisplayPath, severity, "emoji-styles/provider/remote-forbidden", `Remote provider \"${id}\" violates allowRemoteAssets=false.`, id);
    }
  }

  findings.sort((a, b) => a.path.localeCompare(b.path) || a.start.offset - b.start.offset || a.ruleId.localeCompare(b.ruleId));
  return { findings, files, summary: summarize(findings, files.length), configPath: loaded.path };
}

export function rescanFile(file: AuditedFile, source: string): AuditFinding[] {
  return scanSource({ ...file.scanOptions, source });
}

export function summarize(findings: readonly AuditFinding[], files: number): AuditSummary {
  return {
    files,
    findings: findings.length,
    info: findings.filter((finding) => finding.severity === "info").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    errors: findings.filter((finding) => finding.severity === "error").length,
    fixable: findings.filter((finding) => finding.fix?.safety === "safe").length,
  };
}

export function findingLabel(finding: AuditFinding): string {
  return finding.emoji ? getEmojiMetadata(finding.emoji)?.label ?? finding.emoji : finding.ruleId;
}

function addConfigFinding(findings: AuditFinding[], source: string, path: string, severityFor: (ruleId: AuditRuleId) => AuditSeverity | "off", ruleId: AuditRuleId, message: string, needle: string) {
  const severity = severityFor(ruleId);
  if (severity === "off") return;
  const offset = Math.max(0, source.indexOf(needle));
  const start = offsetLocation(source, offset);
  const end = offsetLocation(source, offset + needle.length);
  findings.push({ ruleId, severity, message, path, start, end });
}

function offsetLocation(source: string, offset: number) {
  const clamped = Math.max(0, Math.min(source.length, offset));
  const before = source.slice(0, clamped);
  const line = before.split("\n").length;
  return { line, column: clamped - before.lastIndexOf("\n"), offset: clamped };
}

export function isSupportedAuditPath(path: string): boolean {
  return AUDIT_EXTENSIONS.has(extname(path).toLowerCase());
}
