import { readdir, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { EmojiMcpToolError } from "./types";

const ASSET_EXTENSIONS = new Set([".png", ".webp", ".avif"]);

export function safeWorkspacePath(workspace: string, input = "."): string {
  if (input.includes("\0")) throw new EmojiMcpToolError("PATH_INVALID", "Paths cannot contain null bytes.");
  const root = resolve(workspace);
  const output = resolve(root, input);
  const relation = relative(root, output);
  if (relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relation)) {
    throw new EmojiMcpToolError("PATH_OUTSIDE_WORKSPACE", `Path must stay inside the workspace: ${input}`);
  }
  return output;
}

export async function safeExistingWorkspacePath(workspace: string, input = "."): Promise<string> {
  const root = await realpath(safeWorkspacePath(workspace));
  const candidate = safeWorkspacePath(root, input);
  let output: string;
  try {
    output = await realpath(candidate);
  } catch (error) {
    throw new EmojiMcpToolError("PATH_UNREADABLE", error instanceof Error ? error.message : String(error));
  }
  const relation = relative(root, output);
  if (relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relation)) {
    throw new EmojiMcpToolError("PATH_OUTSIDE_WORKSPACE", `Resolved path must stay inside the workspace: ${input}`);
  }
  return output;
}

export async function listRasterAssets(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    throw new EmojiMcpToolError("ASSET_DIRECTORY_UNREADABLE", error instanceof Error ? error.message : String(error));
  });
  return entries
    .filter((entry) => entry.isFile() && ASSET_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => resolve(directory, entry.name))
    .sort();
}

export function redactSourceContext(value: string, maxLength = 2_000): string {
  return value
    .slice(0, maxLength)
    .replace(/\b(?:sk|rk|pk|ghp|github_pat|sbp)_[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_SECRET]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/gi, "Bearer [REDACTED_SECRET]");
}
