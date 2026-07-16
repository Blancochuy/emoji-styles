import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createEmojiStylesMcpServer } from "../server";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Emoji Styles MCP server", () => {
  it("advertises all phase-10 tools and returns structured content", async () => {
    const cwd = await mkdtemp(resolve(tmpdir(), "emoji-styles-mcp-server-"));
    temporaryDirectories.push(cwd);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createEmojiStylesMcpServer({ cwd, env: {} });
    const client = new Client({ name: "emoji-styles-test", version: "1.0.0" });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "audit_project",
      "compare_providers",
      "create_asset_spec",
      "explain_fallback",
      "generate_license_report",
      "generate_migration_patch",
      "generate_provider_manifest",
      "get_emoji_metadata",
      "resolve_emoji",
      "search_emoji",
      "suggest_semantic_token",
      "validate_generated_assets",
      "validate_provider",
      "validate_theme",
    ]);

    const result = await client.callTool({ name: "search_emoji", arguments: { query: "rocket", limit: 1 } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ ok: true, tool: "search_emoji", data: { count: 1 } });

    await client.close();
    await server.close();
  });
});
