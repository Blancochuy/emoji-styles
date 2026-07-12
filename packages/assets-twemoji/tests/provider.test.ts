import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getEmojiUrl } from "emoji-styles";
import { localTwemojiProvider } from "../src/index";

interface ManifestAsset {
  file: string;
  sha256: string;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(packageRoot, "public/emoji/twemoji/15.1.0");

describe("local Twemoji provider", () => {
  it("resolves catalog URLs from the local public path", () => {
    expect(getEmojiUrl("🚀", localTwemojiProvider)).toBe(
      "/emoji/twemoji/15.1.0/1f680.png",
    );
  });

  it("contains every verified manifest asset", async () => {
    const manifest = JSON.parse(
      await readFile(resolve(assetRoot, "manifest.json"), "utf8"),
    ) as { assets: ManifestAsset[]; failures: string[] };

    expect(manifest.assets).toHaveLength(892);
    expect(manifest.failures).toHaveLength(0);

    for (const asset of manifest.assets) {
      const bytes = await readFile(resolve(assetRoot, asset.file));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
  });
});
