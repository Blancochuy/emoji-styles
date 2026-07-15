import { describe, expect, it } from "vitest";
import { createMappedProvider } from "../src/mapped-provider";
import { publicProviders } from "../src/providers";
import { getEmojiUrl } from "../src/url";

describe("createMappedProvider", () => {
  it("uses exact custom assets and falls back for the rest", () => {
    const provider = createMappedProvider({
      id: "acme",
      label: "Acme icons",
      assets: { "🚀": "/icons/deploy.svg" },
      fallback: publicProviders.fluent3d,
    });

    expect(getEmojiUrl("🚀", provider)).toBe("/icons/deploy.svg");
    expect(getEmojiUrl("🔥", provider)).toContain("/assets/Fire/3D/fire_3d.png");
  });

  it("supports custom assets for complex emoji outside the bundled catalog", () => {
    const provider = createMappedProvider({
      id: "acme",
      label: "Acme icons",
      assets: { "👨‍💻": "/icons/developer.svg" },
    });
    expect(getEmojiUrl("👨‍💻", provider)).toBe("/icons/developer.svg");
  });

  it("fails fast for non-emoji mapping keys", () => {
    expect(() =>
      createMappedProvider({ id: "bad", label: "Bad", assets: { nope: "/nope.svg" } }),
    ).toThrow("Invalid emoji mapping key");
  });
});
