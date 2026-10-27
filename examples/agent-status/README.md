# Agent Desk

A standalone consumer of **published** Emoji Styles packages. Three agent states
use a small original artwork pack, a versioned semantic theme, accessible labels,
and a native Unicode fallback when a local image fails.

This simulates status changes; it does not execute an AI agent or call an image
model. No API key, CDN artwork, remote font, or monorepo build is required.

## Run independently

Requirements: Node.js 20.19+ within Node 20, or Node.js 22.12+ (Node 24 is used
in this example's CI), and npm. Use the exact dependencies in `package-lock.json`.

Copy this folder to any location, including outside the repository:

```sh
# From the emoji-styles repository root:
cp -R examples/agent-status /tmp/my-agent-desk
cd /tmp/my-agent-desk
npm ci
npm test
npm run build
npm run preview
```

Open <http://127.0.0.1:4174>. For development, use `npm run dev` and the printed
URL instead. This folder is intentionally excluded from the pnpm workspace;
it installs `emoji-styles@0.1.0` and `react-emoji-styles@0.1.0` from npm. It has
no workspace dependency, source alias, symlink, or dependency on the private CLI.

## Try the complete flow

1. The initial **Working** state renders the local amber artwork. View page
   source: the task and image label are present before JavaScript executes.
2. Tab to **Completed** or **Needs attention** and press Enter. Both the semantic
   token and artwork change, with the task state announced in a polite live region.
3. Check **Simulate unavailable artwork**. The provider now returns a missing
   local image. After the actual image error, the component uses native Unicode
   and keeps the same accessible label and written task status.
4. Clear the checkbox. The local artwork returns. No remote provider is used.

Native appearance varies by operating system. If a product needs identical
fallback artwork everywhere, configure a second self-hosted provider instead.
Text labels remain necessary; color and artwork alone should not communicate status.

## Integration surface

- `src/theme.ts` maps `agent.working`, `agent.complete`, and `agent.error` to
  Unicode fallbacks and accessible labels through `defineEmojiTheme`.
- `createMappedProvider` resolves those glyphs to `/emoji/*.svg`. Both application
  imports come from the public packages; the app never guesses provider filenames.
- `src/App.tsx` renders `<EmojiToken token={...} theme={theme} />`. The provider is
  configured with an explicit native fallback, avoiding the default CDN chain.
- `public/emoji/` is the local pack. Vite copies these assets to `dist/emoji/`.
- `scripts/prerender.tsx` uses React `renderToString` at build time. `main.tsx`
  hydrates that exact initial state. Vite development uses client rendering.

This is **build-time SSR**, not a running SSR server or React Server Components
example. Deploy the contents of `dist/` to a static host at the domain root.
The sample uses absolute `/emoji/` URLs; a subdirectory deployment requires
adjusting the asset base, Vite base and prerender URLs together.

## Replace the artwork

The three original SVGs use a shared 96×96 canvas, 38px circular silhouette,
3px outline and amber/green/coral palette. They are editable source artwork,
licensed with this example under MIT; provenance and SHA-256 values live in
`public/emoji/PROVENANCE.json`. They are not AI-generated or raster-pipeline output.

For generated PNG/WebP artwork, use the repository's asset-creator workflow to
normalize and review a coherent pack, then copy the runtime files here. Change
`file` and provider `format` in `src/theme.ts`; preserve the semantic token,
Unicode fallback and label. Verify the result at actual UI sizes on both light
and dark surfaces. The raster pipeline does not accept arbitrary SVG input;
this example's trusted vectors are served directly through the mapped provider.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Node tests verify local registry installations, all three resolutions and
labels, local artwork and pre-effect SSR markup. Playwright tests the production
build in desktop and mobile Chromium, keyboard selection, hydration, an HTTP 404
image failure, native fallback and recovery, no external requests, and overflow.
The CI workflow copies only this folder into a temporary directory before
installing, so workspace aliases cannot hide missing published APIs.

A passing test does not establish a broad accessibility audit or visual-quality
score. Build warnings about the large bundle are retained: npm `0.1.0` predates
the Unicode compaction merged into the repository. A merge or website deployment
does not publish a new npm version. Upgrade the pinned package versions and lockfile
only after verifying a new registry release with these same consumer tests.

## License

Code and the three authored SVGs: [MIT](./LICENSE). Native fallback artwork is
provided by the user's operating system, not redistributed by this example.
