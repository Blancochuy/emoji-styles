#!/usr/bin/env node
import { createRequire } from "node:module";
import { formatResult, runCli } from "./index";
import { parseArguments, requestsJson, validateArguments, type ParsedArguments } from "./flags";
import { runStudio } from "./studio/terminal";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // `--version` is the metadata option of some commands, so the bare program flag is handled here.
  const bare = args.filter((arg) => arg !== "--json");
  if (bare.length === 1 && (bare[0] === "--version" || bare[0] === "-v")) {
    const { version } = createRequire(import.meta.url)("../package.json") as { version: string };
    process.stdout.write(formatResult({ command: "version", ok: true, summary: `emoji-styles-cli ${version}`, data: { version, node: process.versions.node } }, requestsJson(args)));
    return;
  }
  let parsed: ParsedArguments | undefined;
  try {
    parsed = parseArguments(args);
    if (!parsed.flags.help) validateArguments(parsed.positionals, parsed.flags);
  } catch { parsed = undefined; } // runCli returns the canonical structured usage error.
  if (parsed?.positionals[0] === "studio" && !parsed.flags.help && !parsed.flags.json && process.stdin.isTTY && process.stdout.isTTY) {
    const { flags, positionals } = parsed;
    try {
      process.exitCode = await runStudio({ input: positionals[1], output: positionals[2], format: flags.format as string | undefined, size: flags.size as string | undefined, safeArea: flags["safe-area"] as string | undefined }, (command) => runCli(command));
    } catch (error) {
      process.stderr.write(`Studio failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
    return;
  }
  const result = await runCli(args);
  process.stdout.write(formatResult(result, requestsJson(args)));
  if (!result.ok) process.exitCode = result.error?.kind === "usage" ? 2 : 1;
}

void main();
