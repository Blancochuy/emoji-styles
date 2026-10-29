import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  buildProviderArtifacts,
  createContactSheet,
  inspectEmojiAsset,
  normalizeEmojiAsset,
  emojiAssetSpecSchema,
  planEmojiGeneration,
  validateAssetSpec,
  validateAssetCollection,
  type AssetMappingEntry,
  type AssetProvenance,
  type RasterAssetFormat,
} from "@emoji-styles/asset-pipeline";
import type { ProviderLicense } from "emoji-styles";
import { booleanFlag, stringFlag } from "../flags";
import { exists, readJson, safeProjectPath, walkFiles, writeJson } from "../files";
import type { CommandContext, CommandResult, ParsedFlags } from "../types";
import { assetsInitCommand, provenanceFromFlags } from "./assets-init";

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
  if (subcommand === "init") return assetsInitCommand(context, rest[0] ?? "./custom-emoji", flags);
  if (subcommand === "spec-schema") return { command: "assets spec-schema", ok: true, summary: "Asset specification schema v1.", data: emojiAssetSpecSchema };
  if (subcommand === "validate-spec" || subcommand === "plan") {
    if (!rest[0]) throw new Error(`Usage: emoji-styles assets ${subcommand} <asset-spec.json> --json`);
    const spec = await readJson<unknown>(safeProjectPath(context.cwd, rest[0]));
    const validation = validateAssetSpec(spec);
    if (!validation.valid || subcommand === "validate-spec") return { command: `assets ${subcommand}`, ok: validation.valid, summary: validation.valid ? "Asset spec is valid." : "Asset spec validation failed.", data: validation };
    const plan = planEmojiGeneration(spec, { variants: numberFlag(flags, "variants", 1) });
    return { command: "assets plan", ok: true, applied: false, summary: `Planned ${plan.totalRequests} request(s); no generation executed. Use --json to inspect prompts.`, data: plan };
  }
  if (subcommand === "inspect") return inspectCommand(context, rest[0] ?? ".");
  if (subcommand === "validate") return validateCommand(context, rest[0] ?? ".", flags);
  if (subcommand === "normalize") return normalizeCommand(context, rest[0] ?? ".", rest[1] ?? "./emoji-assets", flags);
  if (subcommand === "contact-sheet") return contactSheetCommand(context, rest[0] ?? ".", rest[1] ?? "./emoji-contact-sheet.png", flags);
  if (subcommand === "build") return buildCommand(context, rest[0] ?? ".", flags);
  if (subcommand === "pack") return packCommand(context, rest[0], rest[1], flags);
  return { command: "assets", ok: false, summary: "Usage: emoji-styles assets <init|spec-schema|validate-spec|plan|inspect|normalize|validate|contact-sheet|build|pack> ..." };
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
  if (!inputIsFile) assertOutsideInput(input, output);
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
  await createContactSheet({ inputs: files, output, columns: numberFlag(flags, "columns", Math.min(6, files.length)), tileSize: numberFlag(flags, "tile-size", 160), review: booleanFlag(flags, "review") });
  return { command: "assets contact-sheet", ok: true, applied: true, summary: `Created contact sheet at ${relative(context.cwd, output)}.`, changes };
}

async function buildCommand(context: CommandContext, directoryPath: string, flags: ParsedFlags): Promise<CommandResult> {
  const directory = safeProjectPath(context.cwd, directoryPath);
  const output = safeProjectPath(context.cwd, stringFlag(flags, "output") ?? directoryPath);
  const provenancePath = stringFlag(flags, "provenance");
  if (!provenancePath) throw new Error("--provenance <file> is required; ownership and generation history are never inferred");
  const provenance = await readJson<AssetProvenance>(safeProjectPath(context.cwd, provenancePath));
  const plan = await planProviderPackage(context, directory, output, provenance, stringFlag(flags, "base-path") ?? "./assets", flags);
  const existing = await Promise.all(plan.paths.map((path) => exists(path)));
  const changes = plan.paths.map((path, index) => ({ path, action: existing[index] ? "update" as const : "create" as const, description: `${index < plan.targets.length ? "Generate" : "Copy asset"} ${basename(path)}` }));
  if (!booleanFlag(flags, "yes")) return { command: "assets build", ok: true, applied: false, summary: `Ready to package ${plan.count} asset(s). Rerun with --yes.`, changes, data: plan.artifacts };
  if (existing.some(Boolean) && !booleanFlag(flags, "force")) return { command: "assets build", ok: false, applied: false, summary: "Provider output already exists. Use --force with --yes to replace it.", changes };
  await writeProviderPackage(plan, output, flags);
  return { command: "assets build", ok: true, applied: true, summary: `Packaged ${plan.count} asset(s) as ${plan.artifacts.manifest.id}.`, changes };
}

async function packCommand(context: CommandContext, inputPath: string, outputPath: string, flags: ParsedFlags): Promise<CommandResult> {
  const input = safeProjectPath(context.cwd, inputPath);
  const output = safeProjectPath(context.cwd, outputPath);
  assertOutsideInput(input, output);
  const provenancePath = stringFlag(flags, "provenance");
  if (!provenancePath && typeof flags.generated !== "boolean") throw new Error("Declare image origin with --no-generated, or --generated --model <model>, or pass --provenance <file>. Image origin is never inferred.");
  const provenance = provenancePath ? await readJson<AssetProvenance>(safeProjectPath(context.cwd, provenancePath)) : provenanceFromFlags(flags) as AssetProvenance;
  const files = await assetFiles(input);
  if (!files.length) return { command: "assets pack", ok: false, applied: false, summary: `No raster assets found in ${inputPath}.` };
  const format = (stringFlag(flags, "format") ?? "webp") as RasterAssetFormat;
  if (!OUTPUT_FORMATS.has(format)) throw new Error("--format must be png, webp, or avif");
  const size = numberFlag(flags, "size", 256);
  const safeArea = numberFlag(flags, "safe-area", 0.76);
  const names = files.map((file) => `${basename(file, extname(file))}.${format}`);
  if (new Set(names).size !== names.length) throw new Error("Normalization would create duplicate output filenames");
  const basePath = stringFlag(flags, "base-path") ?? publicBasePath(context.cwd, output) ?? "./assets";
  const manifestOut = stringFlag(flags, "manifest-out");
  const reviewSheet = stringFlag(flags, "review-sheet");
  const extras = [
    ...(manifestOut ? [{ path: safeProjectPath(context.cwd, manifestOut), description: "Write importable manifest copy" }] : []),
    ...(reviewSheet ? [{ path: safeProjectPath(context.cwd, reviewSheet), description: "Render 24/48/96 px review sheet" }] : []),
  ];
  const staging = await mkdtemp(join(tmpdir(), "emoji-styles-pack-"));
  try {
    for (let index = 0; index < files.length; index++) await normalizeEmojiAsset({ input: files[index], output: join(staging, names[index]), size, format, safeArea });
    const plan = await planProviderPackage(context, staging, output, provenance, basePath, flags);
    const paths = [...plan.paths, ...extras.map(({ path }) => path)];
    for (let index = 0; index < paths.length; index++) for (const other of paths.slice(index + 1)) {
      const relation = relative(paths[index], other);
      const reverse = relative(other, paths[index]);
      const nested = (value: string) => value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
      if (nested(relation) || nested(reverse)) throw new Error(`Pack output paths overlap: ${paths[index]} and ${other}. Choose separate files for the manifest and review sheet.`);
    }
    const existing = await Promise.all(paths.map((path) => exists(path)));
    const descriptions = [...plan.targets.map((path) => `Generate ${basename(path)}`), ...plan.copies.map(({ target }) => `Normalize to ${size}px ${format} as ${basename(target)}`), ...extras.map(({ description }) => description)];
    const changes = paths.map((path, index) => ({ path, action: existing[index] ? "update" as const : "create" as const, description: descriptions[index] }));
    const where = `${outputPath} (base path ${basePath})`;
    if (!booleanFlag(flags, "yes")) return { command: "assets pack", ok: true, applied: false, summary: `Ready to pack ${plan.count} asset(s) into ${where}. Rerun with --yes.`, changes, data: plan.artifacts };
    if (existing.some(Boolean) && !booleanFlag(flags, "force")) return { command: "assets pack", ok: false, applied: false, summary: "Pack output already exists. Use --force with --yes to replace it.", changes };
    await writeProviderPackage(plan, output, flags);
    if (manifestOut) {
      await mkdir(dirname(extras[0].path), { recursive: true });
      await writeJson(extras[0].path, plan.artifacts.manifest);
    }
    if (reviewSheet) await createContactSheet({ inputs: plan.copies.map(({ target }) => target), output: extras[extras.length - 1].path, columns: Math.min(6, plan.copies.length), tileSize: 160, review: true });
    return { command: "assets pack", ok: true, applied: true, summary: `Packed ${plan.count} asset(s) as ${plan.artifacts.manifest.id} into ${where}.`, changes };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

interface ProviderPackagePlan {
  artifacts: Awaited<ReturnType<typeof buildProviderArtifacts>>;
  targets: string[];
  copies: Array<{ source: string; target: string }>;
  paths: string[];
  count: number;
}

async function planProviderPackage(context: CommandContext, directory: string, output: string, provenance: AssetProvenance, basePath: string, flags: ParsedFlags): Promise<ProviderPackagePlan> {
  if (typeof provenance?.generated !== "boolean") throw new Error("Set provenance.generated to true or false; assets init --generated or --no-generated can create the matching template. Image origin is never inferred.");
  const mappingPath = stringFlag(flags, "mapping");
  const mapping = mappingPath ? await readJson<AssetMappingEntry[]>(safeProjectPath(context.cwd, mappingPath)) : undefined;
  const licenseName = stringFlag(flags, "license") ?? provenance.license;
  const ownership = stringFlag(flags, "ownership") ?? provenance.ownership;
  const license: ProviderLicense | undefined = licenseName || ownership ? { name: licenseName ?? "Proprietary", ...(ownership ? { ownership } : {}) } : undefined;
  const artifacts = await buildProviderArtifacts({ directory, id: stringFlag(flags, "id") ?? "custom-local", label: stringFlag(flags, "label"), version: stringFlag(flags, "version"), basePath, mapping, license, provenance });
  const targets = [resolve(output, "emoji-provider.json"), resolve(output, "provider.ts"), resolve(output, "PROVENANCE.json"), resolve(output, "LICENSE.md"), resolve(output, "README.md"), ...(artifacts.themeModule ? [resolve(output, "theme.ts")] : [])];
  const copies = Object.values(artifacts.manifest.assets).map((asset) => ({ source: resolve(directory, asset.file), target: resolve(output, "assets", asset.file) })).filter(({ source, target }) => source !== target);
  return { artifacts, targets, copies, paths: [...targets, ...copies.map(({ target }) => target)], count: Object.keys(artifacts.manifest.assets).length };
}

async function writeProviderPackage({ artifacts, targets, copies }: ProviderPackagePlan, output: string, flags: ParsedFlags): Promise<void> {
  await mkdir(output, { recursive: true });
  if (copies.length) await mkdir(resolve(output, "assets"), { recursive: true });
  for (const { source, target } of copies) await copyFile(source, target, booleanFlag(flags, "force") ? 0 : constants.COPYFILE_EXCL);
  await writeJson(targets[0], artifacts.manifest);
  await writeFile(targets[1], artifacts.providerModule, "utf8");
  await writeJson(targets[2], artifacts.provenance);
  await writeFile(targets[3], artifacts.licenseDocument, "utf8");
  await writeFile(targets[4], artifacts.readme, "utf8");
  if (artifacts.themeModule) await writeFile(resolve(output, "theme.ts"), artifacts.themeModule, "utf8");
}

/** Vite, Next.js and similar servers expose public/<path> at /<path>. */
function publicBasePath(cwd: string, output: string): string | undefined {
  const parts = relative(cwd, output).split(sep);
  if (parts[0] !== "public") return undefined;
  return `/${[...parts.slice(1), "assets"].join("/")}`;
}

function assertOutsideInput(input: string, output: string): void {
  const outputRelation = relative(input, output);
  if (outputRelation !== ".." && !outputRelation.startsWith(`..${sep}`) && !isAbsolute(outputRelation)) throw new Error("Output directory must not be inside the input directory");
}
