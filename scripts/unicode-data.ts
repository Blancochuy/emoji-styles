export type SourceQualification =
  | "fully-qualified"
  | "minimally-qualified"
  | "unqualified"
  | "component";

export interface ParsedEmojiRecord {
  emoji: string;
  codepoints: string[];
  qualification: SourceQualification;
  emojiVersion: string;
  label: string;
  group: string;
  subgroup: string;
}

export interface ParsedEmojiTest {
  version: string;
  sourceDate: string;
  records: ParsedEmojiRecord[];
}

export interface GeneratedEmojiRecord extends ParsedEmojiRecord {
  qualification: "fully-qualified" | "component";
  name: string;
  codepoint: string;
}

export interface GeneratedDataset {
  records: GeneratedEmojiRecord[];
  aliases: Record<string, string>;
}

const DATA_LINE = /^([0-9A-F ]+)\s*;\s*(fully-qualified|minimally-qualified|unqualified|component)\s*#\s*\S+\s+E([0-9.]+)\s+(.+)$/;

export function codepointsToEmoji(codepoints: readonly string[]): string {
  return String.fromCodePoint(...codepoints.map((value) => Number.parseInt(value, 16)));
}

export function slugifyEmojiLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseEmojiTest(source: string): ParsedEmojiTest {
  const version = source.match(/^# Version:\s*(\S+)/m)?.[1];
  const sourceDateRaw = source.match(/^# Date:\s*(.+)$/m)?.[1];
  if (!version || !sourceDateRaw) {
    throw new Error("emoji-test.txt is missing its Version or Date header");
  }

  const sourceDate = new Date(sourceDateRaw).toISOString();
  const records: ParsedEmojiRecord[] = [];
  let group = "";
  let subgroup = "";

  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith("# group: ")) {
      group = line.slice("# group: ".length).trim();
      continue;
    }
    if (line.startsWith("# subgroup: ")) {
      subgroup = line.slice("# subgroup: ".length).trim();
      continue;
    }

    const match = line.match(DATA_LINE);
    if (!match) continue;
    const codepoints = match[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number.parseInt(value, 16).toString(16));
    records.push({
      emoji: codepointsToEmoji(codepoints),
      codepoints,
      qualification: match[2] as SourceQualification,
      emojiVersion: match[3],
      label: match[4].trim(),
      group,
      subgroup,
    });
  }

  if (records.length === 0) throw new Error("emoji-test.txt contained no emoji records");
  return { version, sourceDate, records };
}

function selectorAgnosticSequence(codepoints: readonly string[]): string {
  return codepoints.filter((value) => value !== "fe0f").join("-");
}

export function buildDataset(parsed: ParsedEmojiTest): GeneratedDataset {
  const canonicalBySelectorAgnosticSequence = new Map<string, string>();
  const records: GeneratedEmojiRecord[] = [];

  for (const record of parsed.records) {
    if (record.qualification !== "fully-qualified" && record.qualification !== "component") {
      continue;
    }
    const codepoint = record.codepoints.join("-");
    records.push({
      ...record,
      qualification: record.qualification,
      codepoint,
      name: `${slugifyEmojiLabel(record.label)}_${codepoint}`,
    });
    if (record.qualification === "fully-qualified") {
      canonicalBySelectorAgnosticSequence.set(
        selectorAgnosticSequence(record.codepoints),
        record.emoji,
      );
    }
  }

  const aliases: Record<string, string> = {};
  for (const record of parsed.records) {
    if (record.qualification !== "minimally-qualified" && record.qualification !== "unqualified") {
      continue;
    }
    const canonical = canonicalBySelectorAgnosticSequence.get(
      selectorAgnosticSequence(record.codepoints),
    );
    if (!canonical) {
      throw new Error(`No fully-qualified sequence found for ${record.codepoints.join(" ")}`);
    }
    aliases[record.emoji] = canonical;
  }

  return { records, aliases };
}

export function renderGeneratedDataset(options: {
  parsed: ParsedEmojiTest;
  dataset: GeneratedDataset;
  sourceUrl: string;
  sourceSha256: string;
  cldrVersion: string;
  generatorVersion: string;
}): string {
  const { parsed, dataset } = options;
  const lines = [
    'import type { EmojiDatasetInfo, EmojiMetadata } from "./types";',
    "",
    "/**",
    " * Generated from the official Unicode emoji-test.txt RGI dataset.",
    " * Do not edit by hand. Run `pnpm generate` from the repository root.",
    ` * Unicode ${parsed.version}; Emoji ${parsed.version}; CLDR ${options.cldrVersion}.`,
    ` * Source SHA-256: ${options.sourceSha256}`,
    " */",
    "",
    "export const emojiDatasetInfo: EmojiDatasetInfo = " + JSON.stringify({
      unicodeVersion: parsed.version,
      emojiVersion: parsed.version,
      cldrVersion: options.cldrVersion,
      source: `Unicode Emoji ${parsed.version} emoji-test.txt`,
      sourceUrl: options.sourceUrl,
      sourceSha256: options.sourceSha256,
      sourceDate: parsed.sourceDate,
      generatedAt: parsed.sourceDate,
      generatorVersion: options.generatorVersion,
      rgiCount: dataset.records.length,
      aliasCount: Object.keys(dataset.aliases).length,
    }, null, 2) + ";",
    "",
    "// `generatedAt` intentionally uses the pinned upstream source timestamp for reproducible output.",
    "export const emojiData: Record<string, EmojiMetadata> = {",
  ];

  for (const record of dataset.records) {
    lines.push(`  ${JSON.stringify(record.emoji)}: ${JSON.stringify({
      name: record.name,
      alt: record.label.charAt(0).toUpperCase() + record.label.slice(1),
      codepoint: record.codepoint,
      codepoints: record.codepoints,
      sequence: record.codepoint,
      unicodeVersion: parsed.version,
      emojiVersion: record.emojiVersion,
      group: record.group,
      subgroup: record.subgroup,
      qualification: record.qualification,
    })},`);
  }
  lines.push("};", "", "export const emojiAliases: Record<string, string> = {");
  for (const [alias, canonical] of Object.entries(dataset.aliases)) {
    lines.push(`  ${JSON.stringify(alias)}: ${JSON.stringify(canonical)},`);
  }
  lines.push("};", "");
  return lines.join("\n");
}
