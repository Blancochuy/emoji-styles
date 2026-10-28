import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from "node:path";
import { gzipSync } from 'node:zlib';
import { build, version as viteVersion } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { frozenVariants, localBuilds, prototypeVariants, repo, root, variantResolve, variants } from "./variants.mjs";
const recordPrototype=process.argv.includes("--record-prototype");
const reports=[];
await mkdir(resolve(root,'reports'),{recursive:true});
for(const variant of variants){
 const outDir=resolve(root,'dist',variant);
 const moduleRecords=[];
 await build({root,configFile:false,logLevel:'warn',resolve:variantResolve(variant),esbuild:{jsx:'automatic'},build:{outDir,emptyOutDir:true,minify:'esbuild',target:'es2020',sourcemap:false,reportCompressedSize:false,rollupOptions:{plugins:[
  {name:'module-inventory',generateBundle(_options,bundle){for(const chunk of Object.values(bundle)){if(chunk.type!=='chunk')continue;for(const [id,info] of Object.entries(chunk.modules))moduleRecords.push({id:id.replaceAll(root,"<fixture>").replaceAll(repo,"<repo>"),renderedBytes:info.renderedLength,originalBytes:info.originalLength,chunk:chunk.fileName});}}},
  visualizer({filename:resolve(root,`reports/${variant}.html`),template:'treemap',gzipSize:false,brotliSize:false,open:false}),
  visualizer({filename:resolve(root,`reports/${variant}.json`),template:'raw-data',gzipSize:false,brotliSize:false,open:false}),
 ]}}});
 const assets=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(?:js|css|html)$/.test(entry.name)){const bytes=await readFile(path);assets.push({file:path.slice(outDir.length+1),type:entry.name.split('.').at(-1),minifiedBytes:bytes.length,gzipBytes:gzipSync(bytes,{level:9}).length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
 await walk(outDir);
 const packages={};
 for(const record of moduleRecords){const match=record.id.match(/node_modules\/(\@[^/]+\/[^/]+|[^/]+)/);const local=record.id.match(/^<repo>\/packages\/(core|react)\/dist\//)?.[1];const name=local?`${{core:"emoji-styles",react:"react-emoji-styles"}[local]} (local build)`:match?.[1]??"application / bundler runtime";packages[name]??={renderedBytes:0,modules:0};packages[name].renderedBytes+=record.renderedBytes;packages[name].modules++;}
 const js=assets.filter(a=>a.type==='js');const css=assets.filter(a=>a.type==='css');
 reports.push({variant,js:{minifiedBytes:js.reduce((s,a)=>s+a.minifiedBytes,0),gzipBytes:js.reduce((s,a)=>s+a.gzipBytes,0)},css:{minifiedBytes:css.reduce((s,a)=>s+a.minifiedBytes,0),gzipBytes:css.reduce((s,a)=>s+a.gzipBytes,0)},packages,assets});
 await writeFile(resolve(root,`reports/${variant}-modules.json`),JSON.stringify(moduleRecords,null,2)+'\n');
}
const baseline=reports[0];
for(const report of reports){report.deltaVsReact={minifiedBytes:report.js.minifiedBytes-baseline.js.minifiedBytes,gzipBytes:report.js.gzipBytes-baseline.js.gzipBytes};}
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const versions=Object.fromEntries(['react','react-dom','emoji-styles','emoji-styles-data','react-emoji-styles','vite','rollup','esbuild','rollup-plugin-visualizer'].map(name=>[name,lock.packages[`node_modules/${name}`]?.version]));
const report={schemaVersion:1,scope:'One client-side React/Vite production page; JS and CSS bytes, excluding artwork/network transfer, runtime CPU and source maps.',environment:{node:process.version,vite:viteVersion,versions},fixture:{tokens:12,themeSha256:createHash('sha256').update(await readFile(resolve(root,'src/theme.ts'))).digest('hex')},method:{gzip:'gzip level 9 independently per emitted file; sum over files',attribution:'Rollup rendered module bytes before final chunk minification; diagnostic, not additive gzip or exact minified contribution.',settings:{target:'es2020',minify:'esbuild',sourcemap:false}},variants:reports};
assert.equal(reports.length,variants.length);
const byName=Object.fromEntries(reports.map(r=>[r.variant,r]));
assert.equal(Object.keys(versions).length,9,"Every measured dependency must have a lockfile version");assert(byName['single-emoji'].packages['emoji-styles-data']);assert(byName['theme-12'].packages['emoji-styles-data']);assert(!byName['react-only'].packages['emoji-styles-data']);
assert(!byName['theme-12-compiled'].packages['emoji-styles-data'],'The compiled variant must not bundle the catalog');
// Informational: the frozen variants are rebuilt too; report (do not assert) whether they still equal baseline.json.
const frozen=JSON.parse(await readFile(resolve(root,'baseline.json'),'utf8'));
const frozenBaselineMatches=Object.fromEntries(frozenVariants.map(name=>{const was=frozen.variants.find(v=>v.variant===name);const now=byName[name];return [name,was.js.minifiedBytes===now.js.minifiedBytes&&was.js.gzipBytes===now.js.gzipBytes&&was.css.gzipBytes===now.css.gzipBytes];}));
const sha=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const localBuildHashes=Object.fromEntries(await Promise.all(Object.entries(localBuilds).map(async([name,file])=>[name,{file:file.replace(repo,'<repo>'),sha256:await sha(file)}])));
report.prototype={status:'prototype; uses unpublished local workspace builds, not npm 0.1.1',variants:prototypeVariants,localBuilds:localBuildHashes,compiledThemeSha256:await sha(resolve(root,'src/theme.compiled.ts')),frozenBaselineMatches};
await writeFile(resolve(root,'reports/results.json'),JSON.stringify(report,null,2)+'\n');
if(recordPrototype){
 const delta=(from,to)=>({minifiedBytes:byName[to].js.minifiedBytes-byName[from].js.minifiedBytes,gzipBytes:byName[to].js.gzipBytes-byName[from].js.gzipBytes});
 const compiled=byName['theme-12-compiled'];
 await writeFile(resolve(root,'prototype.json'),JSON.stringify({schemaVersion:1,status:report.prototype.status,scope:report.scope,note:'Recorded separately from baseline.json, which freezes the three public 0.1.1 variants. The compiled variant is built from this repository at the time of recording; its two compiled entries are aliased to local dist files (hashes below).',environment:report.environment,method:report.method,localBuilds:localBuildHashes,compiledThemeSha256:report.prototype.compiledThemeSha256,frozenBaselineMatches,variant:compiled,comparison:{vsReactOnly:delta('react-only','theme-12-compiled'),vsSingleEmoji:delta('single-emoji','theme-12-compiled'),vsTheme12:delta('theme-12','theme-12-compiled')},reference:Object.fromEntries(frozenVariants.map(name=>[name,{js:byName[name].js,css:byName[name].css}]))},null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
