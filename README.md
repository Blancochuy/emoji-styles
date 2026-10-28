# Emoji Styles

Give your product a consistent emoji style, with accessible Unicode fallback.

Emoji Styles separates meaning from artwork. Keep `🚀` or a semantic token such
as `action.deploy` in your application, then resolve it through an open provider
or your own images. Change the visual language without rewriting product copy.

[Live demo](https://emoji-styles.space) · [Custom-pack quickstart](./docs/QUICKSTART.md) · [Full guide and API](./docs/GUIDE.md) · [Contributing](./CONTRIBUTING.md)

## Start with your own images

The strongest workflow is simple:

**Your transparent images → normalized assets → a portable provider pack → your UI.**

The CLI checks file format, alpha, bounds, mappings and hashes, then packages the
images with a manifest and provenance. React and universal web bindings render
them with accessible labels and a fallback when artwork is unavailable.

Follow the [one-page custom-pack quickstart](./docs/QUICKSTART.md). It covers
initialization, packaging, actual-size review and a React integration. No image
model, API key or generation credits are required for existing artwork.

**Current release note:** CLI and MCP `0.1.0` are published. Registry CLI `0.1.0`
has a confirmed packaging defect: `assets build` writes a manifest but omits image
copies. This source revision fixes that and adds `assets init`; use the verified
source tarball in the quickstart until the CLI patch release is published.

## Use an existing provider

```sh
npm install react-emoji-styles
```

```tsx
import { Emoji, publicProviders } from "react-emoji-styles";
import "react-emoji-styles/styles.css";

export function Launch() {
  return <Emoji emoji="🚀" provider={publicProviders.fluent3d} label="Launch" size={32} />;
}
```

Choose Fluent, Noto, Twemoji, SerenityOS pixel art, local assets or native Unicode.
Coverage and licenses vary by provider; see the [provider guide](./docs/GUIDE.md#providers).

## For coding agents

The published [CLI](./docs/CLI.md) and [local MCP server](./docs/MCP.md) expose
structured resolution, audits, asset validation and generation plans. Repository
skills guide integration and original artwork creation. Read [AGENTS.md](./AGENTS.md)
and the [skills guide](./docs/SKILLS.md).

Image generation runs through the agent's available tool. The renderer and
asset pipeline do not execute image models or charge for generation. Technical
validation does not establish visual quality: review legibility, meaning and style
at interface sizes before accepting artwork.

## Explore further

- [Custom assets and provenance](./docs/CUSTOM_ASSETS.md)
- [Semantic tokens](./docs/SEMANTIC_TOKENS.md)
- [Universal web integration](./docs/WEB.md)
- [CLI commands and Studio](./docs/CLI.md)
- [Standalone consumer example](./examples/agent-status)
- [Architecture, scope and known limits](./docs/READINESS.md)
- [Demo walkthrough](./docs/DEMO.md)

## Develop

Node.js 18+ and pnpm 10 are required; native image dependencies must be enabled.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

Source code is [MIT](./LICENSE). Artwork has separate terms; see the
[asset licensing policy](./docs/LICENSE_POLICY.md). Contributions should start
with a reproducible use case or bug report and follow [CONTRIBUTING.md](./CONTRIBUTING.md).
