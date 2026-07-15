# Provider manifests

Provider manifests make custom emoji packs deterministic and auditable. They map an exact normalized emoji sequence to an asset and record the metadata needed to reproduce, validate, and distribute that pack.

## Minimal manifest

```json
{
  "$schema": "./node_modules/emoji-styles/schemas/emoji-provider.schema.json",
  "id": "company-icons",
  "label": "Company Icons",
  "version": "1.0.0",
  "format": "svg",
  "basePath": "/emoji/company",
  "license": {
    "name": "Proprietary",
    "ownership": "Example Company"
  },
  "assets": {
    "🚀": { "file": "deploy.svg", "width": 24, "height": 24 },
    "✅": { "file": "passed.svg", "width": 24, "height": 24 }
  }
}
```

Asset keys must each be one emoji grapheme. Files must be relative paths and cannot escape `basePath`. Optional SHA-256 checksums let build tooling verify that deployed assets match the reviewed manifest.

```ts
import manifest from "./emoji-provider.json";
import {
  createManifestProvider,
  resolveEmoji,
  validateProviderManifest,
} from "emoji-styles";

const validation = validateProviderManifest(manifest);
if (!validation.valid) throw new Error(validation.errors.join("; "));

const companyIcons = createManifestProvider(manifest, {
  baseUrl: new URL("./emoji/", import.meta.url).href,
  local: true,
});

const result = await resolveEmoji("🚀", {
  provider: companyIcons,
  fallbacks: ["twemoji", "native"],
});
```

## Generated artwork

AI-generated or procedurally generated packs use the same exact mapping, with required provenance:

```json
{
  "generated": true,
  "generator": {
    "type": "ai-image-generation",
    "model": "your-recorded-model-id",
    "createdAt": "2026-07-15T00:00:00Z"
  }
}
```

Use `createGeneratedProvider` to require this declaration at runtime. Record the real model or generator, creation time, and asset ownership; do not copy third-party artwork into a generated pack unless its license permits that use.

## Provider types

- **CDN convention:** derives paths from Unicode metadata. Fast to configure; coverage is unverified unless constrained or supplied explicitly.
- **Local manifest:** exact, self-hosted asset map with verified coverage.
- **Generated custom:** a manifest provider that additionally requires generator provenance.
- **Mapped:** replaces selected emoji with product-owned icons and optionally delegates the rest.
- **Composite:** tries multiple providers in order behind one provider interface.
- **Native:** returns no image URL and deliberately delegates rendering to the current OS/browser.

## Migrating a legacy provider

Existing providers with only `getUrl` remain supported. Adapt them while adding v2 metadata:

```ts
import { adaptLegacyProvider } from "emoji-styles";

const provider = adaptLegacyProvider(legacyProvider, {
  version: "1.0.0",
  format: "png",
  local: false,
  source: "https://assets.example.com/emoji",
});
```

New integrations should implement `resolve()` and return a structured asset. `validateProvider()` reports missing v2 fields without forcing legacy consumers to migrate immediately.

## Security boundary

Runtime validation rejects absolute files, URL-shaped files, backslashes, and `..` path segments inside manifest assets. Treat a remote manifest as untrusted input: validate it, pin its version, host assets on an approved origin, and apply your application's Content Security Policy. A checksum records integrity but does not grant redistribution rights.
