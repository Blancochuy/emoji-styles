import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { CONFIG_FILENAME, runCli } from "../src/index";

const temporaryDirectories: string[] = [];

async function fixture(): Promise<string> {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-styles-cli-"));
  temporaryDirectories.push(cwd);
  await writeFile(resolve(cwd, "package.json"), JSON.stringify({ dependencies: { react: "19.2.7", "emoji-styles": "0.1.0" } }));
  await writeFile(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await mkdir(resolve(cwd, "src"));
  return cwd;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("CLI foundation", () => {
  it("previews init without writing and applies only with --yes", async () => {
    const cwd = await fixture();
    const preview = await runCli(["init", "--provider", "twemoji"], { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    await expect(readFile(resolve(cwd, CONFIG_FILENAME), "utf8")).rejects.toThrow();

    const applied = await runCli(["init", "--provider", "twemoji", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    expect(JSON.parse(await readFile(resolve(cwd, CONFIG_FILENAME), "utf8"))).toMatchObject({ provider: "twemoji", fallbacks: ["twemoji"], nativeFallback: true });
  });

  it("does not overwrite an existing config without --force", async () => {
    const cwd = await fixture();
    await runCli(["init", "--yes"], { cwd });
    const result = await runCli(["init", "--yes", "--provider", "noto"], { cwd });
    expect(result.ok).toBe(false);
    expect(JSON.parse(await readFile(resolve(cwd, CONFIG_FILENAME), "utf8")).provider).toBe("fluent-3d");
  });

  it("configures a non-native terminal policy explicitly", async () => {
    const cwd = await fixture();
    await runCli(["init", "--fallback", "noto,twemoji", "--no-native-fallback", "--yes"], { cwd });
    const config = JSON.parse(await readFile(resolve(cwd, CONFIG_FILENAME), "utf8"));
    expect(config).toMatchObject({ fallbacks: ["noto", "twemoji"], nativeFallback: false });
    const doctor = await runCli(["doctor"], { cwd });
    expect(doctor.checks).toContainEqual(expect.objectContaining({ id: "config/native-fallback", status: "pass", message: "Native OS fallback is disabled" }));
  });

  it("rejects output paths outside the project", async () => {
    const cwd = await fixture();
    const result = await runCli(["init", "--config", "../escaped.json", "--yes"], { cwd });
    expect(result.ok).toBe(false);
    expect(result.summary).toContain("inside the project");
  });

  it("doctors configuration and validates used emoji deterministically", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "app.tsx"), "export const label = 'Launch 🚀';\n");
    await runCli(["init", "--yes", "--provider", "twemoji"], { cwd });
    const doctor = await runCli(["doctor"], { cwd });
    const test = await runCli(["test"], { cwd });
    expect(doctor.ok).toBe(true);
    expect(doctor.checks?.some((check) => check.id === "provider/primary" && check.status === "pass")).toBe(true);
    expect(test.ok).toBe(true);
    expect(test.data).toMatchObject({ used: ["🚀"] });
  });

  it("creates a hashed local provider only after approval", async () => {
    const cwd = await fixture();
    const assets = resolve(cwd, "assets");
    await mkdir(assets);
    await writeFile(resolve(assets, "1f680.png"), new Uint8Array([137, 80, 78, 71]));
    const preview = await runCli(["provider", "create", "assets", "--id", "product", "--ownership", "Example Inc."], { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    await expect(readFile(resolve(assets, "emoji-provider.json"), "utf8")).rejects.toThrow();
    const applied = await runCli(["provider", "create", "assets", "--id", "product", "--ownership", "Example Inc.", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    const manifest = JSON.parse(await readFile(resolve(assets, "emoji-provider.json"), "utf8"));
    expect(manifest.assets["🚀"].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await readFile(resolve(assets, "provider.ts"), "utf8")).toContain("createManifestProvider");
    const overwrite = await runCli(["provider", "create", "assets", "--id", "product", "--ownership", "Example Inc.", "--yes"], { cwd });
    expect(overwrite.ok).toBe(false);
  });

  it("previews and applies deterministic asset normalization", async () => {
    const cwd = await fixture();
    const input = resolve(cwd, "raw", "1f680.png");
    await mkdir(resolve(cwd, "raw"));
    await sharp({ create: { width: 80, height: 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg width="30" height="30"><circle cx="15" cy="15" r="14" fill="#ff3366"/></svg>'), left: 5, top: 10 }])
      .png().toFile(input);
    const preview = await runCli(["assets", "normalize", "raw", "normalized", "--size", "128", "--format", "webp"], { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    await expect(readFile(resolve(cwd, "normalized", "1f680.webp"))).rejects.toThrow();
    const applied = await runCli(["assets", "normalize", "raw", "normalized", "--size", "128", "--format", "webp", "--yes"], { cwd });
    expect(applied).toMatchObject({ ok: true, applied: true });
    expect(await sharp(resolve(cwd, "normalized", "1f680.webp")).metadata()).toMatchObject({ width: 128, height: 128, format: "webp" });
    const overwrite = await runCli(["assets", "normalize", "raw", "normalized", "--size", "128", "--format", "webp", "--yes"], { cwd });
    expect(overwrite).toMatchObject({ ok: false, applied: false });
  });

  it("previews and performs used-only asset sync with validated responses", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "src", "app.ts"), "export const value = '🚀';\n");
    await runCli(["init", "--yes", "--provider", "twemoji"], { cwd });
    const fetchMock = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } });
    const preview = await runCli(["sync", "--used-only"], { cwd, fetch: fetchMock as typeof fetch });
    expect(preview).toMatchObject({ ok: true, applied: false });
    const applied = await runCli(["sync", "--used-only", "--yes"], { cwd, fetch: fetchMock as typeof fetch });
    expect(applied).toMatchObject({ ok: true, applied: true });
    const manifest = JSON.parse(await readFile(resolve(cwd, ".emoji-styles/assets/emoji-provider.json"), "utf8"));
    expect(manifest).toMatchObject({ id: "twemoji-local", assets: { "🚀": { file: "1f680.png" } } });
  });

  it("generates machine-readable and human-readable license reports", async () => {
    const cwd = await fixture();
    await runCli(["init", "--yes", "--provider", "twemoji"], { cwd });
    const json = await runCli(["licenses", "--format", "json"], { cwd });
    const markdown = await runCli(["licenses", "--format", "markdown", "--output", "THIRD_PARTY_NOTICES.md"], { cwd });
    expect(json.ok).toBe(true);
    expect((json.data as { content: string }).content).toContain('"provider": "twemoji"');
    expect(markdown).toMatchObject({ ok: true, applied: true });
    expect(await readFile(resolve(cwd, "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("Twemoji graphics");
  });

  it("fails doctor and test for an invalid semantic theme", async () => {
    const cwd = await fixture();
    await writeFile(resolve(cwd, "theme.json"), JSON.stringify({ schemaVersion: 1, id: "bad", version: "1.0.0", tokens: { launch: { emoji: "🚀" } } }));
    await runCli(["init", "--yes", "--semantic-tokens", "theme.json"], { cwd });
    const doctor = await runCli(["doctor"], { cwd });
    const test = await runCli(["test"], { cwd });
    expect(doctor.ok).toBe(false);
    expect(test.ok).toBe(false);
    expect(doctor.checks?.some((check) => check.id === "semantic/theme" && check.status === "fail")).toBe(true);
  });
});
