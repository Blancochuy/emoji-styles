import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build, createServer, version as viteVersion } from 'vite';
const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, '../..');
const localCompiled = resolve(repo, 'packages/web/dist/compiled.js');
assert(existsSync(localCompiled), 'Build the prototype first: pnpm --filter emoji-styles-web build');
const variants = ['web-none', 'web-full', 'web-compiled'];
// Only emoji-styles-web/compiled is local; its core helpers and every other library resolve from npm.
const alias = variant => [
 { find: 'benchmark-web-app', replacement: resolve(root, `src/${variant}.js`) },
 { find: /^emoji-styles-web\/compiled$/, replacement: localCompiled },
 { find: /^emoji-styles\/compiled$/, replacement: resolve(root, 'node_modules/emoji-styles/dist/compiled.js') },
];

// The compiled HTML must point at the same artwork as the published full renderer.
const { parseEmojiTheme } = await import('emoji-styles');
const { renderEmojiTokenToHTMLResult } = await import('emoji-styles-web');
const { compiledEmojiTheme } = await import(pathToFileURL(resolve(repo, 'benchmarks/runtime-bundle/src/theme.compiled.ts')).href);
const theme = parseEmojiTheme(JSON.parse(await readFile(resolve(repo, 'benchmarks/runtime-bundle/src/theme.json'), 'utf8')));
// Use the same aliases as the browser build for SSR parity; a direct Node import here
// would resolve core helpers through the workspace's symlink rather than pinned npm.
const verifier = await createServer({ root, configFile: false, logLevel: 'silent', resolve: { alias: alias('web-compiled') }, server: { middlewareMode: true, hmr: false, ws: false } });
try {
 const { renderCompiledEmojiTokenToHTMLResult } = await verifier.ssrLoadModule(localCompiled);

 for (const token of Object.keys(theme.tokens)) {
  const full = await renderEmojiTokenToHTMLResult(token, theme, { size: 20 });
  const compiled = renderCompiledEmojiTokenToHTMLResult(token, compiledEmojiTheme, { size: 20 });
  assert.equal(compiled.source?.url, full.asset?.url, `${token}: first artwork URL differs`);
  assert.deepEqual(compiled.fallbackUrls, full.fallbackUrls.filter(url => url !== full.asset?.url), `${token}: fallback URLs differ`);
  assert.equal(compiled.label, full.label, `${token}: label differs`);
 }
} finally { await verifier.close(); }
console.log(`PASS web-compiled: ${Object.keys(theme.tokens).length} tokens render the same artwork, fallbacks and labels as emoji-styles-web 0.2.0`);

const reports = [];
for (const variant of variants) {
 const output = await build({ root, configFile: false, logLevel: 'silent', resolve: { alias: alias(variant) }, build: { write: false, minify: 'esbuild', target: 'es2020', sourcemap: false, reportCompressedSize: false } });
 const files = [output].flat().flatMap(result => result.output);
 const chunks = files.filter(item => item.type === 'chunk');
 const ids = chunks.flatMap(chunk => Object.keys(chunk.modules)).map(id => id.replaceAll(repo, '<repo>'));
 const size = type => {
  const emitted = files.filter(item => item.fileName.endsWith(`.${type}`)).map(item => Buffer.from(item.type === 'chunk' ? item.code : item.source));
  return { minifiedBytes: emitted.reduce((sum, bytes) => sum + bytes.length, 0), gzipBytes: emitted.reduce((sum, bytes) => sum + gzipSync(bytes, { level: 9 }).length, 0) };
 };
 reports.push({ variant, js: size('js'), css: size('css'), catalog: ids.some(id => id.includes('emoji-styles-data')), modules: ids.length, localModules: ids.filter(id => id.startsWith('<repo>/packages/')) });
}
const byName = Object.fromEntries(reports.map(report => [report.variant, report]));
assert(!byName['web-none'].catalog && byName['web-full'].catalog, 'Baseline and full-runtime variants must bracket the catalog');
assert(!byName['web-compiled'].catalog, 'The compiled web variant must not bundle the catalog');
const local = byName['web-compiled'].localModules;
assert(local.includes('<repo>/packages/web/dist/compiled.js') && local.every(id => /^<repo>\/packages\/web\/dist\/(?:compiled|chunk-[^/]+)\.js$/.test(id)), `Only the local web compiled entry and its shared chunk may be local: ${local.join(', ')}`);
assert(!reports.some(report => report.variant !== 'web-compiled' && report.localModules.length), 'Published variants must not use local builds');
for (const report of reports) report.deltaVsNone = { minifiedBytes: report.js.minifiedBytes - byName['web-none'].js.minifiedBytes, gzipBytes: report.js.gzipBytes - byName['web-none'].js.gzipBytes };
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const sha = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const result = {
 schemaVersion: 1,
 status: 'prototype; emoji-styles-web/compiled is an unpublished local build, every other library is from npm',
 scope: 'One client-rendered plain-JS Vite page with the 12 tokens of ../runtime-bundle; JS and CSS bytes, excluding artwork/network transfer, runtime CPU and source maps.',
 environment: { node: process.version, vite: viteVersion, versions: Object.fromEntries(['emoji-styles', 'emoji-styles-data', 'emoji-styles-web', 'vite'].map(name => [name, lock.packages[`node_modules/${name}`]?.version])) },
 method: { gzip: 'gzip level 9 independently per emitted file; sum over files', settings: { target: 'es2020', minify: 'esbuild', sourcemap: false } },
 localBuild: { file: 'packages/web/dist/compiled.js', sha256: await sha(localCompiled) },
 variants: reports.map(({ localModules, ...report }) => report),
 comparison: { compiledVsNone: byName['web-compiled'].deltaVsNone, compiledVsFullGzip: byName['web-compiled'].js.gzipBytes - byName['web-full'].js.gzipBytes },
};
await mkdir(resolve(root, 'reports'), { recursive: true });
await writeFile(resolve(root, 'reports/results.json'), JSON.stringify(result, null, 2) + '\n');
if (process.argv.includes('--record')) await writeFile(resolve(root, 'prototype.json'), JSON.stringify(result, null, 2) + '\n');
console.table(reports.map(({ variant, js, css, catalog }) => ({ variant, minifiedJs: js.minifiedBytes, gzipJs: js.gzipBytes, gzipCss: css.gzipBytes, catalog })));
console.log(JSON.stringify(result.comparison));
