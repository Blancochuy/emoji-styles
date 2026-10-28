import { realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";

export class StartupUsageError extends Error {}
export interface StartupOptions { help: boolean; workspace: string }

export function parseStartup(args: readonly string[], cwd: string): StartupOptions {
  let workspace: string | undefined;
  let help = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") { help = true; continue; }
    if (arg === "--workspace" || arg.startsWith("--workspace=")) {
      if (workspace !== undefined) throw new StartupUsageError("--workspace may only be supplied once.");
      const value = arg === "--workspace" ? args[++index] : arg.slice("--workspace=".length);
      if (!value || value.includes("\0") || (arg === "--workspace" && value.startsWith("--"))) throw new StartupUsageError("--workspace requires a directory path.");
      workspace = value;
    } else throw new StartupUsageError(`Unknown argument: ${arg}. Use --help.`);
  }
  return { help, workspace: resolve(cwd, workspace ?? ".") };
}

export async function resolveWorkspace(path: string): Promise<string> {
  const workspace = await realpath(path);
  if (!(await stat(workspace)).isDirectory()) throw new Error("Workspace must be an existing directory.");
  return workspace;
}

export const startupHelp = `Usage: emoji-styles-mcp [--workspace <directory>]

Local STDIO MCP server. Project tools are read-only; no image generation is executed.
--workspace <directory>  Existing project directory (default: process working directory)
--help, -h               Show this help without starting the server

Use an absolute workspace path in client configurations. Only JSON-RPC goes to
stdout while serving; diagnostics go to stderr. No API key is needed for local tools.
`;
