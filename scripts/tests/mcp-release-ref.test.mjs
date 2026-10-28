import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(fileURLToPath(new URL("../../.github/workflows/npm-mcp-release.yml", import.meta.url)), "utf8");
const block = workflow.split("      - name: Require an immutable MCP tag integrated into master\n")[1].split("\n  validate:")[0];
const script = block.split("        run: |\n")[1].split("\n").map((line) => line.slice(10)).join("\n");
function run(overrides = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "cli-release-ref-"));
  try {
    mkdirSync(join(cwd, "packages/mcp"), { recursive: true });
    writeFileSync(join(cwd, "packages/mcp/package.json"), JSON.stringify({ version: "0.1.0", private: overrides.private ?? false }));
    const env = { ...process.env, RELEASE_REF: "mcp-v0.1.0", WORKFLOW_REF: "refs/tags/mcp-v0.1.0", GITHUB_SHA: "verified-commit", GITHUB_OUTPUT: join(cwd, "outputs"), ...overrides };
    const mock = `git() { case "$1" in tag) echo mcp-v0.1.0;; merge-base) test "$UNMERGED" != true;; rev-parse) echo verified-commit;; *) return 2;; esac; };\n`;
    try { execFileSync("bash", ["-e", "-c", mock + script], { cwd, env, stdio: "pipe" }); return true; }
    catch { return false; }
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}
describe("MCP tag/source/provenance guard", () => {
  it("accepts the matching tag and workflow source integrated into master", () => { expect(run()).toBe(true); });
  it.each([
    { RELEASE_REF: "master" }, { RELEASE_REF: "v0.1.0" }, { RELEASE_REF: "mcp-v9.0.0" },
    { WORKFLOW_REF: "refs/heads/master" }, { GITHUB_SHA: "different-commit" },
    { UNMERGED: "true" }, { private: true },
  ])("rejects unsafe release source %j", (overrides) => { expect(run(overrides)).toBe(false); });
});
