import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseStartup, resolveWorkspace } from "../startup";

describe("MCP startup contract", () => {
  it("preserves the working directory default and supports explicit paths with spaces and equals", () => {
    expect(parseStartup([], "/project")).toEqual({ help: false, workspace: resolve("/project") });
    expect(parseStartup(["--workspace", "my project"], "/project").workspace).toBe(resolve("/project/my project"));
    expect(parseStartup(["--workspace=a=b", "--help"], "/project")).toEqual({ help: true, workspace: resolve("/project/a=b") });
  });
  it.each([["--workspace"], ["--workspace="], ["--workspace", "--help"], ["--workspace", "a", "--workspace=b"], ["--json"], ["unexpected"], ["--workspace=x\0y"]].map((args) => ({ args })))("rejects invalid arguments $args", ({ args }) => {
    expect(() => parseStartup(args, "/project")).toThrow();
  });
  it("requires a real existing directory before starting the transport", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "emoji-mcp-startup-"));
    try {
      expect(await resolveWorkspace(directory)).toBe(await realpath(directory));
      await writeFile(resolve(directory, "file"), "test");
      await expect(resolveWorkspace(resolve(directory, "file"))).rejects.toThrow("directory");
      await expect(resolveWorkspace(resolve(directory, "missing"))).rejects.toThrow();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
