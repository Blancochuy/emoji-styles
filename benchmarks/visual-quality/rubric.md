# Anchored visual rubric

Score each criterion for the exact size/background cell. `null` means uncertain,
not inspected or impossible to assess; record the reason. Ratings are ordinal,
not percentages. Use the same anchors for every style, with fidelity judged
against that style's approved reference rather than preference for 3D or flat art.

| Score | General meaning |
| --- | --- |
| 0 | Fundamentally wrong, absent or unusable |
| 1 | Severe defect; meaning or use is substantially impaired |
| 2 | Recognizable with effort, but an obvious defect remains |
| 3 | Clear and usable at actual size; no meaningful defect |
| 4 | Exceptionally clear and coherent without sacrificing the requested style |

| Criterion | 0–1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Silhouette | Unidentifiable blob, clipped main form or wrong subject | Recognizable only after studying it | Immediately identifiable major forms | Strong recognition with especially clean negative spaces |
| Feature readability | Expression/gesture or critical feature wrong or missing | Critical feature becomes marginal | Required face, finger, shackle, fins or other feature clearly readable | Critical feature remains unambiguous with very economical detail |
| Contrast | Main form disappears against the tested background | Parts merge or require effort | Main contour and meaning-bearing features separate clearly | Strong separation with controlled highlights and no compensating border |
| Edges | Fake background, obvious matte, severe halo or clipping | Visible residue or distracting shadow | Clean contour, restrained attached shadow, no visible residue | Particularly clean antialiasing and controlled translucent edges |
| Composition | Subject cut off, displaced or badly undersized | Unbalanced visual weight or cramped spacing | Balanced optical placement and useful canvas occupancy | Precise balance across shapes, including asymmetrical subjects |
| Style adherence | Material/camera/palette contradict the reference | Noticeable drift | Consistent with the approved style's rules | Highly coherent treatment without losing the individual subject |

Recognition is a separate free-text task, not a score inferred from this table.
Record the original guess, intended subject, correctness adjudication and uncertainty.
A smiling face that was guessed as crying fails recognition even if attractive.

For set consistency, score camera, material, lighting, palette and visual weight
individually using the same 0–4 anchors. A value below 3 or uncertainty in any one
requires an explicit unresolved decision; an average cannot hide a style outlier.

Required evidence for a scored defect: candidate hash/ID, size, background,
criterion, score, observed feature and its effect. Example: “24 px / #171717 /
featureReadability=2: the dragon head joins the tail into one loop; subject becomes
ambiguous.” Never enter sample scores as observed results.
