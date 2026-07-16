import { mkdir } from "node:fs/promises";
import { basename, dirname } from "node:path";
import sharp from "sharp";

export interface ContactSheetOptions {
  inputs: readonly string[];
  output: string;
  columns?: number;
  tileSize?: number;
  background?: string;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export async function createContactSheet(options: ContactSheetOptions): Promise<string> {
  if (!options.inputs.length) throw new Error("Contact sheet requires at least one asset");
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
