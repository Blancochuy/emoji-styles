import { describe, expect, it } from "vitest";
import { getEmojiData, publicProviders } from "react-emoji-styles";
import { customDragonAssetUrl, customDragonProvider } from "./runtime";

const DRAGON = String.fromCodePoint(0x1f409);
const GRINNING_FACE = String.fromCodePoint(0x1f600);

describe("customDragonProvider", () => {
  it("uses the local dragon asset and falls back to Fluent 3D", () => {
    const dragonData = getEmojiData(DRAGON);
    const fallbackData = getEmojiData(GRINNING_FACE);

    expect(dragonData).toBeDefined();
    expect(fallbackData).toBeDefined();
    expect(customDragonProvider.getUrl?.(dragonData!, DRAGON)).toBe(customDragonAssetUrl);
    expect(customDragonProvider.getUrl?.(fallbackData!, GRINNING_FACE)).toBe(
      publicProviders.fluent3d.getUrl?.(fallbackData!, GRINNING_FACE),
    );
  });
});
