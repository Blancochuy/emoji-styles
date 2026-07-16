import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatResult, runCli } from "../src/index";

const temporaryDirectories: string[] = [];

async function fixture(config: Record<string, unknown> = {}): Promise<string> {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-styles-audit-"));
  temporaryDirectories.push(cwd);
  await mkdir(resolve(cwd, "src"));
  await writeFile(resolve(cwd, "package.json"), JSON.stringify({ dependencies: { react: "19.2.7", "emoji-styles": "0.1.0" } }));
  await writeFile(resolve(cwd, "emoji-styles.config.json"), `${JSON.stringify({
    schemaVersion: 1,
    provider: "fluent-3d",
    fallbacks: ["twemoji"],
    nativeFallback: false,
    source: ["src"],
    policy: { allowRemoteAssets: true },
    ...config,
  }, null, 2)}\n`);
  return cwd;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("CLI audit and codemods", () => {
  it("audits JSX with stable accessibility, provider, and determinism rules", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "dashboard.test.tsx"), `export function Dashboard() {
  return <><button>🚀</button><img src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/1f680.png" /></>;
}\n`);

    const result = await runCli(["audit", "src"], { cwd });
    const data = result.data as { findings: Array<{ ruleId: string; path: string; start: { line: number }; fix?: { safety: string } }> };
    const rules = data.findings.map((finding) => finding.ruleId);
    expect(result.ok).toBe(false);
    expect(rules).toContain("emoji-styles/semantic/raw-emoji");
    expect(rules).toContain("emoji-styles/accessibility/missing-label");
    expect(rules).toContain("emoji-styles/determinism/native-critical-ui");
    expect(rules).toContain("emoji-styles/provider/direct-url");
    expect(rules).toContain("emoji-styles/provider/unpinned-url");
    expect(data.findings.some((finding) => finding.fix?.safety === "safe")).toBe(true);
    expect(data.findings.every((finding) => finding.path === "src/dashboard.test.tsx")).toBe(true);
    expect(data.findings.every((finding) => finding.start.line > 0)).toBe(true);
  });

  it("detects unknown providers and project fallback policy without flagging emoji props as raw text", async () => {
    const cwd = await fixture({ fallbacks: [] });
    await writeFile(resolve(cwd, "src", "app.tsx"), `import { Emoji } from "react-emoji-styles";
export const App = () => <Emoji emoji={"🚀"} provider="invented" />;\n`);

    const result = await runCli(["audit"], { cwd });
    const findings = (result.data as { findings: Array<{ ruleId: string }> }).findings;
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/provider/unknown" }));
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/provider/missing-fallback" }));
    expect(findings).not.toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/semantic/raw-emoji" }));
  });

  it("emits JSON and valid SARIF 2.1.0 output", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "app.tsx"), "export const App = () => <button>🔥</button>;\n");
    const jsonResult = await runCli(["audit", "--format", "json"], { cwd });
    const json = JSON.parse(formatResult(jsonResult));
    expect(json.data.summary.findings).toBeGreaterThan(0);

    const sarifResult = await runCli(["audit", "--format", "sarif"], { cwd });
    const sarif = JSON.parse(formatResult(sarifResult));
    expect(sarif).toMatchObject({ version: "2.1.0", runs: [{ tool: { driver: { name: "Emoji Styles" } } }] });
    expect(sarif.runs[0].results[0].ruleId).toMatch(/^emoji-styles\//);
  });

  it("previews a safe JSX accessibility fix and applies it only with approval", async () => {
    const cwd = await fixture();
    const path = resolve(cwd, "src", "app.tsx");
    const original = "export const App = () => <button>🚀</button>;\n";
    await writeFile(path, original);

    const preview = await runCli(["fix", "src", "--dry-run"], { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    expect((preview.data as { patch: string; unsafeFixes: number }).patch).toContain('aria-label="Rocket"');
    expect((preview.data as { unsafeFixes: number }).unsafeFixes).toBe(1);
    expect(await readFile(path, "utf8")).toBe(original);

    const applied = await runCli(["fix", "src", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    expect(await readFile(path, "utf8")).toContain('<button aria-label="Rocket">🚀</button>');
    const audit = await runCli(["audit", "src"], { cwd });
    expect((audit.data as { findings: Array<{ ruleId: string }> }).findings).not.toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/accessibility/missing-label" }));
  });

  it("parses HTML and produces a safe accessible-control patch", async () => {
    const cwd = await fixture();
    const path = resolve(cwd, "src", "index.html");
    await writeFile(path, "<!doctype html><button>💡</button>\n");
    const result = await runCli(["fix", "src"], { cwd });
    expect((result.data as { patch: string }).patch).toContain('aria-label="Light bulb"');
    expect(await readFile(path, "utf8")).toBe("<!doctype html><button>💡</button>\n");
  });

  it("finds emoji-only controls expressed through JSX expressions", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "app.tsx"), "export const App = () => <button>{'🎉'}</button>;\n");
    const result = await runCli(["fix", "src"], { cwd });
    expect((result.data as { patch: string }).patch).toContain('aria-label="Party popper"');
  });

  it("honors severity overrides and remote-asset policy", async () => {
    const cwd = await fixture({
      policy: {
        allowRemoteAssets: false,
        audit: { "emoji-styles/semantic/raw-emoji": "off" },
      },
    });
    await writeFile(resolve(cwd, "src", "app.tsx"), `export const App = () => <img src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1f680.png" />;\n`);
    const result = await runCli(["audit"], { cwd });
    const findings = (result.data as { findings: Array<{ ruleId: string }> }).findings;
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/provider/remote-forbidden" }));
    expect(findings).not.toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/semantic/raw-emoji" }));
  });

  it("reports raw emoji in JavaScript strings and source syntax errors", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "copy.ts"), "export const status = 'Production incident 🔥';\n");
    await writeFile(resolve(cwd, "src", "broken.ts"), "export const = ;\n");
    const result = await runCli(["audit"], { cwd });
    const findings = (result.data as { findings: Array<{ ruleId: string; path: string }> }).findings;
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/semantic/raw-emoji", path: "src/copy.ts" }));
    expect(findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/parser/invalid-source", path: "src/broken.ts" }));
  });

  it("rejects unknown audit-policy rule IDs", async () => {
    const cwd = await fixture({ policy: { audit: { "emoji-styles/not-a-rule": "warning" } } });
    const doctor = await runCli(["doctor"], { cwd });
    expect(doctor.ok).toBe(false);
    expect(doctor.checks).toContainEqual(expect.objectContaining({ id: "config/audit-policy", status: "fail" }));
  });

  it("reports missing or non-reproducible local provider manifests", async () => {
    const missingCwd = await fixture({ provider: "product", localAssets: { directory: "assets", manifest: "assets/emoji-provider.json" } });
    const missing = await runCli(["audit"], { cwd: missingCwd });
    expect((missing.data as { findings: Array<{ ruleId: string }> }).findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/provider/invalid-manifest" }));

    const hashCwd = await fixture({ provider: "product", localAssets: { directory: "assets", manifest: "assets/emoji-provider.json" } });
    await mkdir(resolve(hashCwd, "assets"));
    await writeFile(resolve(hashCwd, "assets", "emoji-provider.json"), JSON.stringify({
      id: "product",
      label: "Product emoji",
      version: "1.0.0",
      format: "png",
      basePath: ".",
      license: { name: "Proprietary", ownership: "Example Inc." },
      assets: { "🚀": { file: "1f680.png" } },
    }));
    const noHash = await runCli(["audit"], { cwd: hashCwd });
    expect((noHash.data as { findings: Array<{ ruleId: string }> }).findings).toContainEqual(expect.objectContaining({ ruleId: "emoji-styles/provider/missing-hash" }));
  });
});
