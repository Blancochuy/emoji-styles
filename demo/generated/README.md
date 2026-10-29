# Compiled demo assets

`demo-theme.compiled.ts` is generated from `../src/compiled/demo-theme.json`.
Its resolved URLs, Unicode fallbacks and provider/license metadata are compiler
output, rather than direct provider usage written in UI source.

The repository's emoji audit scans `demo/src`. Keep generated runtime data here;
keep hand-written components under `src` so they remain audited. Do not add
hand-written rendering code to this directory.

`demo/src/Showcase.test.tsx` recompiles the source theme and requires an exact
match with this module. A changed or stale generated artifact fails that test.
The normal demo build and TypeScript check also include this imported module.

Regenerate from the repository root with the built CLI:

```sh
node packages/cli/dist/cli.js theme compile demo/src/compiled/demo-theme.json --output demo/generated/demo-theme.compiled.ts --yes --force
node packages/cli/dist/cli.js theme compile demo/src/compiled/demo-theme.json --output demo/generated/demo-theme.compiled.ts --check
```
