import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(root, '../..');
export const variants = ['react-only', 'single-emoji', 'theme-12', 'theme-12-compiled'];
export const cli = resolve(root, 'node_modules/emoji-styles-cli/dist/cli.js');
// Only the application entry varies. Every library entry resolves from npm.
export function variantResolve(variant) {
  return { alias: [{ find: 'benchmark-app', replacement: resolve(root, `src/${variant}.jsx`) }] };
}
