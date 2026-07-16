import { auditCommand } from "./commands/audit";
import { doctorCommand } from "./commands/doctor";
import { fixCommand } from "./commands/fix";
import { initCommand } from "./commands/init";
import { licensesCommand } from "./commands/licenses";
import { providerCreateCommand } from "./commands/provider-create";
import { syncCommand } from "./commands/sync";
import { testCommand } from "./commands/test";
import { parseArguments } from "./flags";
import type { CommandContext, CommandResult } from "./types";

export type { AuditEdit, AuditFinding, AuditFix, AuditLocation, AuditRuleId, AuditSeverity, AuditSummary, CliCheck, CommandContext, CommandResult, EmojiStylesConfig, ParsedFlags, ProposedChange } from "./types";
export { CONFIG_FILENAME, CONFIG_SCHEMA_VERSION } from "./types";
export { defaultConfig, loadConfig, validateConfig } from "./config";
export { AUDIT_RULES } from "./audit/rules";
export { auditProject } from "./audit";
export type { AuditedFile, ProjectAudit } from "./audit";
export { createSarif } from "./audit/sarif";
export type { SarifLog } from "./audit/sarif";

export interface RunCliOptions {
  cwd?: string;
  fetch?: typeof globalThis.fetch;
}

export async function runCli(args: readonly string[], options: RunCliOptions = {}): Promise<CommandResult> {
  const { positionals, flags } = parseArguments(args);
  const context: CommandContext = { cwd: options.cwd ?? process.cwd(), fetch: options.fetch ?? globalThis.fetch };
  const [command, subcommand, ...rest] = positionals;
  try {
    if (!command || command === "help" || flags.help) return helpResult();
    if (command === "audit") return await auditCommand(context, subcommand, flags);
    if (command === "fix") return await fixCommand(context, subcommand, flags);
    if (command === "init") return await initCommand(context, flags);
    if (command === "doctor") return await doctorCommand(context, flags);
    if (command === "test") return await testCommand(context, flags);
    if (command === "sync") return await syncCommand(context, flags);
    if (command === "licenses") return await licensesCommand(context, flags);
    if (command === "provider" && subcommand === "create") return await providerCreateCommand(context, rest[0] ?? ".", flags);
    return { command, ok: false, summary: `Unknown command: ${positionals.join(" ")}. Run emoji-styles help.` };
  } catch (error) {
    return { command: positionals.join(" "), ok: false, summary: error instanceof Error ? error.message : String(error) };
  }
}

export function helpResult(): CommandResult {
  return {
    command: "help", ok: true,
    summary: "One emoji policy. Every framework. Every agent.",
    data: {
      usage: "emoji-styles <command> [options]",
      commands: [
        "init                         Preview project configuration (--yes to apply)",
        "audit [path]                 Audit JS, TS, JSX, TSX, and HTML (--format terminal|json|sarif)",
        "fix [path]                   Preview safe codemods (--yes to apply, --dry-run to force preview)",
        "doctor                       Validate configuration and provider health",
        "test                         Resolve used emoji and verify local assets",
        "sync --used-only             Preview local asset synchronization (--yes to apply)",
        "licenses                     Render provider attribution (--format json|markdown)",
        "provider create <directory>  Preview a custom provider (--yes to apply)",
      ],
      globalOptions: ["--config <path>", "--json", "--help", "audit: --format terminal|json|sarif", "fix: --dry-run | --yes", "init: --fallback <ids> --no-native-fallback"],
    },
  };
}

export function formatResult(result: CommandResult, json = false): string {
  const structured = result.data as { format?: string; sarif?: unknown; findings?: import("./types").AuditFinding[]; patch?: string } | undefined;
  if (structured?.format === "sarif" && structured.sarif) return `${JSON.stringify(structured.sarif, null, 2)}\n`;
  if (json || structured?.format === "json") return `${JSON.stringify(result, null, 2)}\n`;
  const lines = [`${result.ok ? "✓" : "✗"} ${result.summary}`];
  if (structured?.findings?.length) {
    lines.push("");
    for (const finding of structured.findings) {
      lines.push(`${finding.path}:${finding.start.line}:${finding.start.column}  ${finding.severity.padEnd(7)}  ${finding.ruleId}`);
      lines.push(`  ${finding.message}`);
      if (finding.suggestion) lines.push(`  → ${finding.suggestion}`);
    }
  }
  if (result.changes?.length) {
    lines.push("", result.applied ? "Changes applied:" : "Proposed changes:");
    for (const change of result.changes) lines.push(`  ${change.action === "create" ? "+" : "~"} ${change.path} — ${change.description}`);
  }
  if (result.checks?.length) {
    lines.push("");
    for (const check of result.checks) lines.push(`  ${check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗"} [${check.id}] ${check.message}`);
  }
  const data = result.data as { usage?: string; commands?: string[]; globalOptions?: string[]; content?: string; install?: string; example?: string; output?: string } | undefined;
  if (data?.usage) {
    lines.push("", `Usage: ${data.usage}`, "", "Commands:", ...(data.commands ?? []).map((line) => `  ${line}`), "", "Options:", ...(data.globalOptions ?? []).map((line) => `  ${line}`));
  } else if (result.command === "licenses" && data?.content && !(data as { output?: string }).output) {
    lines.push("", data.content.trimEnd());
  }
  if (data?.install) lines.push("", `Suggested install: ${data.install}`);
  if (data?.example) lines.push("", "Example:", data.example);
  if (structured?.patch) lines.push("", "Patch:", structured.patch.trimEnd());
  return `${lines.join("\n")}\n`;
}
