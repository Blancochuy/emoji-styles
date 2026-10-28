import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build, version as viteVersion } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
const root=dirname(fileURLToPath(import.meta.url));
const variants=['react-only','single-emoji','theme-12'];
const reports=[];
await mkdir(resolve(root,'reports'),{recursive:true});
for(const variant of variants){
 const outDir=resolve(root,'dist',variant);
 const moduleRecords=[];
 await build({root,configFile:false,logLevel:'warn',resolve:{alias:{'benchmark-app':resolve(root,`src/${variant}.jsx`)}},esbuild:{jsx:'automatic'},build:{outDir,emptyOutDir:true,minify:'esbuild',target:'es2020',sourcemap:false,reportCompressedSize:false,rollupOptions:{plugins:[
  {name:'module-inventory',generateBundle(_options,bundle){for(const chunk of Object.values(bundle)){if(chunk.type!=='chunk')continue;for(const [id,info] of Object.entries(chunk.modules))moduleRecords.push({id:id.replaceAll(root,'<fixture>'),renderedBytes:info.renderedLength,originalBytes:info.originalLength,chunk:chunk.fileName});}}},
  visualizer({filename:resolve(root,`reports/${variant}.html`),template:'treemap',gzipSize:false,brotliSize:false,open:false}),
  visualizer({filename:resolve(root,`reports/${variant}.json`),template:'raw-data',gzipSize:false,brotliSize:false,open:false}),
 ]}}});
 const assets=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(?:js|css|html)$/.test(entry.name)){const bytes=await readFile(path);assets.push({file:path.slice(outDir.length+1),type:entry.name.split('.').at(-1),minifiedBytes:bytes.length,gzipBytes:gzipSync(bytes,{level:9}).length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
 await walk(outDir);
 const packages={};
 for(const record of moduleRecords){const match=record.id.match(/node_modules\/(\@[^/]+\/[^/]+|[^/]+)/);const name=match?.[1]??'application / bundler runtime';packages[name]??={renderedBytes:0,modules:0};packages[name].renderedBytes+=record.renderedBytes;packages[name].modules++;}
 const js=assets.filter(a=>a.type==='js');const css=assets.filter(a=>a.type==='css');
 reports.push({variant,js:{minifiedBytes:js.reduce((s,a)=>s+a.minifiedBytes,0),gzipBytes:js.reduce((s,a)=>s+a.gzipBytes,0)},css:{minifiedBytes:css.reduce((s,a)=>s+a.minifiedBytes,0),gzipBytes:css.reduce((s,a)=>s+a.gzipBytes,0)},packages,assets});
 await writeFile(resolve(root,`reports/${variant}-modules.json`),JSON.stringify(moduleRecords,null,2)+'\n');
}
const baseline=reports[0];
for(const report of reports){report.deltaVsReact={minifiedBytes:report.js.minifiedBytes-baseline.js.minifiedBytes,gzipBytes:report.js.gzipBytes-baseline.js.gzipBytes};}
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const versions=Object.fromEntries(['react','react-dom','emoji-styles','emoji-styles-data','react-emoji-styles','vite','rollup','esbuild','rollup-plugin-visualizer'].map(name=>[name,lock.packages[`node_modules/${name}`]?.version]));
const report={schemaVersion:1,scope:'One client-side React/Vite production page; JS and CSS bytes, excluding artwork/network transfer, runtime CPU and source maps.',environment:{node:process.version,vite:viteVersion,versions},fixture:{tokens:12,themeSha256:createHash('sha256').update(await readFile(resolve(root,'src/theme.ts'))).digest('hex')},method:{gzip:'gzip level 9 independently per emitted file; sum over files',attribution:'Rollup rendered module bytes before final chunk minification; diagnostic, not additive gzip or exact minified contribution.',settings:{target:'es2020',minify:'esbuild',sourcemap:false}},variants:reports};
assert.equal(reports.length,3);
assert.equal(Object.keys(versions).length,9,"Every measured dependency must have a lockfile version");assert(reports[1].packages['emoji-styles-data']);assert(reports[2].packages['emoji-styles-data']);assert(!reports[0].packages['emoji-styles-data']);
await writeFile(resolve(root,'reports/results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
