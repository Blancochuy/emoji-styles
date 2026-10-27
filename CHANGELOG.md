# Changelog

## 0.1.1

- Compact the generated Unicode data representation while preserving all public
  metadata fields, enumeration order, 3,953 records and 1,272 normalization aliases.
- The replayable data-module benchmark measures 114,061 → 57,427 bytes with gzip
  (49.7% smaller). This measures the module, not browser startup or runtime memory.
- Publish the five public packages together so their internal dependencies select
  the compact dataset. Core, React, web and Twemoji APIs are unchanged.

Repository improvements accompanying this release include the searchable demo
catalog, the standalone Agent Desk consumer and its SSR/browser checks, and
stronger custom-artwork planning/validation. CLI, MCP and the asset pipeline remain
private workspace tools; they are not new npm products in this release.

## 0.1.0

Initial public packages: Unicode data, core resolution and semantic themes,
React bindings, universal web bindings, and self-hosted Twemoji assets.
