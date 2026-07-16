import { createMappedProvider, publicProviders } from "react-emoji-styles";
import customGlossAssetUrl from "./assets/1f60d.webp";

export { customGlossAssetUrl };

export const customGlossProvider = createMappedProvider({
  id: "custom-gloss",
  label: "Classic Gloss",
  version: "1.0.0",
  assets: { "😍": customGlossAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "OpenAI Build Week Emoji Styles Custom Emoji Lab",
  license: { name: "License status: user confirmation required", ownership: "License status: user confirmation required" },
});
