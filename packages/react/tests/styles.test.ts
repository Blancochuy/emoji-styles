// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("React package styles", () => {
  it("pixelates only image elements whose current source is SerenityOS", async () => {
    const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toContain(
      '.emoji-styles__image[src*="/SerenityOS/serenity@"][src*="/Base/res/emoji/"]',
    );
    expect(css).toContain("image-rendering: pixelated");
    expect(css).not.toContain('[data-provider="serenityos"]');
  });
});
