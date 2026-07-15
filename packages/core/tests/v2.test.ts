import { describe, expect, it } from "vitest";
import {
  adaptLegacyProvider,
  createCompositeProvider,
  createGeneratedProvider,
  createManifestProvider,
  getEmojiMetadata,
  getProviderCoverage,
  isEmoji,
  isV2Provider,
  publicProviders,
  resolveEmoji,
  validateProvider,
  validateProviderManifest,
  type EmojiProviderManifest,
} from "../src";
import generatedManifest from "./fixtures/generated-provider.json";

const manifest = generatedManifest as EmojiProviderManifest;

describe("core v2", () => {
  it("returns structured metadata for normalized sequences", () => {
    expect(getEmojiMetadata("❤")).toMatchObject({
      label: "Red heart",
      sequence: "2764-fe0f",
      codepoints: ["2764", "fe0f"],
      unicodeVersion: "17.0",
    });
    expect(isEmoji("👨‍💻")).toBe(true);
    expect(isEmoji("hello")).toBe(false);
  });

  it("records resolution attempts and selected fallback", async () => {
    const partial = createManifestProvider(manifest);
    const result = await resolveEmoji("🔥", {
      provider: partial,
      fallbacks: [publicProviders.twemoji],
    });

    expect(result.normalized).toBe("🔥");
    expect(result.selected).toMatchObject({ providerId: "twemoji", format: "png" });
    expect(result.attempts.map((attempt) => attempt.status)).toEqual(["unsupported", "resolved"]);
    expect(result.fallbackUsed).toBe(true);
    expect(result.nativeFallback).toBe(false);
  });

  it("represents native fallback without inventing an asset URL", async () => {
    const result = await resolveEmoji("🔥", {
      provider: createManifestProvider(manifest),
      fallbacks: [publicProviders.native],
    });
    expect(result.selected).toBeNull();
    expect(result.nativeFallback).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.attempts[1]).toMatchObject({ providerId: "native", status: "native" });
  });

  it("resolves verified manifest metadata and coverage", async () => {
    const provider = createGeneratedProvider(manifest);
    const result = await resolveEmoji("🚀", { provider });
    expect(result.selected).toEqual(expect.objectContaining({
      providerId: "acme-gothic",
      providerVersion: "1.0.0",
      url: "/assets/emoji/1f680.webp",
      checksum: "a".repeat(64),
      width: 256,
      local: true,
    }));
    expect(await getProviderCoverage(provider)).toMatchObject({
      supported: 1,
      total: 3953,
      verified: true,
    });
  });

  it("rejects unsafe and incomplete generated manifests", () => {
    const invalid = structuredClone(manifest);
    invalid.assets["🚀"].file = "../private/key.png";
    invalid.generator = undefined;
    const result = validateProviderManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "Unsafe asset path for 🚀",
      "Generated manifests require generator provenance",
    ]));
  });

  it("rejects non-emoji manifest keys and invalid provider ids", () => {
    const invalid = structuredClone(manifest);
    invalid.assets = { rocket: { file: "rocket.webp" } };
    expect(validateProviderManifest(invalid).errors).toContain("Invalid emoji asset key: rocket");

    const provider = createManifestProvider(manifest);
    provider.id = "Bad Provider ID";
    expect(validateProvider(provider).errors).toContain(
      "Provider id must use lowercase letters, numbers, dots, underscores, or hyphens",
    );
  });

  it("rejects unsafe base URLs, duplicate normalized keys, and non-emoji input", async () => {
    const invalid = structuredClone(manifest);
    invalid.basePath = "javascript:alert(1)";
    invalid.assets = {
      "❤": { file: "heart-text.webp" },
      "❤️": { file: "heart-emoji.webp" },
    };
    expect(validateProviderManifest(invalid).errors).toEqual(expect.arrayContaining([
      "Manifest basePath must be relative, HTTP, or HTTPS",
      "Duplicate normalized emoji asset key: ❤️",
    ]));
    expect(() => createManifestProvider(manifest, { baseUrl: "data:text/html,unsafe" })).toThrow(
      "Provider base URL must be relative, HTTP, or HTTPS",
    );
    await expect(resolveEmoji("not emoji", { provider: publicProviders.twemoji })).rejects.toThrow(
      "resolveEmoji requires exactly one emoji grapheme",
    );
  });

  it("adapts legacy providers and composes providers", async () => {
    const legacy = adaptLegacyProvider({
      id: "legacy",
      label: "Legacy",
      visibility: "custom",
      getUrl: (data) => data.codepoint === "1f680" ? "/legacy/rocket.png" : null,
    }, { version: "0.9.0", local: true });
    expect(isV2Provider(legacy)).toBe(true);
    expect(validateProvider(legacy).valid).toBe(true);

    const composite = createCompositeProvider({
      id: "combined",
      label: "Combined",
      version: "1.0.0",
      providers: [createManifestProvider(manifest), legacy],
    });
    const result = await resolveEmoji("🚀", { provider: composite });
    expect(result.selected?.url).toBe("/assets/emoji/1f680.webp");
  });

  it("validates all built-in providers as v2", () => {
    for (const provider of Object.values(publicProviders)) {
      expect(validateProvider(provider), provider.id).toMatchObject({ valid: true, errors: [] });
    }
  });
});
