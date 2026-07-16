import { readFile, writeFile } from "node:fs/promises";
import { auditProject, rescanFile } from "../audit";
import { applyEdits, createPatch } from "../audit/patch";
import { booleanFlag } from "../flags";
import type { AuditEdit, AuditFinding, CommandContext, CommandResult, ParsedFlags } from "../types";

interface PlannedFileChange {
  absolutePath: string;
  displayPath: string;
  before: string;
  after: string;
  edits: AuditEdit[];
}

export async function fixCommand(context: CommandContext, target: string | undefined, flags: ParsedFlags): Promise<CommandResult> {
  const audit = await auditProject(context, flags, target);
  const changes = planChanges(audit.files, audit.findings);
  const unsafe = audit.findings.filter((finding) => finding.fix?.safety === "unsafe").length;
  const safeFindings = audit.findings.filter((finding) => finding.fix?.safety === "safe");
  if (!changes.length) {
    return {
      command: "fix", ok: true, applied: false,
      summary: unsafe ? `No safe automatic fixes are available; ${unsafe} change(s) require human review.` : "No safe automatic fixes are available.",
      data: { patch: "", before: audit.summary, after: audit.summary, safeFixes: 0, unsafeFixes: unsafe, findings: audit.findings },
    };
  }

  const validation = validatePlannedChanges(changes, audit.files, safeFindings);
  if (!validation.ok) {
    return { command: "fix", ok: false, applied: false, summary: validation.message, data: { patch: renderPatch(changes), findings: audit.findings } };
  }
  const patch = renderPatch(changes);
  const proposedChanges = changes.map((change) => ({ path: change.displayPath, action: "update" as const, description: `Apply ${change.edits.length} safe AST-derived edit(s)` }));
  const shouldApply = booleanFlag(flags, "yes") && !booleanFlag(flags, "dry-run");
  if (!shouldApply) {
    return {
      command: "fix", ok: true, applied: false,
      summary: `Prepared ${safeFindings.length} safe fix(es) in ${changes.length} file(s). Review the patch and rerun with --yes to apply.`,
      changes: proposedChanges,
      data: { patch, before: audit.summary, safeFixes: safeFindings.length, unsafeFixes: unsafe, findings: audit.findings },
    };
  }

  try {
    for (const change of changes) await writeFile(change.absolutePath, change.after, "utf8");
    const after = await auditProject(context, flags, target);
    const introducedParserErrors = after.findings.some((finding) => finding.ruleId === "emoji-styles/parser/invalid-source")
      && !audit.findings.some((finding) => finding.ruleId === "emoji-styles/parser/invalid-source");
    const remainingSafe = after.findings.filter((finding) => finding.fix?.safety === "safe").length;
    if (introducedParserErrors || remainingSafe !== 0) {
      await rollback(changes);
      return { command: "fix", ok: false, applied: false, summary: "Validation did not reduce safe findings; all files were rolled back.", data: { patch, before: audit.summary, after: after.summary, rolledBack: true } };
    }
    return {
      command: "fix", ok: true, applied: true,
      summary: `Applied ${safeFindings.length} safe fix(es) and re-ran the audit successfully.`,
      changes: proposedChanges,
      data: { patch, before: audit.summary, after: after.summary, safeFixes: safeFindings.length, unsafeFixes: unsafe, findings: after.findings },
    };
  } catch (error) {
    await rollback(changes);
    return { command: "fix", ok: false, applied: false, summary: `Fix validation failed and changes were rolled back: ${error instanceof Error ? error.message : String(error)}`, data: { patch, rolledBack: true } };
  }
}

function planChanges(files: Awaited<ReturnType<typeof auditProject>>["files"], findings: readonly AuditFinding[]): PlannedFileChange[] {
  const findingsByPath = new Map<string, AuditFinding[]>();
  for (const finding of findings) {
    if (finding.fix?.safety !== "safe") continue;
    const current = findingsByPath.get(finding.path) ?? [];
    current.push(finding);
    findingsByPath.set(finding.path, current);
  }
  const output: PlannedFileChange[] = [];
  for (const file of files) {
    const edits = (findingsByPath.get(file.displayPath) ?? []).flatMap((finding) => finding.fix?.edits ?? []);
    if (!edits.length) continue;
    const unique = dedupeEdits(edits);
    output.push({ absolutePath: file.absolutePath, displayPath: file.displayPath, before: file.source, after: applyEdits(file.source, unique), edits: unique });
  }
  return output;
}

function validatePlannedChanges(changes: readonly PlannedFileChange[], files: Awaited<ReturnType<typeof auditProject>>["files"], safeFindings: readonly AuditFinding[]): { ok: boolean; message: string } {
  let remainingSafe = 0;
  for (const change of changes) {
    const file = files.find((candidate) => candidate.absolutePath === change.absolutePath);
    if (!file) return { ok: false, message: `Internal error: missing audit source for ${change.displayPath}.` };
    const findings = rescanFile(file, change.after);
    if (findings.some((finding) => finding.ruleId === "emoji-styles/parser/invalid-source")) return { ok: false, message: `Generated patch does not parse cleanly: ${change.displayPath}.` };
    remainingSafe += findings.filter((finding) => finding.fix?.safety === "safe").length;
  }
  return remainingSafe === 0
    ? { ok: true, message: "Patch validation passed." }
    : { ok: false, message: "Generated patch did not reduce the safe audit findings." };
}

function dedupeEdits(edits: readonly AuditEdit[]): AuditEdit[] {
  const seen = new Set<string>();
  return edits.filter((edit) => {
    const key = `${edit.start}:${edit.end}:${edit.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderPatch(changes: readonly PlannedFileChange[]): string {
  return changes.map((change) => createPatch(change.displayPath, change.before, change.after)).join("");
}

async function rollback(changes: readonly PlannedFileChange[]) {
  await Promise.all(changes.map(async (change) => {
    const current = await readFile(change.absolutePath, "utf8").catch(() => null);
    if (current === change.after) await writeFile(change.absolutePath, change.before, "utf8");
  }));
}
