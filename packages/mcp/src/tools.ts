import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  buildProviderArtifacts,
  validateAssetCollection,
  type AssetMappingEntry,
  type AssetProvenance,
  type RasterAssetFormat,
} from "@emoji-styles/asset-pipeline";
import {
  emojiData,
  getEmojiMetadata,
  resolveEmoji,
  resolveProvider,
  validateEmojiTheme,
  validateProviderManifest,
  type EmojiProviderRef,
  type EmojiProviderManifest,
  type ProviderLicense,
} from "emoji-styles";
import { auditProject, runCli, type ParsedFlags } from "emoji-styles-cli";
import { listRasterAssets, safeExistingWorkspacePath, safeWorkspacePath } from "./security";
import {
  EmojiMcpToolError,
  type EmojiMcpResult,
  type EmojiMcpToolName,
  type SemanticAnalyzer,
} from "./types";

const providerRef = (value: string): EmojiProviderRef => value as EmojiProviderRef;

export interface EmojiToolsOptions {
  cwd: string;
  fetch?: typeof globalThis.fetch;
  semanticAnalyzer?: SemanticAnalyzer;
}

export interface AssetSpecInput {
  providerId: string;
  styleDescription: string;
  tokens: Array<{ token: string; emoji: string; label: string; subject: string }>;
  perspective?: string;
  lighting?: string;
  materials?: string[];
  accentPolicy?: string;
  size?: number;
  format?: RasterAssetFormat;
  safeArea?: number;
}

export interface ProviderManifestPreviewInput {
  directory: string;
  id: string;
  label?: string;
  version?: string;
  basePath?: string;
  mapping?: AssetMappingEntry[];
  license?: ProviderLicense;
  provenance: AssetProvenance;
}

export class EmojiTools {
  readonly cwd: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly semanticAnalyzer?: SemanticAnalyzer;

  constructor(options: EmojiToolsOptions) {
    this.cwd = safeWorkspacePath(options.cwd);
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.semanticAnalyzer = options.semanticAnalyzer;
  }

  async searchEmoji(input: { query: string; limit?: number }): Promise<EmojiMcpResult> {
    return this.execute("search_emoji", true, async () => {
      const query = input.query.trim().toLowerCase();
      const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
      const matches = Object.entries(emojiData)
        .filter(([emoji, data]) => !query || emoji.includes(query) || data.alt.toLowerCase().includes(query) || data.name.toLowerCase().includes(query) || data.group?.toLowerCase().includes(query) || data.subgroup?.toLowerCase().includes(query))
        .slice(0, limit)
        .map(([emoji, data]) => ({ emoji, label: data.alt, name: data.name, sequence: data.sequence ?? data.codepoint, group: data.group, subgroup: data.subgroup }));
      return { query: input.query, count: matches.length, matches };
    });
  }

  async getEmojiMetadata(input: { emoji: string }): Promise<EmojiMcpResult> {
    return this.execute("get_emoji_metadata", true, async () => {
      const metadata = getEmojiMetadata(input.emoji);
      if (!metadata) throw new EmojiMcpToolError("EMOJI_NOT_FOUND", `No RGI emoji metadata found for ${input.emoji}.`);
      return { emoji: input.emoji, metadata };
    });
  }

  async resolveEmoji(input: { emoji: string; provider: string; fallbacks?: string[] }): Promise<EmojiMcpResult> {
    return this.execute("resolve_emoji", true, async () => resolveEmoji(input.emoji, {
      provider: providerRef(input.provider),
      fallbacks: (input.fallbacks ?? []).map(providerRef),
    }));
  }

  async compareProviders(input: { emoji: string; providers: string[] }): Promise<EmojiMcpResult> {
    return this.execute("compare_providers", true, async () => {
      const providerIds = [...new Set(input.providers)].slice(0, 12);
      const comparisons = await Promise.all(providerIds.map(async (provider) => {
        const resolution = await resolveEmoji(input.emoji, { provider: providerRef(provider) });
        const resolvedProvider = resolveProvider(providerRef(provider));
        return {
          provider,
          label: resolvedProvider?.label ?? provider,
          version: resolvedProvider?.version ?? null,
          format: resolution.selected?.format ?? resolvedProvider?.formats?.[0] ?? null,
          local: resolution.selected?.local ?? resolvedProvider?.local ?? null,
          license: resolution.selected?.license ?? resolvedProvider?.license ?? null,
          selected: resolution.selected,
          status: resolution.attempts[0]?.status ?? "error",
        };
      }));
      return { emoji: input.emoji, comparisons };
    });
  }

  async explainFallback(input: { emoji: string; provider: string; fallbacks: string[] }): Promise<EmojiMcpResult> {
    return this.execute("explain_fallback", true, async () => {
      const resolution = await resolveEmoji(input.emoji, {
        provider: providerRef(input.provider),
        fallbacks: input.fallbacks.map(providerRef),
      });
      const explanation = resolution.selected
        ? `${resolution.selected.providerId} resolved ${resolution.normalized}${resolution.fallbackUsed ? " after earlier providers did not resolve it" : " as the primary provider"}.`
        : resolution.nativeFallback
          ? `The configured chain reached native OS rendering for ${resolution.normalized}.`
          : `No configured provider resolved ${resolution.normalized}.`;
      return { ...resolution, explanation };
    });
  }

  async validateProvider(input: { manifest: string }): Promise<EmojiMcpResult> {
    return this.execute("validate_provider", true, async () => {
      const path = await safeExistingWorkspacePath(this.cwd, input.manifest);
      const manifest = JSON.parse(await readFile(path, "utf8")) as EmojiProviderManifest;
      return { path: input.manifest, validation: validateProviderManifest(manifest), manifest };
    });
  }

  async validateTheme(input: { theme: string }): Promise<EmojiMcpResult> {
    return this.execute("validate_theme", true, async () => {
      const path = await safeExistingWorkspacePath(this.cwd, input.theme);
      const theme = JSON.parse(await readFile(path, "utf8")) as unknown;
      return { path: input.theme, validation: validateEmojiTheme(theme) };
    });
  }

  async auditProject(input: { path?: string; config?: string }): Promise<EmojiMcpResult> {
    return this.execute("audit_project", true, async () => {
      const target = input.path ? await safeExistingWorkspacePath(this.cwd, input.path) : undefined;
      if (input.config) await safeExistingWorkspacePath(this.cwd, input.config);
      const flags: ParsedFlags = input.config ? { config: input.config } : {};
      const audit = await auditProject({ cwd: this.cwd, fetch: this.fetcher }, flags, target);
      return { configPath: audit.configPath, summary: audit.summary, findings: audit.findings };
    });
  }

  async suggestSemanticToken(input: { emoji: string; context: string }): Promise<EmojiMcpResult> {
    return this.execute("suggest_semantic_token", false, async () => {
      if (!this.semanticAnalyzer) {
        throw new EmojiMcpToolError("AI_ADAPTER_REQUIRED", "Semantic analysis requires OPENAI_API_KEY or an injected SemanticAnalyzer.", { retryable: false });
      }
      const suggestion = await this.semanticAnalyzer.analyze(input);
      return suggestion;
    }, this.semanticAnalyzer?.model);
  }

  async generateMigrationPatch(input: { path?: string; config?: string }): Promise<EmojiMcpResult> {
    return this.execute("generate_migration_patch", true, async () => {
      if (input.path) await safeExistingWorkspacePath(this.cwd, input.path);
      if (input.config) await safeExistingWorkspacePath(this.cwd, input.config);
      const args = ["fix", input.path ?? ".", "--dry-run", ...(input.config ? ["--config", input.config] : [])];
      const result = await runCli(args, { cwd: this.cwd, fetch: this.fetcher });
      if (!result.ok) throw new EmojiMcpToolError("PATCH_GENERATION_FAILED", result.summary, { details: result.data });
      return result;
    });
  }

  async createAssetSpec(input: AssetSpecInput): Promise<EmojiMcpResult> {
    return this.execute("create_asset_spec", true, async () => {
      if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(input.providerId)) throw new EmojiMcpToolError("PROVIDER_ID_INVALID", "providerId must be a safe lowercase identifier.");
      const size = input.size ?? 256;
      const safeArea = input.safeArea ?? 0.76;
      return {
        providerId: input.providerId,
        version: "1.0.0",
        style: {
          description: input.styleDescription,
          perspective: input.perspective ?? "front three-quarter",
          lighting: input.lighting ?? "soft upper-left",
          outline: "none",
          background: "transparent",
          detailLevel: "medium",
          materials: input.materials ?? [],
          accentPolicy: input.accentPolicy ?? "one repeatable accent rule per asset",
        },
        canvas: { width: 512, height: 512, safeArea },
        output: { format: input.format ?? "webp", width: size, height: size, transparent: true },
        tokens: input.tokens,
      };
    });
  }

  async validateGeneratedAssets(input: { directory: string; size?: number; format?: RasterAssetFormat; safeArea?: number; maxBytes?: number }): Promise<EmojiMcpResult> {
    return this.execute("validate_generated_assets", true, async () => {
      const directory = await safeExistingWorkspacePath(this.cwd, input.directory);
      const files = await listRasterAssets(directory);
      if (!files.length) throw new EmojiMcpToolError("ASSETS_NOT_FOUND", `No raster emoji assets found in ${input.directory}.`);
      const validation = await validateAssetCollection(files, { size: input.size, format: input.format, safeArea: input.safeArea, maxBytes: input.maxBytes });
      return { directory: input.directory, count: files.length, files: files.map((file) => basename(file)), validation };
    });
  }

  async generateProviderManifest(input: ProviderManifestPreviewInput): Promise<EmojiMcpResult> {
    return this.execute("generate_provider_manifest", true, async () => {
      const directory = await safeExistingWorkspacePath(this.cwd, input.directory);
      const artifacts = await buildProviderArtifacts({ ...input, directory });
      return {
        previewOnly: true,
        manifest: artifacts.manifest,
        provenance: artifacts.provenance,
        files: {
          provider: artifacts.providerModule,
          theme: artifacts.themeModule,
          license: artifacts.licenseDocument,
          readme: artifacts.readme,
        },
      };
    });
  }

  async generateLicenseReport(input: { config?: string }): Promise<EmojiMcpResult> {
    return this.execute("generate_license_report", true, async () => {
      if (input.config) await safeExistingWorkspacePath(this.cwd, input.config);
      const args = ["licenses", "--format", "json", ...(input.config ? ["--config", input.config] : [])];
      const result = await runCli(args, { cwd: this.cwd, fetch: this.fetcher });
      if (!result.ok) throw new EmojiMcpToolError("LICENSE_REPORT_FAILED", result.summary, { details: result.data });
      return result;
    });
  }

  private async execute<T>(tool: EmojiMcpToolName, deterministic: boolean, handler: () => Promise<T>, model?: string): Promise<EmojiMcpResult<T>> {
    try {
      return { ok: true, tool, data: await handler(), meta: { deterministic, workspace: this.cwd, ...(model ? { model } : {}) } };
    } catch (error) {
      const normalized = error instanceof EmojiMcpToolError
        ? error
        : new EmojiMcpToolError("TOOL_FAILED", error instanceof Error ? error.message : String(error));
      return {
        ok: false,
        tool,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.options.retryable ?? false,
          ...(normalized.options.details !== undefined ? { details: normalized.options.details } : {}),
        },
        meta: { deterministic, workspace: this.cwd, ...(model ? { model } : {}) },
      };
    }
  }
}
