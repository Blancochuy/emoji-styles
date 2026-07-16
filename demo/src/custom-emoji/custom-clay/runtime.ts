import { createMappedProvider, publicProviders } from "react-emoji-styles";
import customClayAssetUrl from "./assets/1f4a1.webp";

export { customClayAssetUrl };

export const customClayProvider = createMappedProvider({
  id: "custom-clay",
  label: "Clay Pop",
  version: "1.0.0",
  assets: { "💡": customClayAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "OpenAI Build Week Emoji Styles Custom Emoji Lab",
  license: { name: "License status: user confirmation required", ownership: "License status: user confirmation required" },
});
