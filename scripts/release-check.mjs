import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, ".release");
const packOnly = process.argv.includes("--pack-only");
const publicPackages = [
  { name: "emoji-styles-data", directory: "packages/data" },
  { name: "emoji-styles", directory: "packages/core" },
  { name: "react-emoji-styles", directory: "packages/react" },
  { name: "emoji-styles-web", directory: "packages/web" },
  { name: "emoji-styles-assets-twemoji", directory: "packages/assets-twemoji" },
];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
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

for (const { name, directory: relativeDirectory } of publicPackages) {
  const directory = join(root, relativeDirectory);
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
  if (["emoji-styles", "react-emoji-styles", "emoji-styles-web"].includes(name)) {
    assert(contents.includes("package/dist/compiled.js"), `${name} tarball is missing compiled.js`);
    assert(contents.includes("package/dist/compiled.d.ts"), `${name} tarball is missing compiled.d.ts`);
  }
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
        'const {compileEmojiTheme,defineEmojiTheme}=await import("emoji-styles");',
        'const {getCompiledEmojiToken}=await import("emoji-styles/compiled");',
        'const {CompiledEmojiToken}=await import("react-emoji-styles/compiled");',
        'const {createElement}=await import("react");',
        'const {renderToString}=await import("react-dom/server");',
        'const theme=await compileEmojiTheme(defineEmojiTheme({"action.deploy":{emoji:"🚀",label:"Deploy"}},{defaultProvider:"twemoji",nativeFallback:false}));',
        'if(!getCompiledEmojiToken(theme,"action.deploy"))throw new Error("Compiled token missing");',
        'if(!renderToString(createElement(CompiledEmojiToken,{theme,token:"action.deploy"})).includes("<img"))throw new Error("Compiled rendering failed");',
        'const {renderCompiledEmojiTokenToHTML}=await import("emoji-styles-web/compiled");',
        'if(!renderCompiledEmojiTokenToHTML("action.deploy",theme).includes("<img"))throw new Error("Compiled web rendering failed");',
        'const owned=await compileEmojiTheme(defineEmojiTheme({"action.deploy":{emoji:"🚀",label:"Deploy",asset:{url:"/icons/deploy.svg",format:"svg"}}},{id:"release-assets",version:"1.2.0",defaultProvider:"twemoji"}));',
        'if(owned.tokens["action.deploy"].sources[0].provider!=="theme-release-assets")throw new Error("Custom asset inherited rendering provider");',
        'const attribution=owned.meta.providers.find(p=>p.id==="theme-release-assets");',
        'if(!attribution||attribution.version!=="1.2.0"||attribution.license!==undefined)throw new Error("Incorrect exact-asset attribution");',
        'const {readFileSync}=await import("node:fs");',
        'if(!readFileSync(new URL(import.meta.resolve("emoji-styles-web/styles.css")),"utf8").includes("[data-emoji-compiled]"))throw new Error("Compiled host stylesheet missing");',
        'console.log("Clean consumer root and compiled imports/rendering passed.");',
      ].join("\n"),
    ], { cwd: consumer });
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}
