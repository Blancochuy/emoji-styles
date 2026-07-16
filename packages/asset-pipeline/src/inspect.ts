import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { DEFAULT_ASSET_LIMITS, type AlphaBounds, type AssetInspection, type AssetLimits } from "./types";

function signatureFormat(data: Buffer): string {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (["avif", "avis"].includes(data.toString("ascii", 8, 12))) return "avif";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (data.toString("utf8", 0, 256).toLowerCase().includes("<svg")) return "svg";
  return "unknown";
}

export async function readAssetInput(input: string | Buffer, limits: Partial<AssetLimits> = {}): Promise<{ data: Buffer; path?: string }> {
  const effective = { ...DEFAULT_ASSET_LIMITS, ...limits };
  const data = typeof input === "string" ? await readFile(input) : input;
  if (data.byteLength > effective.maxBytes) throw new Error(`Asset exceeds the ${effective.maxBytes} byte input limit`);
  const format = signatureFormat(data);
  if (format === "svg") throw new Error("SVG input is rejected by default; rasterize and sanitize it before import");
  if (!new Set(["png", "webp", "avif", "jpeg"]).has(format)) throw new Error("Unsupported or invalid raster image signature");
  return { data, ...(typeof input === "string" ? { path: input } : {}) };
}

function findAlphaBounds(pixels: Buffer, width: number, height: number, channels: number, threshold: number): AlphaBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * channels + 3] <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export async function inspectEmojiAsset(input: string | Buffer, options: { alphaThreshold?: number; limits?: Partial<AssetLimits> } = {}): Promise<AssetInspection> {
  const limits = { ...DEFAULT_ASSET_LIMITS, ...options.limits };
  const source = await readAssetInput(input, limits);
  const image = sharp(source.data, { failOn: "error", limitInputPixels: limits.maxInputPixels });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width > limits.maxDimension || metadata.height > limits.maxDimension) {
    throw new Error(`Asset dimensions exceed the ${limits.maxDimension}px limit`);
  }
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = findAlphaBounds(data, info.width, info.height, info.channels, options.alphaThreshold ?? 1);
  let luminance = 0;
  let visible = 0;
  let edgeVisible = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset + 3] <= (options.alphaThreshold ?? 1)) continue;
      luminance += 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      visible++;
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edgeVisible++;
    }
  }
  const maxContent = bounds ? Math.max(bounds.width, bounds.height) : 0;
  return {
    ...(source.path ? { path: source.path } : {}),
    bytes: source.data.byteLength,
    sha256: createHash("sha256").update(source.data).digest("hex"),
    format: metadata.format ?? signatureFormat(source.data),
    width: info.width,
    height: info.height,
    channels: info.channels,
    pages: metadata.pages ?? 1,
    animated: (metadata.pages ?? 1) > 1,
    hasAlpha: metadata.hasAlpha ?? info.channels === 4,
    alphaBounds: bounds,
    occupancy: Number((maxContent / Math.max(info.width, info.height)).toFixed(4)),
    centerOffsetX: bounds ? Number((((bounds.left + bounds.width / 2) - info.width / 2) / info.width).toFixed(4)) : 0,
    centerOffsetY: bounds ? Number((((bounds.top + bounds.height / 2) - info.height / 2) / info.height).toFixed(4)) : 0,
    edgeAlphaRatio: visible ? Number((edgeVisible / visible).toFixed(6)) : 0,
    meanLuminance: visible ? Number((luminance / visible).toFixed(2)) : 0,
  };
}
