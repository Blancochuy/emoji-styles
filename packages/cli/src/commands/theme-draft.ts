import { lstat, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import sharp from "sharp";
import { defineEmojiTheme, getEmojiUrl, normalizeEmoji, providers, serializeEmojiTheme, tokenizeEmojiText, validateProviderManifest, type EmojiProviderManifest } from "emoji-styles";
import { auditProject } from "../audit";
import { loadConfig } from "../config";
import { exists, safeProjectPath, sha256 } from "../files";
import { booleanFlag, stringFlag } from "../flags";
import type { AuditEmojiUsage, CommandContext, CommandResult, ParsedFlags } from "../types";

interface Candidate {
  token: string;
  emoji: string;
  label: string;
  reviewRequired: true;
  reason: string;
  usages: AuditEmojiUsage[];
}
interface SheetProvider {
  id: string;
  attribution: string;
  assets: Map<string, string>;
  unavailable?: string;
}

/** No application edits and no model or network calls. */
export async function themeDraftCommand(context: CommandContext, target: string | undefined, flags: ParsedFlags): Promise<CommandResult> {
  const audit = await auditProject(context, flags, target);
  if (!audit.complete) throw new Error("Resolve source parse errors or oversized files before drafting a theme; a partial inventory would be misleading.");
  if (!audit.files.length) throw new Error("No supported source files found. Check the target and source roots.");
  const candidates = proposeTokens(audit.usages);
  const theme = defineEmojiTheme(Object.fromEntries(candidates.map((candidate) => [candidate.token, { emoji: candidate.emoji, label: candidate.label }])), { id: "review-draft", defaultProvider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false });
  const source = "// DRAFT: review every token, label and meaning before integrating. No source files were migrated.\n" + serializeEmojiTheme(theme, { format: "typescript" });
  const loaded = await loadConfig(context.cwd, stringFlag(flags, "config"));
  const sheetProviders = await comparisonProviders(context, flags, candidates, loaded.config.policy?.allowRemoteAssets !== false);
  const review = {
    schemaVersion: 1, draft: true, reviewRequired: true,
    limitations: ["Static JSX/HTML evidence, not a runtime accessibility audit.", "Status wording heuristics currently recognize English only.", "Dynamic children, CSS visibility, custom components and unresolved aria-labelledby need runtime review.", "Labels and token names are proposals. No bundle-size reduction is implied."],
    candidates, usages: audit.usages, findings: audit.findings,
    providers: sheetProviders.map(({ id, attribution, unavailable }) => ({ id, attribution, ...(unavailable ? { unavailable } : {}) })),
  };
  const output = safeProjectPath(context.cwd, stringFlag(flags, "output") ?? ".emoji-styles/design-review");
  const documents = new Map([["emoji-theme.ts", source], ["review.json", `${JSON.stringify(review, null, 2)}\n`], ["token-sheet.html", renderSheet(candidates, sheetProviders)]]);
  await rejectSymlinks(context.cwd, output);
  for (const name of documents.keys()) await rejectSymlinks(context.cwd, resolve(output, name));
  const changes = await Promise.all([...documents.keys()].map(async (name) => {
    const path = resolve(output, name);
    return { path, action: await exists(path) ? "update" as const : "create" as const, description: `Write review-only ${name}` };
  }));
  if (booleanFlag(flags, "yes")) {
    if (!booleanFlag(flags, "force") && changes.some((change) => change.action === "update")) throw new Error("Draft files already exist; use --force with --yes to replace them.");
    await mkdir(output, { recursive: true });
    for (const [name, contents] of documents) await writeFile(resolve(output, name), contents, "utf8");
  }
  return {
    command: "theme draft", ok: true, applied: booleanFlag(flags, "yes"),
    summary: `Proposed ${candidates.length} token(s) from ${audit.usages.length} occurrence(s). Review names, meaning and accessibility before integration.${booleanFlag(flags, "yes") ? " Open token-sheet.html at 100% zoom." : " Rerun with --yes to write the draft and comparison sheet."}`,
    changes, data: { ...review, output, themeSource: source },
  };
}

function withoutEmoji(text: string): string {
  return tokenizeEmojiText(text).filter((token) => token.type !== "emoji").map((token) => token.value).join("").replace(/\s+/g, " ").trim();
}
export function proposeTokens(usages: AuditEmojiUsage[]): Candidate[] {
  const candidates: Candidate[] = [];
  const byMeaning = new Map<string, Candidate>();
  for (const usage of usages) {
    if (usage.role === "decorative" || usage.role === "unknown" || !normalizeEmoji(usage.emoji)) continue;
    const label = withoutEmoji(usage.context);
    const prefix = usage.role === "control" ? "action" : usage.role;
    const status = usage.role === "status" ? (/\b(?:failed|failure|error|warning)\b/i.test(label) ? "warning" : /\b(?:success|successful|operational|complete|ready)\b/i.test(label) ? "success" : null) : null;
    const slug = status ?? label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 3).map((word) => /^[a-z]/.test(word) ? word : `item${word}`).join(".");
    const base = `${prefix}.${slug || "review"}`;
    const proposedLabel = label || `REVIEW: name this ${usage.role}`;
    const key = JSON.stringify([base, usage.emoji, proposedLabel]);
    const existing = byMeaning.get(key);
    if (existing) { existing.usages.push(usage); continue; }
    let token = base;
    let suffix = 2;
    while (candidates.some((candidate) => candidate.token === token)) token = `${base}${suffix++}`;
    const candidate: Candidate = { token, emoji: usage.emoji, label: proposedLabel, reviewRequired: true, reason: `${usage.reason} Proposed name and label require product review.`, usages: [usage] };
    candidates.push(candidate);
    byMeaning.set(key, candidate);
  }
  return candidates;
}

async function comparisonProviders(context: CommandContext, flags: ParsedFlags, candidates: Candidate[], remoteAllowed: boolean): Promise<SheetProvider[]> {
  const ids = [...new Set((stringFlag(flags, "providers") ?? "fluent-3d,twemoji").split(",").map((id) => id.trim()))];
  if (ids.some((id) => !["fluent-3d", "twemoji"].includes(id))) throw new Error("--providers accepts fluent-3d,twemoji. Add a custom raster pack with --manifest and --asset-root.");
  const output: SheetProvider[] = ids.map((id) => {
    const provider = providers[id as "fluent-3d" | "twemoji"];
    return { id, attribution: `${provider.label}: ${JSON.stringify(provider.license ?? "License metadata unavailable")}`, assets: new Map(remoteAllowed ? candidates.flatMap(({ emoji }) => {
      const url = getEmojiUrl(emoji, id as "fluent-3d" | "twemoji");
      return url?.startsWith("https://") ? [[emoji, url] as [string, string]] : [];
    }) : []), ...(!remoteAllowed ? { unavailable: "Remote artwork disabled by project policy" } : {}) };
  });
  const manifestFlag = stringFlag(flags, "manifest");
  const rootFlag = stringFlag(flags, "asset-root");
  if (Boolean(manifestFlag) !== Boolean(rootFlag)) throw new Error("Pass --manifest and --asset-root together. The asset root is a disk directory, independent of the browser basePath.");
  if (!manifestFlag || !rootFlag) return output;
  const manifestPath = safeProjectPath(context.cwd, manifestFlag);
  await rejectSymlinks(context.cwd, manifestPath);
  if ((await stat(manifestPath)).size > 2 * 1024 * 1024) throw new Error("Manifest exceeds 2 MB.");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as EmojiProviderManifest;
  const validation = validateProviderManifest(manifest);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  if (manifest.format === "svg") throw new Error("The token sheet accepts raster packs only; arbitrary SVG is not embedded.");
  const root = await realpath(safeProjectPath(context.cwd, rootFlag));
  const projectRoot = await realpath(context.cwd);
  safeProjectPath(projectRoot, root);
  const assets = new Map<string, string>();
  let totalBytes = 0;
  for (const { emoji } of candidates) {
    if (assets.has(emoji)) continue;
    const asset = manifest.assets[emoji];
    if (!asset) continue;
    const path = await realpath(safeProjectPath(root, asset.file));
    safeProjectPath(root, path);
    const size = (await stat(path)).size;
    totalBytes += size;
    if (size > 5 * 1024 * 1024 || totalBytes > 20 * 1024 * 1024) throw new Error("Custom sheet assets exceed the 5 MB per-file or 20 MB total limit.");
    const bytes = await readFile(path);
    if (asset.sha256 && asset.sha256 !== sha256(bytes)) throw new Error(`Custom asset hash mismatch: ${asset.file}`);
    const metadata = await sharp(bytes, { limitInputPixels: 4096 * 4096 }).metadata();
    const mime = metadata.format === "heif" && metadata.compression === "av1" ? "avif" : metadata.format;
    if (mime !== manifest.format || !["png", "webp", "avif"].includes(mime ?? "") || (metadata.pages ?? 1) > 1) throw new Error(`Unsupported, mismatched or animated custom raster: ${asset.file}`);
    assets.set(emoji, `data:image/${mime};base64,${bytes.toString("base64")}`);
  }
  output.push({ id: `custom:${manifest.id}`, attribution: `${manifest.label}: ${JSON.stringify(manifest.license)}. Source: ${manifest.source}. Hashes verified where declared; rights and visual quality require review.`, assets });
  return output;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function renderSheet(candidates: Candidate[], sheetProviders: SheetProvider[]): string {
  const rows = candidates.map((candidate) => `<section><h2>${escape(candidate.token)} <small>Review required</small></h2><p>${escape(candidate.label)}</p><p>${escape(candidate.usages[0].path)}:${candidate.usages[0].start.line} · ${escape(candidate.reason)}</p>${["light", "dark"].map((mode) => `<div class="${mode}">${sheetProviders.map((provider) => `<div class="provider"><h3>${escape(provider.id)}</h3>${[16, 20, 24].map((size) => {
    const url = provider.assets.get(candidate.emoji);
    return `<div class="sample"><span class="size">${size} px</span><span class="inline">${url ? `<img src="${escape(url)}" width="${size}" height="${size}" alt="Artwork unavailable" referrerpolicy="no-referrer">` : `<strong>Artwork unavailable</strong>`} <span>${escape(candidate.label)}</span></span></div>`;
  }).join("")}</div>`).join("")}</div>`).join("")}</section>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Emoji token draft review</title><style>body{margin:0;padding:24px;background:#f1f3f5;color:#17212b;font:16px/1.5 system-ui,sans-serif}main{max-width:1080px;margin:auto}h1{font-size:26px}h2{font-size:19px}h3{font-size:15px}small,.size{font-size:12px}.size{min-width:48px}section{background:white;border:1px solid #c5cbd1;border-radius:12px;padding:20px;margin:20px 0}section>p{overflow-wrap:anywhere}.light,.dark{display:flex;flex-wrap:wrap;gap:24px;padding:16px;border:1px solid #84909b}.light{background:#fff;color:#17212b}.dark{background:#17212b;color:#f5f7fa}.provider{flex:1;min-width:240px}.sample,.inline{display:flex;align-items:center;gap:8px}.sample{min-height:40px}.inline{font-size:16px}img{object-fit:contain;flex-shrink:0}footer{font-size:13px;overflow-wrap:anywhere}</style></head><body><main><h1>Emoji token draft</h1><p>Review names, meanings, action labels and artwork at 100% zoom. These are proposals, not a completed migration or accessibility certification. Built-in artwork needs an internet connection when this sheet is opened; failed images retain their alt text. Missing custom artwork is shown explicitly, without Unicode fallback.</p>${rows || "<p>No supported token candidates. See review.json for decorative and unknown occurrences.</p>"}<footer>${sheetProviders.map((provider) => `<p>${escape(provider.id)}: ${escape(provider.attribution)}${provider.unavailable ? ` (${escape(provider.unavailable)})` : ""}</p>`).join("")}</footer></main></body></html>\n`;
}

async function rejectSymlinks(cwd: string, path: string): Promise<void> {
  let current = resolve(cwd);
  for (const part of relative(current, path).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    const info = await lstat(current).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
    if (info?.isSymbolicLink()) throw new Error(`Draft output must not traverse symlinks: ${current}`);
  }
}
