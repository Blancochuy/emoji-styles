import type { AuditEdit } from "../types";

export function applyEdits(source: string, edits: readonly AuditEdit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let output = source;
  let previousStart = source.length + 1;
  for (const edit of sorted) {
    if (edit.start < 0 || edit.end < edit.start || edit.end > source.length) throw new Error(`Invalid edit range ${edit.start}:${edit.end}`);
    if (edit.end > previousStart) throw new Error("Overlapping audit fixes cannot be applied safely");
    output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`;
    previousStart = edit.start;
  }
  return output;
}

export function createPatch(path: string, before: string, after: string): string {
  if (before === after) return "";
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (suffix < oldLines.length - prefix && suffix < newLines.length - prefix && oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]) suffix++;
  const contextStart = Math.max(0, prefix - 2);
  const oldEnd = Math.min(oldLines.length, oldLines.length - suffix + 2);
  const newEnd = Math.min(newLines.length, newLines.length - suffix + 2);
  const oldChunk = oldLines.slice(contextStart, oldEnd);
  const newChunk = newLines.slice(contextStart, newEnd);
  const commonPrefix = Math.max(0, prefix - contextStart);
  const commonSuffix = Math.max(0, Math.min(2, suffix));
  const lines = [`--- a/${path}`, `+++ b/${path}`, `@@ -${contextStart + 1},${oldChunk.length} +${contextStart + 1},${newChunk.length} @@`];
  for (let index = 0; index < commonPrefix; index++) lines.push(` ${oldChunk[index]}`);
  for (const line of oldChunk.slice(commonPrefix, oldChunk.length - commonSuffix)) lines.push(`-${line}`);
  for (const line of newChunk.slice(commonPrefix, newChunk.length - commonSuffix)) lines.push(`+${line}`);
  for (const line of newChunk.slice(newChunk.length - commonSuffix)) lines.push(` ${line}`);
  return `${lines.join("\n")}\n`;
}
