import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer, build } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { cli, prototypeVariants, requireLocalBuilds, root, variantResolve, variants } from './variants.mjs';
const expectedImages={'react-only':0,'single-emoji':1,'theme-12':12,'theme-12-compiled':12};
const rendered={};
for(const variant of variants){
 const server=await createServer({root,configFile:false,logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},resolve:variantResolve(variant),server:{middlewareMode:true,hmr:false,ws:false},esbuild:{jsx:'automatic'}});
 try{
  const {default:App}=await server.ssrLoadModule(`/src/${variant}.jsx`);
  const html=renderToStaticMarkup(createElement(App));
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(images.length,expectedImages[variant]);
  for(const image of images){assert.match(image,/https:\/\//);assert.match(image,/alt="[^"]+"/);}
  if(variant.startsWith('theme-12')){assert.match(html,/Configuración/);assert.match(html,/Añadir cuenta/);}
  rendered[variant]=images.map(image=>image.match(/src="([^"]+)"/)[1]);
  console.log(`PASS ${variant}: real renderer SSR, ${images.length} resolved image(s)`);
 }finally{await server.close();}
}
// The prototype resolves the same artwork URLs as the public 0.1.1 resolver for this theme (informational equality, asserted here).
assert.deepEqual(rendered['theme-12-compiled'],rendered['theme-12']);
console.log('PASS theme-12-compiled: image URLs equal those of the 0.1.1 resolver (theme-12)');

for(const variant of prototypeVariants){
 requireLocalBuilds();
 // Staleness guard: the committed compiled theme must be what `theme compile` produces now.
 const check=spawnSync(process.execPath,[cli,'theme','compile','src/theme.ts','--output','src/theme.compiled.ts','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(check.status,0,`src/theme.compiled.ts is stale or uncompilable:\n${check.stdout}${check.stderr}`);
 console.log('PASS theme-12-compiled: src/theme.compiled.ts is up to date (theme compile --check)');
 // Module inventory from a real production build, in memory.
 const output=await build({root,configFile:false,logLevel:'silent',resolve:variantResolve(variant),esbuild:{jsx:'automatic'},build:{write:false,minify:'esbuild',target:'es2020',sourcemap:false,reportCompressedSize:false}});
 const chunks=[output].flat().flatMap(result=>result.output).filter(item=>item.type==='chunk');
 const ids=chunks.flatMap(chunk=>Object.keys(chunk.modules));
 assert(ids.length>0);
 const forbidden=ids.filter(id=>!id.endsWith(".css")&&/emoji-styles-data|tokenize|\/packages\/core\/dist\/index\.js|\/node_modules\/emoji-styles\/|\/packages\/react\/dist\/index\.js|\/node_modules\/react-emoji-styles\//.test(id));
 assert.deepEqual(forbidden,[],`The catalog, tokenizer or full runtime reached the ${variant} bundle`);
 assert(ids.some(id=>id.endsWith('/packages/react/dist/compiled.js')),'react compiled entry missing from the bundle');
 assert(ids.some(id=>/\/packages\/core\/dist\/(?:compiled|chunk-[^/]+)\.js$/.test(id)),'core compiled entry missing from the bundle');
 assert(!ids.some(id=>id.includes('/packages/react/node_modules/')),'A second React copy was bundled');
 assert(!chunks.some(chunk=>/Grinning face/.test(chunk.code)),'Catalog strings found in emitted JS');
 console.log(`PASS ${variant}: Rollup inventory (${ids.length} modules) has no emoji-styles-data, tokenizer, core root or full React bindings`);
}
