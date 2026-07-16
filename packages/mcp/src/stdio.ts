#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createEmojiStylesMcpServer } from "./server";

const server = createEmojiStylesMcpServer({ cwd: process.cwd() });
const transport = new StdioServerTransport();

server.connect(transport).catch((error: unknown) => {
  console.error("emoji-styles MCP server failed to start", error);
  process.exitCode = 1;
});
