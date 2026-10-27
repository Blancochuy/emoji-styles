import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { parseArguments, requestsJson } from "../src/flags";
import { runCli } from "../src/index";

const execute = promisify(execFile);
const binary = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
async function launch(args: string[], cwd: string) {
  try {
    const output = await execute(process.execPath, [binary, ...args], { cwd });
    return { ...output, code: 0 };
  } catch (error) {
    const failure = error as Error & { stdout: string; stderr: string; code: number };
    return { stdout: failure.stdout, stderr: failure.stderr, code: failure.code };
  }
}

describe("argument contract", () => {
  it("keeps commands after boolean options and parses negation and inline values", () => {
    expect(parseArguments(["--json", "init", "--yes=false", "--no-native-fallback", "--fallback=", "--provider=twemoji"])).toEqual({
      positionals: ["init"], flags: { json: true, yes: false, "native-fallback": false, fallback: "", provider: "twemoji" },
    });
    expect(parseArguments(["provider", "create", "--ownership=Example=Inc"]).flags.ownership).toBe("Example=Inc");
  });

  it("honors -- for paths that look like options", () => {
    expect(parseArguments(["audit", "--", "--json"])).toEqual({ positionals: ["audit", "--json"], flags: {} });
    expect(requestsJson(["audit", "--", "--json"])).toBe(false);
    expect(requestsJson(["provider", "create", "--ownership=--json"])).toBe(false);
    expect(requestsJson(["--json=false", "doctor"])).toBe(false);
  });

  it.each([
    [["doctor", "--typo"], "UNKNOWN_OPTION"],
    [["doctor", "--yes"], "UNKNOWN_OPTION"],
    [["init", "--provider"], "MISSING_OPTION_VALUE"],
    [["init", "--provider", "--yes"], "MISSING_OPTION_VALUE"],
    [["init", "--provider="], "INVALID_OPTION_VALUE"],
    [["init", "--no-provider"], "INVALID_OPTION_VALUE"],
    [["init", "--yes=maybe"], "INVALID_OPTION_VALUE"],
    [["init", "--yes", "--no-yes"], "DUPLICATE_OPTION"],
    [["doctor", "extra"], "INVALID_ARGUMENTS"],
    [["assets", "plan"], "INVALID_ARGUMENTS"],
    [["assets", "normalize", "--format=jpeg"], "INVALID_OPTION_VALUE"],
    [["licenses", "--format=sarif"], "INVALID_OPTION_VALUE"],
    [["absent"], "UNKNOWN_COMMAND"],
    [["constructor"], "UNKNOWN_COMMAND"],
    [["assets", "absent"], "UNKNOWN_COMMAND"],
  ])("rejects invalid invocation %j before dispatch", async (args, code) => {
    expect(await runCli(args)).toMatchObject({ ok: false, error: { kind: "usage", code } });
  });

  it("shows command and group help without accessing input files", async () => {
    const result = await runCli(["assets", "normalize", "--help"]);
    expect(result).toMatchObject({ ok: true, data: { usage: "emoji-styles assets normalize [input] [output]" } });
    expect(await runCli(["help", "assets", "normalize"])).toEqual(result);
    expect(await runCli(["assets", "-h"])).toMatchObject({ ok: true, data: { commands: expect.arrayContaining([expect.stringContaining("assets plan")]) } });
    expect(await runCli(["bogus", "--help"])).toMatchObject({ ok: false, error: { code: "UNKNOWN_COMMAND" } });
  });

  it("preserves artwork version as a string option", () => {
    expect(parseArguments(["assets", "build", "--version", "2.1.0"]).flags.version).toBe("2.1.0");
  });
});

describe("built executable contract", () => {
  it("uses exit 0/1/2 and valid JSON on stdout without writing on usage errors", async () => {
    const cwd = await mkdtemp(resolve(tmpdir(), "emoji-cli-arguments-"));
    try {
      for (const args of [["--json", "init", "--yes", "--provider"], ["init", "--yes", "--format", "json"]]) {
        const result = await launch(args, cwd);
        expect(result.code).toBe(2);
        expect(result.stderr).toBe("");
        expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, error: { kind: "usage" } });
        expect(await readdir(cwd)).toEqual([]);
      }
      const success = await launch(["--json", "init"], cwd);
      expect(success.code).toBe(0);
      expect(JSON.parse(success.stdout)).toMatchObject({ command: "init", ok: true, applied: false });
      const failure = await launch(["doctor", "--json"], cwd);
      expect(failure.code).toBe(1);
      expect(JSON.parse(failure.stdout)).toMatchObject({ command: "doctor", ok: false });
      const help = await launch(["assets", "plan", "--help", "--json"], cwd);
      expect(help.code).toBe(0);
      expect(JSON.parse(help.stdout).data.usage).toBe("emoji-styles assets plan <file>");
      expect(await readdir(cwd)).toEqual([]);
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});

describe("Studio executable routing", () => {
  it("preserves headless JSON errors and help without emitting terminal controls", async () => {
    const cwd = await mkdtemp(resolve(tmpdir(), "emoji-studio-routing-"));
    try {
      for (const args of [["studio", "--json"], ["studio", "--format=webp", "--json"]]) {
        const result = await launch(args, cwd);
        expect(result.code).toBe(2);
        expect(JSON.parse(result.stdout)).toMatchObject({ error: { code: "INTERACTIVE_REQUIRED", kind: "usage" } });
        expect(result.stdout).not.toContain("\x1b");
      }
      const piped = await launch(["studio"], cwd);
      expect(piped.code).toBe(2); expect(piped.stdout).toContain("interactive terminal");
      for (const args of [["studio", "--yes", "--json"], ["studio", "--size=abc", "--json"], ["studio", "--safe-area=NaN", "--json"]]) {
        const invalid = await launch(args, cwd);
        expect(invalid.code).toBe(2);
        expect(JSON.parse(invalid.stdout).error.kind).toBe("usage");
      }
      const help = await launch(["studio", "--help", "--json"], cwd);
      expect(help.code).toBe(0);
      expect(JSON.parse(help.stdout).data.usage).toBe("emoji-styles studio [input] [output]");
      expect(await readdir(cwd)).toEqual([]);
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});
