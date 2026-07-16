export type EmojiMcpToolName =
  | "search_emoji"
  | "get_emoji_metadata"
  | "resolve_emoji"
  | "compare_providers"
  | "explain_fallback"
  | "validate_provider"
  | "validate_theme"
  | "audit_project"
  | "suggest_semantic_token"
  | "generate_migration_patch"
  | "create_asset_spec"
  | "validate_generated_assets"
  | "generate_provider_manifest"
  | "generate_license_report";

export interface EmojiMcpError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface EmojiMcpResult<T = unknown> {
  ok: boolean;
  tool: EmojiMcpToolName;
  data?: T;
  error?: EmojiMcpError;
  warnings?: string[];
  meta: {
    deterministic: boolean;
    workspace: string;
    model?: string;
  };
}

export class EmojiMcpToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly options: { retryable?: boolean; details?: unknown } = {},
  ) {
    super(message);
    this.name = "EmojiMcpToolError";
  }
}

export interface SemanticTokenSuggestion {
  meaning: string;
  suggestedToken: string;
  label: string;
  decorative: boolean;
  confidence: number;
  requiresHumanReview: boolean;
  rationale: string;
}

export interface SemanticAnalysisInput {
  emoji: string;
  context: string;
}

export interface SemanticAnalyzer {
  readonly model: string;
  analyze(input: SemanticAnalysisInput): Promise<SemanticTokenSuggestion>;
}
