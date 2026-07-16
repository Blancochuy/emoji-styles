import { createMappedProvider, publicProviders } from "react-emoji-styles";
import customSoft3dAssetUrl from "./assets/1f680.webp";

export { customSoft3dAssetUrl };

export const customSoft3dProvider = createMappedProvider({
  id: "custom-soft-3d",
  label: "Soft 3D",
  version: "1.0.0",
  assets: { "🚀": customSoft3dAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "OpenAI Build Week Emoji Styles Custom Emoji Lab",
  license: { name: "License status: user confirmation required", ownership: "License status: user confirmation required" },
});
