# Consumer release benchmark

The same Agent Desk source was built with the published npm packages at 0.1.0
and 0.1.1. No workspace alias or local tarball is used for the recorded after
measurement. Node 24.4.1 and Vite 8.3.5 were used for both builds.

| Emitted JavaScript | npm 0.1.0 | npm 0.1.1 | Reduction |
| --- | ---: | ---: | ---: |
| Raw bytes | 1,519,340 | 614,590 | 59.55% |
| gzip, level 9 | 183,017 | 128,061 | 30.03% |

`results.json` contains the baseline source commit, output filenames and source
checksums. Only the installed Emoji Styles package versions changed between
builds; the app, assets, React and build tool versions stayed the same. The new
Unicode data representation accounts for the reduction.

## Reproduce

Copy `examples/agent-status` outside the workspace, install its lockfile with
`npm ci`, then build each variant:

```sh
npm install --save-exact emoji-styles@0.1.0 react-emoji-styles@0.1.0
npm run build
# Run the measurement below and keep its output before rebuilding.
npm install --save-exact emoji-styles@0.1.1 react-emoji-styles@0.1.1
npm run build
# Run the same measurement, then npm test for the current pinned version.
```

Run this from the consumer directory after each build:

```sh
node --input-type=module <<'JS'
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const files = readdirSync('dist/assets').filter(file => file.endsWith('.js'));
const result = files.map(file => {
  const data = readFileSync(`dist/assets/${file}`);
  return { file, bytes: data.length, gzip: gzipSync(data, { level: 9 }).length };
});
console.log(result);
console.log(result.reduce((total, file) => ({
  bytes: total.bytes + file.bytes, gzip: total.gzip + file.gzip,
}), { bytes: 0, gzip: 0 }));
JS
```

The gzip total sums individually compressed JavaScript files. It excludes CSS,
HTML and artwork; host compression settings can differ. Vite's displayed gzip
estimate uses its own defaults. This comparison does not measure startup time,
runtime memory, artwork quality, or a general speedup. The 500 kB chunk warning
remains visible. Consumer SSR and desktop/mobile image-fallback checks are run
separately in `.github/workflows/consumer-example.yml`.
