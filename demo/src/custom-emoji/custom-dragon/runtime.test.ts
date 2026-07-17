import { describe, expect, it } from "vitest";
import { getEmojiData, publicProviders } from "react-emoji-styles";
import { customDragonAssetUrl, customDragonProvider } from "./runtime";

describe("customDragonProvider", () => {
  it("uses the local dragon asset and falls back to Fluent 3D", () => {
    const dragonData = getEmojiData("🐉");
    const fallbackData = getEmojiData("😀");

    expect(dragonData).toBeDefined();
    expect(fallbackData).toBeDefined();
    expect(customDragonProvider.getUrl?.(dragonData!, "🐉")).toBe(customDragonAssetUrl);
    expect(customDragonProvider.getUrl?.(fallbackData!, "😀")).toBe(
      publicProviders.fluent3d.getUrl?.(fallbackData!, "😀"),
    );
  });
});
