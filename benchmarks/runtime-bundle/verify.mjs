import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
const root=dirname(fileURLToPath(import.meta.url));
for(const variant of ['react-only','single-emoji','theme-12']){
 const server=await createServer({root,configFile:false,logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},resolve:{alias:{'benchmark-app':resolve(root,`src/${variant}.jsx`)}},server:{middlewareMode:true,hmr:false,ws:false},esbuild:{jsx:'automatic'}});
 try{
  const {default:App}=await server.ssrLoadModule(`/src/${variant}.jsx`);
  const html=renderToStaticMarkup(createElement(App));
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(images.length,variant==='react-only'?0:variant==='single-emoji'?1:12);
  for(const image of images){assert.match(image,/https:\/\//);assert.match(image,/alt="[^"]+"/);}
  if(variant==='theme-12'){assert.match(html,/Configuración/);assert.match(html,/Añadir cuenta/);}
  console.log(`PASS ${variant}: real renderer SSR, ${images.length} resolved image(s)`);
 }finally{await server.close();}
}
