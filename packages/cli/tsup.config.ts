import { chmod } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/audit-entry.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  dts: true,
  clean: true,
  // The pipeline is an internal workspace implementation, not a registry dependency.
  noExternal: ["@emoji-styles/asset-pipeline"],
  external: ["emoji-styles", "sharp"],
  async onSuccess() { await chmod("dist/cli.js", 0o755); },
});
