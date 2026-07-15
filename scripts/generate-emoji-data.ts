#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDataset, parseEmojiTest, renderGeneratedDataset } from "./unicode-data";

const UNICODE_VERSION = "17.0";
const CLDR_VERSION = "48";
const GENERATOR_VERSION = "2.0.0";
const SOURCE_URL = `https://www.unicode.org/Public/${UNICODE_VERSION}.0/emoji/emoji-test.txt`;
const SOURCE_SHA256 = "1d8a944f88d7952f7ef7c5167fef3c67995bcae24543949710231b03a201acda";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "../packages/data/src/generated.ts");
const check = process.argv.includes("--check") || process.argv.includes("--validate");

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Unable to download ${SOURCE_URL}: HTTP ${response.status}`);
const source = await response.text();
const sourceSha256 = createHash("sha256").update(source).digest("hex");
if (sourceSha256 !== SOURCE_SHA256) {
  throw new Error(`Unicode source checksum mismatch: expected ${SOURCE_SHA256}, received ${sourceSha256}`);
}

const parsed = parseEmojiTest(source);
if (parsed.version !== UNICODE_VERSION) {
  throw new Error(`Expected Unicode ${UNICODE_VERSION}, received ${parsed.version}`);
}
const dataset = buildDataset(parsed);
const output = renderGeneratedDataset({
  parsed,
  dataset,
  sourceUrl: SOURCE_URL,
  sourceSha256,
  cldrVersion: CLDR_VERSION,
  generatorVersion: GENERATOR_VERSION,
});

if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) throw new Error("Generated Unicode data is stale. Run `pnpm generate`.");
  console.log(`Unicode ${UNICODE_VERSION}: ${dataset.records.length} RGI entries and ${Object.keys(dataset.aliases).length} aliases are current.`);
} else {
  await writeFile(outputPath, output, "utf8");
  console.log(`Wrote ${dataset.records.length} RGI entries and ${Object.keys(dataset.aliases).length} aliases to ${outputPath}`);
}
