import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
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
function elements(html: string, tag: string) {
  const output: DefaultTreeAdapterMap["element"][] = [];
  const visit = (node: DefaultTreeAdapterMap["node"]) => {
    if ("tagName" in node && node.tagName === tag) output.push(node);
    if ("childNodes" in node) node.childNodes.forEach(visit);
  };
  visit(parseFragment(html));
  return output;
}
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
    expect(data.candidates.map(({ token }) => token)).toEqual(["content.pricing", "action.deploy", "status.success", "status.review", "action.review"]);
    expect(data.candidates.some(({ emoji }) => emoji === "✨")).toBe(false);
    expect(validateEmojiTheme(defineEmojiTheme(Object.fromEntries(data.candidates.map(({ token, emoji, label }) => [token, { emoji, label }])))).valid).toBe(true);
    const applied = await runCli(["theme", "draft", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    for (const size of [16, 20, 24]) expect(html).toContain(`width="${size}" height="${size}"`);
    expect(html).toContain('class="matrix light"');
    expect(html).toContain('class="matrix dark"');
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

  it("distinguishes failures from warnings and uses conventional glyphs only in explicit status regions", async () => {
    const cwd = await fixture(`export const App = () => <>
<p>⚠️ Payment failed</p><p>⚠️ Warning: storage low</p>
<p role="alert">❌ No se pudo guardar</p><p role="status">⚠️ Espacio limitado</p>
<p role="status">✅ Guardado</p><p>❌ No se pudo guardar</p>
</>`);
    const result = await runCli(["theme", "draft"], { cwd });
    expect(result.ok).toBe(true);
    const data = result.data as { candidates: Array<{ token: string; emoji: string; label: string; reason: string; reviewRequired: boolean }> };
    expect(data.candidates.map(({ token }) => token)).toEqual(["status.review", "status.warning", "status.error", "status.success", "content.no.se.pudo"]);
    expect(data.candidates[0]).toMatchObject({ token: "status.review", emoji: "⚠️", themeIncluded: false, statusConflict: { textSeverity: "error", glyphSeverity: "warning" } });
    expect(data.candidates[2].reason).toContain("explicit status region and conventional glyph");
    expect(data.candidates.every(({ reviewRequired }) => reviewRequired)).toBe(true);
  });

  it("normalizes Spanish diacritics and canonically equivalent Unicode labels", async () => {
    const cwd = await fixture('export const App = () => <><button>Configuración ⚙️</button><button>Añadir cuenta ➕</button><button>Configuracio\u0301n ⚙️</button></>;');
    const result = await runCli(["theme", "draft"], { cwd });
    const data = result.data as { candidates: Array<{ token: string; label: string; usages: unknown[] }> };
    expect(data.candidates.map(({ token }) => token)).toEqual(["action.configuracion", "action.anadir.cuenta"]);
    expect(data.candidates[0].label).toBe("Configuración");
    expect(data.candidates[0].usages).toHaveLength(2);
  });

  it("reports contradictory wording and glyphs without exporting either severity", async () => {
    const cwd = await fixture('export const App = () => <><p>✅ 0 failed checks</p><p role="status">❌ All systems operational</p><p>⚠️ Payment failed</p></>;');
    const result = await runCli(["theme", "draft", "--yes"], { cwd });
    expect(result.ok).toBe(true);
    const data = result.data as { candidates: Array<{ token: string; semanticToken?: string; themeIncluded: boolean }>; statusConflicts: Array<{ textSeverity: string; glyphSeverity: string }>; themeSource: string };
    expect(data.statusConflicts).toEqual([
      expect.objectContaining({ textSeverity: "error", glyphSeverity: "success" }),
      expect.objectContaining({ textSeverity: "success", glyphSeverity: "error" }),
      expect.objectContaining({ textSeverity: "error", glyphSeverity: "warning" }),
    ]);
    expect(data.candidates.every((candidate) => !candidate.themeIncluded && !candidate.semanticToken)).toBe(true);
    expect(data.themeSource).not.toContain('"status.error"');
    expect(data.themeSource).not.toContain('"status.success"');
    expect(data.themeSource).not.toContain('"status.review"');
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    expect(html).toContain("Unresolved states");
    expect(html).toContain("wording suggests error, glyph suggests success");
    expect(html).toContain("Unresolved: excluded from theme");
  });

  it("uses one canonical state for multiple messages sharing one glyph, preserving all contexts", async () => {
    const cwd = await fixture('export const App = () => <><p role="alert">❌ No se pudo guardar</p><p role="alert">❌ Falló la conexión</p><p role="alert">❌</p></>;');
    const result = await runCli(["theme", "draft", "--yes"], { cwd });
    const data = result.data as { candidates: Array<{ token: string; label: string; themeIncluded: boolean; sourceLabels: string[]; usages: unknown[] }>; statusHints: unknown[]; themeSource: string };
    expect(data.candidates).toHaveLength(1);
    expect(data.candidates[0]).toMatchObject({ token: "status.error", label: "Error", themeIncluded: true, sourceLabels: ["No se pudo guardar", "Falló la conexión", ""] });
    expect(data.candidates[0].usages).toHaveLength(3);
    expect(data.statusHints).toEqual([]);
    expect(data.themeSource).toContain('"status.error"');
    expect(data.themeSource).not.toContain('"status.error2"');
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    expect(html).toContain("No se pudo guardar");
    expect(html).toContain("Falló la conexión");
  });

  it("groups competing artwork by canonical state and requires a choice before theme export", async () => {
    const cwd = await fixture('export const App = () => <><p role="status">⚠️ Payment failed</p><p>✅ 0 failed checks</p><p role="alert">❌ No se pudo guardar</p></>;');
    let result = await runCli(["theme", "draft"], { cwd });
    const data = result.data as { candidates: Array<{ themeIncluded: boolean }>; statusHints: Array<{ semanticToken: string; emojis: string[]; conflictedTokens: string[] }>; themeSource: string };
    expect(data.statusHints).toEqual([expect.objectContaining({ semanticToken: "status.error", emojis: ["⚠️", "✅", "❌"], conflictedTokens: ["status.review", "status.review2"] })]);
    expect(data.candidates.every(({ themeIncluded }) => !themeIncluded)).toBe(true);
    expect(data.themeSource).not.toContain('"status.error"');
    // Different conventional error glyphs also require a choice without wording conflicts.
    await writeFile(resolve(cwd, "src/app.tsx"), 'export const App = () => <><p role="alert">❌ No se pudo guardar</p><p role="alert">⛔ Acceso denegado</p></>;');
    result = await runCli(["theme", "draft"], { cwd });
    expect(result.data).toMatchObject({ statusConflicts: [], statusHints: [expect.objectContaining({ semanticToken: "status.error", emojis: ["❌", "⛔"], conflictedTokens: [] })] });
    expect((result.data as { themeSource: string }).themeSource).not.toContain('"status.error"');
  });

  it("suggests reviewing shared control artwork without merging distinct actions or matching content", async () => {
    const cwd = await fixture(`export const App = () => <>
<a href="/settings">⚙️</a><button>Abrir ajustes ⚙️</button>
<button>Deploy 🚀</button><button>Launch 🚀</button><h1>Pricing 🚀</h1>
<button>Deploy 🚀</button><button>Save ✅</button><button>Save ✅</button>
</>`);
    const result = await runCli(["theme", "draft", "--yes"], { cwd });
    const data = result.data as { candidates: Array<{ token: string }>; reuseHints: Array<{ emoji: string; tokens: string[]; occurrences: number; reviewRequired: boolean }> };
    expect(data.candidates.map(({ token }) => token)).toContain("action.review");
    expect(data.candidates.map(({ token }) => token)).toContain("action.abrir.ajustes");
    expect(data.reuseHints).toEqual([
      expect.objectContaining({ emoji: "⚙️", tokens: ["action.review", "action.abrir.ajustes"], occurrences: 2, reviewRequired: true }),
      expect.objectContaining({ emoji: "🚀", tokens: ["action.deploy", "action.launch"], occurrences: 3, reviewRequired: true }),
    ]);
    const stored = JSON.parse(await readFile(resolve(cwd, ".emoji-styles/design-review/review.json"), "utf8"));
    expect(stored.reuseHints).toEqual(data.reuseHints);
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    expect(html).toContain("Shared control artwork");
    expect(html).toContain("shared artwork alone does not establish shared meaning");
  });

  it("puts the complete eleven-token set into two 20px provider matrices with working detail links", async () => {
    const actions = ["Deploy", "Settings", "Delete", "Save", "Share", "Download", "Search", "Close", "Refresh"];
    const cwd = await fixture(`export const App = () => <>${actions.map((label) => `<button>${label} 🚀</button>`).join("")}<p role="alert">❌ No se pudo guardar</p><p role="status">⚠️ Espacio limitado</p><span aria-hidden="true">✨</span></>`);
    expect(await runCli(["theme", "draft", "--yes"], { cwd })).toMatchObject({ ok: true });
    const html = await readFile(resolve(cwd, ".emoji-styles/design-review/token-sheet.html"), "utf8");
    const tables = elements(html, "table");
    expect(tables).toHaveLength(2);
    // Parsed DOM assertions cover both provider matrices independently of CSS wording.
    const descendants = (node: DefaultTreeAdapterMap["node"], tag: string): DefaultTreeAdapterMap["element"][] => {
      return [ ...("tagName" in node && node.tagName === tag ? [node] : []), ...("childNodes" in node ? node.childNodes.flatMap((child) => descendants(child, tag)) : []) ];
    };
    for (const table of tables) {
      expect(descendants(table, "tr")).toHaveLength(12);
      expect(descendants(table, "img")).toHaveLength(22);
      expect(descendants(table, "img").every(({ attrs }) => attrs.some(({ name, value }) => name === "width" && value === "20") && attrs.some(({ name, value }) => name === "height" && value === "20"))).toBe(true);
      const links = descendants(table, "a");
      expect(links).toHaveLength(11);
      for (const { attrs } of links) {
        const href = attrs.find(({ name }) => name === "href")!.value;
        expect(elements(html, "section").some(({ attrs }) => attrs.some(({ name, value }) => name === "id" && `#${value}` === href))).toBe(true);
      }
    }
    expect(html.indexOf('id="overview"')).toBeLessThan(html.indexOf('id="token-1"'));
    expect(html).toContain('width="16" height="16"');
    expect(html).toContain('width="24" height="24"');
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
