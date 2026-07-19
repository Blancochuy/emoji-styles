import { describe, expect, it } from "vitest";
import {
  assertSerenityOSRevision,
  collectSerenityOSAssetIds,
  renderSerenityOSData,
  toSerenityOSAssetId,
} from "../serenityos-index";

describe("SerenityOS asset index", () => {
  it("rejects a checkout at a different upstream revision", () => {
    expect(() => assertSerenityOSRevision("actual", "expected")).toThrow(
      "Expected SerenityOS/serenity@expected, found actual",
    );
    expect(() => assertSerenityOSRevision("expected\n", "expected")).not.toThrow();
  });

  it("uses SerenityOS uppercase unqualified filenames without changing semantic modifiers", () => {
    expect(toSerenityOSAssetId("2764-fe0f")).toBe("U+2764");
    expect(toSerenityOSAssetId("1f469-fe0f-200d-2695-fe0f")).toBe("U+1F469_U+200D_U+2695");
    expect(toSerenityOSAssetId("1f468-1f3fb")).toBe("U+1F468_U+1F3FB");
  });

  it("keeps only exact RGI matches and renders them deterministically", () => {
    const assetFiles = [
      "U+1F680.png",
      "U+2764.png",
      "U+1F468.png",
      "U+F8FF.png",
      "README.md",
    ];
    const codepoints = ["1f680", "2764-fe0f", "1f468-1f3fb"];

    const ids = collectSerenityOSAssetIds(assetFiles, codepoints);
    expect(ids).toEqual(["U+1F680", "U+2764"]);
    expect(renderSerenityOSData(ids, "abc123", "17.0")).toContain(
      'export const SERENITYOS_RGI_ASSET_COUNT = 2;',
    );
    expect(renderSerenityOSData([...ids].reverse(), "abc123", "17.0")).toBe(
      renderSerenityOSData(ids, "abc123", "17.0"),
    );
  });
});
