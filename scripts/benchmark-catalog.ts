import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { brotliCompressSync, gzipSync } from "node:zlib";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flag = process.argv.indexOf("--baseline");
const baselineRef = flag < 0 ? "6dae5a2" : process.argv[flag + 1];
if (!baselineRef) throw new Error("--baseline requires a Git revision");
const baseline = execFileSync("git", ["rev-parse", "--verify", `${baselineRef}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
const path = "packages/data/src/generated.ts";
const before = execFileSync("git", ["show", `${baseline}:${path}`], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const after = await readFile(resolve(root, path), "utf8");
function evaluate(source: string) {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, unknown> = {};
  new Script(js).runInNewContext({ exports }, { timeout: 5000 });
  return { exports, bytes: Buffer.byteLength(js), gzip: gzipSync(js, { level: 9 }).length, brotli: brotliCompressSync(js).length };
}
const previous = evaluate(before);
const current = evaluate(after);
for (const key of ["emojiData", "emojiAliases", "emojiDatasetInfo"]) {
  // Serialization also checks public property/enumeration order across VM realms.
  assert.equal(JSON.stringify(current.exports[key]), JSON.stringify(previous.exports[key]), `${key} changed`);
}
assert.ok(current.gzip < previous.gzip, "Compact data must reduce gzip size");
const { exports: ignoredBefore, ...beforeSizes } = previous;
const { exports: ignoredAfter, ...afterSizes } = current;
const report = {
  baseline,
  scope: "Unminified ES2022 CommonJS generated data only; not browser load time or a full application bundle",
  environment: { node: process.version, typescript: ts.version },
  equivalent: { records: Object.keys(current.exports.emojiData as object).length, aliases: Object.keys(current.exports.emojiAliases as object).length, metadataAndEnumerationOrder: true },
  metadataSha256: createHash("sha256").update(JSON.stringify(current.exports)).digest("hex"),
  before: beforeSizes, after: afterSizes,
};
const output = resolve(root, "benchmarks/catalog/results.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
