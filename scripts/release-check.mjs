import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, ".release");
const packOnly = process.argv.includes("--pack-only");
const packageNames = [
  "emoji-styles-data",
  "emoji-styles",
  "react-emoji-styles",
  "emoji-styles-web",
  "emoji-styles-assets-twemoji",
];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
}

function packageDirectory(name) {
  return run("pnpm", ["--filter", name, "exec", "node", "-p", "process.cwd()"], { capture: true }).trim();
}

function packedManifest(tarball) {
  return JSON.parse(run("tar", ["-xOf", tarball, "package/package.json"], { capture: true }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

const tarballs = [];
let releaseVersion;

for (const name of packageNames) {
  const directory = packageDirectory(name);
  const sourceManifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));

  assert(sourceManifest.private !== true, `${name} is still private.`);
  assert(sourceManifest.publishConfig?.access === "public", `${name} must publish with public access.`);
  assert(sourceManifest.publishConfig?.provenance === true, `${name} must require npm provenance.`);
  assert(sourceManifest.homepage === "https://emoji-styles.space", `${name} must point to the product site.`);
  assert(readFileSync(join(directory, "README.md"), "utf8").trim().length > 0, `${name} has no package README.`);

  releaseVersion ??= sourceManifest.version;
  assert(sourceManifest.version === releaseVersion, `${name} does not share release version ${releaseVersion}.`);

  const before = new Set(readdirSync(releaseDir));
  run("pnpm", ["--filter", name, "pack", "--pack-destination", releaseDir], { capture: true });
  const created = readdirSync(releaseDir).filter((file) => file.endsWith(".tgz") && !before.has(file));
  assert(created.length === 1, `${name} produced ${created.length} tarballs instead of one.`);

  const tarball = join(releaseDir, created[0]);
  const manifest = packedManifest(tarball);
  assert(manifest.name === name, `${created[0]} contains ${manifest.name} instead of ${name}.`);
  assert(manifest.version === releaseVersion, `${name} packed the wrong version.`);

  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    assert(!String(version).startsWith("workspace:"), `${name} leaked workspace protocol for ${dependency}.`);
  }

  const contents = run("tar", ["-tf", tarball], { capture: true });
  assert(contents.includes("package/README.md"), `${name} tarball is missing README.md.`);
  assert(contents.includes("package/LICENSE"), `${name} tarball is missing LICENSE.`);
  assert(contents.includes("package/dist/index.js"), `${name} tarball is missing dist/index.js.`);
  assert(contents.includes("package/dist/index.d.ts"), `${name} tarball is missing dist/index.d.ts.`);
  tarballs.push(tarball);
}

console.log(`Packed ${tarballs.length} public packages at version ${releaseVersion}.`);

if (!packOnly) {
  const consumer = mkdtempSync(join(tmpdir(), "emoji-styles-release-"));
  try {
    writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "emoji-styles-release-smoke", private: true, type: "module" }, null, 2));
    run("npm", [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "react@18.3.1",
      "react-dom@18.3.1",
      ...tarballs,
    ], { cwd: consumer });
    run("node", [
      "--input-type=module",
      "--eval",
      [
        'await import("emoji-styles-data");',
        'await import("emoji-styles");',
        'await import("react-emoji-styles");',
        'await import("emoji-styles-web");',
        'await import("emoji-styles-assets-twemoji");',
        'console.log("Clean consumer imports passed.");',
      ].join("\n"),
    ], { cwd: consumer });
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}
