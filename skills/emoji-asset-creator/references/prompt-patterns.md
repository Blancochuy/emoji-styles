# Prompt patterns

Generate one standalone asset per request. Adapt the subject and meaning while keeping the approved visual-system block unchanged.

```text
Create one standalone custom emoji asset representing “successful deployment”.

Semantic subject:
- a launching rocket that communicates a completed software deployment;
- strong recognizable silhouette at 24 px and 48 px.

Match the approved visual system:
- clean gothic 3D iconography;
- matte black and dark silver materials;
- one subtle purple accent;
- soft upper-left lighting;
- front three-quarter perspective;
- centered composition within a 76% safe area;
- medium detail;
- transparent background.

Exclude:
- text or letters;
- logos or trademarks;
- borders, badges, plates, or frames;
- extra objects;
- shadow outside the object;
- background color, scene, gradient, or checkerboard.

Return exactly one isolated asset.
```

## Anchor selection

Choose a token with medium complexity, recognizable silhouette, and representative materials. Avoid the simplest dot/checkmark or the most complex multi-character scene.

## Reference use

Describe measurable properties—camera, light direction, palette, material, edge treatment, safe area—rather than requesting imitation of a named proprietary emoji vendor. Supply only authorized, non-sensitive references.

## Free style

Accept an open natural-language art direction as the source of truth. Convert evocative terms into a stable visual-system block while keeping the user's unusual or distinctive choices. Presets may be offered as examples, but never require the user to select one.

Keep only the emoji constraints fixed: exactly one primary subject, immediate recognition at 24 px, a strong silhouette, transparent background, no text or logos, and enough repeatable rules to expand the anchor into a coherent set.

## Iteration

Change one failed property at a time. Preserve the approved style block. If the subject is unreadable at 24 px, simplify its silhouette rather than increasing micro-detail.

## Small-size prompt block

The shared `assets plan` prompts preserve the visual-system block and add:

```text
Design for recognition at 24px first, then 48px: strong outer silhouette,
distinct major forms, clear negative spaces. Merge nonessential micro-detail
into broad shapes. Keep meaning-bearing features; do not change the requested
subject or art direction. Separate the silhouette from both white and near-black
UI backgrounds using the requested materials and lighting.
```

This is a design instruction, not an automatic guarantee. Compare the output at
actual size using the review protocol. When editing, identify the target image,
the one failed property, and the invariants to preserve. When supplying an anchor,
identify it as a style reference and record whether the generator actually
supports reference conditioning.
