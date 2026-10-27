import { Script } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { buildDataset, parseEmojiTest, renderGeneratedDataset } from "../unicode-data";

const SOURCE_FIXTURE = `# emoji-test.txt
# Date: 2025-08-04, 20:55:31 GMT
# Version: 17.0
# group: Symbols
# subgroup: heart
2764 FE0F ; fully-qualified # ❤️ E0.6 red heart
2764      ; unqualified     # ❤ E0.6 red heart
# group: People & Body
# subgroup: hand-fingers-closed
1F44D 1F3FD ; fully-qualified # 👍🏽 E1.0 thumbs up: medium skin tone
# group: Component
# subgroup: skin-tone
1F3FD ; component # 🏽 E1.0 medium skin tone
`;

describe("Unicode data generator", () => {
  it("preserves complete codepoint sequences and builds selector aliases", () => {
    const parsed = parseEmojiTest(SOURCE_FIXTURE);
    const dataset = buildDataset(parsed);

    expect(dataset.records.map((record) => record.codepoint)).toEqual([
      "2764-fe0f",
      "1f44d-1f3fd",
      "1f3fd",
    ]);
    expect(dataset.aliases).toEqual({ "❤": "❤️" });
  });

  it("renders source versions, checksum, and generator version", () => {
    const parsed = parseEmojiTest(SOURCE_FIXTURE);
    const output = renderGeneratedDataset({
      parsed,
      dataset: buildDataset(parsed),
      sourceUrl: "https://unicode.example/emoji-test.txt",
      sourceSha256: "abc123",
      cldrVersion: "48",
      generatorVersion: "2.0.0",
    });

    expect(output).toContain('"unicodeVersion": "17.0"');
    expect(output).toContain('"cldrVersion": "48"');
    expect(output).toContain('"generatorVersion": "2.0.0"');
    expect(output).toContain('"👍🏽"');
    const exports: Record<string, unknown> = {};
    new Script(ts.transpileModule(output, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText).runInNewContext({ exports });
    const data = JSON.parse(JSON.stringify(exports.emojiData));
    expect(data["👍🏽"]).toEqual({
      name: "thumbs-up-medium-skin-tone_1f44d-1f3fd", alt: "Thumbs up: medium skin tone",
      codepoint: "1f44d-1f3fd", codepoints: ["1f44d", "1f3fd"], sequence: "1f44d-1f3fd",
      unicodeVersion: "17.0", emojiVersion: "1.0", group: "People & Body",
      subgroup: "hand-fingers-closed", qualification: "fully-qualified",
    });
    expect(data["🏽"].qualification).toBe("component");
    expect(exports.emojiAliases).toEqual({ "❤": "❤️" });
  });
});
