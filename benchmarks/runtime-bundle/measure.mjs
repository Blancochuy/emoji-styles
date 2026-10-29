import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from "node:path";
import { gzipSync } from 'node:zlib';
import { build, version as viteVersion } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { repo, root, variantResolve, variants } from "./variants.mjs";
const recordPublished=process.argv.includes("--record-published");
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
const versions=Object.fromEntries(['react','react-dom','emoji-styles','emoji-styles-data','react-emoji-styles','emoji-styles-cli','vite','rollup','esbuild','rollup-plugin-visualizer'].map(name=>[name,lock.packages[`node_modules/${name}`]?.version]));
const report={schemaVersion:1,scope:'One client-side React/Vite production page; JS and CSS bytes, excluding artwork/network transfer, runtime CPU and source maps.',environment:{node:process.version,vite:viteVersion,versions},fixture:{tokens:12,reviewStatus:'Unreviewed historical size fixture; compile uses --allow-draft, never application approval.',themeSha256:createHash('sha256').update(await readFile(resolve(root,'src/theme.ts'))).digest('hex')},method:{gzip:'gzip level 9 independently per emitted file; sum over files',attribution:'Rollup rendered module bytes before final chunk minification; diagnostic, not additive gzip or exact minified contribution.',settings:{target:'es2020',minify:'esbuild',sourcemap:false}},variants:reports};
assert.equal(reports.length,variants.length);
const byName=Object.fromEntries(reports.map(r=>[r.variant,r]));
assert.equal(Object.values(versions).filter(Boolean).length,10,"Every measured dependency must have a lockfile version");assert(byName['single-emoji'].packages['emoji-styles-data']);assert(byName['theme-12'].packages['emoji-styles-data']);assert(!byName['react-only'].packages['emoji-styles-data']);
assert(!byName['theme-12-compiled'].packages['emoji-styles-data'],'The compiled variant must not bundle the catalog');
// Historical records remain immutable: baseline.json (npm 0.1.1), prototype.json (local builds).
const historical=JSON.parse(await readFile(resolve(root,'baseline.json'),'utf8'));
const sha=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
report.distribution={source:'public npm registry; no local library aliases',lockfileSha256:await sha(resolve(root,'package-lock.json')),compiledThemeSha256:await sha(resolve(root,'src/theme.compiled.ts'))};
report.comparison={vsReactOnly:byName['theme-12-compiled'].deltaVsReact,gzipVsHistoricalTheme12:byName['theme-12-compiled'].js.gzipBytes-historical.variants.find(v=>v.variant==='theme-12').js.gzipBytes};
await writeFile(resolve(root,'reports/results.json'),JSON.stringify(report,null,2)+'\n');
if(recordPublished) await writeFile(resolve(root,'published.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
