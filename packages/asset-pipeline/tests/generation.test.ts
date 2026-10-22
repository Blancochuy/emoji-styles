import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { planEmojiGeneration, validateAssetSpec } from "../src";

async function fixture() {
  return JSON.parse(await readFile(new URL("../../../benchmarks/emoji-quality/asset-spec.json", import.meta.url), "utf8"));
}

describe("generation specifications and planning", () => {
  it("upgrades legacy specs in memory and preserves freeform direction", async () => {
    const spec = await fixture();
    delete spec.schemaVersion;
    spec.style.description = "Dreamlike translucent glass with handmade asymmetry";
    spec.style.palette = ["warm amber", "foggy grey"];
    const result = validateAssetSpec(spec);
    expect(result).toMatchObject({ valid: true, spec: { schemaVersion: 1, style: spec.style } });
    expect(result.warnings).toHaveLength(1);
    expect(spec).not.toHaveProperty("schemaVersion");
  });

  it("rejects malformed specs and reports actionable paths", async () => {
    const spec = await fixture();
    for (const invalid of [null, [], { ...spec, schemaVersion: 2 }, { ...spec, tokens: [] }, { ...spec, output: { ...spec.output, transparent: false } }, { ...spec, canvas: { ...spec.canvas, safeArea: NaN } }]) {
      expect(validateAssetSpec(invalid)).toMatchObject({ valid: false, issues: expect.arrayContaining([expect.objectContaining({ path: expect.any(String), code: expect.any(String) })]) });
    }
    spec.tokens[0].emoji = "hello";
    spec.tokens[1].token = spec.tokens[0].token;
    expect(validateAssetSpec(spec).issues.map((issue) => issue.code)).toEqual(["invalid-emoji", "duplicate-token"]);
    spec.tokens[0].emoji = "❤️";
    spec.tokens[1].emoji = "❤";
    expect(validateAssetSpec(spec).issues.map((issue) => issue.code)).toContain("duplicate-emoji");
  });

  it("plans bounded candidates without an adapter and hashes equivalent specs identically", async () => {
    const spec = await fixture();
    const reordered = Object.fromEntries(Object.entries(spec).reverse());
    const plan = planEmojiGeneration(spec, { variants: 2 });
    expect(plan).toMatchObject({ executesGeneration: false, totalRequests: 4, variantsPerToken: 2 });
    expect(new Set(plan.tasks.map((task) => task.id)).size).toBe(4);
    expect(plan.specSha256).toBe(planEmojiGeneration(reordered).specSha256);
    spec.style.lighting = "Diffuse frontal light";
    expect(plan.specSha256).not.toBe(planEmojiGeneration(spec).specSha256);
    expect(plan.tasks[0].prompt).toContain("matte black");
    for (const variants of [0, 5, 1.5, NaN]) expect(() => planEmojiGeneration(spec, { variants })).toThrow("variants");
  });
});
