import { mkdir } from "node:fs/promises";
import { basename, dirname } from "node:path";
import sharp from "sharp";
import { inspectEmojiAsset, readAssetInput } from "./inspect";

export interface ContactSheetOptions {
  inputs: readonly string[];
  output: string;
  columns?: number;
  tileSize?: number;
  background?: string;
  /** Show 24/48/96px previews on both light and dark backgrounds. */
  review?: boolean;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export async function createContactSheet(options: ContactSheetOptions): Promise<string> {
  if (!options.inputs.length) throw new Error("Contact sheet requires at least one asset");
  if (options.review) return createReviewSheet(options);
  const columns = Math.max(1, options.columns ?? 6);
  const tileSize = Math.max(64, options.tileSize ?? 160);
  const rows = Math.ceil(options.inputs.length / columns);
  const width = columns * tileSize;
  const height = rows * tileSize;
  const composites: sharp.OverlayOptions[] = [];
  for (let index = 0; index < options.inputs.length; index++) {
    const input = options.inputs[index];
    const x = (index % columns) * tileSize;
    const y = Math.floor(index / columns) * tileSize;
    const image = await sharp(input, { failOn: "error" }).resize(tileSize - 40, tileSize - 52, { fit: "inside" }).png().toBuffer();
    const metadata = await sharp(image).metadata();
    composites.push({ input: image, left: x + Math.floor((tileSize - (metadata.width ?? 0)) / 2), top: y + 12 });
    const label = escapeXml(basename(input).slice(0, 24));
    composites.push({ input: Buffer.from(`<svg width="${tileSize}" height="28"><text x="${tileSize / 2}" y="18" text-anchor="middle" fill="#a5adb0" font-family="ui-monospace,monospace" font-size="11">${label}</text></svg>`), left: x, top: y + tileSize - 32 });
  }
  await mkdir(dirname(options.output), { recursive: true });
  await sharp({ create: { width, height, channels: 4, background: options.background ?? "#101415" } }).composite(composites).png({ compressionLevel: 9 }).toFile(options.output);
  return options.output;
}

async function createReviewSheet(options: ContactSheetOptions): Promise<string> {
  const columns = options.columns ?? 3;
  if (!Number.isInteger(columns) || columns < 1 || columns > 12) throw new Error("Review sheet columns must be an integer from 1 to 12");
  const tileSize = 320;
  const width = columns * tileSize;
  const height = Math.ceil(options.inputs.length / columns) * tileSize;
  if (width * height > 16_777_216) throw new Error("Review sheet exceeds the output pixel limit; split the collection");
  const composites: sharp.OverlayOptions[] = [];
  for (const [index, input] of options.inputs.entries()) {
    const source = await readAssetInput(input);
    const inspection = await inspectEmojiAsset(source.data);
    if (inspection.animated) throw new Error("Review sheets require static assets; animation must be reviewed separately");
    const x = (index % columns) * tileSize;
    const y = Math.floor(index / columns) * tileSize;
    const label = escapeXml(basename(input).slice(0, 40));
    const backgrounds = ["#ffffff", "#101415"];
    const sizes = [24, 48, 96];
    const centers = [48, 136, 248];
    const panels = backgrounds.map((background, row) => {
      const labels = sizes.map((size, column) =>
        `<text x="${centers[column]}" y="${160 + row * 140}" text-anchor="middle" font-family="monospace" font-size="11" fill="${row ? "#d1d5db" : "#374151"}">${size}px</text>`);
      return `<rect y="${32 + row * 140}" width="320" height="140" fill="${background}"/>${labels.join("")}`;
    });
    const panel = `<svg width="320" height="320">
      <rect width="320" height="320" fill="#e5e7eb"/>
      <text x="12" y="21" font-family="monospace" font-size="12" fill="#111827">${label}</text>
      ${panels.join("")}
    </svg>`;
    composites.push({ input: Buffer.from(panel), left: x, top: y });
    for (const [column, size] of sizes.entries()) {
      const preview = await sharp(source.data).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      for (let row = 0; row < 2; row++) {
        composites.push({ input: preview, left: x + centers[column] - size / 2, top: y + 32 + row * 140 + Math.floor((112 - size) / 2) });
      }
    }
  }
  await mkdir(dirname(options.output), { recursive: true });
  await sharp({ create: { width, height, channels: 4, background: "#e5e7eb" } }).composite(composites).png({ compressionLevel: 9 }).toFile(options.output);
  return options.output;
}
