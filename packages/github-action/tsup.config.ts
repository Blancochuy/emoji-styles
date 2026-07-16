import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node24",
  splitting: false,
  minify: true,
  clean: true,
  outDir: "../../.github/actions/emoji-styles-audit/dist",
  noExternal: [/.*/],
  outExtension: () => ({ js: ".js" }),
});
