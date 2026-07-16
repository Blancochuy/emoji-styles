import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { buildProviderArtifacts, createContactSheet, inspectEmojiAsset, normalizeEmojiAsset, validateAssetCollection, validateEmojiAsset } from "../src";

const temporaryDirectories: string[] = [];

async function fixture(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "emoji-asset-pipeline-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function sampleAsset(path: string, color = "#ff3366"): Promise<void> {
  const circle = Buffer.from(`<svg width="120" height="80"><circle cx="60" cy="40" r="30" fill="${color}"/></svg>`);
  await sharp({ create: { width: 300, height: 220, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: circle, left: 90, top: 70 }])
    .png()
    .toFile(path);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("asset pipeline", () => {
  it("crops, centers, pads, converts, and hashes deterministically", async () => {
    const directory = await fixture();
    const input = resolve(directory, "source.png");
    const output = resolve(directory, "1f680.webp");
    await sampleAsset(input);
    const first = await normalizeEmojiAsset({ input, output, size: 256, format: "webp", safeArea: 0.76 });
    const second = await normalizeEmojiAsset({ input, size: 256, format: "webp", safeArea: 0.76 });
    expect(first.inspection).toMatchObject({ width: 256, height: 256, format: "webp", edgeAlphaRatio: 0 });
    expect(first.inspection.occupancy).toBeCloseTo(0.76, 2);
    expect(Math.abs(first.inspection.centerOffsetX)).toBeLessThanOrEqual(0.004);
    expect(Math.abs(first.inspection.centerOffsetY)).toBeLessThanOrEqual(0.004);
    expect(first.inspection.sha256).toBe(second.inspection.sha256);
    expect(await readFile(output)).toEqual(first.data);
  });

  it("rejects SVG, corrupt, oversized, and fully transparent input", async () => {
    await expect(inspectEmojiAsset(Buffer.from("<svg></svg>"))).rejects.toThrow("SVG input is rejected");
    await expect(inspectEmojiAsset(Buffer.from("not an image"))).rejects.toThrow("Unsupported");
    const transparent = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    await expect(normalizeEmojiAsset({ input: transparent })).rejects.toThrow("fully transparent");
    await expect(inspectEmojiAsset(transparent, { limits: { maxBytes: 8 } })).rejects.toThrow("byte input limit");
  });

  it("validates normalized output and detects exact duplicates", async () => {
    const directory = await fixture();
    const source = resolve(directory, "source.png");
    const first = resolve(directory, "first.png");
    const second = resolve(directory, "second.png");
    await sampleAsset(source);
    await normalizeEmojiAsset({ input: source, output: first, size: 128, format: "png", safeArea: 0.75 });
    await writeFile(second, await readFile(first));
    const single = await validateEmojiAsset(first, { size: 128, format: "png", safeArea: 0.75 });
    const collection = await validateAssetCollection([first, second], { size: 128, format: "png", safeArea: 0.75 });
    expect(single.valid).toBe(true);
    expect(collection.valid).toBe(false);
    expect(collection.issues).toContainEqual(expect.objectContaining({ code: "duplicate", severity: "error", path: second }));
  });

  it("builds a licensed provider, semantic theme, provenance, and contact sheet", async () => {
    const root = await fixture();
    const directory = resolve(root, "assets");
    const asset = resolve(directory, "1f680.webp");
    const source = resolve(root, "source.png");
    await sampleAsset(source);
    await normalizeEmojiAsset({ input: source, output: asset, format: "webp" });
    const provenance = { generated: false, createdAt: "2026-07-15T12:00:00.000Z", source: "design-system", ownership: "Example Inc." } as const;
    const built = await buildProviderArtifacts({
      directory,
      id: "product-icons",
      license: { name: "Proprietary", ownership: "Example Inc." },
      provenance,
      mapping: [{ file: "1f680.webp", emoji: "🚀", token: "action.deploy" }],
    });
    expect(built.manifest.assets["🚀"]).toMatchObject({ file: "1f680.webp", width: 256, height: 256 });
    expect(built.manifest.assets["🚀"].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(built.themeModule).toContain('"action.deploy": "🚀"');
    const sheet = resolve(directory, "review.png");
    await createContactSheet({ inputs: [asset], output: sheet, columns: 1, tileSize: 120 });
    expect(await sharp(sheet).metadata()).toMatchObject({ width: 120, height: 120, format: "png" });
  });

  it("never infers licensing or generated-model provenance", async () => {
    const directory = await fixture();
    const source = resolve(directory, "source.png");
    const asset = resolve(directory, "1f680.png");
    await sampleAsset(source);
    await normalizeEmojiAsset({ input: source, output: asset, format: "png" });
    await expect(buildProviderArtifacts({ directory, id: "unsafe", provenance: { generated: false, createdAt: "2026-07-15T12:00:00.000Z" } })).rejects.toThrow("ownership or license");
    await expect(buildProviderArtifacts({ directory, id: "unsafe", license: { name: "MIT" }, provenance: { generated: true, createdAt: "2026-07-15T12:00:00.000Z", generator: { type: "image" } } })).rejects.toThrow("generator model");
  });
});
