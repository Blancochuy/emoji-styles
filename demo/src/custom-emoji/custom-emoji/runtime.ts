import { createMappedProvider, publicProviders } from "react-emoji-styles";
import agentReadyAssetUrl from "./assets/1f916.webp";

export { agentReadyAssetUrl };

export const customEmojiProvider = createMappedProvider({
  id: "custom-emoji",
  label: "Custom Emoji",
  version: "1.0.0",
  assets: { "🤖": agentReadyAssetUrl },
  fallback: publicProviders.fluent3d,
  format: "webp",
  local: true,
  source: "OpenAI Build Week Emoji Styles demo workflow",
  license: {
    name: "License status: user confirmation required",
    ownership: "License status: user confirmation required",
  },
});
