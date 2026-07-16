import { AUDIT_RULES } from "./rules";
import type { AuditFinding } from "../types";

export interface SarifLog {
  version: "2.1.0";
  $schema: string;
  runs: unknown[];
}

export function createSarif(findings: readonly AuditFinding[]): SarifLog {
  const usedRules = new Set(findings.map((finding) => finding.ruleId));
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "Emoji Styles",
          informationUri: "https://github.com/Blancochuy/emoji-styles",
          rules: AUDIT_RULES.filter((rule) => usedRules.has(rule.id)).map((rule) => ({
            id: rule.id,
            name: rule.id.split("/").slice(-1)[0],
            shortDescription: { text: rule.title },
            fullDescription: { text: rule.description },
            defaultConfiguration: { level: sarifLevel(rule.defaultSeverity) },
          })),
        },
      },
      results: findings.map((finding) => ({
        ruleId: finding.ruleId,
        level: sarifLevel(finding.severity),
        message: { text: finding.message },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: finding.path },
            region: {
              startLine: finding.start.line,
              startColumn: finding.start.column,
              endLine: finding.end.line,
              endColumn: finding.end.column,
            },
          },
        }],
        ...(finding.fix?.safety === "safe" ? {
          fixes: [{
            description: { text: finding.fix.description },
            artifactChanges: [{
              artifactLocation: { uri: finding.path },
              replacements: finding.fix.edits.map((edit) => ({
                deletedRegion: offsetRegion(edit.start, edit.end),
                insertedContent: { text: edit.text },
              })),
            }],
          }],
        } : {}),
      })),
    }],
  };
}

function sarifLevel(severity: "info" | "warning" | "error"): "note" | "warning" | "error" {
  return severity === "info" ? "note" : severity;
}

function offsetRegion(start: number, end: number) {
  return { charOffset: start, charLength: Math.max(0, end - start) };
}
