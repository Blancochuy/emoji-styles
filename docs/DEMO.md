# Product demo

The Emoji Styles demo presents the repository as a developer product: create a visual language, encode it as a stable contract, enforce it in source, and inspect the evidence that will ship.

**Live demo:** [emoji-styles.space](https://emoji-styles.space)

## Run locally

From the repository root:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. To verify the production output instead:

```bash
pnpm --filter emoji-styles-demo build
pnpm --filter emoji-styles-demo preview
```

## Product surfaces

| Surface | What it demonstrates | Suggested interaction |
| --- | --- | --- |
| Custom Asset Studio | Codex-assisted original emoji, deterministic normalization, provenance, and local providers | Switch among the four checked-in styles, then open Free Style and edit the art direction |
| Semantic Theme Builder | Stable product intent separated from artwork | Change the token, label, fallback, and provider; copy the generated code |
| Audit Flow | Parser-backed policy and accessibility enforcement | Toggle between Before and Fixed to see deterministic findings disappear |
| Reproducibility View | Inspectable provider, version, license, fallback, dataset, and hash contracts | Compare the same emoji across the provider ledger |
| Provider Explorer | Real renderer output across the Unicode 17 catalog | Search, change size, switch providers, and copy framework-ready code |
| Framework Examples | One resolution core across UI stacks | Switch React, Vue, Svelte, and Angular without changing the visual contract |

## Suggested Build Week walkthrough

Keep the demo under three minutes and lead with the differentiator:

1. Create or select an original Custom Emoji style and explain that Codex produced a validated local provider rather than a loose image.
2. Use Theme Builder to name the product intent once and show the generated typed contract.
3. Open Audit Flow, show the raw emoji finding, then toggle to the compliant semantic-token implementation.
4. Open Reproducibility and point out pinned provider versions, licenses, hashes, fallback behavior, and React/CI evidence.
5. Finish in Provider Explorer and Framework Examples to show consistent output across devices and stacks.

The video narration should explicitly identify where Codex with GPT-5.6 accelerated the asset workflow, API design, audit rules, tests, documentation, and production hardening. The Devpost form separately requires the `/feedback` session ID from the primary Codex task.

## Judge test path

The demo requires no account, API key, sample data, or external asset generation. All showcased custom assets and public-provider metadata are checked into or pinned by the repository. Network-backed provider artwork retains the documented local/native fallback behavior.
