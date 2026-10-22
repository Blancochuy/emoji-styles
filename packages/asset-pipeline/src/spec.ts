import { isEmoji, normalizeEmoji } from "emoji-styles";
import type { RasterAssetFormat } from "./types";

export interface EmojiAssetSpec {
  schemaVersion: 1;
  providerId: string;
  version: string;
  style: {
    description: string;
    perspective: string;
    lighting: string;
    outline: string;
    background: "transparent";
    detailLevel: string;
    materials: string[];
    accentPolicy: string;
    [key: string]: unknown;
  };
  canvas: { width: number; height: number; safeArea: number };
  output: { format: RasterAssetFormat; width: number; height: number; transparent: true };
  tokens: Array<{ token: string; emoji: string; label: string; subject: string }>;
}

interface Schema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  const?: unknown;
  enum?: readonly unknown[];
  properties?: Record<string, Schema>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

const text = (maxLength: number): Schema => ({ type: "string", minLength: 1, maxLength });
const dimension: Schema = { type: "integer", minimum: 16, maximum: 4096 };

/** Also used by the runtime validator; semantic constraints are checked below. */
export const emojiAssetSpecSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Emoji Styles asset specification v1",
  type: "object",
  additionalProperties: false,
  required: ["providerId", "version", "style", "canvas", "output", "tokens"],
  properties: {
    schemaVersion: { type: "integer", const: 1, default: 1 },
    providerId: { ...text(80), pattern: "^[a-z0-9]+(?:[._-][a-z0-9]+)*$" },
    version: { ...text(80), pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$" },
    style: {
      type: "object", additionalProperties: true,
      required: ["description", "perspective", "lighting", "outline", "background", "detailLevel", "materials", "accentPolicy"],
      properties: {
        description: text(2000), perspective: text(200), lighting: text(200), outline: text(200),
        background: { const: "transparent" }, detailLevel: text(200),
        materials: { type: "array", maxItems: 20, items: text(120) }, accentPolicy: text(300),
      },
    },
    canvas: {
      type: "object", additionalProperties: false, required: ["width", "height", "safeArea"],
      properties: { width: dimension, height: dimension, safeArea: { type: "number", minimum: 0.4, maximum: 0.95 } },
    },
    output: {
      type: "object", additionalProperties: false, required: ["format", "width", "height", "transparent"],
      properties: {
        format: { enum: ["png", "webp", "avif"] },
        width: { ...dimension, maximum: 2048 }, height: { ...dimension, maximum: 2048 }, transparent: { const: true },
      },
    },
    tokens: {
      type: "array", minItems: 1, maxItems: 100,
      items: {
        type: "object", additionalProperties: false, required: ["token", "emoji", "label", "subject"],
        properties: {
          token: { ...text(120), pattern: "^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)+$" },
          emoji: text(32), label: text(160), subject: text(300),
        },
      },
    },
  },
} satisfies Schema & { $schema: string; title: string };

export interface AssetSpecIssue { path: string; code: string; message: string }
export interface AssetSpecValidation {
  valid: boolean;
  issues: AssetSpecIssue[];
  warnings: string[];
  spec?: EmojiAssetSpec;
}

// Evaluates the small, closed schema vocabulary above, never caller-supplied schemas.
function check(value: unknown, schema: Schema, path: string, issues: AssetSpecIssue[]): void {
  const issue = (message: string) => issues.push({ path, code: "schema", message });
  if ("const" in schema && value !== schema.const) issue(`Expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) issue(`Expected one of ${schema.enum.join(", ")}`);
  if (!schema.type) return;
  const object = value !== null && typeof value === "object" && !Array.isArray(value);
  const matches = schema.type === "object" ? object : schema.type === "array" ? Array.isArray(value)
    : schema.type === "integer" ? Number.isInteger(value) : typeof value === schema.type;
  if (!matches) { issue(`Expected ${schema.type}`); return; }
  if (typeof value === "string") {
    if (!value.trim() || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) issue("String is empty or outside its length limit");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) issue("String does not match the required pattern");
  } else if (typeof value === "number") {
    if (!Number.isFinite(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity)) issue("Number is outside its allowed range");
  } else if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) issue("Array is outside its item limit");
    if (schema.items) value.forEach((item, index) => check(item, schema.items!, `${path}[${index}]`, issues));
  } else if (object) {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) issues.push({ path: `${path}.${key}`, code: "required", message: "Required field is missing" });
    }
    for (const [key, item] of Object.entries(record)) {
      const child = schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, key) ? schema.properties[key] : undefined;
      if (child) check(item, child, `${path}.${key}`, issues);
      else if (schema.additionalProperties === false) issues.push({ path: `${path}.${key}`, code: "unknown-field", message: "Unknown field" });
    }
  }
}

export function validateAssetSpec(input: unknown): AssetSpecValidation {
  const issues: AssetSpecIssue[] = [];
  check(input, emojiAssetSpecSchema, "$", issues);
  if (issues.length) return { valid: false, issues, warnings: [] };
  const spec = JSON.parse(JSON.stringify(input)) as EmojiAssetSpec;
  const warnings = spec.schemaVersion === undefined ? ["Legacy spec upgraded to schemaVersion 1 in memory; source was not changed."] : [];
  spec.schemaVersion = 1;
  if (spec.canvas.width !== spec.canvas.height || spec.output.width !== spec.output.height) issues.push({ path: "$", code: "square-canvas", message: "Generation and runtime canvases must be square" });
  const tokens = new Set<string>();
  const emojis = new Set<string>();
  for (const [index, entry] of spec.tokens.entries()) {
    const path = `$.tokens[${index}]`;
    if (!isEmoji(entry.emoji)) issues.push({ path: `${path}.emoji`, code: "invalid-emoji", message: "Expected exactly one emoji grapheme" });
    const emoji = normalizeEmoji(entry.emoji) ?? entry.emoji.normalize("NFC");
    if (tokens.has(entry.token)) issues.push({ path: `${path}.token`, code: "duplicate-token", message: "Token must be unique" });
    if (emojis.has(emoji)) issues.push({ path: `${path}.emoji`, code: "duplicate-emoji", message: "Each fallback must identify one canonical artwork asset" });
    tokens.add(entry.token);
    emojis.add(emoji);
  }
  return { valid: issues.length === 0, issues, warnings, ...(issues.length ? {} : { spec }) };
}
