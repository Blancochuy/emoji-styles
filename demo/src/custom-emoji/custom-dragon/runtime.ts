import { createMappedProvider, publicProviders } from "react-emoji-styles";
import customDragonAssetUrl from "./assets/1f409.webp";

export { customDragonAssetUrl };

export const customDragonProvider = createMappedProvider({
  id: "custom-dragon",
  label: "Chinese Dragon",
  version: "1.0.0",
  assets: { "🐉": customDragonAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "Emoji Styles Custom Emoji Lab workflow",
  license: {
    name: "License status: user confirmation required",
    ownership: "License status: user confirmation required",
  },
});
