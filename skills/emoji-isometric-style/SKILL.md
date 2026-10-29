---
name: emoji-isometric-style
description: Create an original isometric emoji set for a web product, in the friendly product-illustration genre seen in ride, travel and delivery apps. Use when the user asks for isometric, 2.5D or "Uber/Airbnb-like" emoji or icons; it turns the request into a measurable visual system, plans generation and reviews small-size legibility.
---

# Isometric Emoji Style

Build a coherent isometric emoji set from an original, measurable visual system.
This skill defines the style and its review; packaging, provenance and app
integration follow `emoji-asset-creator`, which should be installed alongside it.
Run CLI commands from the user's application root and resolve this skill's
files relative to its installed directory. No repository checkout is required.

## Brand references

"Like Uber" or "like Airbnb" describes a genre, not assets to copy. Translate it
into generic traits (true isometric view, simple rounded volumes, flat matte
faces, three-tone lighting, calm palette, one accent) and read
[the isometric system](references/isometric-system.md). Never put a company
name, logo, mascot, typeface, signature color or traced illustration into a
prompt, reference or asset. If the user owns a brand palette, use theirs and
record that they supplied it. Do not claim the result matches a brand's style.

## Setup

Use locally installed CLI **0.3.3+** (`npm install --save-dev emoji-styles-cli@0.3.3`,
check with `npm ls emoji-styles-cli`). Planning and validation never call an image
model or spend credits.

Copy [the spec template](assets/isometric-spec.json) to
`./artwork/isometric/asset-spec.json`. Set `providerId`, replace the example tokens
with the product's tokens, Unicode fallbacks, labels and subjects, and adjust the
palette only through the rules in the system reference. Keep `projection`,
`lighting`, `contrastRule` and `smallSizeRule` unless the user explicitly changes
the direction; they are what keeps the set coherent and legible.

```sh
npx --no-install emoji-styles assets validate-spec ./artwork/isometric/asset-spec.json --json
npx --no-install emoji-styles assets plan ./artwork/isometric/asset-spec.json --variants 1 --json
```

The plan prints one prompt per token and a request count. It is not permission
to generate; agree a finite request budget with the user first.

## Subjects that suit isometric

Objects, places, vehicles, devices, documents and containers read well. Faces,
hands and gestures lose meaning when turned 45 degrees: keep them frontal and say
so in the token subject (the template's `face.smile` shows how). Abstract marks
(check, cross, warning) become a raised symbol on a small isometric tile. Avoid
tokens whose meaning depends on text, numbers or thin lines.

## Anchor, then the set

1. Generate one anchor first, normally a medium-complexity object such as
   `object.package`. Use the planned prompt unchanged, with transparent output.
2. Review it with [the isometric review](references/isometric-review.md) at
   24 and 48 px on white and near-black. The user approves or rejects it; a
   rejection pauses the set instead of triggering automatic retries.
3. Generate the remaining tokens one per request, passing the approved anchor
   as the style reference when the tool supports references. Record when it
   does not.
4. Review every asset with the same checklist. Repair only the failed property
   (for example the projection angle) and keep the rest of the style block.

Record each attempt, prompt, actual tool/model (or an explicit unknown-model
reason), settings, reference and output hashes, as described in
`emoji-asset-creator`. Keep raw outputs separate from packaged runtime images.

## Pack and integrate

Follow `emoji-asset-creator` for `assets inspect`, `assets pack`, the review
sheet, provenance, the compiled theme and runtime integration. Report the
approved anchor, the review decisions, projection exceptions and any token that
did not reach legibility at 24 px.
