# Catalog representation benchmark

Run `pnpm benchmark:catalog` from a full Git checkout. No network or image model
is used. `--baseline <commit>` can be passed through the script command to select
another historical revision; the default is `6dae5a2`, after PRs #25 and #26.

The script compiles both generated data modules with the installed TypeScript
version to ES2022 CommonJS, executes them in isolated VM contexts, and compares
all 3,953 records, 1,272 aliases, dataset information, and enumeration order.
It fails on differences or if gzip size does not decrease. Results are written
to `results.json`, including the resolved baseline and metadata checksum.

On Node 24.4.1 / TypeScript 5.9.3:

| Generated JavaScript | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Uncompressed | 1,494,353 B | 431,210 B | 71.1% |
| gzip, level 9 | 114,061 B | 57,427 B | 49.7% |
| Brotli, default | 74,593 B | 42,433 B | 43.1% |

This measures the data module, not the complete demo or browser load time.
Compact tuples expand synchronously into the same public metadata objects at
import. The change reduces transfer and source parsing size, but adds expansion
work; it does not establish faster startup or lower runtime heap usage.
