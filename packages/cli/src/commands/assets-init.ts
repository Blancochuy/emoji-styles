import { validateAssetSpec } from "@emoji-styles/asset-pipeline";
import { resolve } from "node:path";
import { booleanFlag, stringFlag } from "../flags";
import { exists, safeProjectPath, writeJson } from "../files";
import type { CommandContext, CommandResult, ParsedFlags } from "../types";

/** Provenance declared on the command line; unknown values stay explicitly unconfirmed. */
export function provenanceFromFlags(flags: ParsedFlags) {
  const generated = typeof flags.generated === "boolean" ? flags.generated : null;
  return {
    generated, createdAt: "unknown",
    ...(generated === true ? { generator: { type: "ai-image-generation", provider: stringFlag(flags, "generator-provider") ?? "unknown", model: stringFlag(flags, "model") ?? null } } : {}),
    source: stringFlag(flags, "source") ?? "Unknown; record the actual artwork origin before packaging",
    ownership: stringFlag(flags, "ownership") ?? "License status: user confirmation required",
    license: stringFlag(flags, "license") ?? "License status: user confirmation required",
    referenceAssets: [], modifications: [],
  };
}

export async function assetsInitCommand(context: CommandContext, path: string, flags: ParsedFlags): Promise<CommandResult> {
  const directory = safeProjectPath(context.cwd, path);
  const spec = {
    schemaVersion: 1, providerId: stringFlag(flags, "id") ?? "custom-local", version: "1.0.0",
    style: { description: "Original emoji with broad rounded shapes and clearly readable features; replace with your art direction", perspective: "front three-quarter", lighting: "soft upper-left", outline: "none", background: "transparent", detailLevel: "low to medium", materials: [], accentPolicy: "One subject-appropriate accent; replace with your palette rule" },
    canvas: { width: 512, height: 512, safeArea: 0.76 },
    output: { format: "webp", width: 256, height: 256, transparent: true },
    tokens: [{ token: "action.deploy", emoji: "🚀", label: "Rocket", subject: "One compact rocket with a distinct nose, body, fins and attached exhaust flame" }],
  };
  const validation = validateAssetSpec(spec);
  if (!validation.valid) throw new Error(`Invalid asset template: ${validation.issues.map((issue) => issue.message).join("; ")}`);
  const provenance = provenanceFromFlags(flags);
  const values = [{ path: resolve(directory, "asset-spec.json"), value: spec }, { path: resolve(directory, "provenance-input.json"), value: provenance }];
  const existing = await Promise.all(values.map(({ path }) => exists(path)));
  const changes = values.map(({ path }, index) => ({ path, action: existing[index] ? "update" as const : "create" as const, description: "Create editable artwork template; no image generation" }));
  const note = "Review provenance-input.json before packaging. Use --generated or --no-generated to declare image origin; generated artwork also needs its actual model or an explicit unknown-model explanation.";
  if (!booleanFlag(flags, "yes")) return { command: "assets init", ok: true, applied: false, summary: `Ready to create asset-spec.json and provenance-input.json. Rerun with --yes. ${note}`, changes, data: { spec, provenance } };
  if (existing.some(Boolean) && !booleanFlag(flags, "force")) return { command: "assets init", ok: false, applied: false, summary: "Asset templates already exist. Use --force with --yes to replace them.", changes };
  for (const { path, value } of values) await writeJson(path, value);
  return { command: "assets init", ok: true, applied: true, summary: `Created asset templates in ${path}. ${note}`, changes };
}
