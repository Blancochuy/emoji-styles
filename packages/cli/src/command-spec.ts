/** Shared argument and help contract. Keep filesystem operations in command handlers. */
export interface CommandSpec {
  usage: string;
  description: string;
  options: Record<string, "boolean" | "string">;
  minArgs: number;
  maxArgs: number;
  formats?: readonly string[];
}
const write = { yes: "boolean", force: "boolean" } as const;
const raster = { format: "string", size: "string", "safe-area": "string" } as const;
const metadata = { id: "string", label: "string", version: "string", license: "string", ownership: "string" } as const;
const spec = (usage: string, description: string, options: CommandSpec["options"] = {}, maxArgs = 0, minArgs = 0, formats?: readonly string[]): CommandSpec => ({ usage, description, options, minArgs, maxArgs, formats });
export const globalOptions = { config: "string", json: "boolean", help: "boolean" } as const;
export const commandSpecs: Record<string, CommandSpec> = {
  studio: spec("studio [input] [output]", "Open the interactive local image workspace (TTY only)", raster, 2, 0, ["png", "webp", "avif"]),
  init: spec("init", "Preview project configuration; apply with --yes", { ...write, provider: "string", fallback: "string", "native-fallback": "boolean", source: "string", "local-assets": "string", "semantic-tokens": "string" }),
  audit: spec("audit [path]", "Audit JavaScript, TypeScript, JSX, TSX, and HTML", { format: "string" }, 1, 0, ["terminal", "json", "sarif"]),
  "theme draft": spec("theme draft [path]", "Propose a semantic theme and actual-size token sheet; write with --yes", { ...write, output: "string", providers: "string", manifest: "string", "asset-root": "string" }, 1),
  fix: spec("fix [path]", "Preview safe codemods; apply with --yes", { yes: "boolean", "dry-run": "boolean" }, 1),
  doctor: spec("doctor", "Validate configuration and provider health"),
  test: spec("test", "Resolve used emoji and verify local assets"),
  sync: spec("sync --used-only", "Preview synchronization of used assets; apply with --yes", { "used-only": "boolean", output: "string", yes: "boolean" }),
  licenses: spec("licenses", "Render provider attribution", { format: "string", output: "string" }, 0, 0, ["terminal", "json", "markdown"]),
  "provider create": spec("provider create [directory]", "Preview a manifest for existing assets; apply with --yes", { ...write, ...metadata, source: "string", "allow-svg": "boolean" }, 1),
  "assets init": spec("assets init [directory]", "Preview editable spec and provenance templates; create with --yes", { ...write, id: "string", source: "string", ownership: "string", license: "string", generated: "boolean", "generator-provider": "string", model: "string" }, 1),
  "assets spec-schema": spec("assets spec-schema", "Print the generation-spec schema"),
  "assets validate-spec": spec("assets validate-spec <file>", "Validate a generation spec without calling a model", {}, 1, 1),
  "assets plan": spec("assets plan <file>", "Plan generation without calling a model", { variants: "string" }, 1, 1),
  "assets inspect": spec("assets inspect [input]", "Inspect raster files and transparency", {}, 1),
  "assets validate": spec("assets validate [input]", "Validate raster files and geometry", raster, 1, 0, ["png", "webp", "avif"]),
  "assets normalize": spec("assets normalize [input] [output]", "Preview normalized raster assets; apply with --yes", { ...write, ...raster }, 2, 0, ["png", "webp", "avif"]),
  "assets contact-sheet": spec("assets contact-sheet [input] [output]", "Preview a review sheet; render with --yes", { yes: "boolean", columns: "string", "tile-size": "string", review: "boolean" }, 2),
  "assets pack": spec("assets pack <input> <output>", "Normalize, validate and package images in one step; write with --yes", { ...write, ...raster, ...metadata, source: "string", generated: "boolean", "generator-provider": "string", model: "string", provenance: "string", "base-path": "string", mapping: "string", "manifest-out": "string", "review-sheet": "string" }, 2, 2, ["png", "webp", "avif"]),
  "assets build": spec("assets build [directory]", "Preview a validated custom provider; package with --yes", { ...write, ...metadata, output: "string", "base-path": "string", mapping: "string", provenance: "string" }, 1),
};
export function commandKey(positionals: readonly string[]): string {
  return ["assets", "provider", "theme"].includes(positionals[0]) ? positionals.slice(0, 2).join(" ") : positionals[0] ?? "";
}
