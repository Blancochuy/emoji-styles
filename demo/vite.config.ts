import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, "../packages/assets-twemoji/public"),
  build: {
    // Theme validation deliberately rejects data: URLs, so keep imported brand
    // artwork as emitted files instead of inlining small assets in production.
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: [
      {
        find: "react-emoji-styles/styles.css",
        replacement: path.resolve(__dirname, "../packages/react/styles.css"),
      },
      { find: "emoji-styles-data", replacement: path.resolve(__dirname, "../packages/data/src/index.ts") },
      { find: "emoji-styles", replacement: path.resolve(__dirname, "../packages/core/src/index.ts") },
      { find: "react-emoji-styles", replacement: path.resolve(__dirname, "../packages/react/src/index.ts") },
      { find: "emoji-styles-assets-twemoji", replacement: path.resolve(__dirname, "../packages/assets-twemoji/src/index.ts") },
    ],
  },
});
