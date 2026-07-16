#!/usr/bin/env node
import { formatResult, runCli } from "./index";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const result = await runCli(args);
  process.stdout.write(formatResult(result, args.includes("--json") || args.includes("--format=json")));
  if (!result.ok) process.exitCode = 1;
}

void main();
