# Candidate review and bounded iteration

Use this record when selecting an anchor, evaluating a pack, or comparing prompt
changes. Keep it next to review artifacts, outside the runtime asset directory.

For each candidate, record:

- token, Unicode fallback, candidate ID, exact prompt and spec SHA-256;
- generator provider, model (null plus a reason when not exposed), effective
  settings, reference SHA-256 values, and raw/normalized SHA-256;
- technical validation result and warnings, original dimensions, normalization;
- reviewer identity/method, actual sizes inspected, backgrounds, and evidence;
- decision `accept`, `revise`, or `uncertain`, with a concrete reason.

Assess these criteria separately using `pass`, `fail`, or `uncertain`:

| Criterion | Evidence to inspect |
| --- | --- |
| Meaning | The primary subject expresses the requested token without its filename |
| Silhouette | Subject and meaning-bearing features remain distinguishable at 24 px |
| Contrast | Major forms separate from light and dark backgrounds |
| Style | Camera, materials, light, palette, and visual weight agree with the anchor |
| Edges | No halo, matte residue, fake checkerboard, clipped contour, or detached shadow |
| Composition | Safe area and optical balance work at actual display sizes |

Accept only after technical errors are resolved and required visual criteria
pass. Record intentional exceptions as exceptions; do not silently relabel a
failure as a pass. A vision model may assist, but record its uncertainty and do
not describe its judgment as an independent human review.

For a revision, name the failed property and preserve all other style rules.
Examples: enlarge a meaning-bearing feature, merge decorative scales into a
broad surface, separate overlapping limbs, or repair one matte edge. Do not add
unrequested colors or change the subject to improve a score.

Keep one initial attempt by default. Additional candidates or corrections must
fit the user's authorized budget; agree on a finite cap for larger runs. Save
state after each attempt so an interrupted session can resume without repeating
accepted work. Preserve a working runtime asset until a replacement passes.

## Comparing versions

Use the same subjects, style constraints, generator, call settings, normalization,
attempt count, review sizes, and backgrounds for both versions. Freeze prompts
before looking at outputs. If seeds are unavailable, record null. Preserve all
attempts; do not cherry-pick the new condition's best result against the old
condition's first result.

For stronger evidence, randomize the displayed condition labels, collect more
subjects and multiple runs, and have independent reviewers compare them.
Keep technical acceptance counts separate from visual preferences. Small,
unblinded comparisons are exploratory evidence, not a percentage quality gain.
