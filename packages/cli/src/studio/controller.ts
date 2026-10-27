import type { AssetInspection, AssetCollectionValidation } from "@emoji-styles/asset-pipeline";
import type { CommandResult } from "../types";

export type StudioScreen = "input" | "output" | "menu" | "details" | "confirm";
export type StudioAction = "inspect" | "preview" | "apply" | "validate" | "input" | "output" | "format" | "size" | "exit";
export interface StudioOptions { input?: string; output?: string; format?: string; size?: string; safeArea?: string }
export type Execute = (args: readonly string[]) => Promise<CommandResult>;

/** UI state only; all image operations use the existing CLI handlers. */
export class StudioController {
  screen: StudioScreen = "input";
  selection = 0;
  scroll = 0;
  draft = "";
  input: string;
  output: string;
  format: string;
  size: string;
  safeArea: string;
  busy = "";
  notice = "";
  details: string[] = [];
  preview?: CommandResult;
  stopped = false;
  exitCode = 0;
  lastApplied?: string;
  private editingPath = false;
  constructor(options: StudioOptions, private readonly execute: Execute, private readonly changed: () => void = () => {}) {
    this.input = options.input ?? "./raw";
    this.output = options.output ?? "./emoji-assets";
    this.format = options.format ?? "webp";
    this.size = options.size ?? "256";
    this.safeArea = options.safeArea ?? "0.76";
    this.draft = this.input;
  }
  menu(): { action: StudioAction; label: string }[] {
    return [
      { action: "inspect", label: "Inspect source images" },
      { action: "preview", label: "Preview normalization" },
      { action: "apply", label: this.preview ? "Apply reviewed preview..." : "Apply preview (preview first)" },
      { action: "validate", label: "Validate output" },
      { action: "input", label: "Change input path..." },
      { action: "output", label: "Change output path..." },
      { action: "format", label: `Format: ${this.format.toUpperCase()}` },
      { action: "size", label: `Canvas: ${this.size} x ${this.size} px` },
      { action: "exit", label: "Exit Studio" },
    ];
  }
  stop(code = 130): void { this.stopped = true; this.exitCode = code; this.changed(); }
  back(): void {
    if ((this.screen === "input" || this.screen === "output") && this.editingPath) {
      this.editingPath = false; this.screen = "menu"; this.notice = "";
    } else if (this.screen === "input") this.stop(0);
    else if (this.screen === "output") { this.screen = "input"; this.draft = this.input; }
    else if (this.screen === "menu") this.stop(0);
    else { this.screen = "menu"; this.selection = this.screenSelection(); }
  }
  private screenSelection(): number { return this.preview ? 2 : 0; }
  async acceptPath(): Promise<void> {
    const path = this.draft.trim();
    if (!path) { this.notice = "Enter a path inside this project."; return; }
    this.preview = undefined;
    this.notice = "";
    if (this.screen === "input") {
      this.input = path;
      if (this.editingPath) {
        this.editingPath = false;
        await this.perform("inspect");
      } else {
        this.screen = "output";
        this.draft = this.output;
      }
    } else {
      this.output = path;
      this.editingPath = false;
      await this.perform("inspect");
    }
  }
  private args(command: string, apply = false): string[] {
    return ["assets", command, ...(command === "inspect" ? [] : ["--format", this.format, "--size", this.size, "--safe-area", this.safeArea]), ...(apply ? ["--yes"] : []), "--", command === "validate" ? this.output : this.input, ...(command === "normalize" ? [this.output] : [])];
  }
  private show(result: CommandResult, title: string): void {
    this.details = [title, "", ...describeResult(result)];
    this.screen = "details";
    this.scroll = 0;
    this.notice = result.ok ? "" : "Fix the paths or settings, then retry from the menu.";
  }
  async perform(action: StudioAction): Promise<void> {
    if (this.busy || this.stopped) return;
    if (action === "exit") { this.stop(0); return; }
    if (action === "input" || action === "output") {
      this.editingPath = true; this.screen = action; this.draft = this[action]; this.notice = ""; return;
    }
    if (action === "format" || action === "size") {
      const values = action === "format" ? ["webp", "png", "avif"] : ["128", "256", "512"];
      this[action] = values[(values.indexOf(this[action]) + 1) % values.length];
      this.preview = undefined;
      this.notice = "Settings changed. Create a new preview before applying.";
      return;
    }
    if (action === "apply") {
      if (!this.preview) { this.notice = "Preview normalization before applying."; return; }
      if (this.preview.changes?.some((change) => change.action === "update")) {
        this.notice = "Output files already exist. Choose another output path and preview again."; return;
      }
      this.screen = "confirm"; this.selection = 0; return;
    }
    this.busy = action === "preview" ? "Preparing preview" : action === "inspect" ? "Inspecting source" : "Validating output";
    this.changed();
    try {
      if (action === "preview") {
        this.preview = undefined;
        const result = await this.execute(this.args("normalize"));
        if (result.ok) this.preview = result;
        this.show(result, "Normalization preview (no files written)");
      } else {
        const result = await this.execute(this.args(action === "inspect" ? "inspect" : "validate"));
        this.show(result, action === "inspect" ? "Source inspection" : "Output validation");
      }
    } catch (error) { this.show({ command: "studio", ok: false, summary: error instanceof Error ? error.message : String(error) }, "Operation failed"); }
    finally { this.busy = ""; this.changed(); }
  }
  async confirmApply(): Promise<void> {
    if (this.screen !== "confirm" || !this.preview || this.busy || this.stopped) return;
    if (this.selection === 0) { this.screen = "menu"; this.selection = 2; return; }
    this.busy = "Rechecking preview"; this.changed();
    try {
      const approved = this.preview;
      const fresh = await this.execute(this.args("normalize"));
      if (this.stopped) return;
      if (!fresh.ok) { this.preview = undefined; this.show(fresh, "Preview check failed"); return; }
      if (JSON.stringify([fresh.changes, fresh.data]) !== JSON.stringify([approved.changes, approved.data])) {
        this.preview = fresh;
        this.show(fresh, "Inputs or output changed. Review this new preview before applying."); return;
      }
      this.preview = undefined;
      this.busy = "Writing normalized images"; this.changed();
      const applied = await this.execute(this.args("normalize", true));
      if (!applied.ok) { this.show(applied, "Normalization failed"); return; }
      this.lastApplied = this.output;
      this.busy = "Validating normalized images"; this.changed();
      const validated = await this.execute(this.args("validate"));
      this.show(validated, `Written to ${this.output}. Technical validation follows.`);
    } catch (error) { this.preview = undefined; this.show({ command: "studio", ok: false, summary: error instanceof Error ? error.message : String(error) }, "Operation failed"); }
    finally { this.busy = ""; this.changed(); }
  }
}

export function describeResult(result: CommandResult): string[] {
  const lines = [`${result.ok ? "OK" : "FAILED"}  ${result.summary}`];
  const data = result.data as { assets?: AssetInspection[]; previews?: AssetInspection[]; issues?: AssetCollectionValidation["issues"] } | undefined;
  const inspections = data?.previews ?? (Array.isArray(data?.assets) ? data.assets.filter((item) => "width" in item) : []);
  for (const asset of inspections) {
    lines.push("", asset.path ?? "Normalized preview", `  ${asset.width} x ${asset.height} ${asset.format.toUpperCase()} | ${(asset.bytes / 1024).toFixed(1)} KB`, `  Transparent pixels: ${(asset.transparentPixelRatio * 100).toFixed(1)}% | alpha channel: ${asset.hasAlpha ? "yes" : "no"}`, `  Visible canvas: ${(asset.occupancy * 100).toFixed(1)}% | animated: ${asset.animated ? "yes" : "no"}`);
    if (asset.transparentPixelRatio === 0) lines.push("  No transparent pixels. Normalization does not remove backgrounds.");
  }
  if (result.changes?.length) {
    lines.push("", "Planned files:");
    for (const change of result.changes) lines.push(`  ${change.action === "create" ? "+" : "! exists"} ${change.path}`);
  }
  for (const issue of data?.issues ?? []) lines.push(`  ${issue.severity.toUpperCase()} [${issue.code}] ${issue.path ?? ""} ${issue.message}`);
  lines.push("", "Technical checks do not establish visual quality. Review at 24/48 px on light and dark backgrounds.");
  return lines;
}
