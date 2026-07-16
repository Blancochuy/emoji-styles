import { existsSync, readFileSync, readdirSync, readlinkSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const skills = ["emoji-styles", "emoji-asset-creator"] as const;

function filesUnder(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("Codex skills", () => {
  for (const name of skills) {
    it(`validates ${name} structure, metadata, and package size`, () => {
      const root = resolve(repository, "skills", name);
      const skill = readFileSync(resolve(root, "SKILL.md"), "utf8");
      const metadata = readFileSync(resolve(root, "agents", "openai.yaml"), "utf8");
      expect(skill).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`));
      expect(skill).not.toContain("TODO");
      expect(skill.split("\n").length).toBeLessThan(500);
      expect(metadata).toContain(`default_prompt: "Use $${name}`);
      expect(metadata).toContain("short_description:");
      expect(existsSync(resolve(root, "scripts"))).toBe(true);
      expect(existsSync(resolve(root, "references"))).toBe(true);
      expect(existsSync(resolve(root, "assets"))).toBe(true);
      const bytes = filesUnder(root).reduce((total, file) => total + statSync(file).size, 0);
      expect(bytes).toBeLessThan(1024 * 1024);
    });

    it(`exposes ${name} through repository discovery`, () => {
      const link = resolve(repository, ".agents", "skills", name);
      expect(readlinkSync(link)).toBe(`../../skills/${name}`);
      expect(readFileSync(resolve(link, "SKILL.md"), "utf8")).toContain(`name: ${name}`);
    });
  }

  it("keeps every bundled Python helper syntactically valid and self-documenting", () => {
    for (const name of skills) {
      const scripts = resolve(repository, "skills", name, "scripts");
      for (const file of readdirSync(scripts).filter((entry) => entry.endsWith(".py"))) {
        const path = resolve(scripts, file);
        const compile = spawnSync("python3", ["-c", "import pathlib,sys; p=pathlib.Path(sys.argv[1]); compile(p.read_text(), str(p), 'exec')", path], { encoding: "utf8" });
        expect(compile.stderr, `${path} must compile`).toBe("");
        expect(compile.status).toBe(0);
        if (file.startsWith("_")) continue;
        const help = spawnSync("python3", [path, "--help"], { cwd: scripts, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
        expect(help.stderr, `${path} --help must succeed`).toBe("");
        expect(help.status).toBe(0);
        expect(help.stdout).toContain("usage:");
      }
    }
  });

  it("keeps every Custom Emoji Lab asset tied to its manifest and provenance", () => {
    const examples = [
      { id: "custom-emoji", emoji: "🤖", file: "1f916.webp" },
      { id: "custom-gloss", emoji: "😍", file: "1f60d.webp" },
      { id: "custom-soft-3d", emoji: "🚀", file: "1f680.webp" },
      { id: "custom-clay", emoji: "💡", file: "1f4a1.webp" },
    ];

    for (const example of examples) {
      const root = resolve(repository, "demo", "src", "custom-emoji", example.id);
      const manifest = JSON.parse(readFileSync(resolve(root, "emoji-provider.json"), "utf8"));
      const provenance = JSON.parse(readFileSync(resolve(root, "PROVENANCE.json"), "utf8"));
      const entry = manifest.assets[example.emoji];
      const asset = readFileSync(resolve(root, "assets", entry.file));

      expect(manifest.id).toBe(example.id);
      expect(manifest.generated).toBe(true);
      expect(entry).toMatchObject({ file: example.file, width: 256, height: 256 });
      expect(createHash("sha256").update(asset).digest("hex")).toBe(entry.sha256);
      expect(asset.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(asset.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(provenance.generator.provider).toBe("OpenAI built-in image_gen");
      expect(provenance.license).toContain("user confirmation required");
    }
  });

  it("keeps freeform visual direction as a first-class asset workflow", () => {
    const root = resolve(repository, "skills", "emoji-asset-creator");
    const skill = readFileSync(resolve(root, "SKILL.md"), "utf8");
    const promptPatterns = readFileSync(resolve(root, "references", "prompt-patterns.md"), "utf8");
    const specification = readFileSync(resolve(root, "references", "asset-specification.md"), "utf8");

    expect(skill).toContain("freeform styles are first-class");
    expect(promptPatterns).toContain("never require the user to select one");
    expect(specification).toContain("Do not force the direction into a vendor category");
  });
});
