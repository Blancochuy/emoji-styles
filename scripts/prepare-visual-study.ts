import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planEmojiGeneration } from "../packages/asset-pipeline/src/generation";

interface Case { id: string; emoji: string; label: string; subject: string; criticalFeature: string }
interface Style { id: string; [key: string]: unknown }
interface Protocol {
  schemaVersion: number; id: string; generationAuthorized: boolean;
  sizes: number[]; backgrounds: string[]; normalization: { size: number; format: string; safeArea: number };
  stages: { pilot: { cases: string[]; replicates: number }; expanded: { replicates: number } };
  anchor: { case: string; maxRequestsPerStyle: number };
  baseline: { gitRef: string; planner: string; plannerSha256: string }; challenger: { id: string; append: string };
  styles: Style[]; cases: Case[]; review: { criteria: string[] };
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** Preparation only: no generator, network call, result grading or image writes. */
export function prepareVisualStudy(protocol: Protocol, stage: "pilot" | "expanded") {
  if (protocol.schemaVersion !== 1 || protocol.generationAuthorized !== false) throw new Error("This preparer only accepts v1 protocols with generationAuthorized=false.");
  if (new Set(protocol.cases.map((item) => item.id)).size !== protocol.cases.length || new Set(protocol.styles.map((style) => style.id)).size !== protocol.styles.length) throw new Error("Duplicate case/style IDs.");
  const ids = stage === "pilot" ? protocol.stages.pilot.cases : protocol.cases.map((item) => item.id);
  const cases = ids.map((id) => { const entry = protocol.cases.find((item) => item.id === id); if (!entry) throw new Error(`Unknown case: ${id}`); return entry; });
  if (new Set(ids).size !== ids.length || !ids.length || !protocol.styles.length) throw new Error("Empty or duplicate study cases/styles.");
  const replicates = protocol.stages[stage].replicates;
  if (!Number.isInteger(replicates) || replicates < 1 || replicates > 4) throw new Error("Replicates must be from 1 to 4.");
  if (!protocol.cases.some((entry) => entry.id === protocol.anchor.case) || !Number.isInteger(protocol.anchor.maxRequestsPerStyle) || protocol.anchor.maxRequestsPerStyle < 1) throw new Error("Invalid anchor configuration.");
  const tasks = protocol.styles.flatMap(({ id, ...style }) => {
    const spec = { schemaVersion: 1, providerId: `study-${id}`, version: "1.0.0", style, canvas: { width: 512, height: 512, safeArea: protocol.normalization.safeArea }, output: { format: protocol.normalization.format, width: protocol.normalization.size, height: protocol.normalization.size, transparent: true }, tokens: cases.map((entry) => ({ token: entry.id, emoji: entry.emoji, label: entry.label, subject: entry.subject })) };
    const plan = planEmojiGeneration(spec, { variants: replicates });
    return plan.tasks.flatMap((task) => (["baseline", "challenger"] as const).map((condition) => {
      const prompt = condition === "baseline" ? task.prompt : `${task.prompt}\n\n${protocol.challenger.append}`;
      return { id: `${id}.${task.id}.${condition}`, style: id, case: task.token, replicate: task.variant, condition, prompt, promptSha256: hash(prompt), specSha256: plan.specSha256, requiredReference: `approved-anchor:${id}`, seed: null, model: null, rawSha256: null, normalizedSha256: null, status: "not-generated" };
    }));
  });
  const anchorRequests = protocol.styles.length * protocol.anchor.maxRequestsPerStyle;
  return { schemaVersion: 1, protocolId: protocol.id, protocolSha256: hash(JSON.stringify(protocol)), stage, executesGeneration: false, generationAuthorized: false, budget: { comparisonRequests: tasks.length, anchorRequestCap: anchorRequests, proposedRequestCap: tasks.length + anchorRequests, repairRequests: 0, cost: null, note: "Proposed ceiling only, not permission to generate. Actual provider/model/cost and effective settings must be locked first." }, reviewCellsPerCandidate: protocol.sizes.length * protocol.backgrounds.length, tasks };
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const stage = args[0] ?? "pilot";
  if ((stage !== "pilot" && stage !== "expanded") || args.length > 1) throw new Error("Usage: pnpm benchmark:visual-plan [pilot|expanded]");
  const protocol = JSON.parse(readFileSync(join(root, "benchmarks/visual-quality/protocol.json"), "utf8")) as Protocol;
  if (hash(readFileSync(join(root, protocol.baseline.planner), "utf8")) !== protocol.baseline.plannerSha256) throw new Error("The baseline planner changed. Freeze a new protocol revision before preparing a study.");
  const result = prepareVisualStudy(protocol, stage);
  const folder = join(root, ".visual-study", `${protocol.id}-${stage}-${result.protocolSha256.slice(0, 12)}`);
  if (existsSync(folder)) throw new Error(`Prepared study already exists: ${folder}. Keep it intact; use a new protocol revision to change a frozen study.`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "protocol.json"), `${JSON.stringify(protocol, null, 2)}\n`);
  writeFileSync(join(folder, "plan.json"), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(folder, "review-template.json"), readFileSync(join(root, "benchmarks/visual-quality/records.template.json"), "utf8"));
  console.log(JSON.stringify({ output: folder, ...result.budget, executesGeneration: false, generationAuthorized: false }, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
