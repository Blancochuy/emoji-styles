import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { compileEmojiTheme, defineEmojiTheme, getEmojiUrl, serializeEmojiTheme } from "emoji-styles";
import { formatResult, runCli } from "../src/index";
import { THEME_COMPILER_REQUIREMENT, loadThemeCompiler } from "../src/commands/theme-compile";

const binary = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const directories: string[] = [];
const theme = defineEmojiTheme({
  "action.deploy": { emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" } },
  "action.home": { emoji: "🏠", label: "Home", decorative: true },
}, { id: "app", version: "1.2.0", defaultProvider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false });
async function project(files: Record<string, string> = { "theme.json": serializeEmojiTheme(theme) }) {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-compile-"));
  directories.push(cwd);
  for (const [name, contents] of Object.entries(files)) {
    await mkdir(resolve(cwd, name, ".."), { recursive: true });
    await writeFile(resolve(cwd, name), contents);
  }
  return cwd;
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const compile = (cwd: string, ...args: string[]) => runCli(["theme", "compile", "theme.json", "--output", "src/emoji-theme.compiled.ts", ...args], { cwd });

describe("theme compile", () => {
  it("previews without writing, then writes only with --yes", async () => {
    const cwd = await project();
    const preview = await compile(cwd);
    expect(preview).toMatchObject({ ok: true, applied: false, changes: [{ action: "create" }], data: { tokens: 2, upToDate: false } });
    expect(preview.summary).toContain("Rerun with --yes");
    await expect(readFile(resolve(cwd, "src/emoji-theme.compiled.ts"))).rejects.toThrow();
    const applied = await compile(cwd, "--yes");
    expect(applied).toMatchObject({ ok: true, applied: true });
    const source = await readFile(resolve(cwd, "src/emoji-theme.compiled.ts"), "utf8");
    expect(source).toContain('export type EmojiTokenName = "action.deploy" | "action.home";');
    expect(source).toContain(getEmojiUrl("🚀", "fluent-3d"));
    expect(source).toBe((applied.data as { source: string }).source);
    expect(JSON.parse(formatResult(applied, true))).toMatchObject({ command: "theme compile", ok: true, applied: true });
  });

  it("matches the core compiler and is deterministic", async () => {
    const cwd = await project();
    await compile(cwd, "--yes");
    const source = await readFile(resolve(cwd, "src/emoji-theme.compiled.ts"), "utf8");
    const { renderCompiledEmojiThemeModule } = await import("emoji-styles");
    expect(source).toBe(renderCompiledEmojiThemeModule(await compileEmojiTheme(theme)));
  });

  it("refuses to overwrite a different file without --force, and treats identical output as up to date", async () => {
    const cwd = await project();
    await compile(cwd, "--yes");
    expect(await compile(cwd, "--yes")).toMatchObject({ ok: true, applied: false, summary: expect.stringContaining("already up to date") });
    await writeFile(resolve(cwd, "src/emoji-theme.compiled.ts"), "// hand edited\n");
    expect(await compile(cwd, "--yes")).toMatchObject({ ok: false, error: { kind: "operation" }, summary: expect.stringContaining("--force") });
    expect(await readFile(resolve(cwd, "src/emoji-theme.compiled.ts"), "utf8")).toBe("// hand edited\n");
    expect(await compile(cwd, "--yes", "--force")).toMatchObject({ ok: true, applied: true, changes: [{ action: "update" }] });
    expect(await readFile(resolve(cwd, "src/emoji-theme.compiled.ts"), "utf8")).toContain("compiledEmojiTheme");
  });

  it("--check passes when current and fails with a reason when the theme, data or provider revision is stale", async () => {
    const cwd = await project();
    expect(await compile(cwd, "--check")).toMatchObject({ ok: false, error: { code: "COMPILED_THEME_STALE", kind: "operation" }, summary: expect.stringContaining("does not exist") });
    await compile(cwd, "--yes");
    expect(await compile(cwd, "--check")).toMatchObject({ ok: true, applied: false, summary: expect.stringContaining("up to date") });

    const output = resolve(cwd, "src/emoji-theme.compiled.ts");
    const current = await readFile(output, "utf8");
    const stale = async (edit: (source: string) => string, reason: string) => {
      await writeFile(output, edit(current));
      expect(await compile(cwd, "--check")).toMatchObject({ ok: false, error: { code: "COMPILED_THEME_STALE" }, summary: expect.stringContaining(reason) });
    };
    await stale((source) => source.replace('"label": "Deploy"', '"label": "Ship"'), "changed tokens: action.deploy");
    await stale((source) => source.replace('"emojiVersion": "', '"emojiVersion": "0.'), "emoji data changed");
    await stale((source) => source.replace(/("id": "fluent-3d",\s+"version": ")[0-9a-f]+/, "$1deadbeef"), "provider revisions or licenses changed");
    await stale((source) => source.replace('"version": "1.2.0"', '"version": "1.1.0"'), "theme changed from app@1.1.0 to app@1.2.0");
    await writeFile(output, "// something else\n");
    expect(await compile(cwd, "--check")).toMatchObject({ ok: false, summary: expect.stringContaining("not generated by theme compile") });
    // The theme itself changing is also detected.
    await writeFile(output, current);
    await writeFile(resolve(cwd, "theme.json"), serializeEmojiTheme(defineEmojiTheme({ ...theme.tokens, "action.new": { emoji: "✅", label: "New" } }, { id: "app", version: "1.2.0", defaultProvider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false })));
    expect(await compile(cwd, "--check")).toMatchObject({ ok: false, summary: expect.stringContaining("added tokens: action.new") });
    expect(await readFile(output, "utf8")).toBe(current);
  });

  it("reports usage errors (exit code 2) for missing options and incompatible flags", async () => {
    const cwd = await project();
    expect(await runCli(["theme", "compile", "theme.json"], { cwd })).toMatchObject({ ok: false, error: { kind: "usage" } });
    expect(await runCli(["theme", "compile"], { cwd })).toMatchObject({ ok: false, error: { kind: "usage" } });
    expect(await compile(cwd, "--check", "--yes")).toMatchObject({ ok: false, error: { kind: "usage" } });
    expect(await compile(cwd, "--bogus")).toMatchObject({ ok: false, error: { kind: "usage" } });
  });

  it("keeps paths inside the project, rejects symlinked outputs and reports missing modules", async () => {
    const cwd = await project();
    expect(await runCli(["theme", "compile", "../theme.json", "--output", "out.ts"], { cwd })).toMatchObject({ ok: false, error: { kind: "operation" }, summary: expect.stringContaining("inside the project") });
    expect(await compile(cwd, "--output", "../escape.ts")).toMatchObject({ ok: false });
    expect(await runCli(["theme", "compile", "missing.json", "--output", "out.ts"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("not found") });
    await mkdir(resolve(cwd, "real"));
    await symlink(resolve(cwd, "real"), resolve(cwd, "linked"));
    expect(await runCli(["theme", "compile", "theme.json", "--output", "linked/out.ts", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("symlinks") });
  });

  it("loads ESM modules (default or emojiTheme export) and rejects ambiguous or missing exports", async () => {
    const tokens = { "action.deploy": { emoji: "🚀", label: "Deploy" } };
    const cwd = await project({
      "default.mjs": `export default ${JSON.stringify({ id: "esm", version: "3.0.0", defaultProvider: "twemoji", nativeFallback: true, tokens })};`,
      "named.mjs": `export const emojiTheme = ${JSON.stringify({ tokens })}; export const other = 1;`,
      "two.mjs": `export const a = ${JSON.stringify({ tokens })}; export const b = ${JSON.stringify({ tokens })};`,
      "none.mjs": "export const nothing = 1;",
      "bad.json": JSON.stringify({ schemaVersion: 1, tokens: { nodots: { emoji: "x", label: "" } } }),
      "bad-ext.yaml": "tokens: {}",
    });
    const run = (module: string) => runCli(["theme", "compile", module, "--output", "out.ts", "--json"], { cwd });
    expect(await run("default.mjs")).toMatchObject({ ok: true, data: { theme: { id: "esm", version: "3.0.0" }, tokens: 1 } });
    expect(await run("named.mjs")).toMatchObject({ ok: true, data: { theme: { id: "migrated" } } });
    expect(await run("two.mjs")).toMatchObject({ ok: false, summary: expect.stringContaining("several themes (a, b)") });
    expect(await run("none.mjs")).toMatchObject({ ok: false, summary: expect.stringContaining("no theme export") });
    expect(await run("bad.json")).toMatchObject({ ok: false });
    expect(await run("bad-ext.yaml")).toMatchObject({ ok: false, summary: expect.stringContaining("Unsupported theme module extension") });
  });

  it("explains ESM syntax in a module that Node loads as CommonJS", async () => {
    // Run the built executable: the in-process runner goes through vitest's module loader, which ignores package.json "type".
    const esm = `export default ${JSON.stringify({ tokens: { "action.deploy": { emoji: "🚀", label: "Deploy" } } })};`;
    const cwd = await project({ "package.json": JSON.stringify({ type: "commonjs" }), "theme.js": esm, "theme.mjs": esm });
    const run = async (module: string) => {
      try {
        return { code: 0, ...await promisify(execFile)(process.execPath, [binary, "theme", "compile", module, "--output", "out.ts", "--json"], { cwd }) };
      } catch (error) {
        const failure = error as { code: number; stdout: string };
        return { code: failure.code, stdout: failure.stdout };
      }
    };
    const failed = await run("theme.js");
    expect(failed.code).toBe(1);
    const result = JSON.parse(failed.stdout) as { ok: boolean; error: { kind: string }; summary: string };
    expect(result).toMatchObject({ ok: false, error: { kind: "operation" }, summary: expect.stringContaining("Could not import the theme module: ") });
    expect(result.summary).toContain('rename it to .mts/.mjs, set "type": "module", or use a .json theme');
    expect((await run("theme.mjs")).code).toBe(0);
  });

  it("applies --export-name and --type-name, and warns about tokens that would render nothing", async () => {
    const quiet = defineEmojiTheme({ "status.fresh": { emoji: "🫩", label: "Tired" } }, { id: "warn", defaultProvider: "twemoji", nativeFallback: false });
    const cwd = await project({ "theme.json": serializeEmojiTheme(quiet) });
    const result = await compile(cwd, "--export-name", "iconTheme", "--type-name", "IconToken");
    expect(result.data).toMatchObject({ warnings: [expect.stringContaining("status.fresh has no artwork source")] });
    expect((result.data as { source: string }).source).toContain("export const iconTheme: CompiledEmojiTheme<IconToken> =");
    expect(await compile(cwd, "--export-name", "not valid")).toMatchObject({ ok: false, error: { kind: "operation" }, summary: expect.stringContaining("Invalid export name") });
  });
  it.each([
    ["--export-name", "default"],
    ["--export-name", "class"],
    ["--type-name", "string"],
    ["--type-name", "CompiledEmojiTheme"],
  ])("rejects %s %s before creating or replacing output", async (flag, name) => {
    const cwd = await project();
    const args = [flag, name, "--yes"];
    expect(await compile(cwd, ...args)).toMatchObject({ ok: false, error: { kind: "operation" }, summary: expect.stringContaining("Invalid") });
    const output = resolve(cwd, "src/emoji-theme.compiled.ts");
    await expect(readFile(output, "utf8")).rejects.toThrow();
    await mkdir(resolve(cwd, "src"));
    await writeFile(output, "// existing reviewed theme\n");
    expect(await compile(cwd, ...args, "--force")).toMatchObject({ ok: false, summary: expect.stringContaining("Invalid") });
    expect(await readFile(output, "utf8")).toBe("// existing reviewed theme\n");
  });

  it("refuses an unreviewed theme draft in every mode unless --allow-draft is given", async () => {
    const draft = defineEmojiTheme({
      "action.deploy": { emoji: "🚀", label: "Review: deploy status" },
      "action.review": { emoji: "🗑️", label: "REVIEW: name this control", labels: { es: "Eliminar" } },
      "action.home": { emoji: "🏠", label: "Home", labels: { es: " REVIEW: name this control" } },
    }, { id: "review-draft", defaultProvider: "fluent-3d", nativeFallback: false });
    const cwd = await project({ "theme.json": serializeEmojiTheme(draft) });
    const output = resolve(cwd, "src/emoji-theme.compiled.ts");
    for (const args of [[], ["--yes"], ["--yes", "--force"], ["--check"]]) {
      const result = await compile(cwd, ...args);
      expect(result).toMatchObject({ ok: false, applied: false, error: { code: "THEME_DRAFT_UNREVIEWED", kind: "operation" }, summary: expect.stringContaining("--allow-draft") });
      expect((result.data as { draftMarkers: string[] }).draftMarkers).toEqual([
        'theme id is "review-draft"',
        'action.home labels.es is the placeholder " REVIEW: name this control"',
        'action.review label is the placeholder "REVIEW: name this control"',
      ]);
    }
    await expect(readFile(output)).rejects.toThrow();

    const preview = await compile(cwd, "--yes", "--allow-draft");
    expect(preview).toMatchObject({ ok: true, applied: true });
    expect((preview.data as { warnings: string[] }).warnings).toHaveLength(3);

    const reviewed = defineEmojiTheme(Object.fromEntries(Object.entries(draft.tokens).map(([token, entry]) => [token, { ...entry, label: entry.label.replace(/^REVIEW:.*/, "Delete project"), labels: { es: "Inicio" } }])), { id: "app", defaultProvider: "fluent-3d", nativeFallback: false });
    const approved = await project({ "theme.json": serializeEmojiTheme(reviewed) });
    expect(await compile(approved, "--yes")).toMatchObject({ ok: true, applied: true, data: { warnings: [] } });
  });

  it("reports an installed core without the compiler instead of failing to load", async () => {
    await expect(loadThemeCompiler(async () => ({}))).rejects.toThrow(THEME_COMPILER_REQUIREMENT);
    await expect(loadThemeCompiler()).resolves.toMatchObject({ compileEmojiTheme: expect.any(Function) });
  });
});
