import { extname } from "node:path";
import { inspectEmojiAsset } from "./inspect";
import type { AssetCollectionValidation, AssetInspection, AssetValidationIssue, AssetValidationResult, ValidateAssetOptions } from "./types";

export async function validateEmojiAsset(input: string | Buffer, options: ValidateAssetOptions = {}): Promise<AssetValidationResult> {
  const issues: AssetValidationIssue[] = [];
  let inspection: AssetInspection;
  try {
    inspection = await inspectEmojiAsset(input, { limits: options.maxBytes ? { maxBytes: options.maxBytes } : undefined });
  } catch (error) {
    return { valid: false, issues: [{ code: "asset-invalid", severity: "error", message: error instanceof Error ? error.message : String(error), ...(typeof input === "string" ? { path: input } : {}) }] };
  }
  const add = (code: string, severity: "error" | "warning", message: string): void => {
    issues.push({ code, severity, message, ...(inspection.path ? { path: inspection.path } : {}) });
  };
  if (inspection.animated) add("animation-unsupported", "error", "Static provider assets must contain exactly one frame");
  if (!inspection.alphaBounds) add("fully-transparent", "error", "Asset has no visible pixels");
  if (options.size && (inspection.width !== options.size || inspection.height !== options.size)) add("dimensions", "error", `Expected ${options.size}x${options.size}, received ${inspection.width}x${inspection.height}`);
  if (inspection.width !== inspection.height) add("not-square", "error", "Asset canvas must be square");
  if (options.format && inspection.format !== options.format) add("format", "error", `Expected ${options.format}, received ${inspection.format}`);
  if (options.requireAlpha !== false && !inspection.hasAlpha) add("alpha", "error", "Asset must retain an alpha channel");
  if (inspection.edgeAlphaRatio > 0) add("edge-contact", "error", "Visible pixels touch the canvas edge");
  const safeArea = options.safeArea ?? 0.76;
  const tolerance = options.safeAreaTolerance ?? 0.03;
  if (inspection.alphaBounds && Math.abs(inspection.occupancy - safeArea) > tolerance) add("safe-area", "warning", `Content occupancy ${inspection.occupancy} is outside ${safeArea} ± ${tolerance}`);
  const centerLimit = options.maxCenterOffset ?? 0.015;
  if (Math.abs(inspection.centerOffsetX) > centerLimit || Math.abs(inspection.centerOffsetY) > centerLimit) add("centering", "warning", "Visible content is not centered within the configured tolerance");
  if (options.maxBytes && inspection.bytes > options.maxBytes) add("file-size", "error", `Asset exceeds ${options.maxBytes} bytes`);
  return { valid: !issues.some((issue) => issue.severity === "error"), inspection, issues };
}

export async function validateAssetCollection(inputs: readonly string[], options: ValidateAssetOptions = {}): Promise<AssetCollectionValidation> {
  const assets = await Promise.all(inputs.map((input) => validateEmojiAsset(input, options)));
  const issues = assets.flatMap((asset) => asset.issues);
  const hashes = new Map<string, string>();
  for (const asset of assets) {
    const inspection = asset.inspection;
    if (!inspection) continue;
    const prior = hashes.get(inspection.sha256);
    if (prior) issues.push({ code: "duplicate", severity: "error", message: `Exact duplicate of ${prior}`, path: inspection.path });
    else hashes.set(inspection.sha256, inspection.path ?? inspection.sha256);
    if (inspection.path && extname(inspection.path).slice(1).toLowerCase() !== inspection.format) {
      issues.push({ code: "extension-mismatch", severity: "error", message: `File extension does not match ${inspection.format} content`, path: inspection.path });
    }
  }
  const luminances = assets.flatMap((asset) => asset.inspection ? [asset.inspection.meanLuminance] : []).sort((a, b) => a - b);
  const median = luminances[Math.floor(luminances.length / 2)];
  if (median !== undefined) {
    for (const asset of assets) {
      const inspection = asset.inspection;
      if (inspection && Math.abs(inspection.meanLuminance - median) > 100) issues.push({ code: "luminance-outlier", severity: "warning", message: "Asset luminance is a collection outlier", path: inspection.path });
    }
  }
  return { valid: assets.every((asset) => asset.valid) && !issues.some((issue) => issue.severity === "error"), assets, issues };
}
