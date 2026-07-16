import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import { inspectEmojiAsset, readAssetInput } from "./inspect";
import { DEFAULT_ASSET_LIMITS, type NormalizeEmojiAssetOptions, type NormalizedEmojiAsset } from "./types";

export async function normalizeEmojiAsset(options: NormalizeEmojiAssetOptions): Promise<NormalizedEmojiAsset> {
  const size = options.size ?? 256;
  const safeArea = options.safeArea ?? 0.76;
  const format = options.format ?? "webp";
  const alphaThreshold = options.alphaThreshold ?? 1;
  const limits = { ...DEFAULT_ASSET_LIMITS, ...options.limits };
  if (!Number.isInteger(size) || size < 16 || size > limits.maxDimension) throw new Error(`Output size must be an integer from 16 to ${limits.maxDimension}`);
  if (safeArea <= 0.1 || safeArea > 1) throw new Error("safeArea must be greater than 0.1 and at most 1");
  const sourceInput = await readAssetInput(options.input, limits);
  const source = await inspectEmojiAsset(sourceInput.data, { alphaThreshold, limits });
  if (source.animated) throw new Error("Animated assets require a frame-preserving workflow and cannot be normalized as static images");
  if (!source.alphaBounds) throw new Error("Asset is fully transparent");
  const bounds = source.alphaBounds;
  const contentSize = Math.max(1, Math.floor(size * safeArea));
  const cropped = sharp(sourceInput.data, { failOn: "error", limitInputPixels: limits.maxInputPixels })
    .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    .resize(contentSize, contentSize, { fit: "inside", kernel: sharp.kernel.lanczos3 });
  const rendered = await cropped.png().toBuffer({ resolveWithObject: true });
  const left = Math.floor((size - rendered.info.width) / 2);
  const top = Math.floor((size - rendered.info.height) / 2);
  let output = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: rendered.data, left, top }]);
  if (format === "png") output = output.png({ compressionLevel: 9, adaptiveFiltering: true });
  else if (format === "webp") output = output.webp({ lossless: true, effort: 6 });
  else output = output.avif({ lossless: true, effort: 6 });
  const data = await output.toBuffer();
  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, data);
  }
  const inspection = await inspectEmojiAsset(data, { alphaThreshold, limits: { ...limits, maxBytes: Math.max(limits.maxBytes, data.byteLength) } });
  return { data, source: { ...source, ...(sourceInput.path ? { path: sourceInput.path } : {}) }, inspection: { ...inspection, ...(options.output ? { path: options.output } : {}) }, ...(options.output ? { output: options.output } : {}) };
}
