import { auditProject } from "../audit";
import { createSarif } from "../audit/sarif";
import { stringFlag } from "../flags";
import type { CommandContext, CommandResult, ParsedFlags } from "../types";

export async function auditCommand(context: CommandContext, target: string | undefined, flags: ParsedFlags): Promise<CommandResult> {
  const format = stringFlag(flags, "format") ?? (flags.json ? "json" : "terminal");
  if (!new Set(["terminal", "json", "sarif"]).has(format)) {
    return { command: "audit", ok: false, summary: `Unsupported audit format: ${format}. Use terminal, json, or sarif.` };
  }
  const audit = await auditProject(context, flags, target);
  const ok = audit.summary.errors === 0;
  return {
    command: "audit",
    ok,
    summary: audit.summary.findings
      ? `Audited ${audit.summary.files} file(s): ${audit.summary.errors} error(s), ${audit.summary.warnings} warning(s), ${audit.summary.info} info.`
      : `Audited ${audit.summary.files} file(s); no policy violations found.`,
    data: {
      format,
      target: target ?? null,
      summary: audit.summary,
      findings: audit.findings,
      ...(format === "sarif" ? { sarif: createSarif(audit.findings) } : {}),
    },
  };
}
