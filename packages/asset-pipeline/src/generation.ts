import { createHash } from "node:crypto";
import { validateAssetSpec, type EmojiAssetSpec } from "./spec";

export interface GenerationCapabilities {
  references: boolean;
  nativeAlpha: boolean;
}

export interface EmojiGenerationRequest {
  prompt: string;
  transparentBackground: boolean;
  requestedCanvas?: { width: number; height: number };
  referenceImages?: readonly Buffer[];
  signal?: AbortSignal;
}

export interface EmojiGenerationResult {
  data: Buffer;
  provider: string;
  model: string | null;
  jobId?: string;
  seed?: string;
  cost?: { amount: number; currency: string };
}

/** Optional adapters live outside the deterministic pipeline and core renderer. */
export interface EmojiGenerationBackend {
  id: string;
  capabilities: GenerationCapabilities;
  generate(request: EmojiGenerationRequest): Promise<EmojiGenerationResult>;
  edit?(request: EmojiGenerationRequest & { image: Buffer }): Promise<EmojiGenerationResult>;
}

export interface EmojiGenerationPlan {
  schemaVersion: 1;
  specSha256: string;
  variantsPerToken: number;
  totalRequests: number;
  executesGeneration: false;
  warnings: string[];
  tasks: Array<{ id: string; token: string; emoji: string; variant: number; prompt: string }>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function promptFor(spec: EmojiAssetSpec, entry: EmojiAssetSpec["tokens"][number]): string {
  return [
    "Create exactly one standalone custom emoji on a genuinely transparent background.",
    `Subject: ${entry.subject}. Meaning: ${entry.label}. Unicode fallback: ${entry.emoji}.`,
    "Visual system (preserve throughout the pack):",
    JSON.stringify(spec.style, null, 2),
    `Centered composition; content occupies approximately ${Math.round(spec.canvas.safeArea * 100)}% of a square canvas.`,
    "Design for recognition at 24px first, then 48px: strong outer silhouette, distinct major forms, clear negative spaces.",
    "Merge nonessential micro-detail into broad shapes. Keep meaning-bearing features; do not change the requested subject or art direction.",
    "Separate the silhouette from both white and near-black UI backgrounds using the requested materials and lighting.",
    "No text, letters, logos, frames, scene, checkerboard, extra objects, detached shadow, or clipped content.",
    "Return one asset, never a contact sheet. If an approved reference is supplied, use it only as the style anchor.",
  ].join("\n");
}

/** Produces prompts and request counts only: no adapter calls, spending, or file writes. */
export function planEmojiGeneration(input: unknown, options: { variants?: number } = {}): EmojiGenerationPlan {
  const validation = validateAssetSpec(input);
  if (!validation.spec) throw new Error(`Invalid asset spec: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  const variants = options.variants ?? 1;
  if (!Number.isInteger(variants) || variants < 1 || variants > 4) throw new Error("variants must be an integer from 1 to 4");
  const spec = validation.spec;
  return {
    schemaVersion: 1,
    specSha256: createHash("sha256").update(canonicalJson(spec)).digest("hex"),
    variantsPerToken: variants,
    totalRequests: spec.tokens.length * variants,
    executesGeneration: false,
    warnings: [...validation.warnings, "Review one anchor before executing the rest of this plan. Variants are independent attempts, not guaranteed deterministic outputs."],
    tasks: spec.tokens.flatMap((entry) => Array.from({ length: variants }, (_, index) => ({
      id: `${entry.token}.candidate-${index + 1}`, token: entry.token, emoji: entry.emoji, variant: index + 1, prompt: promptFor(spec, entry),
    }))),
  };
}
