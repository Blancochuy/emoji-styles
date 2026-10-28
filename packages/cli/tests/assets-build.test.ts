import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { formatResult, runCli } from "../src/index";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
async function fixture(input = "normalized") {
  const cwd = await mkdtemp(join(tmpdir(), "emoji-pack-")); directories.push(cwd);
  await mkdir(join(cwd, input), { recursive: true });
  for (const [file, color] of [["1f680.webp", "red"], ["1f512.webp", "blue"]]) {
    const ink = await sharp({ create: { width: 160, height: 160, channels: 4, background: color } }).png().toBuffer();
    await sharp({ create: { width: 256, height: 256, channels: 4, background: "#00000000" } }).composite([{ input: ink, left: 48, top: 48 }]).webp({ lossless: true }).toFile(join(cwd, input, file));
  }
  await writeFile(join(cwd, "provenance.json"), JSON.stringify({ generated: false, createdAt: "2026-10-27T00:00:00Z", source: "Test geometry", license: "MIT" }));
  return cwd;
}
const build = (input: string, output?: string) => ["assets", "build", input, "--provenance", "provenance.json", ...(output ? ["--output", output] : [])];
async function verifyPack(cwd: string, directory: string) {
  const manifest = JSON.parse(await readFile(join(cwd, directory, "emoji-provider.json"), "utf8"));
  for (const asset of Object.values(manifest.assets) as Array<{ file: string; sha256: string }>) {
    const file = resolve(cwd, directory, manifest.basePath, asset.file);
    expect(createHash("sha256").update(await readFile(file)).digest("hex")).toBe(asset.sha256);
  }
}
describe("portable custom packs", () => {
  it.each([["normalized", "pack"], ["normalized", undefined], ["provider/assets", "provider"]])("packages actual files for input %s and output %s", async (input, output) => {
    const cwd = await fixture(input);
    const preview = await runCli(build(input, output), { cwd });
    expect(preview).toMatchObject({ ok: true, applied: false });
    if (output !== "provider") await expect(readFile(join(cwd, output ?? input, "assets/1f680.webp"))).rejects.toThrow();
    expect(await runCli([...build(input, output), "--yes"], { cwd })).toMatchObject({ ok: true, applied: true });
    await verifyPack(cwd, output ?? input);
    for (const file of ["1f680.webp", "1f512.webp"]) expect(await readFile(join(cwd, input, file))).toEqual(await readFile(join(cwd, output ?? input, "assets", file)));
  });
  it("refuses to replace an existing destination image without --force, including when metadata does not exist", async () => {
    const cwd = await fixture(); await mkdir(join(cwd, "pack/assets"), { recursive: true });
    await writeFile(join(cwd, "pack/assets/1f680.webp"), "existing image");
    expect(await runCli([...build("normalized", "pack"), "--yes"], { cwd })).toMatchObject({ ok: false, applied: false });
    expect(await readFile(join(cwd, "pack/assets/1f680.webp"), "utf8")).toBe("existing image");
    await expect(readFile(join(cwd, "pack/emoji-provider.json"))).rejects.toThrow();
    expect(await runCli([...build("normalized", "pack"), "--yes", "--force"], { cwd })).toMatchObject({ ok: true, applied: true });
    await verifyPack(cwd, "pack");
  });
  it("prints the actual schema in terminal mode", async () => {
    expect(formatResult(await runCli(["assets", "spec-schema"]))).toContain('"schemaVersion"');
  });
  it("initializes usable specs without inventing provenance or overwriting files", async () => {
    const cwd = await fixture();
    expect(await runCli(["assets", "init", "artwork"], { cwd })).toMatchObject({ ok: true, applied: false, data: { provenance: { generated: null, createdAt: "unknown" } } });
    await expect(readFile(join(cwd, "artwork/asset-spec.json"))).rejects.toThrow();
    expect(await runCli(["assets", "init", "artwork", "--yes"], { cwd })).toMatchObject({ ok: true, applied: true });
    expect(await runCli(["assets", "validate-spec", "artwork/asset-spec.json"], { cwd })).toMatchObject({ ok: true });
    expect(await runCli(["assets", "plan", "artwork/asset-spec.json"], { cwd })).toMatchObject({ ok: true, data: { totalRequests: 1, executesGeneration: false } });
    expect(await runCli(["assets", "build", "normalized", "--provenance", "artwork/provenance-input.json", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("Image origin is never inferred") });
    expect(await runCli(["assets", "init", "artwork", "--no-generated", "--yes"], { cwd })).toMatchObject({ ok: false, applied: false });
    expect(await runCli(["assets", "init", "artwork", "--no-generated", "--yes", "--force"], { cwd })).toMatchObject({ ok: true, applied: true });
    const provenance = JSON.parse(await readFile(join(cwd, "artwork/provenance-input.json"), "utf8"));
    expect(provenance).toMatchObject({ generated: false, ownership: "License status: user confirmation required" });
    expect(provenance.generator).toBeUndefined();
    expect(await runCli(["assets", "init", "../escape", "--yes"], { cwd })).toMatchObject({ ok: false });
  });
  it("packs raw images in one step with origin flags, a public base path, a manifest copy and a review sheet", async () => {
    const cwd = await fixture("raw");
    const pack = ["assets", "pack", "raw", "public/emoji/product", "--id", "product", "--no-generated", "--source", "Test geometry", "--ownership", "Tests", "--license", "MIT", "--manifest-out", "src/emoji-provider.json", "--review-sheet", "review.png"];
    expect(await runCli(pack, { cwd })).toMatchObject({ ok: true, applied: false, summary: expect.stringContaining("base path /emoji/product/assets") });
    await expect(readFile(join(cwd, "public/emoji/product/emoji-provider.json"))).rejects.toThrow();
    expect(await runCli([...pack, "--yes"], { cwd })).toMatchObject({ ok: true, applied: true });
    const manifest = JSON.parse(await readFile(join(cwd, "public/emoji/product/emoji-provider.json"), "utf8"));
    expect(manifest).toMatchObject({ id: "product", basePath: "/emoji/product/assets", generated: false, license: { name: "MIT", ownership: "Tests" } });
    for (const asset of Object.values(manifest.assets) as Array<{ file: string; sha256: string }>) {
      expect(createHash("sha256").update(await readFile(join(cwd, "public/emoji/product/assets", asset.file))).digest("hex")).toBe(asset.sha256);
    }
    expect(JSON.parse(await readFile(join(cwd, "src/emoji-provider.json"), "utf8"))).toEqual(manifest);
    expect((await sharp(join(cwd, "review.png")).metadata()).width).toBeGreaterThan(0);
    expect(JSON.parse(await readFile(join(cwd, "public/emoji/product/PROVENANCE.json"), "utf8"))).toMatchObject({ generated: false, source: "Test geometry" });
    expect(await runCli([...pack, "--yes"], { cwd })).toMatchObject({ ok: false, applied: false, summary: expect.stringContaining("--force") });
    expect(await runCli([...pack, "--yes", "--force"], { cwd })).toMatchObject({ ok: true, applied: true });
  });
  it("refuses to pack without a declared image origin or a generated model", async () => {
    const cwd = await fixture("raw");
    expect(await runCli(["assets", "pack", "raw", "pack", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("Image origin is never inferred") });
    expect(await runCli(["assets", "pack", "raw", "pack", "--generated", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("generator model") });
    expect(await runCli(["assets", "pack", "raw", "raw/pack", "--no-generated", "--yes"], { cwd })).toMatchObject({ ok: false, summary: expect.stringContaining("inside the input") });
    await expect(readFile(join(cwd, "pack/emoji-provider.json"))).rejects.toThrow();
    expect(await runCli(["assets", "pack", "raw", "pack", "--provenance", "provenance.json", "--yes"], { cwd })).toMatchObject({ ok: true, applied: true });
    expect(JSON.parse(await readFile(join(cwd, "pack/emoji-provider.json"), "utf8"))).toMatchObject({ basePath: "./assets" });
  });
  it("records an explicitly supplied generator instead of inventing a model", async () => {
    const cwd = await fixture();
    expect(await runCli(["assets", "init", "artwork", "--generated", "--model", "unknown (not exposed by native tool)", "--generator-provider", "User-selected tool", "--yes"], { cwd })).toMatchObject({ ok: true, applied: true });
    expect(JSON.parse(await readFile(join(cwd, "artwork/provenance-input.json"), "utf8"))).toMatchObject({ generated: true, createdAt: "unknown", generator: { model: "unknown (not exposed by native tool)", provider: "User-selected tool" } });
  });
});
