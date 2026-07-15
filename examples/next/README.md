# Next.js App Router example

This example shows the SSR-safe React adapter in a Next.js App Router project.

1. Install `emoji-styles` and `react-emoji-styles`.
2. Import `react-emoji-styles/styles.css` once from `app/layout.tsx`.
3. Render `Emoji` from a Server Component or a Client Component.

The root page produces complete image markup during prerendering. The callback example is isolated behind `"use client"` because event callbacks are client behavior.
