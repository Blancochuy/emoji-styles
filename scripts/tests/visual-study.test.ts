import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { prepareVisualStudy } from "../prepare-visual-study";

const protocol = JSON.parse(readFileSync(fileURLToPath(new URL("../../benchmarks/visual-quality/protocol.json", import.meta.url)), "utf8"));

describe("visual study preparation", () => {
  it("prepares paired pilot prompts without granting generation permission or inventing results", () => {
    const plan = prepareVisualStudy(protocol, "pilot");
    expect(plan).toMatchObject({ executesGeneration: false, generationAuthorized: false, reviewCellsPerCandidate: 8, budget: { comparisonRequests: 24, anchorRequestCap: 3, proposedRequestCap: 27, repairRequests: 0, cost: null } });
    for (const style of protocol.styles) for (const id of protocol.stages.pilot.cases) {
      const pair = plan.tasks.filter((task) => task.style === style.id && task.case === id);
      expect(pair).toHaveLength(2);
      const baseline = pair.find((task) => task.condition === "baseline")!;
      const challenger = pair.find((task) => task.condition === "challenger")!;
      expect(challenger.prompt).toBe(`${baseline.prompt}\n\n${protocol.challenger.append}`);
      expect(challenger.specSha256).toBe(baseline.specSha256);
      expect(challenger.promptSha256).not.toBe(baseline.promptSha256);
      expect(pair.every((task) => task.status === "not-generated" && task.rawSha256 === null && task.normalizedSha256 === null && task.model === null)).toBe(true);
    }
  });
  it("keeps independent replicates and all cases in the expanded plan", () => {
    const plan = prepareVisualStudy(protocol, "expanded");
    expect(plan.tasks).toHaveLength(144);
    expect(plan.budget.proposedRequestCap).toBe(147);
    expect(new Set(plan.tasks.map((task) => task.id)).size).toBe(144);
    expect([...new Set(plan.tasks.map((task) => task.replicate))]).toEqual([1, 2]);
    expect(new Set(plan.tasks.map((task) => task.case)).size).toBe(12);
  });
  it("freezes reproducible hashes and changes them when the protocol changes", () => {
    expect(prepareVisualStudy(protocol, "pilot")).toEqual(prepareVisualStudy(protocol, "pilot"));
    const changed = structuredClone(protocol);
    changed.challenger.append += " Changed condition.";
    const original = prepareVisualStudy(protocol, "pilot");
    const updated = prepareVisualStudy(changed, "pilot");
    expect(updated.protocolSha256).not.toBe(original.protocolSha256);
    expect(updated.tasks.find((task) => task.condition === "baseline")!.promptSha256).toBe(original.tasks.find((task) => task.condition === "baseline")!.promptSha256);
  });
  it("refuses an authorization flag instead of accidentally turning preparation into generation", () => {
    expect(() => prepareVisualStudy({ ...protocol, generationAuthorized: true }, "pilot")).toThrow("generationAuthorized=false");
  });
  it("rejects ambiguous assignments and invalid input before preparing a run", () => {
    expect(() => prepareVisualStudy({ ...protocol, cases: [...protocol.cases, protocol.cases[0]] }, "pilot")).toThrow("Duplicate");
    expect(() => prepareVisualStudy({ ...protocol, stages: { ...protocol.stages, pilot: { cases: ["missing"], replicates: 1 } } }, "pilot")).toThrow("Unknown case");
    expect(() => prepareVisualStudy({ ...protocol, stages: { ...protocol.stages, expanded: { replicates: 0 } } }, "expanded")).toThrow("Replicates");
    expect(() => prepareVisualStudy({ ...protocol, normalization: { ...protocol.normalization, format: "svg" } }, "pilot")).toThrow("Invalid asset spec");
  });
});
