#!/usr/bin/env node
import { formatResult, runCli } from "./index";
import { requestsJson } from "./flags";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const result = await runCli(args);
  process.stdout.write(formatResult(result, requestsJson(args)));
  if (!result.ok) process.exitCode = result.error?.kind === "usage" ? 2 : 1;
}

void main();
