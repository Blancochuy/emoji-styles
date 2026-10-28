import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { smokeRuntimeDependencies } from "../runtime-release-dependencies.mjs";
const directories = [];
afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "runtime-stage-")); directories.push(root);
  const packages = ["emoji-styles-data", "emoji-styles"].map((name) => {
    const file = `${name}-0.2.0.tgz`, bytes = Buffer.from(`fixture ${name}`);
    writeFileSync(join(root, file), bytes);
    return { name, file, version: "0.2.0", integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}` };
  });
  writeFileSync(join(root, "manifest.json"), JSON.stringify({ packages }));
  return { root, env: { EMOJI_STYLES_SMOKE_DEPENDENCIES: root }, packages };
}
it("uses no candidate artifacts by default and forbids them in registry verification", () => {
  expect(smokeRuntimeDependencies(".", true, {})).toEqual([]);
  const { root, env } = fixture();
  expect(() => smokeRuntimeDependencies(root, true, env)).toThrow("Registry smoke");
});
it("accepts exactly the staged runtime artifacts with matching integrity", () => {
  const { root, env, packages } = fixture();
  expect(smokeRuntimeDependencies(root, false, env)).toEqual(packages.map(({ file }) => join(root, file)));
});
it("rejects changed bytes before installation", () => {
  const { root, env, packages } = fixture();
  writeFileSync(join(root, packages[0].file), "changed");
  expect(() => smokeRuntimeDependencies(root, false, env)).toThrow("Staged bytes changed");
});
it("rejects paths outside the artifact directory", () => {
  const { root, env } = fixture();
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  manifest.packages[0].file = "../escape.tgz";
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
  expect(() => smokeRuntimeDependencies(root, false, env)).toThrow();
});
