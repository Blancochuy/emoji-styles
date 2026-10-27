# Open-source readiness

Assessment of the repository after the generation workflow and demo updates in
PRs #25 and #26, the catalog improvements, and the npm 0.1.1 release.

## Where it provides real utility

The strongest use case is a typed rendering and validation layer for a product's
visual language: keep Unicode or semantic tokens in application code, resolve a
chosen provider, and retain accessible labels and explicit fallbacks. The raster
pipeline packages custom artwork reproducibly. The local MCP server gives agents
structured discovery, resolution, audit results, and asset plans.

The project should be presented around those tasks. An emoji gallery alone does
not establish a reason to adopt another runtime dependency. Likewise, calling an
image model is not sufficient differentiation: consistent small-size artwork,
verifiable packaging, and integration into real interfaces are the useful output.

## Verified scope and limits

| Area | Evidence in the repository | Remaining limit |
| --- | --- | --- |
| Rendering | Core, React, universal web bindings; fallback, SSR and accessibility tests | Provider metadata and a resolved URL cannot prove an upstream image still exists or looks correct |
| Unicode catalog | Pinned Unicode 17 source with checksum; 3,953 records and 1,272 aliases | Dataset coverage is not artwork coverage for every provider |
| Compact data | Full metadata/alias/order equality benchmark; roughly half the previous gzip transfer for the data module | Metadata still expands synchronously at import; no measured browser startup or memory claim |
| Demo catalog | Codepoint/category search, keyboard selection, preview and partial-provider notes; avoids a misleading zero-dependency claim | English labels only; not a multilingual search product |
| Custom artwork | Spec validation, bounded generation plans, alpha/bounds/hash checks and actual-size contact sheets | Visual quality still needs review; technical acceptance is not an aesthetic score |
| Transparency | Frozen native-alpha image outputs pass the raster pipeline without background removal | Capability depends on the generation backend and output; an alpha channel alone is insufficient |
| Image backends | Provider-neutral planning and provenance contracts | No built-in multi-model execution, retries, billing, or backend comparison harness |
| Agents | Local read-only MCP and two source skills with protocol and workflow tests | CLI, MCP and asset pipeline are private workspace packages; checkout/build is required |
| Distribution | Public renderer packages at npm 0.1.1, clean-tarball verification and an independently installed consumer | Future repository changes still require a package release; merges and website deployments do not publish npm versions |
| Quality benchmark | Replayable technical acceptance cases and a frozen visual pilot | Small visual sample; no blinded scoring, repeated generations or evidence of broad model superiority |

The demo's Custom Emoji provider replaces only the robot; other entries delegate
to Fluent 3D and then fallback providers. Its rendered catalog must not be
presented as thousands of original custom assets.

## Next priorities, in order

1. **Validate adoption with outside users.** The standalone
   [Agent Desk example](../examples/agent-status) installs released npm packages
   outside the workspace and exercises a semantic theme, original local assets,
   build-time SSR, and failed-image fallback. Next, have a newcomer reproduce it
   from the README and record friction. It now consumes npm v0.1.1, including
   the compact data; its measured JavaScript gzip transfer is 30.03% smaller
   than the same consumer using v0.1.0. See the
   [consumer release benchmark](../benchmarks/consumer-release/README.md).
2. **Finish agent distribution.** Decide whether to publish supported CLI/MCP
   packages or distribute a versioned plugin. Define compatibility, support and
   upgrade rules first; avoid documenting unavailable `npx` commands.
3. **Expand visual evaluation before quality claims.** Use multiple intents,
   skin tones, thin details and complex silhouettes, repeated generations,
   16/24/32px review on both backgrounds, reviewer rubrics, and cost/latency
   measurements. Keep model provenance and failures, not just favorite outputs.
4. **Add one generation adapter behind a capability contract.** Declare native
   alpha, output formats, reference-image support, dimensions, cost bounds and
   retries. Keep credentials and model calls outside the renderer. Validate
   actual pixels before deciding whether background removal is necessary.
5. **Maintain provider evidence.** Add a scheduled asset-availability sample and
   an explicit supported-provider matrix before promising complete coverage.
   Keep artwork attribution separate from the source-code license.

Do not prioritize more presets or framework wrappers ahead of those gaps. The
existing abstraction is broad enough; usability, distribution and evidence are
more valuable now than adding surface area.

## Reproduce the current checks

See [CONTRIBUTING.md](../CONTRIBUTING.md) for setup. Run `pnpm test`,
`pnpm typecheck`, `pnpm build`, and `pnpm benchmark:catalog`. Before a release,
run `pnpm release:check`, including installation of all public tarballs into a
clean temporary consumer. These checks do not publish packages.

The [catalog benchmark](../benchmarks/catalog/README.md) and
[artwork benchmark](../benchmarks/emoji-quality/README.md) record their scopes
and limitations separately.
