# OpenAI Build Week baseline

This document separates the repository state verified at the start of the Build Week hardening plan from work completed afterward. It is an engineering record, not a substitute for the `/feedback` session ID or the project description required by the submission form.

## Snapshot

| Field | Verified value |
| --- | --- |
| Baseline date | 2026-07-15 (America/Monterrey) |
| Baseline commit | `a2c4ea0c474aad0a54ef0081ed4f89e8c77b79a3` |
| Baseline branch | `master` |
| Repository | `https://github.com/Blancochuy/emoji-styles` |
| Earliest commit visible in Git | `4602b0b9b7a9856cb104df8072c6bb7d4a6bc179`, 2026-07-12 01:14:48 UTC |

The Git history available in this clone does not establish an earlier pre-event version. Before submission, the owner must confirm the official event start time and the commit that should be treated as the challenge boundary. Likewise, model and session attribution cannot be inferred from Git: the final submission must use Codex `/feedback` to capture the actual session ID and verify the GPT-5.6 requirement.

## What exists at the baseline

- A pnpm monorepo with a framework-agnostic ESM core, React bindings, a local Twemoji asset package, a Vite demo, asset tooling, and GitHub Actions CI.
- Typed public providers for Fluent Emoji, Noto Emoji, Twemoji, and native Unicode, plus CDN and semantic mapped-provider factories.
- React components and hooks for single emoji, text tokenization, context defaults, fallbacks, lazy loading, and grids.
- A generated catalog of 893 entries and a validated local Twemoji bundle containing 892 PNG assets.
- Licensing boundaries and notices for code and third-party artwork.

The baseline packages are versioned `0.1.0` but deliberately remain `private: true`; none is published to npm.

## Reproducible validation

All commands below were run from a clean checkout of the baseline commit using Node.js 24.4.1 and pnpm 10.13.1.

| Check | Command | Result |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | Pass; pnpm reported ignored build scripts for `esbuild` and `sharp` |
| Unit tests | `pnpm test` | Pass; 33 tests across core, React, assets, and scripts |
| Type checking | `pnpm typecheck` | Pass |
| Production builds | `pnpm build` | Pass |
| Asset integrity | `pnpm assets:check` | Pass; 892 catalog assets validated |
| Clean consumer install | Install the three generated tarballs with React 18.3.1 into an empty npm project | Pass; all public package entry points import successfully |
| Consumer audit | `npm install` in the clean fixture | Pass; 0 reported vulnerabilities |
| Workspace audit | `pnpm audit --prod` | Inconclusive; the registry returned HTTP 410 for pnpm's audit endpoint |

Baseline output sizes:

| Artifact | Uncompressed build output | Packed tarball |
| --- | ---: | ---: |
| `emoji-styles` | 87.33 KB JavaScript; 4.53 KB declarations | 25 KB |
| `react-emoji-styles` | 13.72 KB JavaScript; 2.52 KB declarations | 5.3 KB |
| `emoji-styles-assets-twemoji` | 822 B JavaScript; 404 B declarations | 753 KB, including 892 PNGs |
| Demo | 239.18 KB JavaScript; 29.08 KB CSS | Not packaged |

The package names `emoji-styles`, `react-emoji-styles`, and `emoji-styles-assets-twemoji` returned npm registry `404 Not Found` on the snapshot date. This indicates that they were not published then, but name availability must be checked again immediately before publishing.

## Baseline risks and gaps

### P0 — Unicode sequence coverage

The tokenizer preserves extended grapheme clusters, but the generated metadata and built-in provider path do not cover important multi-codepoint sequences. The generator takes only `entry.unified.split("-")[0]` for the character key and explicitly excludes flags and keycaps. A clean consumer probe produced:

| Sequence | Tokenized as one emoji | Present in catalog | Built-in Twemoji URL |
| --- | --- | --- | --- |
| `😀` | Yes | Yes | Yes |
| `❤️` | Yes | Yes | Yes |
| `👍🏽` | Yes | No | No |
| `👨‍💻` | Yes | No | No |
| `👨‍👩‍👧‍👦` | Yes | No | No |
| `🇲🇽` | Yes | No | No |
| `1️⃣` | Yes | No | No |

This is the first implementation priority because the product promise depends on deterministic rendering of real-world emoji sequences, not only single code points.

### P0 — Publication readiness

- All three packages are private and cannot be published as configured.
- Tarballs install correctly together and workspace dependencies become versioned `0.1.0` dependencies, but the package tarballs contain no package-level README.
- Registry name availability, npm ownership, provenance, release automation, and a dry-run publish still need verification.

### P1 — SSR and strict CSP behavior

- Server rendering does not access the browser globals directly and completes without throwing.
- With default lazy loading, SSR returns only a skeleton and no image. With `lazy={false}`, it returns an image at opacity zero plus the skeleton, so useful no-JavaScript rendering is not yet guaranteed.
- `Emoji` and `EmojiGrid` create `<style>` elements at runtime for skeleton keyframes. Sites with a strict `style-src` policy may reject this unless they allow inline styles or supply a nonce. No CSP-safe stylesheet export exists yet.
- There is no explicit server-render/hydration regression suite.

### P1 — Distribution and maintenance

- The generated catalog is embedded in the core bundle; data cannot yet be installed or updated independently.
- CI validates React 18 and 19, but clean tarball installation and SSR behavior are not CI jobs.
- `pnpm install` requires an explicit project decision for ignored dependency build scripts.
- `demo/src/template:` is an empty tracked file and should be removed during the next cleanup touching the demo.
- A first-party CLI, framework adapters beyond React, MCP integration, and Codex skill are not present at baseline. They are future scope, not baseline regressions.

## Phase 1 acceptance target

The next phase should stay focused on Unicode correctness:

1. Preserve complete normalized codepoint sequences in generated keys and metadata.
2. Add fixtures for skin tones, variation selectors, ZWJ professions and families, flags, and keycaps.
3. Make built-in URL resolution and the local Twemoji manifest agree on supported sequences.
4. Keep grapheme tokenization deterministic and define normalization behavior explicitly.
5. Re-run the complete baseline suite and the clean-consumer probe before starting publication or new adapters.

No package publication, provider expansion, CLI, MCP server, or landing-page redesign belongs in Phase 1 unless it is required to prove this Unicode contract.

## Phase 1 implementation record — Unicode and data correctness

Completed on 2026-07-15 on branch `agent/unicode-data-correctness`:

- Replaced the partial `emoji-datasource` generator with a checksum-pinned parser for the official Unicode Emoji 17.0 `emoji-test.txt` dataset.
- Added `emoji-styles-data` as a separately built package containing 3,953 RGI entries and 1,272 canonical aliases. The generated artifact records Unicode 17.0, Emoji 17.0, CLDR 48, source URL and checksum, source timestamp, and generator version 2.0.0.
- Preserved the existing `emojiData`, `hasEmoji`, `getEmojiData`, and `getEmojiUrl` APIs while adding `normalizeEmoji`, `isRGIEmoji`, and `toEmojiCodepointSequence`.
- Added shared fixtures and regressions for variation selectors, skin tones, ZWJ professions and families, gender variants, regional-indicator flags, keycaps, and tag sequences.
- Corrected Twemoji's filename normalization: VS16 is omitted for ordinary sequences, retained in ZWJ asset IDs, with the documented legacy eye-in-speech-bubble exception.
- Expanded the local Twemoji 15.1 package from 892 partial assets to all 3,782 RGI assets supported by that release, each verified by SHA-256.
- Reduced the framework-agnostic core JavaScript build from 87.33 KB at baseline to 13.03 KB by moving generated metadata out of the core bundle. The separately installable data bundle is 1.51 MB before consumer compression or application-level code splitting.

Phase 1 intentionally does not claim that every Unicode 17 sequence exists in every artwork provider. Explicit provider manifests and coverage reporting remain Phase 2 scope. The demo currently includes the complete metadata bundle and emits Vite's large-chunk warning; lazy data loading is a measured optimization target rather than an unverified claim.

## Phase 2 implementation record — provider protocol v2

Completed on 2026-07-15 on branch `agent/core-provider-v2`:

- Added normalized metadata and structured asynchronous resolution with an inspectable attempt history, explicit unsupported results, ordered fallbacks, and native fallback state.
- Added versioned provider metadata, structured resolved assets, provider validation, coverage reporting, composite providers, and a migration adapter for legacy `getUrl` providers.
- Added exact local manifests with runtime path, checksum, dimension, emoji-key, license, and generated-provenance validation, plus a distributable JSON Schema.
- Added generated custom providers that require the caller to record generator type, model, and timestamp; Emoji Styles does not infer ownership or licensing from generation.
- Generated the local Twemoji support index from its checksum manifest. Coverage is verified at 3,782 of 3,953 Emoji 17 RGI sequences; unsupported Emoji 17 additions now return `null` instead of a path to a missing file.
- Preserved the synchronous v1 API surface so existing integrations can migrate without a package rename or forced rewrite.

The provider protocol deliberately separates convention-based addressability from verified coverage. A CDN formatter may know how a filename would be constructed, while a manifest provider can prove which exact assets were reviewed and shipped.

## Phase 3 implementation record — semantic emoji themes

Completed on 2026-07-15 on branch `agent/semantic-tokens-v1`:

- Added versioned semantic themes so product intent such as `action.deploy` can resolve independently from Unicode characters, provider artwork, or exact custom assets.
- Added accessible default and localized labels, decorative-state metadata, per-token providers, ordered fallbacks, inheritance, deterministic composition, and native Unicode fallback.
- Added `defineEmojiTheme`, `validateEmojiTheme`, `mergeEmojiThemes`, `resolveEmojiToken`, `serializeEmojiTheme`, `parseEmojiTheme`, and schema-v0 migration APIs to the framework-agnostic core.
- Added semantic asset providers for reviewed brand assets or generated artwork. Exact assets retain provider, version, dimensions, checksum, and license metadata without Emoji Styles inferring ownership.
- Added a distributable JSON Schema with schema versioning and runtime-equivalent URL safety constraints.
- Added React theme context, `EmojiToken`, `useEmojiToken`, and `useEmojiTheme`, including registries for loading serialized custom-provider references.
- Updated the demo and documentation to show a semantic product-language workflow useful to both developers and AI agents. The demo uses a bundled custom deploy asset and an accessible Unicode/provider fallback.

Phase 3 establishes the portable semantic contract. Deeper SSR, hydration, strict-CSP, and framework-adapter work remains in later phases rather than being implied by this initial React integration.

## Phase 4 implementation record — universal web support

Completed on 2026-07-15 on branch `agent/universal-web`:

- Added a framework-independent Web Component, deterministic SSR HTML renderer, semantic-token registry, and reversible DOM text transformer.
- Added accessible and decorative states, ordered fallback behavior, resolution events, preload metadata, safe attribute escaping, and project configuration shared with the core policy.
- Added recipes for vanilla HTML, Vue, Svelte, Angular, and Astro without duplicating the core provider resolver.

## Phase 5 implementation record — React SSR and CSP refinement

Completed on 2026-07-15 on branch `agent/react-ssr-csp` and hardened further in `agent/cli-foundation`:

- Migrated React rendering to the structured core resolver while preserving the compatibility API.
- Added complete initial SSR markup, hydration regressions, static package CSS, browser-native image loading, callbacks, reduced-motion behavior, and strict-CSP coverage.
- Kept native OS rendering deterministic in markup and made named or numeric native sizes work without inline style attributes.
- Verified React 18.3.1 and React 19.2.7 independently in CI.

## Phase 6 implementation record — CLI foundation and project policy

Completed on 2026-07-15 on branch `agent/cli-foundation`:

- Added the first-party `emoji-styles` CLI candidate with `init`, `doctor`, `test`, `sync --used-only`, `licenses`, and `provider create`.
- Added one JSON project policy consumed by the CLI, React, universal Web Component, SSR renderer, and semantic themes.
- Added preview-first writes, explicit approval, overwrite protection, safe project paths, MIME and size validation, timeouts, retries, checksums, and structured JSON output.
- Separated ordered provider fallbacks from the explicit terminal `nativeFallback` policy.

## Phase 7 implementation record — source audit and codemods

Implemented on 2026-07-15 on branch `agent/audit-codemods`:

- Added parser-backed auditing for JavaScript, TypeScript, JSX, TSX, and HTML without executing target code.
- Added stable rule IDs and configurable severities for raw semantic emoji, accessibility labels, native rendering in deterministic tests, provider URLs, provider policy, manifests and hashes, license metadata, custom asset bypass, unsupported sequences, and parser errors.
- Added terminal, structured JSON, and SARIF 2.1.0 output with file, line, column, severity, suggestions, and safe fix metadata.
- Added preview-first codemods, unified patch generation, safe/unsafe classification, in-memory parse validation, post-write audit validation, and automatic rollback.
- Automatic writes are intentionally limited to accessible labels on emoji-only JSX and HTML buttons. Semantic migrations remain human-reviewable proposals because token meaning and product wording cannot be inferred deterministically.
- Validation passed across 130 monorepo tests, full type checking and production builds. The packed CLI and its parser dependencies were also installed in a clean npm consumer, where `help`, `init`, and `audit --format json` ran successfully with zero reported npm vulnerabilities.
