import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root=dirname(fileURLToPath(import.meta.url));
export const repo=resolve(root,'../..');
/** Frozen against public npm 0.1.1 packages. Their numbers live in baseline.json and are never rewritten. */
export const frozenVariants=['react-only','single-emoji','theme-12'];
/** Prototype variants use UNPUBLISHED local workspace builds; see README. Recorded in prototype.json. */
export const prototypeVariants=['theme-12-compiled'];
export const variants=[...frozenVariants,...prototypeVariants];
export const localBuilds={'emoji-styles/compiled':resolve(repo,'packages/core/dist/compiled.js'),'react-emoji-styles/compiled':resolve(repo,'packages/react/dist/compiled.js')};
export const cli=resolve(repo,'packages/cli/dist/cli.js');
export function requireLocalBuilds(){for(const file of [...Object.values(localBuilds),cli])if(!existsSync(file))throw new Error(`Missing ${file}. Build the workspace first: pnpm --filter emoji-styles-data build && pnpm --filter emoji-styles build && pnpm --filter @emoji-styles/asset-pipeline build && pnpm --filter emoji-styles-cli build && pnpm --filter react-emoji-styles build`);}
/** Vite `resolve` options. Only prototype variants are pointed at local builds (with one React instance). */
export function variantResolve(variant){
 const alias=[{find:'benchmark-app',replacement:resolve(root,`src/${variant}.jsx`)}];
 if(!prototypeVariants.includes(variant))return {alias};
 requireLocalBuilds();
 return {alias:[...alias,...Object.entries(localBuilds).map(([name,replacement])=>({find:new RegExp(`^${name}$`),replacement}))],dedupe:['react','react-dom']};
}
