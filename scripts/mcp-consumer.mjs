// Copied into the clean npm consumer: all imports resolve from the installed artifact.
import assert from "node:assert/strict";
import { readFile, readdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createEmojiStylesMcpServer } from "emoji-styles-mcp";
assert.equal(typeof createEmojiStylesMcpServer, "function");
const workspace = await realpath("project with spaces");
const binary = join(process.cwd(), "node_modules/emoji-styles-mcp/dist/stdio.js");
const transport = new StdioClientTransport({
  command: process.execPath, args: [binary, "--workspace", workspace],
  cwd: process.cwd(), stderr: "pipe", env: { PATH: process.env.PATH ?? "", OPENAI_API_KEY: "" },
});
let diagnostics = "";
transport.stderr?.on("data", (chunk) => { diagnostics += chunk.toString(); });
const client = new Client({ name: "emoji-clean-consumer", version: "1.0.0" });
const before = await readFile(join(workspace, "src/app.tsx"), "utf8");
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 10_000 });
  assert(result.structuredContent, `No structured payload: ${name}`);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  return result;
};
try {
  await client.connect(transport, { timeout: 10_000 });
  const tools = (await client.listTools()).tools;
  assert.equal(tools.length, 16);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
  }
  const search = await call("search_emoji", { query: "rocket", limit: 1 });
  assert.equal(search.structuredContent.data.count, 1);
  assert.equal(search.structuredContent.meta.workspace, workspace);
  for (const [name, args] of [
    ["get_emoji_metadata", { emoji: "🚀" }],
    ["compare_providers", { emoji: "🚀", providers: ["twemoji", "noto"] }],
    ["explain_fallback", { emoji: "🚀", provider: "twemoji", fallbacks: [] }],
    ["generate_license_report", {}],
  ]) assert.equal((await call(name, args)).structuredContent.ok, true);
  const resolution = await call("resolve_emoji", { emoji: "🚀", provider: "twemoji" });
  assert.equal(resolution.structuredContent.ok, true);
  const audit = await call("audit_project", { path: "src" });
  assert.equal(audit.structuredContent.ok, true);
  assert(audit.structuredContent.data.findings.length > 0);
  const patch = await call("generate_migration_patch", { path: "src" });
  assert.equal(patch.structuredContent.ok, true);
  assert.equal(await readFile(join(workspace, "src/app.tsx"), "utf8"), before);
  const outside = await call("audit_project", { path: "../outside.ts" });
  assert.equal(outside.isError, true);
  assert.equal(outside.structuredContent.error.code, "PATH_OUTSIDE_WORKSPACE");
  if (process.platform !== "win32") {
    const symlink = await call("validate_provider", { manifest: "escaped.json" });
    assert.equal(symlink.structuredContent.error.code, "PATH_OUTSIDE_WORKSPACE");
  }
  const semantic = await call("suggest_semantic_token", { emoji: "🚀", context: "Deploy" });
  assert.equal(semantic.structuredContent.error.code, "AI_ADAPTER_REQUIRED");
  const spec = await call("create_asset_spec", {
    providerId: "smoke", styleDescription: "Original geometric rounded glyphs",
    tokens: [{ token: "action.deploy", emoji: "🚀", label: "Deploy", subject: "Rocket" }],
  });
  assert.equal(spec.structuredContent.ok, true);
  const validSpec = await call("validate_asset_spec", { spec: spec.structuredContent.data });
  assert.equal(validSpec.structuredContent.data.valid, true);
  const invalidSpec = await call("validate_asset_spec", { spec: {} });
  assert.equal(invalidSpec.structuredContent.data.valid, false);
  const plan = await call("plan_asset_generation", { spec: spec.structuredContent.data, variants: 1 });
  assert.equal(plan.structuredContent.ok, true);
  const assets = await call("validate_generated_assets", { directory: "assets", size: 256, format: "webp" });
  assert.equal(assets.structuredContent.ok, true);
  assert.equal(assets.structuredContent.data.validation.valid, true);
  const pack = await call("generate_provider_manifest", { directory: "assets", id: "smoke", provenance: { generated: false, createdAt: "2026-10-27T00:00:00Z", source: "Geometric test fixture", license: "MIT" } });
  assert.equal(pack.structuredContent.ok, true);
  assert.equal(pack.structuredContent.data.previewOnly, true);
  assert.deepEqual((await readdir(join(workspace, "assets"))).sort(), ["1f680.webp"]);
  assert.deepEqual((await readdir(workspace)).sort(), (process.platform === "win32" ? ["assets", "emoji-styles.config.json", "src"] : ["assets", "emoji-styles.config.json", "escaped.json", "src"]).sort());
  assert.equal(diagnostics, "", `Unexpected stderr: ${diagnostics}`);
  console.log("PASS: installed MCP STDIO handshake, 16 tools, discovery, audit, no-write patch, workspace boundary, spec/plan, native assets and provider preview");
} finally { await client.close(); await transport.close(); }

// Exercise graceful POSIX signal shutdown after a real protocol handshake.
if (process.platform !== "win32") {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const signalTransport = new StdioClientTransport({ command: process.execPath, args: [binary, "--workspace", workspace], stderr: "pipe", env: { PATH: process.env.PATH ?? "", OPENAI_API_KEY: "" } });
    const signalClient = new Client({ name: "emoji-signal-check", version: "1.0.0" });
    let stderr = "";
    signalTransport.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    try {
      await signalClient.connect(signalTransport, { timeout: 10_000 });
      let timer;
      const closed = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${signal} did not close the MCP process`)), 5000);
        signalClient.onclose = resolve;
      });
      try {
        process.kill(signalTransport.pid, signal);
        await closed;
      } finally { clearTimeout(timer); }
      assert.equal(stderr, "");
    } finally { await signalClient.close(); await signalTransport.close(); }
  }
  console.log("PASS: installed MCP closes on SIGINT and SIGTERM after handshake");
}
