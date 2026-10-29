import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.env.npm_execpath;
assert(npm && /npm-cli\.js$/.test(npm), "Run with npm run skills:smoke.");
const npx = join(dirname(npm), "npx-cli.js");
const temporary = mkdtempSync(join(tmpdir(), "emoji-portable-skills-"));
const env = { ...process.env, npm_config_yes: "false" };
delete env.NODE_PATH;
delete env.NODE_OPTIONS;
const source = `export default function App() { return <>
  <h1>Pricing 🚀</h1><button>Deploy 🚀</button>
  <p>✅ All systems operational</p><p>⚠️ Payment failed</p>
  <span aria-hidden="true">✨</span><a href="/settings">⚙️</a>
</>; }
`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function node(args, cwd, expected = [0]) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
  assert.ifError(result.error);
  assert(expected.includes(result.status), `Exit ${result.status}: ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return { ...result, args };
}

// Execute the actual portable CLI examples from each installed SKILL.md. Only
// this small argv grammar is supported; never evaluate the Markdown as shell code.
function examples(skill) {
  const markdown = readFileSync(skill, "utf8");
  return [...markdown.matchAll(/```sh\n([\s\S]*?)```/g)].flatMap((match) => match[1].split("\n"))
    .filter((line) => line.startsWith("npx --no-install emoji-styles "))
    .map((line) => [...line.matchAll(/"([^"\n]*)"|'([^'\n]*)'|(\S+)/g)].map((part) => part[1] ?? part[2] ?? part[3]).slice(3));
}
function select(commands, predicate) {
  const found = commands.find(predicate);
  assert(found, "Portable skill is missing a command required by its consumer workflow.");
  return found;
}

try {
  for (const folder of [".agents/skills", ".claude/skills", ".cursor/skills"]) {
    const cwd = join(temporary, folder.split("/")[0].slice(1));
    mkdirSync(join(cwd, folder), { recursive: true });
    for (const name of ["emoji-styles", "emoji-asset-creator"]) cpSync(join(root, "skills", name), join(cwd, folder, name), { recursive: true });
    assert(!existsSync(join(cwd, "skills")) && !existsSync(join(cwd, "packages")));
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "portable-skills-consumer", private: true, type: "module" }));
    node([npm, "install", "--no-audit", "--no-fund", "emoji-styles-cli@0.3.3", "emoji-styles@0.3.0", "react-emoji-styles@0.3.0", "emoji-styles-web@0.3.0", "react@19.2.7", "react-dom@19.2.7", "vite@6.4.1"], cwd);
    assert(!lstatSync(join(cwd, "node_modules/emoji-styles-cli")).isSymbolicLink());
    assert(!existsSync(join(cwd, "node_modules/@emoji-styles/asset-pipeline")));
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, "src/App.tsx"), source);
    const integration = examples(join(cwd, folder, "emoji-styles/SKILL.md"));
    const artwork = examples(join(cwd, folder, "emoji-asset-creator/SKILL.md"));
    const cli = (args, expected = [0]) => {
      const result = node([npx, "--no-install", "emoji-styles", ...args, ...(args.includes("--json") ? [] : ["--json"])], cwd, expected);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.ok, result.status === 0, "CLI exit code must match its structured outcome.");
      return parsed;
    };
    const preview = select(integration, (args) => args[0] === "init" && !args.includes("--yes"));
    assert.equal(cli(preview).applied, false);
    assert(!existsSync(join(cwd, "emoji-styles.config.json")));
    assert.equal(cli(select(integration, (args) => args[0] === "init" && args.includes("--yes"))).applied, true);
    const audit = cli(select(integration, (args) => args[0] === "audit"), [0, 1]);
    assert(audit.data.findings.some((finding) => finding.ruleId === "emoji-styles/semantic/raw-emoji"));
    assert.deepEqual(audit.data.usages.map(({ role }) => role), ["content", "control", "status", "status", "decorative", "control"]);
    const draft = select(integration, (args) => args[0] === "theme" && args[1] === "draft" && !args.includes("--yes"));
    assert.equal(cli(draft).applied, false);
    assert(!existsSync(join(cwd, "emoji-review")));
    assert.equal(cli(select(integration, (args) => args[0] === "theme" && args.includes("--yes"))).applied, true);
    const review = JSON.parse(readFileSync(join(cwd, "emoji-review/review.json"), "utf8"));
    for (const token of ["content.pricing", "action.deploy", "status.success", "action.review"]) assert(review.candidates.some(candidate => candidate.token === token));
    const sheet = readFileSync(join(cwd, "emoji-review/token-sheet.html"), "utf8");
    for (const size of [16, 20, 24]) assert(sheet.includes(`width="${size}" height="${size}"`));
    assert.equal(readFileSync(join(cwd, "src/App.tsx"), "utf8"), source);
    const compile = select(integration, args => args[0] === "theme" && args[1] === "compile" && !args.includes("--yes") && !args.includes("--check"));
    assert(!compile[2].includes("emoji-review"), "The skill must compile a reviewed copy, not the draft.");
    const refusedDraft = cli(["theme", "compile", "emoji-review/emoji-theme.ts", "--output", "src/emoji-theme.compiled.ts", "--yes"], [1]);
    assert.equal(refusedDraft.error.code, "THEME_DRAFT_UNREVIEWED");
    assert(!existsSync(join(cwd, "src/emoji-theme.compiled.ts")));
    // Stand in for the review the skill requires: own theme id and no placeholder labels.
    const reviewed = readFileSync(join(cwd, "emoji-review/emoji-theme.ts"), "utf8").replace(/^\/\/ .*\n/gm, "").replace('"review-draft"', '"portable-app"').replace(/"REVIEW: [^"]*"/g, '"Open settings"');
    assert(!/REVIEW:|review-draft/.test(reviewed));
    writeFileSync(join(cwd, compile[2]), reviewed);
    assert.equal(cli(compile).applied, false);
    assert(!existsSync(join(cwd, "src/emoji-theme.compiled.ts")));
    assert.equal(cli(select(integration, args => args[1] === "compile" && args.includes("--yes"))).applied, true);
    assert.equal(cli(select(integration, args => args[1] === "compile" && args.includes("--check"))).ok, true);
    for (const command of ["doctor", "test"]) assert.equal(cli(select(integration, (args) => args[0] === command)).ok, true);
    assert.equal(cli(select(integration, (args) => args[0] === "fix"), [0, 1]).applied, false);
    assert.equal(readFileSync(join(cwd, "src/App.tsx"), "utf8"), source);

    mkdirSync(join(cwd, "raw"));
    for (const name of ["1f680", "1f512"]) cpSync(join(root, "docs/assets/quickstart", `${name}.png`), join(cwd, "raw", `${name}.png`));
    assert.equal(cli(select(artwork, (args) => args[0] === "assets" && args[1] === "inspect")).ok, true);
    assert.equal(cli(select(artwork, (args) => args[1] === "init")).applied, true);
    assert.equal(cli(select(artwork, (args) => args[1] === "validate-spec")).data.valid, true);
    assert.equal(cli(select(artwork, (args) => args[1] === "plan")).data.executesGeneration, false);
    const pack = select(artwork, (args) => args[1] === "pack");
    assert.equal(cli(pack).applied, false);
    assert(!existsSync(join(cwd, "public/emoji/product")));
    assert(!existsSync(join(cwd, "src/emoji-provider.json")));
    assert.equal(cli([...pack, "--yes"]).applied, true);
    const manifest = JSON.parse(readFileSync(join(cwd, "src/emoji-provider.json"), "utf8"));
    assert.equal(manifest.basePath, "/emoji/product/assets");
    assert.equal(Object.keys(manifest.assets).length, 2);
    for (const asset of Object.values(manifest.assets)) assert.equal(sha256(readFileSync(join(cwd, "public", manifest.basePath.slice(1), asset.file))), asset.sha256);
    const provenance = JSON.parse(readFileSync(join(cwd, "public/emoji/product/PROVENANCE.json"), "utf8"));
    assert.equal(provenance.generated, false);
    assert.equal(provenance.license, "License status: user confirmation required");
    assert(existsSync(join(cwd, "review/product.png")));
    assert.equal(cli([...pack, "--yes"], [1]).applied, false);

    // Compile actual packed artwork in a build-only MJS module, never the browser entry.
    writeFileSync(join(cwd, "product-theme.mjs"), `import {readFileSync} from 'node:fs';import {createManifestProvider,defineEmojiTheme} from 'emoji-styles';const manifest=JSON.parse(readFileSync(new URL('./src/emoji-provider.json',import.meta.url)));export const theme=defineEmojiTheme({'action.deploy':{emoji:'🚀',label:'Deploy application'}},{defaultProvider:createManifestProvider(manifest),nativeFallback:true});`);
    const customCompile = ["theme", "compile", "product-theme.mjs", "--output", "src/product.compiled.ts"];
    assert.equal(cli(customCompile).applied, false);
    assert.equal(cli([...customCompile, "--yes"]).applied, true);
    assert.equal(cli([...customCompile, "--check"]).ok, true);
    const compiledSource = readFileSync(join(cwd, "src/product.compiled.ts"), "utf8");
    assert(compiledSource.includes("/emoji/product/assets/"));
    writeFileSync(join(cwd, "src/App.tsx"), `import {CompiledEmojiToken} from 'react-emoji-styles/compiled';import 'react-emoji-styles/styles.css';import {compiledEmojiTheme} from './product.compiled';export default function App(){return <CompiledEmojiToken token="action.deploy" theme={compiledEmojiTheme}/>;}`);
    writeFileSync(join(cwd, "src/main.tsx"), "import {createRoot} from 'react-dom/client';import App from './App';createRoot(document.getElementById('root')!).render(<App/>);");
    writeFileSync(join(cwd, "index.html"), '<div id="root"></div><script type="module" src="/src/main.tsx"></script>');
    writeFileSync(join(cwd, "vite.config.js"), `export default {esbuild:{jsx:"automatic"},plugins:[{name:'assert-compiled-graph',generateBundle(_options,bundle){const ids=Object.values(bundle).filter(x=>x.type==='chunk').flatMap(x=>Object.keys(x.modules));if(ids.some(id=>!id.endsWith('.css')&&(/emoji-styles-data|tokenize/.test(id)||/node_modules\\/(emoji-styles|react-emoji-styles|emoji-styles-web)\\//.test(id)&&! /\\/dist\\/(?:compiled|chunk-[^/]+)\\.js$/.test(id))))throw new Error('Full catalog/runtime reached compiled consumer');if(!ids.some(id=>id.endsWith('/react-emoji-styles/dist/compiled.js')))throw new Error('Missing compiled renderer');}}]};`);
    node([join(cwd, "node_modules/vite/bin/vite.js"), "build"], cwd);
    for (const asset of Object.values(manifest.assets)) assert.equal(sha256(readFileSync(join(cwd, "dist", manifest.basePath.slice(1), asset.file))), asset.sha256);
    node(["--input-type=module", "--eval", `
      import assert from 'node:assert/strict';
      import {compiledEmojiTheme} from './src/product.compiled.ts';
      import {renderCompiledEmojiTokenToHTMLResult} from 'emoji-styles-web/compiled';
      const result=renderCompiledEmojiTokenToHTMLResult('action.deploy',compiledEmojiTheme);
      assert(result.source.url.startsWith('/emoji/product/assets/'));
      assert(result.html.includes('aria-label="Deploy application"'));
      assert(result.html.includes('data-emoji-token="action.deploy"'));
    `], cwd);
    writeFileSync(join(cwd, "src/main.tsx"), `import {renderCompiledEmojiTokenToHTML,installCompiledEmojiFallbacks} from 'emoji-styles-web/compiled';import 'emoji-styles-web/styles.css';import {compiledEmojiTheme} from './product.compiled';const root=document.getElementById('root')!;root.innerHTML=renderCompiledEmojiTokenToHTML('action.deploy',compiledEmojiTheme);installCompiledEmojiFallbacks(root);`);
    const configPath=join(cwd, "vite.config.js");
    writeFileSync(configPath,readFileSync(configPath,"utf8").replace('/react-emoji-styles/dist/compiled.js','/emoji-styles-web/dist/compiled.js'));
    node([join(cwd, "node_modules/vite/bin/vite.js"), "build"], cwd);
    for (const asset of Object.values(manifest.assets)) assert.equal(sha256(readFileSync(join(cwd, "dist", manifest.basePath.slice(1), asset.file))), asset.sha256);
    console.log(`PASS ${folder}: copied skills, published CLI, actual examples, role audit, theme draft, no-spend plan, portable pack, draft/custom-theme compilation and catalog-free React/web app builds and web SSR. Host discovery/model behavior not tested.`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
