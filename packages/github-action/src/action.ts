import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { auditProject, createSarif, type AuditFinding, type AuditSummary, type SarifLog } from "emoji-styles-cli/audit";

export type FailureThreshold = "none" | "warning" | "error";

export interface AuditActionInputs {
  path?: string;
  config?: string;
  sarifFile: string;
  failOn: FailureThreshold;
  maxAnnotations: number;
}

export interface AuditActionResult {
  findings: AuditFinding[];
  summary: AuditSummary;
  sarif: SarifLog;
  sarifFile: string;
  failed: boolean;
  failureMessage?: string;
}

export async function runAuditAction(inputs: AuditActionInputs, workspace: string): Promise<AuditActionResult> {
  const sarifFile = await safeOutputPath(workspace, inputs.sarifFile);
  const audit = await auditProject(
    { cwd: workspace, fetch: globalThis.fetch },
    inputs.config ? { config: inputs.config } : {},
    inputs.path,
  );
  const sarif = createSarif(audit.findings);
  await writeFile(sarifFile, `${JSON.stringify(sarif, null, 2)}\n`, "utf8");
  const failed = exceedsThreshold(audit.summary, inputs.failOn);
  return {
    findings: audit.findings,
    summary: audit.summary,
    sarif,
    sarifFile,
    failed,
    ...(failed ? { failureMessage: failureMessage(audit.summary, inputs.failOn) } : {}),
  };
}

export function exceedsThreshold(summary: AuditSummary, threshold: FailureThreshold): boolean {
  if (threshold === "none") return false;
  if (threshold === "warning") return summary.errors + summary.warnings > 0;
  return summary.errors > 0;
}

export function findingsForAnnotations(findings: readonly AuditFinding[], maximum: number): AuditFinding[] {
  return findings.slice(0, Math.max(0, maximum));
}

async function safeOutputPath(workspace: string, input: string): Promise<string> {
  if (!input || input.includes("\0")) throw new Error("sarif-file must be a non-empty project-relative path.");
  const root = await realpath(resolve(workspace));
  const output = resolve(root, input);
  assertInsideWorkspace(root, output);
  await mkdir(dirname(output), { recursive: true });
  const parent = await realpath(dirname(output));
  assertInsideWorkspace(root, parent);
  const finalPath = resolve(parent, basename(output));
  try {
    if ((await lstat(finalPath)).isSymbolicLink()) throw new Error("sarif-file cannot overwrite a symbolic link.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return finalPath;
}

function assertInsideWorkspace(root: string, output: string): void {
  const relation = relative(root, output);
  if (relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relation)) {
    throw new Error("sarif-file must stay inside GITHUB_WORKSPACE.");
  }
}

function failureMessage(summary: AuditSummary, threshold: FailureThreshold): string {
  return threshold === "warning"
    ? `Emoji Styles found ${summary.errors} error(s) and ${summary.warnings} warning(s).`
    : `Emoji Styles found ${summary.errors} policy error(s).`;
}
