# Custom Dragon Emoji Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, package, and display one original transparent Chinese dragon emoji as an independent `custom-dragon` local provider.

**Architecture:** The `$emoji-asset-creator` workflow produces one reviewed style anchor, removes an intermediate magenta chroma background, and deterministically normalizes it to a 256×256 lossless WebP. A self-contained provider directory maps `dragon.emoji` and `🐉` to that asset, falls back to Fluent 3D, and is exposed as a fifth selectable Custom Emoji Lab example.

**Tech Stack:** OpenAI built-in image generation, Python/Pillow asset helpers, TypeScript, React 18, Emoji Styles mapped providers, Vitest, Testing Library, Vite.

## Global Constraints

- Provider ID is exactly `custom-dragon` and remains separate from `custom-emoji`.
- Semantic token is exactly `dragon.emoji`; Unicode mapping and fallback are exactly `🐉`.
- Runtime asset is `demo/src/custom-emoji/custom-dragon/assets/1f409.webp` at 256×256 with alpha.
- The final asset has no background color; `#ff00ff` is permitted only in the temporary generation source.
- Composition is one compact S-shaped Chinese flying dragon with jade-green scales, dark-green underside, crimson horns, and golden eyes.
- Exclude wings, fire, clouds, scenery, text, logos, frames, cast shadows, and secondary objects.
- Preserve a 0.76 safe area and readability at 48 px and 24 px.
- Use `publicProviders.fluent3d` as the runtime fallback.
- Ownership and license remain `License status: user confirmation required`.
- Do not replace or modify existing custom emoji assets.
- Preserve the untracked root `package-lock.json` unchanged.

---

### Task 1: Define and approve the style anchor

**Files:**
- Create: `demo/src/custom-emoji/custom-dragon/asset-spec.json`
- Create temporarily: `tmp/imagegen/custom-dragon/1f409-source.png`
- Create temporarily: `tmp/imagegen/custom-dragon/1f409.png`
- Create: `demo/src/custom-emoji/custom-dragon/assets/1f409.webp`

**Interfaces:**
- Consumes: the approved generation prompt in `docs/superpowers/specs/2026-07-17-custom-dragon-emoji-design.md`.
- Produces: one normalized transparent WebP named `1f409.webp` for packaging and runtime import.

- [ ] **Step 1: Create the asset specification before generation**

Create `asset-spec.json` with this contract:

```json
{
  "providerId": "custom-dragon",
  "version": "1.0.0",
  "style": {
    "description": "Original fierce Chinese flying dragon with a compact S-shaped silhouette",
    "perspective": "front three-quarter head with serpentine body in flight",
    "lighting": "dramatic soft upper-left light with strong value separation",
    "outline": "none; crisp silhouette edges",
    "background": "transparent after chroma-key removal",
    "detailLevel": "medium-high on the head, simplified along the body",
    "materials": ["jade-green scales", "dark-green underside", "crimson-red horns"],
    "accentPolicy": "crimson horns are the only strong accent; golden eyes support facial readability"
  },
  "canvas": { "width": 1024, "height": 1024, "safeArea": 0.76 },
  "output": { "format": "webp", "width": 256, "height": 256, "transparent": true },
  "tokens": [{ "token": "dragon.emoji", "emoji": "🐉", "label": "Fierce Chinese flying dragon", "subject": "One airborne Chinese dragon with a compact S-shaped body" }],
  "assumptions": [
    "The artwork is an original direction without proprietary vendor references.",
    "The built-in image generation model identifier is not exposed to this workflow.",
    "Final ownership and redistribution status require project-owner confirmation."
  ]
}
```

- [ ] **Step 2: Generate exactly one style anchor**

Use the built-in image generation tool with the approved prompt. Generate a single 1024×1024 subject on a flat `#ff00ff` background. Save the returned image into the project as `tmp/imagegen/custom-dragon/1f409-source.png`; do not reference the generated-images cache from application code.

- [ ] **Step 3: Inspect the generated source**

Open the source at original size. Reject it if it contains more than one dragon, wings, fire, clouds, text, a cropped body, a non-uniform background, or a silhouette that does not read as an S-shaped Chinese dragon.

- [ ] **Step 4: Remove the chroma background**

Run:

```powershell
python "$env:USERPROFILE\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" --input tmp/imagegen/custom-dragon/1f409-source.png --out tmp/imagegen/custom-dragon/1f409.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Expected: a PNG with alpha, fully transparent corners, and no visible magenta background.

- [ ] **Step 5: Preview and apply deterministic normalization**

Run:

```powershell
python skills/emoji-asset-creator/scripts/inspect_assets.py tmp/imagegen/custom-dragon
python skills/emoji-asset-creator/scripts/normalize_asset.py tmp/imagegen/custom-dragon/1f409.png demo/src/custom-emoji/custom-dragon/assets --size 256 --format webp --safe-area 0.76
python skills/emoji-asset-creator/scripts/normalize_asset.py tmp/imagegen/custom-dragon/1f409.png demo/src/custom-emoji/custom-dragon/assets --size 256 --format webp --safe-area 0.76 --yes
```

Expected: preview reports the planned transform, then creates `assets/1f409.webp` without touching existing provider directories.

- [ ] **Step 6: Validate and visually review the anchor**

Run:

```powershell
python skills/emoji-asset-creator/scripts/validate_set.py demo/src/custom-emoji/custom-dragon/assets --size 256 --format webp --safe-area 0.76
```

Open the WebP at original size and also render 48 px and 24 px previews. Confirm alpha, transparent corners, no magenta fringe, no edge contact, clear dragon silhouette, approved palette, and readable face.

---

### Task 2: Package the independent provider through a failing provenance test

**Files:**
- Modify: `scripts/tests/skills.test.ts`
- Create: `demo/src/custom-emoji/custom-dragon/mapping.json`
- Create temporarily: `demo/src/custom-emoji/custom-dragon/provenance-input.json`
- Generate: `demo/src/custom-emoji/custom-dragon/emoji-provider.json`
- Generate: `demo/src/custom-emoji/custom-dragon/provider.ts`
- Generate: `demo/src/custom-emoji/custom-dragon/theme.ts`
- Generate: `demo/src/custom-emoji/custom-dragon/PROVENANCE.json`
- Generate: `demo/src/custom-emoji/custom-dragon/LICENSE.md`
- Generate: `demo/src/custom-emoji/custom-dragon/README.md`

**Interfaces:**
- Consumes: `assets/1f409.webp` from Task 1.
- Produces: a manifest whose `assets["🐉"]` entry has file `1f409.webp`, exact dimensions, and the actual SHA-256.

- [ ] **Step 1: Add the failing bundled-example test case**

Append this entry to the `examples` array in `scripts/tests/skills.test.ts`:

```ts
{ id: "custom-dragon", emoji: "🐉", file: "1f409.webp" },
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter emoji-styles-scripts test -- --run tests/skills.test.ts
```

Expected: FAIL because `demo/src/custom-emoji/custom-dragon/emoji-provider.json` and `PROVENANCE.json` do not exist yet.

- [ ] **Step 3: Create truthful mapping and provenance inputs**

Create `mapping.json`:

```json
[{ "file": "1f409.webp", "emoji": "🐉", "token": "dragon.emoji", "label": "Fierce Chinese flying dragon" }]
```

Create `provenance-input.json` using the real current ISO timestamp and:

```json
{
  "generated": true,
  "generator": { "type": "ai-image-generation", "provider": "OpenAI built-in image_gen", "model": "Model identifier not exposed by the built-in tool" },
  "humanDirection": "Original fierce Chinese flying dragon, compact S-shaped airborne silhouette, jade-green scales, dark-green underside, crimson horns, golden eyes, readable at 24 and 48 pixels",
  "referenceAssets": [],
  "modifications": ["chroma-key background removed", "transparent bounds cropped", "centered to 0.76 safe area", "resized to 256 pixels", "converted to lossless WebP"],
  "source": "Emoji Styles Custom Emoji Lab workflow",
  "ownership": "License status: user confirmation required",
  "license": "License status: user confirmation required"
}
```

- [ ] **Step 4: Preview and generate the manifest package**

Run the generator once without mutation, then apply:

```powershell
python skills/emoji-asset-creator/scripts/generate_manifest.py demo/src/custom-emoji/custom-dragon/assets --output demo/src/custom-emoji/custom-dragon --id custom-dragon --mapping demo/src/custom-emoji/custom-dragon/mapping.json --provenance demo/src/custom-emoji/custom-dragon/provenance-input.json
python skills/emoji-asset-creator/scripts/generate_manifest.py demo/src/custom-emoji/custom-dragon/assets --output demo/src/custom-emoji/custom-dragon --id custom-dragon --mapping demo/src/custom-emoji/custom-dragon/mapping.json --provenance demo/src/custom-emoji/custom-dragon/provenance-input.json --yes
```

Inspect all generated files and remove only the temporary `provenance-input.json` after its contents are represented accurately in `PROVENANCE.json`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
pnpm --filter emoji-styles-scripts test -- --run tests/skills.test.ts
```

Expected: the Custom Emoji Lab manifest/provenance test passes for all five providers.

---

### Task 3: Register the runtime provider and landing card with TDD

**Files:**
- Create: `demo/src/custom-emoji/custom-dragon/runtime.ts`
- Modify: `demo/src/App.test.tsx`
- Modify: `demo/src/App.tsx`

**Interfaces:**
- Produces: `customDragonAssetUrl: string` and `customDragonProvider: EmojiAssetProvider`.
- Consumes: those exports in `CUSTOM_EXAMPLES`.

- [ ] **Step 1: Add a failing landing integration test**

Add this test to `demo/src/App.test.tsx`:

```tsx
it("selects and renders the independent Chinese Dragon provider", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Chinese Dragon/i }));

  expect(screen.getByText("dragon.emoji")).toBeInTheDocument();
  expect(screen.getAllByRole("img", { name: "Fierce Chinese flying dragon" }).some((image) => image.getAttribute("data-provider") === "custom-dragon")).toBe(true);
  expect(screen.getByText(/customDragonProvider/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```powershell
npm --prefix demo test -- --run src/App.test.tsx
```

Expected: FAIL because there is no `Chinese Dragon` card.

- [ ] **Step 3: Implement the mapped runtime provider**

Create `runtime.ts`:

```ts
import { createMappedProvider, publicProviders } from "react-emoji-styles";
import customDragonAssetUrl from "./assets/1f409.webp";

export { customDragonAssetUrl };

export const customDragonProvider = createMappedProvider({
  id: "custom-dragon",
  label: "Chinese Dragon",
  version: "1.0.0",
  assets: { "🐉": customDragonAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "Emoji Styles Custom Emoji Lab workflow",
  license: {
    name: "License status: user confirmation required",
    ownership: "License status: user confirmation required",
  },
});
```

- [ ] **Step 4: Add the Custom Emoji Lab example**

Import both runtime exports in `App.tsx`, then append this object to `CUSTOM_EXAMPLES` before the free-style card is rendered:

```ts
{
  id: "chinese-dragon",
  style: "Chinese Dragon",
  token: "dragon.emoji",
  emoji: "🐉",
  label: "Fierce Chinese flying dragon",
  description: "Jade serpentine 3D",
  assetUrl: customDragonAssetUrl,
  provider: customDragonProvider,
  providerExport: "customDragonProvider",
  providerPath: "./custom-emoji/custom-dragon/runtime",
},
```

Add matching `providerExport` and `providerPath` properties to the four existing example records, using their actual runtime exports and module paths. Replace the generic `customExampleCode` builder with:

```ts
const customExampleCode = `import { ${activeCustomExample.providerExport} } from '${activeCustomExample.providerPath}';

<Emoji
  emoji="${activeCustomExample.emoji}"
  provider={${activeCustomExample.providerExport}}
  label="${activeCustomExample.label}"
  size="3xl"
/>`;
```

Keep `customExampleId` initialized to `agent-core`; the existing card remains the initial selection.

- [ ] **Step 5: Run demo tests and verify GREEN**

Run:

```powershell
npm --prefix demo test
```

Expected: the dragon integration test and existing picker tests pass.

---

### Task 4: Final technical and browser validation

**Files:**
- Review only: `demo/src/custom-emoji/custom-dragon/**`
- Review only: `demo/src/App.tsx`
- Review only: `scripts/tests/skills.test.ts`

**Interfaces:**
- Consumes: the complete provider and landing integration.
- Produces: fresh evidence for asset integrity, typing, production build, responsive layout, and fallback behavior.

- [ ] **Step 1: Validate the asset and provider package**

Run:

```powershell
python skills/emoji-asset-creator/scripts/validate_set.py demo/src/custom-emoji/custom-dragon/assets --size 256 --format webp --safe-area 0.76
pnpm --filter emoji-styles-scripts test -- --run tests/skills.test.ts
```

Expected: one valid transparent 256×256 WebP and all focused script tests pass.

- [ ] **Step 2: Verify the demo**

Run:

```powershell
npm --prefix demo test
Set-Location demo
& .\node_modules\.bin\tsc.CMD --noEmit
Set-Location ..
npm --prefix demo run build
```

Expected: tests and typecheck exit 0; Vite builds production assets successfully.

- [ ] **Step 3: Validate the rendered landing page**

Start the demo on an unused local port. In the browser, select `Chinese Dragon` and confirm the preview shows the custom asset, `dragon.emoji`, `data-provider="custom-dragon"`, and the generated provider snippet. Check desktop and 390×844 layouts with no horizontal overflow. Confirm a non-mapped emoji passed to `customDragonProvider` resolves through Fluent 3D.

- [ ] **Step 4: Review repository hygiene**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors, only intentional custom-dragon/test/landing changes plus the user's pre-existing work, and the root `package-lock.json` remains untracked and unchanged.
