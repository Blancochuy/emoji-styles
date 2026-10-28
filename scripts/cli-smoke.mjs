import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8")).version;
const registryMode = process.argv[2] === "--registry";
const packageSpec = registryMode ? `emoji-styles-cli@${version}` : resolve(process.argv[2] ?? join(root, `.release-cli/emoji-styles-cli-${version}.tgz`));
const npm = process.env.npm_execpath;
assert(npm && /npm-cli\.js$/.test(npm), "Run this check with npm run cli:smoke -- <tarball>.");
if (!registryMode) assert(existsSync(packageSpec), `Build the CLI tarball first: ${packageSpec}`);
const cwd = mkdtempSync(join(tmpdir(), "emoji-cli-install-"));
const env = { ...process.env };
delete env.NODE_PATH;
delete env.NODE_OPTIONS;
function node(args, expected = 0) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, expected, `Exit ${result.status}, expected ${expected}: ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const json = (args, expected = 0) => JSON.parse(node([binary, ...args, "--json"], expected));
let binary;
try {
  writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "emoji-cli-clean-consumer", private: true, type: "module" }));
  // Use the real npm installer (including native runtime setup), never workspace links.
  node([npm, "install", "--omit=dev", "--include=optional", "--no-audit", "--no-fund", packageSpec]);
  const installed = join(cwd, "node_modules/emoji-styles-cli");
  assert.equal(JSON.parse(readFileSync(join(installed, "package.json"), "utf8")).version, version);
  assert(!lstatSync(installed).isSymbolicLink(), "CLI installation is a workspace link.");
  binary = join(installed, "dist/cli.js");
  assert(realpathSync(binary).startsWith(realpathSync(cwd)));
  assert(!existsSync(join(cwd, "node_modules/@emoji-styles/asset-pipeline")), "Private pipeline installed at runtime.");
  const tree = JSON.parse(node([npm, "ls", "--all", "--json"]));
  assert(tree.dependencies["emoji-styles-cli"], "Missing installed CLI.");
  node(["--input-type=module", "--eval", 'await import("emoji-styles-cli"); await import("emoji-styles-cli/audit");']);
  const help = JSON.parse(node([npm, "exec", "--offline", "--", "emoji-styles", "studio", "--help", "--json"]));
  assert.equal(help.data.usage, "emoji-styles studio [input] [output]");
  // Load the installed TUI with simulated terminal capabilities on every OS.
  const studio = node(["--input-type=module", "--eval", `
    import assert from 'node:assert/strict';
    import { pathToFileURL } from 'node:url';
    process.stdin.isTTY = true;
    process.stdin.isRaw = false;
    process.stdin.setRawMode = (mode) => { process.stdin.isRaw = mode; };
    process.stdout.isTTY = true;
    process.stdout.columns = 80;
    process.stdout.rows = 24;
    process.argv = [process.execPath, ${JSON.stringify(binary)}, 'studio'];
    await import(pathToFileURL(${JSON.stringify(binary)}).href);
    assert.equal(process.stdin.isRaw, true);
    process.emit('SIGINT');
    process.once('beforeExit', () => {
      assert.equal(process.stdin.isRaw, false);
      assert.equal(process.listenerCount('SIGINT'), 0);
    });
  `], 130);
  assert(studio.includes("EMOJI STYLES / STUDIO"));
  assert(studio.includes("\x1b[?25h\x1b[?1049l"));
  assert.equal(json(["studio"], 2).error.code, "INTERACTIVE_REQUIRED");
  assert.equal(json(["init", "--yes", "--provider"], 2).error.code, "MISSING_OPTION_VALUE");
  assert(!existsSync(join(cwd, "emoji-styles.config.json")));
  assert.equal(json(["init", "--provider", "twemoji"]).applied, false);
  assert(!existsSync(join(cwd, "emoji-styles.config.json")));
  assert.equal(json(["init", "--provider", "twemoji", "--yes"]).applied, true);
  mkdirSync(join(cwd, "src"));
  writeFileSync(join(cwd, "src/app.ts"), "export const label = 'Launch 🚀';\n");
  assert.equal(json(["doctor"]).ok, true);
  assert(json(["audit"]).data.findings.length > 0);
  assert.equal(json(["fix", "--dry-run"]).applied, false);
  assert.equal(json(["licenses"]).ok, true);
  // Build a transparent geometric fixture using only the installed native dependency.
  node(["--input-type=module", "--eval", `
    import sharp from 'sharp';
    import { mkdir } from 'node:fs/promises';
    await mkdir('raw images');
    const ink = await sharp({create:{width:40,height:30,channels:4,background:'#ed6655'}}).png().toBuffer();
    await sharp({create:{width:80,height:60,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:ink,left:20,top:15}]).png().toFile('raw images/1f680.png');
  `]);
  const inspection = json(["assets", "inspect", "raw images"]);
  assert.equal(inspection.data.assets[0].transparentPixelRatio, 0.75);
  assert.equal(json(["assets", "normalize", "raw images", "normalized"]).applied, false);
  assert(!existsSync(join(cwd, "normalized")));
  assert.equal(json(["assets", "normalize", "raw images", "normalized", "--yes"]).applied, true);
  assert.equal(json(["assets", "validate", "normalized", "--format", "webp"]).ok, true);
  assert.equal(json(["assets", "normalize", "raw images", "normalized", "--yes"], 1).applied, false);
  assert.equal(json(["assets", "contact-sheet", "normalized", "review.png", "--review", "--yes"]).applied, true);
  assert(existsSync(join(cwd, "review.png")));
  writeFileSync(join(cwd, "provenance.json"), JSON.stringify({ generated: false, createdAt: "2026-10-27T00:00:00Z", source: "Geometric installation test fixture", license: "MIT" }));
  assert.equal(json(["assets", "build", "normalized", "--output", "provider", "--provenance", "provenance.json", "--yes"]).applied, true);
  const manifest = JSON.parse(readFileSync(join(cwd, "provider/emoji-provider.json"), "utf8"));
  assert.match(manifest.assets["🚀"].sha256, /^[a-f0-9]{64}$/);
  assert(json(["assets", "spec-schema"]).ok);
  console.log(`Standalone CLI ${registryMode ? "registry" : "tarball"} install passed: ${process.platform}/${process.arch}, Node ${process.versions.node}; npm bin, API, JSON, native images, review sheet, validated provider.`);
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
