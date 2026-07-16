import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve } from "node:path";
import {
  buildProviderArtifacts,
  createContactSheet,
  inspectEmojiAsset,
  normalizeEmojiAsset,
  validateAssetCollection,
  type AssetMappingEntry,
  type AssetProvenance,
  type RasterAssetFormat,
} from "@emoji-styles/asset-pipeline";
import type { ProviderLicense } from "emoji-styles";
import { booleanFlag, stringFlag } from "../flags";
import { exists, readJson, safeProjectPath, walkFiles, writeJson } from "../files";
import type { CommandContext, CommandResult, ParsedFlags } from "../types";

const INPUT_EXTENSIONS = new Set([".png", ".webp", ".avif", ".jpg", ".jpeg"]);
const OUTPUT_FORMATS = new Set<RasterAssetFormat>(["png", "webp", "avif"]);

function numberFlag(flags: ParsedFlags, name: string, fallback: number): number {
  const raw = stringFlag(flags, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number`);
  return value;
}

async function assetFiles(path: string): Promise<string[]> {
  return walkFiles(path, INPUT_EXTENSIONS);
}

export async function assetsCommand(context: CommandContext, subcommand: string | undefined, rest: string[], flags: ParsedFlags): Promise<CommandResult> {
  if (subcommand === "inspect") return inspectCommand(context, rest[0] ?? ".");
  if (subcommand === "validate") return validateCommand(context, rest[0] ?? ".", flags);
  if (subcommand === "normalize") return normalizeCommand(context, rest[0] ?? ".", rest[1] ?? "./emoji-assets", flags);
  if (subcommand === "contact-sheet") return contactSheetCommand(context, rest[0] ?? ".", rest[1] ?? "./emoji-contact-sheet.png", flags);
  if (subcommand === "build") return buildCommand(context, rest[0] ?? ".", flags);
  return { command: "assets", ok: false, summary: "Usage: emoji-styles assets <inspect|normalize|validate|contact-sheet|build> ..." };
}

async function inspectCommand(context: CommandContext, path: string): Promise<CommandResult> {
  const input = safeProjectPath(context.cwd, path);
  const files = await assetFiles(input);
  if (!files.length) return { command: "assets inspect", ok: false, summary: `No raster assets found in ${path}.` };
  const inspections = [];
  for (const file of files) inspections.push(await inspectEmojiAsset(file));
  return { command: "assets inspect", ok: true, summary: `Inspected ${inspections.length} asset(s).`, data: { assets: inspections } };
}

async function validateCommand(context: CommandContext, path: string, flags: ParsedFlags): Promise<CommandResult> {
  const input = safeProjectPath(context.cwd, path);
  const files = await assetFiles(input);
  if (!files.length) return { command: "assets validate", ok: false, summary: `No raster assets found in ${path}.` };
  const format = stringFlag(flags, "format") as RasterAssetFormat | undefined;
  if (format && !OUTPUT_FORMATS.has(format)) throw new Error("--format must be png, webp, or avif");
  const result = await validateAssetCollection(files, {
    size: numberFlag(flags, "size", 256),
    safeArea: numberFlag(flags, "safe-area", 0.76),
    ...(format ? { format } : {}),
  });
  return { command: "assets validate", ok: result.valid, summary: `${result.valid ? "Validated" : "Validation failed for"} ${files.length} asset(s): ${result.issues.length} issue(s).`, data: result };
}

async function normalizeCommand(context: CommandContext, inputPath: string, outputPath: string, flags: ParsedFlags): Promise<CommandResult> {
  const input = safeProjectPath(context.cwd, inputPath);
  const output = safeProjectPath(context.cwd, outputPath);
  if (resolve(input) === resolve(output)) throw new Error("Input and output paths must be different");
  const files = await assetFiles(input);
  if (!files.length) return { command: "assets normalize", ok: false, applied: false, summary: `No raster assets found in ${inputPath}.` };
  const format = (stringFlag(flags, "format") ?? "webp") as RasterAssetFormat;
  if (!OUTPUT_FORMATS.has(format)) throw new Error("--format must be png, webp, or avif");
  const size = numberFlag(flags, "size", 256);
  const safeArea = numberFlag(flags, "safe-area", 0.76);
  const inputIsFile = files.length === 1 && resolve(files[0]) === resolve(input);
  const outputRelation = relative(input, output);
  if (!inputIsFile && outputRelation !== ".." && !outputRelation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(outputRelation)) {
    throw new Error("Output directory must not be inside the input directory");
  }
  const outputs = files.map((file) => inputIsFile && extname(output) ? output : resolve(output, `${basename(file, extname(file))}.${format}`));
  if (new Set(outputs).size !== outputs.length) throw new Error("Normalization would create duplicate output filenames");
  const existing = await Promise.all(outputs.map((path) => exists(path)));
  const changes = outputs.map((path, index) => ({ path, action: existing[index] ? "update" as const : "create" as const, description: `Normalize to ${size}px ${format} with ${safeArea} safe area` }));
  if (!booleanFlag(flags, "yes")) {
    const previews = [];
    for (const file of files) previews.push((await normalizeEmojiAsset({ input: file, size, format, safeArea })).inspection);
    return { command: "assets normalize", ok: true, applied: false, summary: `Ready to normalize ${files.length} asset(s). Rerun with --yes to write files.`, changes, data: { previews } };
  }
  if (existing.some(Boolean) && !booleanFlag(flags, "force")) return { command: "assets normalize", ok: false, applied: false, summary: "Normalized output already exists. Use --force with --yes to replace it.", changes };
  for (let index = 0; index < files.length; index++) await normalizeEmojiAsset({ input: files[index], output: outputs[index], size, format, safeArea });
  return { command: "assets normalize", ok: true, applied: true, summary: `Normalized ${files.length} asset(s) to ${outputPath}.`, changes };
}

async function contactSheetCommand(context: CommandContext, inputPath: string, outputPath: string, flags: ParsedFlags): Promise<CommandResult> {
  const input = safeProjectPath(context.cwd, inputPath);
  const output = safeProjectPath(context.cwd, outputPath);
  const files = await assetFiles(input);
  if (!files.length) return { command: "assets contact-sheet", ok: false, applied: false, summary: `No raster assets found in ${inputPath}.` };
  const changes = [{ path: output, action: await exists(output) ? "update" as const : "create" as const, description: `Render review sheet for ${files.length} assets` }];
  if (!booleanFlag(flags, "yes")) return { command: "assets contact-sheet", ok: true, applied: false, summary: `Ready to render a ${files.length}-asset contact sheet. Rerun with --yes.`, changes };
  await createContactSheet({ inputs: files, output, columns: numberFlag(flags, "columns", 6), tileSize: numberFlag(flags, "tile-size", 160) });
  return { command: "assets contact-sheet", ok: true, applied: true, summary: `Created contact sheet at ${relative(context.cwd, output)}.`, changes };
}

async function buildCommand(context: CommandContext, directoryPath: string, flags: ParsedFlags): Promise<CommandResult> {
  const directory = safeProjectPath(context.cwd, directoryPath);
  const output = safeProjectPath(context.cwd, stringFlag(flags, "output") ?? directoryPath);
  const provenancePath = stringFlag(flags, "provenance");
  if (!provenancePath) throw new Error("--provenance <file> is required; ownership and generation history are never inferred");
  const provenance = await readJson<AssetProvenance>(safeProjectPath(context.cwd, provenancePath));
  const mappingPath = stringFlag(flags, "mapping");
  const mapping = mappingPath ? await readJson<AssetMappingEntry[]>(safeProjectPath(context.cwd, mappingPath)) : undefined;
  const licenseName = stringFlag(flags, "license") ?? provenance.license;
  const ownership = stringFlag(flags, "ownership") ?? provenance.ownership;
  const license: ProviderLicense | undefined = licenseName || ownership ? { name: licenseName ?? "Proprietary", ...(ownership ? { ownership } : {}) } : undefined;
  const artifacts = await buildProviderArtifacts({ directory, id: stringFlag(flags, "id") ?? "custom-local", label: stringFlag(flags, "label"), version: stringFlag(flags, "version"), basePath: stringFlag(flags, "base-path") ?? "./assets", mapping, license, provenance });
  const targets = [resolve(output, "emoji-provider.json"), resolve(output, "provider.ts"), resolve(output, "PROVENANCE.json"), resolve(output, "LICENSE.md"), resolve(output, "README.md"), ...(artifacts.themeModule ? [resolve(output, "theme.ts")] : [])];
  const existing = await Promise.all(targets.map((path) => exists(path)));
  const changes = targets.map((path, index) => ({ path, action: existing[index] ? "update" as const : "create" as const, description: `Generate ${basename(path)}` }));
  if (!booleanFlag(flags, "yes")) return { command: "assets build", ok: true, applied: false, summary: `Ready to package ${Object.keys(artifacts.manifest.assets).length} asset(s). Rerun with --yes.`, changes, data: artifacts };
  if (existing.some(Boolean) && !booleanFlag(flags, "force")) return { command: "assets build", ok: false, applied: false, summary: "Provider output already exists. Use --force with --yes to replace it.", changes };
  await mkdir(output, { recursive: true });
  await writeJson(targets[0], artifacts.manifest);
  await writeFile(targets[1], artifacts.providerModule, "utf8");
  await writeJson(targets[2], artifacts.provenance);
  await writeFile(targets[3], artifacts.licenseDocument, "utf8");
  await writeFile(targets[4], artifacts.readme, "utf8");
  if (artifacts.themeModule) await writeFile(resolve(output, "theme.ts"), artifacts.themeModule, "utf8");
  return { command: "assets build", ok: true, applied: true, summary: `Packaged ${Object.keys(artifacts.manifest.assets).length} asset(s) as ${artifacts.manifest.id}.`, changes };
}
