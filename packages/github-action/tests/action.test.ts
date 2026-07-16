import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exceedsThreshold, findingsForAnnotations, runAuditAction } from "../src/action";

const temporaryDirectories: string[] = [];

async function fixture(severity = "error"): Promise<string> {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-styles-action-"));
  temporaryDirectories.push(cwd);
  await mkdir(resolve(cwd, "src"));
  await writeFile(resolve(cwd, "emoji-styles.config.json"), JSON.stringify({
    schemaVersion: 1,
    provider: "fluent-3d",
    fallbacks: ["twemoji"],
    nativeFallback: false,
    source: ["src"],
    policy: { audit: { "emoji-styles/accessibility/missing-label": severity } },
  }));
  await writeFile(resolve(cwd, "src", "app.tsx"), "export const App = () => <button>🚀</button>;\n");
  return cwd;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Emoji Styles GitHub Action", () => {
  it("writes valid SARIF and fails at the configured error threshold", async () => {
    const cwd = await fixture();
    const result = await runAuditAction({ sarifFile: "reports/emoji.sarif", failOn: "error", maxAnnotations: 50 }, cwd);
    const saved = JSON.parse(await readFile(resolve(cwd, "reports", "emoji.sarif"), "utf8"));

    expect(result.failed).toBe(true);
    expect(result.summary.errors).toBeGreaterThan(0);
    expect(saved).toMatchObject({ version: "2.1.0", runs: [{ tool: { driver: { name: "Emoji Styles" } } }] });
    expect(result.findings).toContainEqual(expect.objectContaining({ path: "src/app.tsx", start: expect.objectContaining({ line: 1 }) }));
  });

  it("honors project policy and selectable failure thresholds", async () => {
    const cwd = await fixture("warning");
    const errorOnly = await runAuditAction({ sarifFile: "error.sarif", failOn: "error", maxAnnotations: 50 }, cwd);
    const warningsToo = await runAuditAction({ sarifFile: "warning.sarif", failOn: "warning", maxAnnotations: 50 }, cwd);

    expect(errorOnly.failed).toBe(false);
    expect(warningsToo.failed).toBe(true);
    expect(exceedsThreshold(warningsToo.summary, "none")).toBe(false);
  });

  it("keeps SARIF output inside the checked-out workspace", async () => {
    const cwd = await fixture();
    await expect(runAuditAction({ sarifFile: "../outside.sarif", failOn: "none", maxAnnotations: 50 }, cwd))
      .rejects.toThrow("must stay inside GITHUB_WORKSPACE");
  });

  it("rejects a SARIF directory symlink that escapes the workspace", async () => {
    const cwd = await fixture();
    const outside = await fixture();
    await symlink(outside, resolve(cwd, "linked-reports"));
    await expect(runAuditAction({ sarifFile: "linked-reports/audit.sarif", failOn: "none", maxAnnotations: 50 }, cwd))
      .rejects.toThrow("must stay inside GITHUB_WORKSPACE");
  });

  it("does not overwrite a SARIF file symlink", async () => {
    const cwd = await fixture();
    const outside = resolve(await fixture(), "outside.sarif");
    await writeFile(outside, "untouched");
    await symlink(outside, resolve(cwd, "audit.sarif"));
    await expect(runAuditAction({ sarifFile: "audit.sarif", failOn: "none", maxAnnotations: 50 }, cwd))
      .rejects.toThrow("cannot overwrite a symbolic link");
    expect(await readFile(outside, "utf8")).toBe("untouched");
  });

  it("caps annotations without dropping SARIF findings", async () => {
    const cwd = await fixture();
    const result = await runAuditAction({ sarifFile: "emoji.sarif", failOn: "none", maxAnnotations: 1 }, cwd);
    expect(findingsForAnnotations(result.findings, 1)).toHaveLength(1);
    expect(result.findings.length).toBeGreaterThan(1);
  });
});
