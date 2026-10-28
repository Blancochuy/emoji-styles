import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEmojiTheme, validateEmojiTheme, type EmojiTheme } from "emoji-styles";

const MODULE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts"]);
const isThemeLike = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as { tokens?: unknown }).tokens === "object" && (value as { tokens?: unknown }).tokens !== null;

/**
 * Load a theme without adding a TypeScript runtime.
 * - `.json`: code-free; the output of `serializeEmojiTheme` (or a schema-less token map). Preferred for CI.
 * - `.js` `.mjs` `.cjs`: imported with Node's own loader, which EXECUTES the file like any script.
 * - `.ts` `.mts`: imported only if this Node version strips types natively (22.18+/23.6+); no transpiler is bundled.
 * A module may export the theme as `default`, as `emojiTheme`, or be the only theme-like export.
 */
export async function loadThemeModule(path: string): Promise<EmojiTheme> {
  const extension = extname(path).toLowerCase();
  if ((await stat(path)).size > 2 * 1024 * 1024) throw new Error("Theme module exceeds 2 MB.");
  if (extension === ".json") return parseEmojiTheme(await readFile(path, "utf8"));
  if (!MODULE_EXTENSIONS.has(extension)) throw new Error(`Unsupported theme module extension "${extension}". Use .json (serializeEmojiTheme output), .mjs/.js, or .ts on a Node version that strips types.`);
  let loaded: Record<string, unknown>;
  try {
    loaded = await import(/* @vite-ignore */ pathToFileURL(path).href) as Record<string, unknown>;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ERR_UNKNOWN_FILE_EXTENSION" || code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") {
      throw new Error(`This Node.js (${process.version}) cannot import ${extension} files without a transpiler. Export the theme as JSON with serializeEmojiTheme(), use a .mjs module, or run Node 22.18+/23.6+.`);
    }
    throw new Error(`Could not import the theme module: ${error instanceof Error ? error.message : String(error)}`);
  }
  const named = Object.entries(loaded).filter(([name, value]) => name !== "default" && isThemeLike(value));
  const candidate = isThemeLike(loaded.default) ? loaded.default : isThemeLike(loaded.emojiTheme) ? loaded.emojiTheme : named.length === 1 ? named[0][1] : undefined;
  if (!candidate) {
    throw new Error(named.length > 1
      ? `Theme module exports several themes (${named.map(([name]) => name).join(", ")}); export one as default or as emojiTheme.`
      : "Theme module has no theme export. Export a defineEmojiTheme() result as default or as emojiTheme.");
  }
  return validateEmojiTheme(candidate).valid ? candidate as unknown as EmojiTheme : parseEmojiTheme(candidate);
}
