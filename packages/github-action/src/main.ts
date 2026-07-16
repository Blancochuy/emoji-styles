import * as core from "@actions/core";
import { relative } from "node:path";
import { findingsForAnnotations, runAuditAction, type AuditActionInputs, type FailureThreshold } from "./action";

export async function main(): Promise<void> {
  try {
    const inputs = readInputs();
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const result = await runAuditAction(inputs, workspace);
    for (const finding of findingsForAnnotations(result.findings, inputs.maxAnnotations)) {
      const properties = {
        title: finding.ruleId,
        file: finding.path,
        startLine: finding.start.line,
        endLine: finding.end.line,
        startColumn: finding.start.column,
        endColumn: finding.end.column,
      };
      const message = finding.suggestion ? `${finding.message} ${finding.suggestion}` : finding.message;
      if (finding.severity === "error") core.error(message, properties);
      else if (finding.severity === "warning") core.warning(message, properties);
      else core.notice(message, properties);
    }
    if (result.findings.length > inputs.maxAnnotations) {
      core.notice(`${result.findings.length - inputs.maxAnnotations} additional finding(s) are available in the SARIF report.`);
    }
    core.setOutput("findings", result.summary.findings);
    core.setOutput("errors", result.summary.errors);
    core.setOutput("warnings", result.summary.warnings);
    core.setOutput("sarif-file", relative(workspace, result.sarifFile).split("\\").join("/"));
    await core.summary
      .addHeading("Emoji Styles audit", 2)
      .addTable([
        [{ data: "Files", header: true }, { data: "Findings", header: true }, { data: "Errors", header: true }, { data: "Warnings", header: true }, { data: "Fixable", header: true }],
        [String(result.summary.files), String(result.summary.findings), String(result.summary.errors), String(result.summary.warnings), String(result.summary.fixable)],
      ])
      .addRaw(`Policy: ${inputs.config || "emoji-styles.config.json"}`)
      .write();
    if (result.failed) core.setFailed(result.failureMessage ?? "Emoji Styles policy failed.");
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

function readInputs(): AuditActionInputs {
  const failOn = (core.getInput("fail-on") || "error") as FailureThreshold;
  if (!new Set<FailureThreshold>(["none", "warning", "error"]).has(failOn)) throw new Error("fail-on must be none, warning, or error.");
  const maxAnnotations = Number.parseInt(core.getInput("max-annotations") || "50", 10);
  if (!Number.isInteger(maxAnnotations) || maxAnnotations < 0 || maxAnnotations > 1_000) throw new Error("max-annotations must be between 0 and 1000.");
  return {
    path: core.getInput("path") || undefined,
    config: core.getInput("config") || undefined,
    sarifFile: core.getInput("sarif-file") || "emoji-styles.sarif",
    failOn,
    maxAnnotations,
  };
}

void main();
