import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import { semanticAnalyzerFromEnvironment } from "./semantic";
import { EmojiTools, type EmojiToolsOptions } from "./tools";
import type { EmojiMcpResult } from "./types";

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const providerId = z.string().min(1).max(80);
const workspacePath = z.string().min(1).max(1_024);
const rasterFormat = z.enum(["png", "webp", "avif"]);
const tokenEntry = z.object({
  token: z.string().min(3).max(120),
  emoji: z.string().min(1).max(32),
  label: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
});
const mappingEntry = z.object({
  file: z.string().min(1).max(255),
  emoji: z.string().min(1).max(32).optional(),
  token: z.string().min(3).max(120).optional(),
  label: z.string().min(1).max(160).optional(),
});
const license = z.object({
  name: z.string().min(1).max(160),
  url: z.string().url().optional(),
  attribution: z.string().max(500).optional(),
  ownership: z.string().max(300).optional(),
});
const provenance = z.object({
  generated: z.boolean(),
  createdAt: z.string().min(1).max(80),
  generator: z.object({
    type: z.string().min(1).max(120),
    provider: z.string().max(160).optional(),
    model: z.string().max(160).optional(),
  }).optional(),
  humanDirection: z.string().max(2_000).optional(),
  referenceAssets: z.array(z.string().max(1_024)).max(50).optional(),
  modifications: z.array(z.string().max(160)).max(50).optional(),
  source: z.string().max(1_024).optional(),
  ownership: z.string().max(300).optional(),
  license: z.string().max(300).optional(),
});

export interface EmojiStylesMcpServerOptions extends Omit<EmojiToolsOptions, "semanticAnalyzer"> {
  semanticAnalyzer?: EmojiToolsOptions["semanticAnalyzer"];
  env?: NodeJS.ProcessEnv;
}

export function createEmojiStylesMcpServer(options: EmojiStylesMcpServerOptions): McpServer {
  const semanticAnalyzer = options.semanticAnalyzer ?? semanticAnalyzerFromEnvironment({ fetch: options.fetch, env: options.env });
  const tools = new EmojiTools({ cwd: options.cwd, fetch: options.fetch, semanticAnalyzer });
  const server = new McpServer(
    { name: "emoji-styles", version: "0.1.0" },
    {
      instructions: "Use deterministic tools first. audit_project and generate_migration_patch are read-only: review every proposed patch before applying it through the coding environment. suggest_semantic_token is the only GPT-powered tool and always requires human review when confidence is low.",
    },
  );

  server.registerTool("search_emoji", {
    title: "Search emoji",
    description: "Search the pinned Unicode/CLDR emoji dataset by glyph, label, name, group, or subgroup.",
    inputSchema: z.object({ query: z.string().max(200).default(""), limit: z.number().int().min(1).max(50).optional() }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.searchEmoji(input)));

  server.registerTool("get_emoji_metadata", {
    title: "Get emoji metadata",
    description: "Return normalized sequence, codepoints, CLDR label, Unicode version, Emoji version, and category metadata.",
    inputSchema: z.object({ emoji: z.string().min(1).max(32) }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.getEmojiMetadata(input)));

  server.registerTool("resolve_emoji", {
    title: "Resolve emoji",
    description: "Resolve one emoji through a primary provider and optional ordered fallbacks, returning every attempt.",
    inputSchema: z.object({ emoji: z.string().min(1).max(32), provider: providerId, fallbacks: z.array(providerId).max(12).optional() }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.resolveEmoji(input)));

  server.registerTool("compare_providers", {
    title: "Compare emoji providers",
    description: "Compare resolution, version, format, locality, and license metadata for one emoji across providers.",
    inputSchema: z.object({ emoji: z.string().min(1).max(32), providers: z.array(providerId).min(1).max(12) }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.compareProviders(input)));

  server.registerTool("explain_fallback", {
    title: "Explain fallback",
    description: "Resolve and explain why a primary provider, fallback provider, native OS glyph, or no asset was selected.",
    inputSchema: z.object({ emoji: z.string().min(1).max(32), provider: providerId, fallbacks: z.array(providerId).max(12).default([]) }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.explainFallback(input)));

  server.registerTool("validate_provider", {
    title: "Validate provider manifest",
    description: "Validate a provider manifest JSON file inside the workspace without writing changes.",
    inputSchema: z.object({ manifest: workspacePath }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.validateProvider(input)));

  server.registerTool("validate_theme", {
    title: "Validate semantic theme",
    description: "Validate a serialized Emoji Styles semantic theme inside the workspace.",
    inputSchema: z.object({ theme: workspacePath }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.validateTheme(input)));

  server.registerTool("audit_project", {
    title: "Audit project emoji usage",
    description: "Run the deterministic Emoji Styles source audit and return findings with stable rule IDs, paths, and line numbers.",
    inputSchema: z.object({ path: workspacePath.optional(), config: workspacePath.optional() }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.auditProject(input)));

  server.registerTool("suggest_semantic_token", {
    title: "Suggest semantic emoji token",
    description: "Use explicitly configured GPT-5.6 structured output to classify one emoji in minimal UI context. Never invents providers or asset URLs.",
    inputSchema: z.object({ emoji: z.string().min(1).max(32), context: z.string().min(1).max(2_000) }),
    annotations: { ...readOnlyAnnotations, openWorldHint: true },
  }, async (input) => toolResult(await tools.suggestSemanticToken(input)));

  server.registerTool("generate_migration_patch", {
    title: "Generate migration patch",
    description: "Generate and validate a dry-run patch for safe audit fixes. Returns a diff but never writes source files.",
    inputSchema: z.object({ path: workspacePath.optional(), config: workspacePath.optional() }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.generateMigrationPatch(input)));

  server.registerTool("create_asset_spec", {
    title: "Create custom emoji asset specification",
    description: "Create a deterministic asset specification from a freely described visual direction and semantic tokens.",
    inputSchema: z.object({
      providerId,
      styleDescription: z.string().min(1).max(2_000),
      tokens: z.array(tokenEntry).min(1).max(100),
      perspective: z.string().max(200).optional(),
      lighting: z.string().max(200).optional(),
      materials: z.array(z.string().max(120)).max(20).optional(),
      accentPolicy: z.string().max(300).optional(),
      size: z.number().int().min(16).max(2_048).optional(),
      format: rasterFormat.optional(),
      safeArea: z.number().min(0.4).max(0.95).optional(),
    }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.createAssetSpec(input)));

  server.registerTool("validate_generated_assets", {
    title: "Validate generated emoji assets",
    description: "Inspect untrusted PNG, WebP, or AVIF files inside one workspace directory and validate format, alpha, bounds, dimensions, duplicates, and outliers.",
    inputSchema: z.object({
      directory: workspacePath,
      size: z.number().int().min(16).max(2_048).optional(),
      format: rasterFormat.optional(),
      safeArea: z.number().min(0.4).max(0.95).optional(),
      maxBytes: z.number().int().min(1_024).max(10 * 1_024 * 1_024).optional(),
    }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.validateGeneratedAssets(input)));

  server.registerTool("generate_provider_manifest", {
    title: "Preview generated provider",
    description: "Validate local assets and preview the manifest, provider module, semantic theme, license notice, and provenance without writing files.",
    inputSchema: z.object({
      directory: workspacePath,
      id: providerId,
      label: z.string().max(160).optional(),
      version: z.string().max(80).optional(),
      basePath: z.string().max(1_024).optional(),
      mapping: z.array(mappingEntry).max(1_000).optional(),
      license: license.optional(),
      provenance,
    }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.generateProviderManifest(input)));

  server.registerTool("generate_license_report", {
    title: "Generate emoji license report",
    description: "Generate a structured provider attribution report from project configuration without writing an output file.",
    inputSchema: z.object({ config: workspacePath.optional() }),
    annotations: readOnlyAnnotations,
  }, async (input) => toolResult(await tools.generateLicenseReport(input)));

  return server;
}

function toolResult(result: EmojiMcpResult): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
    ...(result.ok ? {} : { isError: true }),
  };
}
