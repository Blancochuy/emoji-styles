import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { defineEmojiTheme, validateEmojiTheme } from "emoji-styles";
import { runCli } from "../src/index";
import type { AuditEmojiUsage, AuditFinding } from "../src/types";

const directories: string[] = [];
const example = `export const App = () => <>
<h1>Pricing 🚀</h1>
<button>Deploy 🚀</button>
<p>✅ All systems operational</p>
<p>⚠️ Payment failed</p>
<span aria-hidden="true">✨</span>
<a href="/settings">⚙️</a>
</>;`;
async function fixture(source = example, extension = "tsx") {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-design-"));
  directories.push(cwd);
  await mkdir(resolve(cwd, "src"));
  await writeFile(resolve(cwd, `src/app.${extension}`), source);
  await writeFile(resolve(cwd, "emoji-styles.config.json"), JSON.stringify({ schemaVersion: 1, provider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false, source: ["src"] }));
  return cwd;
}
function auditData(result: Awaited<ReturnType<typeof runCli>>) { return result.data as { usages: AuditEmojiUsage[]; findings: AuditFinding[] }; }
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("semantic audit and theme drafts", () => {
  it("distinguishes the six real contexts, preserves decoration, and reports the unnamed link", async () => {
    const cwd = await fixture();
    const { usages, findings } = auditData(await runCli(["audit", "--json"], { cwd }));
    expect(usages.map(({ role }) => role)).toEqual(["content", "control", "status", "status", "decorative", "control"]);
    expect(usages[2].evidence).toBe("heuristic");
    expect(usages[1].accessibleName).toBe("explicit");
    expect(usages[5].accessibleName).toBe("missing");
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("raw-emoji"))).toHaveLength(5);
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("missing-label"))).toEqual([expect.objectContaining({ message: expect.stringContaining("Emoji-only a") })]);
    expect((await readFile(resolve(cwd, "src/app.tsx"), "utf8"))).toBe(example);
  });

  it("writes valid theme proposals and an escaped actual-size sheet only with --yes", async () => {
    const cwd = await fixture();
    const preview = await runCli(["theme", "draft"], { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    await expect(readFile(resolve(cwd, ".emoji-styles/design-review/emoji-theme.ts"))).rejects.toThrow();
    const data = preview.data as { candidates: Array<{ token: string; emoji: string; label: string }>; usages: AuditEmojiUsage[] };
    expect(data.candidates.map(({ token }) => token)).toEqual(["content.pricing", "action.deploy", "status.success", "status.warning", "action.review"]);
    expect(data.candidates.some(({ emoji }) => emoji === "✨")).toBe(false);
    expect(validateEmojiTheme(defineEmojiTheme(Object.fromEntries(data.candidates.map(({ token, emoji, label }) => [token, { emoji, label }])))).valid).toBe(true);
    const applied = await runCli(["theme", "draft", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    for (const size of [16, 20, 24]) expect(html).toContain(`width="${size}" height="${size}"`);
    expect(html).toContain('class="light"');
    expect(html).toContain('class="dark"');
    expect(html).toContain("twemoji");
    expect(html).toContain("fluent-3d");
    expect(html).not.toContain("<script");
    expect(await runCli(["theme", "draft", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("already exist") });
    expect(await runCli(["theme", "draft", "--force", "--yes"], { cwd })).toMatchObject({ ok: true });
  });

  it("avoids invented action names and handles nested, hidden, dynamic and empty labels", async () => {
    const cwd = await fixture(`export const App = ({label, props}) => <>
<a href="/x" aria-label=" "><span>⚙️</span></a>
<button><span aria-hidden="true">🚀</span></button>
<button><span>Deploy</span> 🚀</button>
<button aria-label={label}>🚀</button>
<button aria-labelledby={label}>🚀</button>
<button {...props}>🚀</button>
<button aria-label={"Launch"}>🚀</button>
<button>{label} 🚀</button>
<button><Widget/> 🚀</button>
<div role="button">🚀</div>
<div aria-hidden={true}><button>🚀</button></div>
<span hidden={false}>✨</span>
</>`);
    const { findings, usages } = auditData(await runCli(["audit"], { cwd }));
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("missing-label"))).toHaveLength(3);
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("missing-label")).every(({ fix }) => fix === undefined)).toBe(true);
    expect(usages.filter(({ accessibleName }) => accessibleName === "unknown").length).toBeGreaterThanOrEqual(5);
    expect(usages.at(-1)?.role).toBe("content");
    await runCli(["fix", "--yes"], { cwd });
    expect(await readFile(resolve(cwd, "src/app.tsx"), "utf8")).not.toContain('aria-label="Rocket"');
  });

  it("applies the same evidence in HTML, including hidden=false boolean attributes", async () => {
    const cwd = await fixture('<h1>Pricing 🚀</h1><a href="/x" title=" "><span>⚙️</span></a><p role="status">✅ Ready</p><span hidden="false">✨</span><button aria-label="Deploy">🚀</button>', "html");
    const { findings, usages } = auditData(await runCli(["audit"], { cwd }));
    expect(usages.map(({ role }) => role)).toEqual(["content", "control", "status", "decorative", "control"]);
    expect(usages[2].evidence).toBe("explicit");
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("missing-label"))).toHaveLength(1);
  });

  it("keeps occurrences distinct and leaves strings/custom components uncertain", async () => {
    const cwd = await fixture('const title = "🚀"; export const App = () => <><p>🚀 🚀</p><Widget>🚀</Widget></>;');
    const { usages } = auditData(await runCli(["audit"], { cwd }));
    expect(usages.map(({ role }) => role)).toEqual(["unknown", "content", "content", "unknown"]);
    expect(new Set(usages.map(({ start }) => start.offset)).size).toBe(4);
  });

  it("keeps collisions reviewable, escapes source text and obeys offline policy", async () => {
    const cwd = await fixture('export const App = () => <><button>Deploy 🚀</button><button>Deploy 🔥</button><p>✅ Ready &lt;script&gt;alert(1)&lt;/script&gt;</p></>;');
    await writeFile(resolve(cwd, "emoji-styles.config.json"), JSON.stringify({ schemaVersion: 1, provider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false, source: ["src"], policy: { allowRemoteAssets: false } }));
    const result = await runCli(["theme", "draft", "--yes"], { cwd });
    expect(result.ok).toBe(true);
    const data = result.data as { candidates: Array<{ token: string }> };
    expect(data.candidates.map(({ token }) => token)).toContain("action.deploy2");
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/src="https:/);
    expect(html).toContain("Artwork unavailable");
  });

  it("embeds a real packed custom raster independent of its browser basePath", async () => {
    const cwd = await fixture();
    await mkdir(resolve(cwd, "raw"));
    await sharp({ create: { width: 64, height: 64, channels: 4, background: "#0000" } }).composite([{ input: Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="24" fill="purple"/></svg>') }]).png().toFile(resolve(cwd, "raw/1f680.png"));
    expect(await runCli(["assets", "pack", "raw", "public/emoji/product", "--id", "product", "--no-generated", "--source", "test", "--ownership", "test", "--yes"], { cwd })).toMatchObject({ ok: true });
    const args = ["theme", "draft", "--manifest", "public/emoji/product/emoji-provider.json", "--asset-root", "public/emoji/product/assets", "--yes"];
    const result = await runCli(args, { cwd });
    expect(result).toMatchObject({ ok: true });
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    expect(html).toContain("data:image/webp;base64,");
    expect(html).toContain("custom:product");
    expect(html).toContain("Artwork unavailable");
    await writeFile(resolve(cwd, "public/emoji/product/assets/1f680.webp"), "corrupted");
    expect(await runCli([...args, "--force"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("hash mismatch") });
  });

  it("refuses incomplete drafts even when parser findings are disabled", async () => {
    const cwd = await fixture('const broken = <button>');
    await writeFile(resolve(cwd, "emoji-styles.config.json"), JSON.stringify({ schemaVersion: 1, provider: "fluent-3d", fallbacks: ["twemoji"], source: ["src"], policy: { audit: { "emoji-styles/parser/invalid-source": "off" } } }));
    expect(await runCli(["theme", "draft", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("partial inventory") });
    await writeFile(resolve(cwd, "src/app.tsx"), " ".repeat(2 * 1024 * 1024 + 1));
    expect(await runCli(["theme", "draft", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("oversized") });
  });

  it("inventories literal renderer props without treating them as raw migrations", async () => {
    const cwd = await fixture('export const App = () => <><h1>Pricing <Emoji emoji="🚀"/></h1><button>Deploy <Emoji emoji={"🚀"}/></button><Emoji emoji="✨" aria-hidden={true}/></>;');
    const { findings, usages } = auditData(await runCli(["audit"], { cwd }));
    expect(usages.map(({ role }) => role)).toEqual(["content", "control", "decorative"]);
    expect(findings.filter(({ ruleId }) => ruleId.endsWith("raw-emoji"))).toHaveLength(0);
    expect(usages[0].context).toBe("Pricing");
  });

  it("rejects invalid sources, unsupported providers, incomplete custom flags and symlink outputs", async () => {
    const cwd = await fixture();
    expect(await runCli(["theme", "draft", "--providers", "unknown"], { cwd })).toMatchObject({ ok: false });
    expect(await runCli(["theme", "draft", "--manifest", "foo"], { cwd })).toMatchObject({ ok: false });
    expect(await runCli(["theme", "draft", "missing"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("No supported source") });
    await symlink(resolve(cwd, "src"), resolve(cwd, "linked"));
    expect(await runCli(["theme", "draft", "--output", "linked", "--yes", "--force"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("symlink") });
    await writeFile(resolve(cwd, "src/app.tsx"), 'const x = <button>');
    expect(await runCli(["theme", "draft"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("parse errors") });
  });
});
