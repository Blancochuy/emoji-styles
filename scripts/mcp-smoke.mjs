import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "packages/mcp/package.json"), "utf8")).version;
const tarball = resolve(process.argv[2] ?? join(root, `.release-mcp/emoji-styles-mcp-${version}.tgz`));
const npm = process.env.npm_execpath;
assert(npm?.endsWith("npm-cli.js"), "Use npm run mcp:smoke.");
assert(existsSync(tarball), "Run pnpm mcp:pack first.");
const cwd = mkdtempSync(join(tmpdir(), "emoji-mcp-consumer-"));
const env = { ...process.env, OPENAI_API_KEY: "" };
delete env.NODE_PATH; delete env.NODE_OPTIONS;
function node(args, code = 0) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, code, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result;
}
try {
  writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "emoji-mcp-consumer", private: true, type: "module" }));
  node([npm, "install", "--omit=dev", "--include=optional", "--no-audit", "--no-fund", tarball]);
  const installed = join(cwd, "node_modules/emoji-styles-mcp");
  assert(!lstatSync(installed).isSymbolicLink());
  assert(!existsSync(join(cwd, "node_modules/@emoji-styles/asset-pipeline")));
  node([npm, "ls", "--all", "--json"]);
  const binary = join(installed, "dist/stdio.js");
  assert(node([npm, "exec", "--offline", "--", "emoji-styles-mcp", "--help"]).stdout.includes("--workspace"));
  for (const args of [["--workspace"], ["--workspace="], ["--unknown"]]) {
    const result = node([binary, ...args], 2);
    assert.equal(result.stdout, ""); assert(!result.stderr.includes("at main"));
  }
  for (const path of ["missing", "package.json"]) assert.equal(node([binary, "--workspace", path], 1).stdout, "");
  assert.equal(node([binary]).stdout, "", "EOF should close quietly.");
  const project = join(cwd, "project with spaces");
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "assets"));
  writeFileSync(join(project, "emoji-styles.config.json"), JSON.stringify({ schemaVersion: 1, provider: "twemoji", fallbacks: [], nativeFallback: false, source: ["src"] }));
  writeFileSync(join(project, "src/app.tsx"), "export const button = <button>🚀</button>;\n");
  writeFileSync(join(cwd, "outside.ts"), "outside workspace");
  if (process.platform !== "win32") symlinkSync(join(cwd, "outside.ts"), join(project, "escaped.json"));
  node(["--input-type=module", "--eval", `
    import sharp from 'sharp';
    const ink = await sharp({create:{width:128,height:128,channels:4,background:'#ed6655'}}).png().toBuffer();
    await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:ink,left:64,top:64}]).webp({lossless:true}).toFile('project with spaces/assets/1f680.webp');
  `]);
  cpSync(join(root, "scripts/mcp-consumer.mjs"), join(cwd, "consumer.mjs"));
  const result = node(["consumer.mjs"]);
  process.stdout.write(result.stdout);
  console.log(`Standalone MCP install passed: ${process.platform}/${process.arch}, Node ${process.versions.node}`);
} finally { rmSync(cwd, { recursive: true, force: true }); }
