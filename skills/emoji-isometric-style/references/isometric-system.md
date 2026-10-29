# Isometric visual system

The template in `assets/isometric-spec.json` encodes one original direction:
friendly product isometric. Every rule below is a field in its `style` block, so
the planned prompts carry it to the generator unchanged.

## From a brand reference to traits

When a user names a company, keep the traits and drop the identity.

| Usually meant | Encode as | Never use |
| --- | --- | --- |
| "isometric like ride or travel apps" | true isometric view, 45 degree turn, no perspective | the company's illustrations as references |
| "clean and friendly" | 3 to 6 rounded volumes, soft corners, no texture | mascots or characters |
| "brand colors" | the user's own palette, or the template palette | signature brand colors the user does not own |
| "premium" | restrained palette, one accent, generous safe area | logos, wordmarks or typefaces |

Record in the final report that the direction is original and genre-inspired.

## Geometry

- **Projection:** true isometric. Vertical edges stay vertical; receding edges run
  at 30 degrees left and right. Pixel-aligned 2:1 dimetric (about 26.6 degrees)
  is an acceptable alternative for crisp pixel art, but pick one for the whole set.
- **Turn:** the object rotates 45 degrees about its vertical axis so the top face
  and two side faces show. Every asset uses the same turn and elevation.
- **Volumes:** 3 to 6 primary blocks, cylinders, prisms or rounded spheres. Corner
  rounding of about 6% of the object width. No hairline struts or spikes.
- **Ground:** no floor plane, platform or contact shadow. Emoji sit inline in text
  and on both light and dark UI, where a floor reads as a separate object.

## Light and color

- **Three-tone model:** top face lightest, left face mid tone, right face darkest,
  all derived from one hue by lightness steps. This light never changes direction.
- **Palette:** the template uses warm sand, sage, dusty blue and slate, with a
  tangerine accent. Replace it with the user's palette when they own one; keep
  four base hues or fewer and exactly one accent.
- **Accent:** only on the meaning-bearing part (the flame, the door, the tape).
- **Contrast:** the darkest face stays above about 30% lightness and the lightest
  top face below about 94%, so the silhouette separates from near-black and white
  backgrounds. Dark materials on dark UI were the main legibility failure in this
  project's visual study; do not trade this rule for a moodier palette.

## Variants

Change these fields together and keep the rest:

- **Flat isometric (default):** flat matte fills, optional 8% gradient in one face.
- **Soft 3D isometric:** `materials` becomes "soft matte clay with gentle ambient
  occlusion in inner corners"; keep the three-tone model readable underneath and
  keep the no-ground rule.

## Exceptions

`projectionExceptions` keeps faces, hands and gestures frontal so eyes, mouths and
fingers stay readable. State the exception in each affected token subject and
review those tokens against the rest of the set for visual weight.
