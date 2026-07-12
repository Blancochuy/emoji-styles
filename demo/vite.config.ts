import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "emoji-styles": path.resolve(__dirname, "../packages/core/src/index.ts"),
      "react-emoji-styles": path.resolve(__dirname, "../packages/react/src/index.ts"),
    },
  },
});
