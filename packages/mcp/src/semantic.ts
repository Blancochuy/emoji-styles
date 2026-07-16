import { z } from "zod/v4";
import { redactSourceContext } from "./security";
import { EmojiMcpToolError, type SemanticAnalyzer, type SemanticAnalysisInput, type SemanticTokenSuggestion } from "./types";

export const semanticSuggestionSchema = z.object({
  meaning: z.string().min(1).max(160),
  suggestedToken: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/),
  label: z.string().min(1).max(120),
  decorative: z.boolean(),
  confidence: z.number().min(0).max(1),
  requiresHumanReview: z.boolean(),
  rationale: z.string().min(1).max(400),
});

const SEMANTIC_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["meaning", "suggestedToken", "label", "decorative", "confidence", "requiresHumanReview", "rationale"],
  properties: {
    meaning: { type: "string" },
    suggestedToken: { type: "string", pattern: "^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)+$" },
    label: { type: "string" },
    decorative: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    requiresHumanReview: { type: "boolean" },
    rationale: { type: "string" },
  },
} as const;

export interface OpenAiSemanticAnalyzerOptions {
  apiKey: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
  endpoint?: string;
}

export class OpenAiSemanticAnalyzer implements SemanticAnalyzer {
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly endpoint: string;

  constructor(options: OpenAiSemanticAnalyzerOptions) {
    if (!options.apiKey.trim()) throw new EmojiMcpToolError("OPENAI_API_KEY_MISSING", "OPENAI_API_KEY is required for semantic analysis.");
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-5.6";
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/responses";
  }

  async analyze(input: SemanticAnalysisInput): Promise<SemanticTokenSuggestion> {
    const context = redactSourceContext(input.context);
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        max_output_tokens: 600,
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content: "Classify one emoji in UI context. Suggest a stable semantic token and accessible label. Never invent providers, assets, URLs, or facts outside the supplied context. Mark low-confidence or ambiguous cases for human review.",
          },
          {
            role: "user",
            content: `Emoji: ${input.emoji}\nUI context:\n${context}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "emoji_semantic_suggestion",
            strict: true,
            schema: SEMANTIC_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new EmojiMcpToolError("OPENAI_REQUEST_FAILED", `OpenAI Responses API returned ${response.status}.`, {
        retryable: response.status === 429 || response.status >= 500,
        details: redactSourceContext(message, 500),
      });
    }
    const payload = await response.json() as OpenAiResponsePayload;
    if (payload.error) throw new EmojiMcpToolError("OPENAI_RESPONSE_ERROR", payload.error.message, { retryable: false });
    const refusal = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "refusal");
    if (refusal?.refusal) throw new EmojiMcpToolError("OPENAI_REFUSAL", refusal.refusal, { retryable: false });
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new EmojiMcpToolError("OPENAI_OUTPUT_MISSING", "OpenAI returned no structured output.", { retryable: false });
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new EmojiMcpToolError("OPENAI_OUTPUT_INVALID", "OpenAI output was not valid JSON.", { retryable: false });
    }
    const validated = semanticSuggestionSchema.safeParse(parsed);
    if (!validated.success) {
      throw new EmojiMcpToolError("OPENAI_SCHEMA_INVALID", "OpenAI output did not match the semantic suggestion schema.", {
        retryable: false,
        details: validated.error.issues,
      });
    }
    return validated.data;
  }
}

interface OpenAiResponsePayload {
  output_text?: string;
  error?: { message: string };
  output?: Array<{
    content?: Array<{
      type: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

export function semanticAnalyzerFromEnvironment(options: { fetch?: typeof globalThis.fetch; env?: NodeJS.ProcessEnv } = {}): SemanticAnalyzer | undefined {
  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return undefined;
  return new OpenAiSemanticAnalyzer({ apiKey, model: env.EMOJI_STYLES_OPENAI_MODEL ?? "gpt-5.6", fetch: options.fetch });
}
