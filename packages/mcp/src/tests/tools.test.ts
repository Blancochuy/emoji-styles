import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EmojiTools } from "../tools";
import type { SemanticAnalyzer } from "../types";

const temporaryDirectories: string[] = [];

async function workspace(): Promise<string> {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-styles-mcp-"));
  temporaryDirectories.push(cwd);
  return cwd;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("EmojiTools", () => {
  it("searches pinned metadata and resolves a deterministic provider chain", async () => {
    const tools = new EmojiTools({ cwd: await workspace() });
    const search = await tools.searchEmoji({ query: "rocket", limit: 5 });
    const resolution = await tools.resolveEmoji({ emoji: "🚀", provider: "twemoji" });

    expect(search).toMatchObject({ ok: true, tool: "search_emoji", meta: { deterministic: true } });
    expect((search.data as { matches: Array<{ emoji: string }> }).matches).toContainEqual(expect.objectContaining({ emoji: "🚀" }));
    expect(resolution).toMatchObject({ ok: true, tool: "resolve_emoji", data: { selected: { providerId: "twemoji" } } });
  });

  it("rejects workspace traversal with a structured error", async () => {
    const tools = new EmojiTools({ cwd: await workspace() });
    const result = await tools.validateTheme({ theme: "../private-theme.json" });

    expect(result).toMatchObject({
      ok: false,
      tool: "validate_theme",
      error: { code: "PATH_OUTSIDE_WORKSPACE", retryable: false },
    });
  });

  it("rejects a workspace symlink that resolves outside the project", async () => {
    const cwd = await workspace();
    const outside = resolve(await workspace(), "theme.json");
    await writeFile(outside, "{}");
    await symlink(outside, resolve(cwd, "linked-theme.json"));
    const result = await new EmojiTools({ cwd }).validateTheme({ theme: "linked-theme.json" });

    expect(result).toMatchObject({ ok: false, error: { code: "PATH_OUTSIDE_WORKSPACE" } });
  });

  it("creates a provider-neutral custom style specification", async () => {
    const tools = new EmojiTools({ cwd: await workspace() });
    const result = await tools.createAssetSpec({
      providerId: "neon-clay",
      styleDescription: "Soft translucent clay emoji with a cyan-magenta edge glow.",
      tokens: [{ token: "status.launch", emoji: "🚀", label: "Launch", subject: "A rocket taking off" }],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        providerId: "neon-clay",
        style: { description: expect.stringContaining("translucent clay") },
        output: { transparent: true },
      },
    });
  });

  it("keeps semantic analysis opt-in and supports an injected analyzer", async () => {
    const cwd = await workspace();
    const withoutAdapter = await new EmojiTools({ cwd }).suggestSemanticToken({ emoji: "🚀", context: "Launch button" });
    expect(withoutAdapter).toMatchObject({ ok: false, error: { code: "AI_ADAPTER_REQUIRED" } });

    const semanticAnalyzer: SemanticAnalyzer = {
      model: "test-model",
      analyze: async () => ({
        meaning: "Launch action",
        suggestedToken: "action.launch",
        label: "Launch",
        decorative: false,
        confidence: 0.98,
        requiresHumanReview: false,
        rationale: "The emoji labels a launch control.",
      }),
    };
    const result = await new EmojiTools({ cwd, semanticAnalyzer }).suggestSemanticToken({ emoji: "🚀", context: "Launch button" });
    expect(result).toMatchObject({ ok: true, meta: { deterministic: false, model: "test-model" }, data: { suggestedToken: "action.launch" } });
  });
});
