#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createEmojiStylesMcpServer } from "./server";
import { parseStartup, resolveWorkspace, startupHelp, StartupUsageError } from "./startup";

async function main(): Promise<void> {
  try {
    const options = parseStartup(process.argv.slice(2), process.cwd());
    if (options.help) { process.stdout.write(startupHelp); return; }
    const cwd = await resolveWorkspace(options.workspace);
    const server = createEmojiStylesMcpServer({ cwd });
    const transport = new StdioServerTransport();
    let closing = false;
    const cleanup = () => {
      process.stdin.off("end", onEnd);
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
    };
    const close = async (code: number) => {
      if (closing) return;
      closing = true;
      process.exitCode = code;
      try { await server.close(); }
      catch (error) { process.stderr.write(`emoji-styles-mcp: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
      finally { cleanup(); }
    };
    const onEnd = () => { void close(0); };
    const onInterrupt = () => { void close(130); };
    const onTerminate = () => { void close(143); };
    process.stdin.once("end", onEnd);
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onTerminate);
    try { await server.connect(transport); }
    catch (error) { cleanup(); await server.close(); throw error; }
  } catch (error) {
    process.stderr.write(`emoji-styles-mcp: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = error instanceof StartupUsageError ? 2 : 1;
  }
}
void main();
