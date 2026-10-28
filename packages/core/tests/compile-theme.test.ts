import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compileEmojiTheme,
  defineEmojiTheme,
  emojiDatasetInfo,
  getEmojiUrl,
  publicProviders,
  renderCompiledEmojiThemeModule,
  resolveEmoji,
  type CompiledEmojiTheme,
} from "../src";
import { getCompiledEmojiDimension, getCompiledEmojiLabel, getCompiledEmojiToken } from "../src/compiled";

const theme = defineEmojiTheme({
  "action.deploy": { emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" } },
  "action.home": { emoji: "🏠", label: "Home" },
  "status.celebrate": { emoji: "🎉", label: "Celebrate", decorative: true },
}, { id: "compiled-fixture", version: "2.1.0", defaultProvider: "fluent-3d", fallbacks: ["twemoji"], nativeFallback: false });

describe("compileEmojiTheme", () => {
  it("emits the same URLs as the existing resolver, in provider order", async () => {
    const compiled = await compileEmojiTheme(theme);
    for (const [token, definition] of Object.entries(theme.tokens)) {
      const fluent = (await resolveEmoji(definition.emoji, { provider: "fluent-3d" })).selected!;
      const twemoji = (await resolveEmoji(definition.emoji, { provider: "twemoji" })).selected!;
      expect(compiled.tokens[token].sources).toEqual([
        { provider: "fluent-3d", url: fluent.url, format: "png" },
        { provider: "twemoji", url: twemoji.url, format: "png" },
      ]);
      expect(compiled.tokens[token].sources.map((source) => source.url)).toEqual([getEmojiUrl(definition.emoji, "fluent-3d"), getEmojiUrl(definition.emoji, "twemoji")]);
    }
    // CLDR-name exceptions are applied at compile time (folder "House", not the emoji alt text casing).
    expect(compiled.tokens["action.home"].sources[0].url).toContain("/House/3D/house_3d.png");
    expect(compiled.tokens["action.deploy"].sources[0].url).toContain("/Rocket/3D/rocket_3d.png");
    expect(compiled.tokens["action.deploy"].sources[1].url).toContain("twemoji@15.1.0/assets/72x72/1f680.png");
  });

  it("keeps labels, decorative flags and a deterministic, sorted token order", async () => {
    const compiled = await compileEmojiTheme(theme);
    expect(Object.keys(compiled.tokens)).toEqual(["action.deploy", "action.home", "status.celebrate"]);
    expect(compiled.tokens["action.deploy"]).toMatchObject({ emoji: "🚀", label: "Deploy", labels: { es: "Desplegar" }, decorative: false });
    expect(compiled.tokens["action.home"]).not.toHaveProperty("labels");
    expect(compiled.tokens["status.celebrate"].decorative).toBe(true);
    expect(JSON.stringify(await compileEmojiTheme(theme))).toBe(JSON.stringify(compiled));
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled);
  });

  it("honors nativeFallback and an explicit native provider", async () => {
    expect((await compileEmojiTheme(theme)).tokens["action.deploy"].unicode).toBeNull();
    expect((await compileEmojiTheme(theme, { nativeFallback: true })).tokens["action.deploy"].unicode).toBe("🚀");
    const implicit = await compileEmojiTheme({ ...theme, nativeFallback: undefined });
    expect(implicit.meta.nativeFallback).toBe(true);
    expect(implicit.tokens["action.deploy"].unicode).toBe("🚀");
    // Providers after an explicit native entry are unreachable, exactly as in resolveEmoji.
    const native = await compileEmojiTheme(theme, { fallbacks: ["native", "twemoji"] });
    expect(native.tokens["action.deploy"].sources.map((source) => source.provider)).toEqual(["fluent-3d"]);
    expect(native.tokens["action.deploy"].unicode).toBe("🚀");
    const only = await compileEmojiTheme(theme, { provider: "native" });
    expect(only.tokens["action.deploy"]).toMatchObject({ sources: [], unicode: "🚀" });
  });

  it("records dataset, provider revisions and license attribution", async () => {
    const { meta } = await compileEmojiTheme(theme);
    expect(meta.theme).toEqual({ id: "compiled-fixture", version: "2.1.0" });
    expect(meta.nativeFallback).toBe(false);
    expect(meta.dataset).toEqual({ emojiVersion: emojiDatasetInfo.emojiVersion, unicodeVersion: emojiDatasetInfo.unicodeVersion, cldrVersion: emojiDatasetInfo.cldrVersion, sourceSha256: emojiDatasetInfo.sourceSha256 });
    expect(meta.providers.map((provider) => provider.id)).toEqual(["fluent-3d", "twemoji"]);
    expect(meta.providers[0]).toMatchObject({ version: publicProviders.fluent3d.version, license: { name: "MIT", attribution: "Fluent Emoji by Microsoft" }, source: "https://github.com/microsoft/fluentui-emoji" });
    expect(meta.providers[1]).toMatchObject({ version: "15.1.0", license: { name: "CC BY 4.0" } });
  });

  it("leads with exact custom assets, then the provider chain, and rejects unknown providers", async () => {
    const custom = defineEmojiTheme({
      "action.deploy": { emoji: "🚀", label: "Deploy", asset: { url: "/icons/deploy.svg", format: "svg", providerId: "acme-icons", providerVersion: "3.0.0" } },
    }, { id: "custom", defaultProvider: "twemoji", nativeFallback: false });
    const compiled = await compileEmojiTheme(custom);
    expect(compiled.tokens["action.deploy"].sources).toEqual([
      { provider: "acme-icons", url: "/icons/deploy.svg", format: "svg" },
      { provider: "twemoji", url: getEmojiUrl("🚀", "twemoji"), format: "png" },
    ]);
    expect(compiled.meta.providers.find((provider) => provider.id === "acme-icons")?.version).toBe("3.0.0");
    await expect(compileEmojiTheme(defineEmojiTheme({ "action.deploy": { emoji: "🚀", label: "Deploy" } }, { defaultProvider: "missing-pack" }))).rejects.toThrow(/Unknown provider "missing-pack"/);
  });

  it("omits providers that cannot render an emoji instead of inventing URLs", async () => {
    // Twemoji 15.1 predates this emoji; the compiled token keeps only the sources that resolve.
    const newest = defineEmojiTheme({ "status.new": { emoji: "🫩", label: "Face with bags under eyes" } }, { defaultProvider: "twemoji", nativeFallback: false });
    expect(getEmojiUrl("🫩", "twemoji")).toBeNull();
    expect((await compileEmojiTheme(newest)).tokens["status.new"]).toMatchObject({ sources: [], unicode: null });
  });

  it("renders a TypeScript module with a token-name union that round-trips as JSON", async () => {
    const compiled = await compileEmojiTheme(theme);
    const source = renderCompiledEmojiThemeModule(compiled);
    expect(source).toContain('import type { CompiledEmojiTheme } from "emoji-styles/compiled";');
    expect(source).toContain('export type EmojiTokenName = "action.deploy" | "action.home" | "status.celebrate";');
    const literal = source.slice(source.indexOf("= {", source.indexOf("export const")) + 2, source.lastIndexOf(";"));
    expect(JSON.parse(literal) as CompiledEmojiTheme).toEqual(compiled);
    expect(source).toBe(renderCompiledEmojiThemeModule(compiled));
    expect(renderCompiledEmojiThemeModule(compiled, { exportName: "iconTheme", typeName: "IconToken" })).toContain("export const iconTheme: CompiledEmojiTheme<IconToken> =");
    expect(() => renderCompiledEmojiThemeModule(compiled, { exportName: "not valid" })).toThrow(/Invalid export name/);
    expect(() => renderCompiledEmojiThemeModule(compiled, { exportName: "same", typeName: "same" })).toThrow(/must differ/);
  });
  it.each(["default", "class", "await", "eval", "arguments", "CompiledEmojiTheme"])("rejects invalid module export name %s", async (exportName) => {
    const compiled = await compileEmojiTheme(theme);
    expect(() => renderCompiledEmojiThemeModule(compiled, { exportName })).toThrow(`Invalid export name: ${exportName}`);
  });

  it.each(["default", "class", "string", "number", "unknown", "never", "CompiledEmojiTheme"])("rejects invalid or conflicting type name %s", async (typeName) => {
    const compiled = await compileEmojiTheme(theme);
    expect(() => renderCompiledEmojiThemeModule(compiled, { typeName })).toThrow(`Invalid type name: ${typeName}`);
  });

  it("keeps valid contextual names, dollar signs and underscores available", async () => {
    const compiled = await compileEmojiTheme(theme);
    expect(renderCompiledEmojiThemeModule(compiled, { exportName: "$theme_2", typeName: "_Token2" })).toContain("export const $theme_2: CompiledEmojiTheme<_Token2>");
    expect(renderCompiledEmojiThemeModule(compiled, { exportName: "type", typeName: "From" })).toContain("export const type: CompiledEmojiTheme<From>");
  });

});

describe("compiled runtime helpers", () => {
  it("looks up own tokens only, localizes labels and maps sizes", async () => {
    const compiled = await compileEmojiTheme(theme);
    expect(getCompiledEmojiToken(compiled, "action.deploy")?.emoji).toBe("🚀");
    expect(getCompiledEmojiToken(compiled, "constructor")).toBeNull();
    expect(getCompiledEmojiToken(compiled, "__proto__")).toBeNull();
    const deploy = compiled.tokens["action.deploy"];
    expect(getCompiledEmojiLabel(deploy)).toBe("Deploy");
    expect(getCompiledEmojiLabel(deploy, "ES-mx")).toBe("Desplegar");
    expect(getCompiledEmojiLabel(deploy, "fr")).toBe("Deploy");
    expect([getCompiledEmojiDimension(), getCompiledEmojiDimension("xl"), getCompiledEmojiDimension(18)]).toEqual([20, 32, 18]);
  });
});

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
describe.skipIf(!existsSync(resolve(dist, "compiled.js")))("built compiled entry", () => {
  it("never reaches the catalog, tokenizer, provider tables or the package root", () => {
    const seen = new Set<string>();
    const queue = [resolve(dist, "compiled.js")];
    const external = new Set<string>();
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/emoji-styles-data|tokenizeEmojiText|emojiData|fluentAssetNames|publicProviders/);
      for (const match of code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
        if (match[1].startsWith(".")) queue.push(resolve(dirname(file), match[1]));
        else external.add(match[1]);
      }
    }
    expect([...external]).toEqual([]);
    expect([...seen].map((file) => file.slice(dist.length + 1)).filter((file) => file === "index.js")).toEqual([]);
    expect(readFileSync(resolve(dist, "compiled.d.ts"), "utf8")).not.toContain("emoji-styles-data");
  });
});
