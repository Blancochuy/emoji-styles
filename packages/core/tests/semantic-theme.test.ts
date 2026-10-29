import { describe, expect, it } from "vitest";
import {
  createSemanticTokenProvider,
  defineEmojiTheme,
  getEmojiTokenLabel,
  mergeEmojiThemes,
  migrateEmojiTheme,
  parseEmojiTheme,
  publicProviders,
  resolveEmojiToken,
  serializeEmojiTheme,
  validateEmojiTheme,
  validateProvider,
  type EmojiTheme,
} from "../src";

const baseTheme = defineEmojiTheme({
  "status.success": {
    emoji: "✅",
    label: "Operation succeeded",
    labels: { es: "Operación exitosa", "es-MX": "Operación completada" },
  },
  "status.warning": {
    emoji: "⚠",
    label: "Warning",
  },
}, {
  id: "product-core",
  version: "1.0.0",
  defaultProvider: publicProviders.twemoji,
  fallbacks: [publicProviders.native],
});

describe("semantic emoji themes", () => {
  it("defines normalized, localized, versioned tokens", () => {
    expect(baseTheme).toMatchObject({
      schemaVersion: 1,
      id: "product-core",
      version: "1.0.0",
      tokens: {
        "status.warning": { emoji: "⚠️", decorative: false },
      },
    });
    expect(getEmojiTokenLabel(baseTheme.tokens["status.success"], "es-MX")).toBe("Operación completada");
    expect(getEmojiTokenLabel(baseTheme.tokens["status.success"], "ES-ar")).toBe("Operación exitosa");
    expect(validateEmojiTheme(baseTheme)).toMatchObject({ valid: true, errors: [] });
  });

  it("supports inheritance and last-theme-wins composition", () => {
    const brandTheme = defineEmojiTheme({
      "status.success": {
        emoji: "🎉",
        label: "Celebration",
        decorative: true,
      },
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy application",
      },
    }, {
      id: "brand-dark",
      version: "2.0.0",
      extends: baseTheme,
    });

    expect(brandTheme.inherits).toContain("product-core");
    expect(brandTheme.tokens["status.warning"].emoji).toBe("⚠️");
    expect(brandTheme.tokens["status.success"].emoji).toBe("🎉");

    const merged = mergeEmojiThemes(baseTheme, brandTheme);
    expect(merged.id).toBe("brand-dark");
    expect(merged.tokens["action.deploy"].label).toBe("Deploy application");
  });

  it("serializes to JSON and TypeScript and parses a flattened theme", () => {
    const json = serializeEmojiTheme(baseTheme);
    const parsed = parseEmojiTheme(json);
    expect(parsed.tokens).toEqual(baseTheme.tokens);
    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: 1,
      defaultProvider: "twemoji",
      fallbacks: ["native"],
    });

    const typescript = serializeEmojiTheme(baseTheme, {
      format: "typescript",
      variableName: "productTheme",
    });
    expect(typescript).toContain("export const productTheme = defineEmojiTheme(");
  });

  it("migrates schema-less token maps", () => {
    const migrated = migrateEmojiTheme({
      "action.deploy": { emoji: "🚀", label: "Deploy" },
    });
    expect(migrated).toMatchObject({
      schemaVersion: 1,
      id: "migrated",
      tokens: { "action.deploy": { decorative: false } },
    });
  });

  it("resolves an exact custom asset before Unicode fallback", async () => {
    const theme = defineEmojiTheme({
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy",
        asset: {
          url: "/icons/deploy.webp",
          format: "webp",
          width: 256,
          height: 256,
          checksum: "a".repeat(64),
        },
      },
    }, { id: "custom", version: "1.0.0" });

    await expect(resolveEmojiToken("action.deploy", theme)).resolves.toMatchObject({
      source: "custom-asset",
      label: "Deploy",
      asset: {
        url: "/icons/deploy.webp",
        format: "webp",
        local: true,
        checksum: "a".repeat(64),
      },
    });
  });

  it("never attributes an exact custom asset to the theme's rendering provider", async () => {
    const theme = defineEmojiTheme({
      "action.deploy": { emoji: "🚀", label: "Deploy", asset: { url: "/icons/deploy.svg", format: "svg" } },
      "action.ship": {
        emoji: "🚢",
        label: "Ship",
        asset: { url: "/icons/ship.svg", format: "svg", providerId: "acme-icons", providerVersion: "2.0.0", license: { name: "Proprietary", ownership: "Acme" } },
      },
    }, { id: "custom", version: "1.2.0", defaultProvider: publicProviders.fluent3d });

    const anonymous = await resolveEmojiToken("action.deploy", theme);
    expect(anonymous.asset).toMatchObject({ providerId: "theme-custom", providerVersion: "1.2.0" });
    expect(anonymous.asset?.license).toBeUndefined();
    await expect(resolveEmojiToken("action.ship", theme)).resolves.toMatchObject({
      asset: { providerId: "acme-icons", providerVersion: "2.0.0", license: { name: "Proprietary", ownership: "Acme" } },
    });
  });

  it("resolves stable asset ids through a semantic provider", async () => {
    const provider = createSemanticTokenProvider({
      id: "acme-icons",
      label: "Acme Icons",
      version: "1.0.0",
      assets: {
        "action.deploy": "/assets/action.deploy.svg",
      },
      fallback: publicProviders.twemoji,
      license: { name: "Proprietary", ownership: "Acme" },
    });
    expect(validateProvider(provider)).toMatchObject({ valid: true, errors: [] });

    const theme = defineEmojiTheme({
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy",
        asset: "action.deploy",
        provider,
      },
    }, { id: "acme", version: "1.0.0" });
    await expect(resolveEmojiToken("action.deploy", theme)).resolves.toMatchObject({
      source: "semantic-provider",
      asset: { providerId: "acme-icons", url: "/assets/action.deploy.svg" },
    });
  });

  it("uses provider and native fallback when no custom asset exists", async () => {
    const theme = defineEmojiTheme({
      "status.future": { emoji: "🫪", label: "Distorted face" },
    }, {
      id: "future",
      version: "1.0.0",
      defaultProvider: "twemoji",
      fallbacks: ["native"],
    });
    await expect(resolveEmojiToken("status.future", theme)).resolves.toMatchObject({
      source: "native",
      asset: null,
      emojiResolution: {
        nativeFallback: true,
        attempts: [
          { providerId: "twemoji", status: "unsupported" },
          { providerId: "native", status: "native" },
        ],
      },
    });
  });

  it("keeps Unicode as the terminal fallback when a theme omits native", async () => {
    const theme = defineEmojiTheme({
      "status.future": { emoji: "🫪", label: "Distorted face" },
    }, {
      id: "portable",
      version: "1.0.0",
      defaultProvider: "twemoji",
      fallbacks: [],
    });
    await expect(resolveEmojiToken("status.future", theme)).resolves.toMatchObject({
      source: "native",
      emojiResolution: {
        nativeFallback: true,
        attempts: [
          { providerId: "twemoji", status: "unsupported" },
          { providerId: "native", status: "native" },
        ],
      },
    });
  });

  it("can disable the implicit OS fallback at theme or call level", async () => {
    const theme = defineEmojiTheme({
      "status.future": { emoji: "🫪", label: "Distorted face" },
    }, {
      id: "deterministic",
      version: "1.0.0",
      defaultProvider: "twemoji",
      fallbacks: [],
      nativeFallback: false,
    });
    await expect(resolveEmojiToken("status.future", theme)).resolves.toMatchObject({
      source: "unresolved",
      asset: null,
      emojiResolution: {
        nativeFallback: false,
        attempts: [{ providerId: "twemoji", status: "unsupported" }],
      },
    });
    await expect(resolveEmojiToken("status.future", theme, { nativeFallback: true })).resolves.toMatchObject({
      source: "native",
      emojiResolution: { nativeFallback: true },
    });
  });

  it("rejects invalid names, labels, assets, and schema versions", () => {
    expect(() => defineEmojiTheme({
      deploy: { emoji: "not emoji", label: "", asset: "Bad Asset" },
    }, { id: "Bad Theme", version: "latest" })).toThrow();

    const invalid = { ...baseTheme } as EmojiTheme;
    Object.assign(invalid, { schemaVersion: 99 });
    expect(validateEmojiTheme(invalid).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "schemaVersion", code: "unsupported-schema" }),
    ]));
    expect(() => createSemanticTokenProvider({
      id: "unsafe",
      label: "Unsafe",
      version: "1.0.0",
      assets: { "action.deploy": "javascript:alert(1)" },
    })).toThrow("Unsafe semantic asset URL");
    expect(validateEmojiTheme(null)).toMatchObject({ valid: false });
    expect(validateEmojiTheme({
      schemaVersion: 1,
      id: "malformed",
      version: "1.0.0",
      tokens: { "action.deploy": { emoji: 42, label: [], decorative: "no" } },
      fallbacks: "twemoji",
      inherits: ["base", "base"],
    })).toMatchObject({ valid: false });
  });
});
