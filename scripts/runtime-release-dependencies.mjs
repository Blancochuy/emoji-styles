import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const runtimePackages = ["emoji-styles-data", "emoji-styles"];
const integrity = (bytes) => `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

/** Stage exact runtime artifacts so prepublication consumers never need workspace links. */
export function stageRuntimeDependencies(root, destination, pnpm) {
  const directory = join(destination, "dependencies");
  mkdirSync(directory, { recursive: true });
  const packages = runtimePackages.map((name) => {
    execFileSync(process.execPath, [pnpm, "--filter", name, "pack", "--pack-destination", directory], { cwd: root, stdio: "pipe" });
    const source = JSON.parse(readFileSync(join(root, name === "emoji-styles" ? "packages/core/package.json" : "packages/data/package.json"), "utf8"));
    const file = `${name}-${source.version}.tgz`;
    return { name, version: source.version, file, integrity: integrity(readFileSync(join(directory, file))) };
  });
  writeFileSync(join(directory, "manifest.json"), JSON.stringify({ packages }, null, 2) + "\n");
}

/** Registry verification must always use registry dependencies, never staged artifacts. */
export function smokeRuntimeDependencies(root, registryMode, env = process.env) {
  const input = env.EMOJI_STYLES_SMOKE_DEPENDENCIES;
  if (!input) return [];
  assert(!registryMode, "Registry smoke must not use staged runtime dependencies.");
  const directory = resolve(root, input);
  const { packages } = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  assert.deepEqual(packages.map(({ name }) => name), runtimePackages);
  return packages.map((entry) => {
    assert.equal(entry.file, basename(entry.file));
    assert.equal(entry.file, `${entry.name}-${entry.version}.tgz`);
    const path = join(directory, entry.file);
    assert.equal(integrity(readFileSync(path)), entry.integrity, `Staged bytes changed for ${entry.name}`);
    return path;
  });
}
