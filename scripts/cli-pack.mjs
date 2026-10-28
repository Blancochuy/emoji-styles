import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, ".release-cli");
const pnpm = process.env.npm_execpath;
assert(pnpm && /pnpm/i.test(pnpm), "Run this check with pnpm cli:pack.");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
execFileSync(process.execPath, [pnpm, "--filter", "emoji-styles-cli", "pack", "--pack-destination", destination], { cwd: root, stdio: "inherit" });
const files = readdirSync(destination).filter((name) => name.endsWith(".tgz"));
assert.equal(files.length, 1);
const tarball = join(destination, files[0]);
const tar = (args) => execFileSync("tar", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
const contents = tar(["-tf", tarball]).trim().split(/\r?\n/);
const manifest = JSON.parse(tar(["-xOf", tarball, "package/package.json"]));
assert.equal(manifest.name, "emoji-styles-cli");
assert.notEqual(manifest.private, true, "CLI release manifest is still private.");
assert.equal(manifest.repository.url, "git+https://github.com/Blancochuy/emoji-styles.git");
assert.equal(manifest.repository.directory, "packages/cli");
assert.equal(manifest.bin["emoji-styles"], "./dist/cli.js");
assert.equal(manifest.publishConfig.access, "public");
assert.equal(manifest.publishConfig.provenance, true);
const publicPackages = new Set(["emoji-styles", "@babel/parser", "parse5", "sharp"]);
for (const [name, version] of Object.entries(manifest.dependencies)) {
  assert(publicPackages.has(name), `Unexpected runtime dependency: ${name}`);
  assert(!/^(workspace:|link:|file:)/.test(version), `Local dependency leaked: ${name}`);
}
assert(manifest.dependencies.sharp, "Native image runtime must be declared.");
assert(!manifest.dependencies["@emoji-styles/asset-pipeline"], "Private pipeline leaked into runtime dependencies.");
for (const file of ["README.md", "LICENSE", "dist/index.js", "dist/index.d.ts", "dist/cli.js", "dist/audit-entry.js", "schemas/emoji-styles-config.schema.json"]) assert(contents.includes(`package/${file}`), `Missing ${file}`);
assert(contents.every((file) => !/^package\/(src|tests|node_modules)\//.test(file)), "Tarball includes development files.");
assert(tar(["-xOf", tarball, "package/dist/cli.js"]).startsWith("#!/usr/bin/env node"), "Executable has no shebang.");
for (const file of contents.filter((name) => /\.(js|ts)$/.test(name))) {
  const source = tar(["-xOf", tarball, file]);
  assert(!/(?:from\s*|import\s*\(|require\s*\()\s*["']@emoji-styles\/asset-pipeline["']/.test(source), `${file} imports a private package.`);
}
const executable = tar(["-tvf", tarball]).split(/\r?\n/).find((line) => line.endsWith("package/dist/cli.js"));
assert(executable && /^[-rwx]*x/.test(executable), "Packed bin is not executable.");
const core = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
assert.equal(manifest.dependencies["emoji-styles"], core.version, "Packed CLI must use the verified public core version.");
console.log(`Verified standalone CLI tarball: ${tarball}`);
