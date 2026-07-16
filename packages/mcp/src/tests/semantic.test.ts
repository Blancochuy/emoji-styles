import { describe, expect, it, vi } from "vitest";
import { OpenAiSemanticAnalyzer } from "../semantic";

const suggestion = {
  meaning: "Launch action",
  suggestedToken: "action.launch",
  label: "Launch",
  decorative: false,
  confidence: 0.96,
  requiresHumanReview: false,
  rationale: "The rocket is used on a launch button.",
};

describe("OpenAiSemanticAnalyzer", () => {
  it("uses strict structured output, disables storage, and redacts source secrets", async () => {
    let requestInit: RequestInit | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestInit = init;
      return new Response(JSON.stringify({ output_text: JSON.stringify(suggestion) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const analyzer = new OpenAiSemanticAnalyzer({ apiKey: "test-key", fetch: fetcher });
    const result = await analyzer.analyze({ emoji: "🚀", context: "Launch with sk_abcdefghijklmnopqrstuvwxyz" });

    expect(result).toEqual(suggestion);
    const request = JSON.parse(String(requestInit?.body)) as Record<string, any>;
    expect(request).toMatchObject({
      model: "gpt-5.6",
      store: false,
      text: { format: { type: "json_schema", strict: true } },
    });
    expect(JSON.stringify(request)).toContain("[REDACTED_SECRET]");
    expect(JSON.stringify(request)).not.toContain("sk_abcdefghijklmnopqrstuvwxyz");
  });

  it("rejects output that does not satisfy the semantic contract", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ output_text: JSON.stringify({ suggestedToken: "launch" }) }), { status: 200 }));
    const analyzer = new OpenAiSemanticAnalyzer({ apiKey: "test-key", fetch: fetcher });

    await expect(analyzer.analyze({ emoji: "🚀", context: "Launch" })).rejects.toMatchObject({ code: "OPENAI_SCHEMA_INVALID" });
  });
});
