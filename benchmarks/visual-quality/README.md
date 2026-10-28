# Visual quality study v1

Status: prepared protocol, no generated candidates, no ratings, no generation
permission. User direction: compare multiple original styles and both interface
and chat sizes, including 24 px. This is the next step after the two-subject
[exploratory pilot](../emoji-quality/README.md), not a replacement of its history.

## Question and scope

Does a shape-hierarchy prompt treatment improve small-size recognition and visual
acceptance compared with the current planner, across the same subjects and styles?

Compare prompts using the same generation backend and effective settings. This
is not a comparison of models, complete skills, best-of-N selection strategies,
or all possible art directions. The challenger is a hypothesis, not an established
improvement. Three original style profiles represent rounded matte 3D, bold flat
color and dark graphite 3D; they are proposed reference systems, not copies of
vendor artwork. Review their actual anchors before accepting a style as locked.

## Preparation (zero generation)

```sh
pnpm install --frozen-lockfile
pnpm benchmark:visual-plan pilot
pnpm benchmark:visual-plan expanded
```

The preparer copies the protocol, exact prompts, hashes and an unreviewed template
into `.visual-study/`. It calls the deterministic planner, never an image tool or
network API. Existing frozen folders are not overwritten. Generated plans contain
condition labels and expected subjects; they are operator material and must not
be given to blind reviewers. Ignore rules prevent accidentally committing live
study outputs. Keep the authoritative study archive in an agreed durable location.

`protocol.json` pins the current planner to commit `0428cf5` and its source hash.
Preparation stops if its source changes. In both arms the same subject and style
are passed to that planner. Baseline uses its exact prompt. Challenger appends the
literal `shape-hierarchy-v1` block. Freeze this before any outputs are viewed;
changing prompts requires a new protocol ID/revision and an explicitly separate run.

## Cases and proposed request ceiling

Twelve cases span two faces, two hands, four objects, two symbols and two complex
organic silhouettes. Case-specific identifying features, acceptable recognition
labels and likely confusions are registered in `protocol.json` before review.
Do not use filenames or the Unicode fallback as visual evidence of recognition.

| Stage | Cases | Styles | Arms | Independent attempts/cell | Comparison images | Anchor request cap | Proposed total cap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pilot | 4 | 3 | 2 | 1 | 24 | 3 | 27 |
| Expanded | 12 | 3 | 2 | 2 | 144 | 3 | 147 |

Pilot cases are happy face, thumbs up, rocket and full-body dragon. Expanded is a
fresh run, not the pilot's best outputs plus extra cases. If both are authorized
independently with new anchors, the combined proposed maximum is 174 requests.
If the same approved, hashed anchors are reused, record this and avoid charging
for them twice. None of these counts is authorization, a price quote or a promise
that an anchor will pass. No repairs or extra anchor attempts are included.

## Decisions required before generation

1. Select the backend/tool, exposed model version, supported resolution, quality,
   transparency and reference capabilities. Record unavailable settings as null
   with a reason. Never infer the underlying model from a tool's name.
2. Confirm the style descriptions and approve one representative rocket anchor
   per style. Limit each to the authorized attempt cap; a rejected anchor pauses
   that style, rather than triggering automatic retries or dropping it from results.
3. Approve a request ceiling and, when available, a monetary ceiling/currency.
   The exact rate must be verified at execution time. If a tool exposes no price,
   use an explicit request cap and record actual cost as unknown.
4. Freeze the prepared manifest, effective settings, software/normalization
   versions, reference hashes, run ID and execution order. For reference-capable
   tools both arms use the *same* anchor; with no reference support, neither arm
   gets a visual reference. Disclose the resulting consistency limitation.
5. Prepare the blind review export at 24/32/48/64 px and validate that the output
   really uses those sizes. The current built-in `--review` contact sheet renders
   24/48/96 px and is insufficient by itself for this full protocol. A dedicated
   review export is an execution prerequisite; this delivery does not claim it exists.

No additional image, brand reference, API key or third-party dataset is needed
for protocol preparation. Generation authorization, tool choice and reviewers
are the outstanding inputs for the execution stage.

## Execution controls

- Hold backend, effective settings, style, subject, reference, normalization and
  request count constant within a paired comparison. Request native alpha when
  supported and inspect actual pixels. Do not apply background removal to real alpha.
- Randomize block order by style/case/replicate and randomize arm order within
  each block using a recorded shuffle seed. The preparer's task order is not a
  randomized execution schedule. Run paired requests close together to limit drift.
- Do not claim deterministic seeds when a provider does not expose them. If model
  identity changes during a run, stop and report a separate stratum or restart
  explicitly; never quietly merge it into the original comparison.
- Exactly one subject per request. Preserve every returned image, failure,
  refusal, tool error and charged attempt. No cherry-picking, best-of-N, silent
  replacements or extra cleanup for only one arm.
- A transport retry that the provider cannot prove uncharged counts against the
  budget. On exhaustion or uncertainty, stop and retain the partial run. Save after
  each request; resuming must not repeat already-returned outputs.
- Save raw files outside runtime assets and normalize both arms identically to
  256 px lossless WebP with safe area 0.76. Preserve all source and output hashes.
  Save technical errors separately; they must not disappear through selective filtering.

## Review order and blinding

The operator stores the condition key, prompt, expected label and provenance
separately. Assign opaque candidate IDs and independently randomize each reviewer's
order and each pair's left/right placement. Record the seed and assignment key;
reviewers must not receive it or sidecar files that disclose the condition. Strip
subject names, fallback glyphs, metadata and semantic filenames from review views.
Do not tell reviewers which side is the proposed improvement.

Target two independent human reviewers. A vision-capable agent can provide a
separate assisted assessment with its model/method recorded, never a fabricated
human vote. A single author/assistant review is exploratory and must be labeled so.

1. **Unlabeled recognition:** show isolated candidates at 24 px on both backgrounds
   at actual pixel size, without side-by-side duplicates. Record the reviewer's
   free-text guess and uncertainty before showing larger images. Repeat at 48 px
   in a separate randomized pass. Record which background was seen first; repeated
   views of one image are repeated measures, not independent recognition samples. Determine correctness using the preregistered
   subject labels and confusions, retaining the original guesses. Don't demand
   that a rocket visually communicates a software-specific action such as deployment.
   Device display scaling, browser zoom and familiarity are recorded. A reviewer
   who already learned the subject from a larger view cannot supply a naive 24 px trial.
2. **Labeled visual assessment:** reveal intended subject and approved style anchor,
   retaining hidden condition. Review all eight size/background cells and full
   resolution for edge diagnosis. Score each criterion per cell and cite defects.
   Zooming in is allowed for diagnosis, not evidence of readability at 24 px.
3. **Paired preference:** compare corresponding candidates with randomized sides
   at 24 and 48 px. Record left/right/tie/uncertain, a concrete reason and whether
   both are unacceptable. Do not infer preference from technical validity alone.
4. **Set consistency:** review each anonymous condition's complete style set
   together. Score camera, material, light, palette and visual weight against the
   same anchor. Evaluate this separately from an isolated asset's quality.

## Rubric and acceptance

Use the anchored rubric in [rubric.md](rubric.md). Ratings are 0–4 or null for
uncertain/not evaluated, never invented defaults. Record size and background
alongside each score. There is no aggregate score that can hide a hard failure.

An asset is **accept** only when technical validation has no errors, the 24/48 px
recognition trials are correct on both backgrounds, every required visual criterion
is at least 3 in all reviewed cells, and style-set consistency passes. Missing or
uncertain evidence means **uncertain**; a concrete failed requirement means
**revise**. Record warnings, reviewer disagreements and intentional exceptions.
An exception is not a pass in the primary acceptance count.

Do not silently adjudicate away disagreements. Keep each reviewer's scores and
report their agreement. A subsequent explicit adjudication is a separate record.
If a second independent recognition pass cannot be obtained, do not claim the
full human-review gate was met. For pilot-only evidence, set consistency refers
to the four pilot subjects and does not establish coherence of a 12-asset pack.

## Analysis and stop/go

Report per subject, style, arm and replicate, using pairs as the comparison unit.
Primary outcome: recognition at 24 px on each background. Secondary outcomes:
48 px recognition, visual acceptance, paired preference including ties/both-bad,
set consistency, initial failures, attempts, latency and cost when actually exposed.
Do not treat eight review cells or two reviewers as independent generated samples.

Include all planned cells in the generation-success/technical-acceptance denominators.
Show recognition on all assigned attempts (failed/missing generations separately)
and on available outputs; never present only technically passing images as the
whole result. Publish counts and paired differences, with actual denominators.
A pilot with one image per cell cannot establish a reliable overall quality gain.
For inferential statistics, define the paired/clustered analysis and uncertainty
before the expanded run; do not attach an invented percentage or significance.

The pilot is a feasibility gate: confirm transparent delivery, successful blind
exports, complete metadata and usable independent reviews. For each style, inspect
all four pairs. Any new critical anatomy/meaning/alpha defect in the challenger,
or lower 24 px recognition on either background, blocks promoting it unchanged.
No regression and directional improvement allow considering the expanded run,
not declaring the challenger the winner. A tie or insufficient evidence remains
inconclusive. If prompts are changed after the pilot, create a new challenger ID;
the pilot becomes exploratory development evidence for that new run.

## Records

[records.template.json](records.template.json) lists the run, attempt, review,
paired-preference and collection-review fields. It is a blank template, not
evidence. Copy a row per real attempt and per scored cell; unknown model/cost
fields need a reason. Never replace null with a guessed model, zero cost or a pass.
Keep the blind assignment key separate from reviewer-facing files.

## Repairs and integration

Repairs are a separate, newly budgeted experiment. Specify one defect, preserve
style invariants, record parent hashes and edit settings, and re-run technical and
visual checks. Never replace first-attempt candidates in the primary comparison.

Only after evidence supports a change should the skill/prompts or generation
adapter be updated. Runtime/demo assets are not replaced by this protocol.
Archive the run's full records and review key, keeping credentials absent and
artwork rights/provenance explicit. Repository MIT licensing does not itself
settle generated-artwork ownership.
