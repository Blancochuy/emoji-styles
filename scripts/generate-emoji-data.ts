#!/usr/bin/env node
/**
 * generate-emoji-data.ts
 *
 * Generates packages/core/src/data.ts by VALIDATING emoji URLs against CDN.
 *
 * Strategy:
 * 1. Download emoji-datasource (Unicode CLDR metadata)
 * 2. For each emoji, try multiple CDN filename patterns
 * 3. Validate which URLs actually work (HTTP 200)
 * 4. Generate data.ts with only confirmed-working emojis
 *
 * Usage:
 *   npx tsx scripts/generate-emoji-data.ts              # Default: 80 emojis
 *   npx tsx scripts/generate-emoji-data.ts --all         # All ~1600 emojis
 *   npx tsx scripts/generate-emoji-data.ts --quick       # Skip validation, use known patterns
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// ─── Types ───
interface EmojiDatasourceEntry {
  name: string;
  unified: string;
  image: string;
  short_name: string;
  short_names: string[];
  category: string;
  subcategory: string;
  added_in: string;
  has_img_apple: boolean;
  has_img_google: boolean;
}

interface GeneratedEmoji {
  char: string;
  name: string;
  alt: string;
  codepoint: string;
  category: string;
}

// ─── URL validation cache ───
const urlCache = new Map<string, boolean>();
async function checkUrl(url: string): Promise<boolean> {
  if (urlCache.has(url)) return urlCache.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    const ok = res.ok;
    urlCache.set(url, ok);
    return ok;
  } catch {
    urlCache.set(url, false);
    return false;
  }
}

// ─── CDN filename candidate generation ───
function generateCandidates(entry: EmojiDatasourceEntry): string[] {
  const unified = entry.unified.split("-")[0].toLowerCase();
  const candidates: string[] = [];

  // Pattern 1: short_name with underscores → hyphens
  candidates.push(entry.short_name.replace(/_/g, "-") + "_" + unified);

  // Pattern 2: all short_names variants
  for (const sn of entry.short_names) {
    const c = sn.replace(/_/g, "-") + "_" + unified;
    if (!candidates.includes(c)) candidates.push(c);
  }

  // Pattern 3: Unicode name → lowercase, spaces/special → hyphens
  const nameSlug = entry.name
    .toLowerCase()
    .replace(/[:\u2019\u2018\u201C\u201D\uFE0F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const nameCandidate = nameSlug + "_" + unified;
  if (!candidates.includes(nameCandidate)) candidates.push(nameCandidate);

  // Pattern 4: Remove "face" prefix/suffix variations
  // e.g. "grinning-face-with-big-eyes" → "grinning-face"
  if (nameSlug.includes("face")) {
    const simplified = nameSlug.replace(/-with-.*$/, "").replace(/-face$/, "-face");
    const sc = simplified + "_" + unified;
    if (!candidates.includes(sc)) candidates.push(sc);
  }

  return candidates;
}

// ─── Unicode helpers ───
function codepointToChar(codepoint: string): string {
  try {
    const parts = codepoint.split("-").filter(p => p !== "fe0f");
    return String.fromCodePoint(...parts.map(p => parseInt(p, 16)));
  } catch {
    return "";
  }
}

// ─── Known working emojis (hardcoded fallback) ───
const KNOWN_WORKING: Record<string, string> = {
  "👋": "waving-hand_1f44b",
  "👍": "thumbs-up_1f44d",
  "👏": "clapping-hands_1f44f",
  "🙌": "raising-hands_1f64c",
  "😀": "grinning-face_1f600",
  "😂": "face-with-tears-of-joy_1f602",
  "😍": "smiling-face-with-heart-eyes_1f60d",
  "🤔": "thinking-face_1f914",
  "😎": "smiling-face-with-sunglasses_1f60e",
  "🥳": "partying-face_1f973",
  "😢": "crying-face_1f622",
  "😡": "angry-face_1f621",
  "🚀": "rocket_1f680",
  "💡": "light-bulb_1f4a1",
  "🔥": "fire_1f525",
  "⭐": "star_2b50",
  "🏆": "trophy_1f3c6",
  "🎯": "direct-hit_1f3af",
  "💰": "money-bag_1f4b0",
  "📊": "bar-chart_1f4ca",
  "📋": "clipboard_1f4cb",
  "🎤": "microphone_1f3a4",
  "✏️": "pencil_270f",
  "📅": "calendar_1f4c5",
  "🔍": "magnifying-glass-tilted-left_1f50d",
  "✅": "check-mark-button_2705",
  "🎉": "party-popper_1f389",
  "⚡": "high-voltage_26a1",
  "✨": "sparkles_2728",
  "❤️": "red-heart_2764",
  "📣": "megaphone_1f4e3",
  "🔒": "locked_1f512",
  "👀": "eyes_1f440",
  "🧊": "ice_1f9ca",
  "🧮": "abacus_1f9ee",
  "💳": "credit-card_1f4b3",
  "🛒": "shopping-cart_1f6d2",
  "🎁": "wrapped-gift_1f381",
  "💧": "droplet_1f4a7",
  "🐾": "paw-prints_1f43e",
  "🗑️": "wastebasket_1f5d1",
  "🎨": "artist-palette_1f3a8",
  "🔨": "hammer_1f528",
  "⏰": "alarm-clock_23f0",
  "💻": "laptop_1f4bb",
  "🎓": "graduation-cap_1f393",
  "🏫": "school_1f3eb",
  "🌟": "glowing-star_1f31f",
  "🕵️": "detective_1f575",
  "🔎": "magnifying-glass-tilted-right_1f50e",
  "🎟️": "admission-tickets_1f39f",
  "🪙": "coin_1fa99",
  "📢": "megaphone_1f4e3",
};

// ─── Main ───
async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes("--all");
  const quick = args.includes("--quick");

  console.log("📦 Downloading emoji-datasource...");
  const res = await fetch("https://unpkg.com/emoji-datasource@15.1.0/emoji.json");
  const raw: EmojiDatasourceEntry[] = await res.json();
  console.log(`   Found ${raw.length} emojis in Unicode CLDR`);

  // Filter
  const filtered = raw.filter(e => {
    if (!e.has_img_apple) return false;
    if (e.subcategory === "keycap") return false;
    if (e.category === "Flags") return false;
    if (e.category === "Component") return false;
    return true;
  });

  const toProcess = includeAll ? filtered : filtered.slice(0, 100);
  console.log(`   Processing ${toProcess.length} emojis${includeAll ? " (--all)" : ""}`);

  const valid: GeneratedEmoji[] = [];

  if (quick) {
    // Quick mode: use known working emojis
    console.log("\n⚡ Quick mode: using known working emojis");
    for (const [char, name] of Object.entries(KNOWN_WORKING)) {
      const cp = name.split("_").pop() || "";
      valid.push({
        char,
        name,
        alt: name.split("_").slice(0, -1).join("-").replace(/-/g, " "),
        codepoint: cp,
        category: "Objects",
      });
    }
    console.log(`   Using ${valid.length} known emojis`);
  } else {
    // Validate mode: test URLs
    console.log("\n🔍 Validating CDN URLs...");
    const CDN = "https://em-content.zobj.net/source/microsoft-teams/400";

    for (let i = 0; i < toProcess.length; i++) {
      const entry = toProcess[i];
      const unified = entry.unified.split("-")[0].toLowerCase();
      const char = codepointToChar(unified);

      if (!char) continue;

      const candidates = generateCandidates(entry);
      let found = false;

      for (const candidate of candidates) {
        const url = `${CDN}/${candidate}.png`;
        if (await checkUrl(url)) {
          valid.push({
            char,
            name: candidate,
            alt: entry.name.charAt(0) + entry.name.slice(1).toLowerCase(),
            codepoint: unified,
            category: entry.category,
          });
          found = true;
          break;
        }
      }

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   ${i + 1}/${toProcess.length} checked, ${valid.length} valid...\r`);
      }
    }
    console.log(`\n   ✅ ${valid.length} emojis validated`);
  }

  // Generate data.ts
  console.log("\n📝 Generating data.ts...");

  const byCategory: Record<string, GeneratedEmoji[]> = {};
  for (const e of valid) {
    (byCategory[e.category] ??= []).push(e);
  }

  let output = `import type { EmojiData } from "./types";\n\n`;
  output += `/**\n * Auto-generated emoji data mapping.\n`;
  output += ` * Source: emoji-datasource (Unicode CLDR) + em-content.zobj.net CDN\n`;
  output += ` * Generated: ${new Date().toISOString().split("T")[0]}\n`;
  output += ` * Count: ${valid.length} emojis\n`;
  output += ` *\n`;
  output += ` * To regenerate: npx tsx scripts/generate-emoji-data.ts\n`;
  output += ` * To add all emojis: npx tsx scripts/generate-emoji-data.ts --all\n`;
  output += ` * Quick (no validation): npx tsx scripts/generate-emoji-data.ts --quick\n`;
  output += ` */\n\n`;
  output += `export const emojiData: Record<string, EmojiData> = {\n`;

  for (const [category, emojis] of Object.entries(byCategory)) {
    output += `  // ─── ${category} (${emojis.length}) ───\n`;
    for (const e of emojis) {
      const escaped = JSON.stringify(e.char);
      output += `  ${escaped}: { name: ${JSON.stringify(e.name)}, alt: ${JSON.stringify(e.alt)}, codepoint: ${JSON.stringify(e.codepoint)} },\n`;
    }
    output += `\n`;
  }

  output += `};\n`;

  const outPath = join(import.meta.dirname, "..", "packages", "core", "src", "data.ts");
  writeFileSync(outPath, output, "utf-8");
  console.log(`   ✅ Written to ${outPath}`);
  console.log(`   📊 ${valid.length} emojis across ${Object.keys(byCategory).length} categories`);
}

main().catch(console.error);
