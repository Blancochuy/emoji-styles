import { chmod } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/stdio.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  dts: true,
  clean: true,
  noExternal: ["@emoji-styles/asset-pipeline"],
  external: ["emoji-styles", "emoji-styles-cli", "sharp"],
  async onSuccess() { await chmod("dist/stdio.js", 0o755); },
});
