import { commandKey, commandSpecs, globalOptions } from "./command-spec";
import type { ParsedFlags } from "./types";

export class UsageError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "UsageError"; }
}
export interface ParsedArguments { positionals: string[]; flags: ParsedFlags }

export function parseArguments(args: readonly string[]): ParsedArguments {
  const positionals: string[] = [];
  const flags: ParsedFlags = {};
  const types: Record<string, "boolean" | "string"> = { ...globalOptions };
  for (const command of Object.values(commandSpecs)) Object.assign(types, command.options);
  let literal = false;
  for (let index = 0; index < args.length; index++) {
    let value = args[index];
    if (!literal && value === "--") { literal = true; continue; }
    if (literal || !value.startsWith("-") || value === "-") { positionals.push(value); continue; }
    if (value === "-h") value = "--help";
    if (!value.startsWith("--")) throw new UsageError("UNKNOWN_OPTION", `Unknown option: ${value}. Use --help.`);
    const equals = value.indexOf("=");
    const rawName = value.slice(2, equals === -1 ? undefined : equals);
    const inline = equals === -1 ? undefined : value.slice(equals + 1);
    const negated = rawName.startsWith("no-");
    const name = negated ? rawName.slice(3) : rawName;
    const type = Object.prototype.hasOwnProperty.call(types, name) ? types[name] : undefined;
    if (!type) throw new UsageError("UNKNOWN_OPTION", `Unknown option: --${rawName}. Use --help.`);
    if (Object.prototype.hasOwnProperty.call(flags, name)) throw new UsageError("DUPLICATE_OPTION", `Option --${name} was supplied more than once.`);
    if (negated && (type !== "boolean" || inline !== undefined)) throw new UsageError("INVALID_OPTION_VALUE", `Use --no-${name} only for boolean options, without a value.`);
    if (type === "boolean") {
      if (inline !== undefined && inline !== "true" && inline !== "false") throw new UsageError("INVALID_OPTION_VALUE", `--${name} expects true or false.`);
      flags[name] = negated ? false : inline !== "false";
    } else {
      const next = args[index + 1];
      if (inline === undefined && (next === undefined || next.startsWith("--") || next === "-h")) throw new UsageError("MISSING_OPTION_VALUE", `--${name} requires a value.`);
      flags[name] = inline ?? args[++index];
      if (flags[name] === "" && name !== "fallback") throw new UsageError("INVALID_OPTION_VALUE", `--${name} requires a non-empty value.`);
    }
  }
  return { positionals, flags };
}

export function validateArguments(positionals: readonly string[], flags: ParsedFlags): void {
  const key = commandKey(positionals);
  const spec = Object.prototype.hasOwnProperty.call(commandSpecs, key) ? commandSpecs[key] : undefined;
  if (!spec) throw new UsageError("UNKNOWN_COMMAND", `Unknown command: ${key}. Run emoji-styles help.`);
  const allowed = { ...globalOptions, ...spec.options };
  for (const name of Object.keys(flags)) if (!Object.prototype.hasOwnProperty.call(allowed, name)) throw new UsageError("UNKNOWN_OPTION", `Option --${name} is not supported by ${key}.`);
  const count = positionals.length - key.split(" ").length;
  if (count < spec.minArgs || count > spec.maxArgs) throw new UsageError("INVALID_ARGUMENTS", `Usage: emoji-styles ${spec.usage}`);
  if (flags.format && spec.formats && !spec.formats.includes(String(flags.format))) throw new UsageError("INVALID_OPTION_VALUE", `--format for ${key} must be ${spec.formats.join(" | ")}.`);
  if (key === "studio") {
    if (flags.size !== undefined && (!Number.isInteger(Number(flags.size)) || Number(flags.size) < 16 || Number(flags.size) > 4096)) throw new UsageError("INVALID_OPTION_VALUE", "--size must be an integer from 16 to 4096.");
    if (flags["safe-area"] !== undefined && (!Number.isFinite(Number(flags["safe-area"])) || Number(flags["safe-area"]) <= 0.1 || Number(flags["safe-area"]) > 1)) throw new UsageError("INVALID_OPTION_VALUE", "--safe-area must be greater than 0.1 and at most 1.");
  }
}

/** Output selection must also work when parsing fails. Ignore literal filenames after --. */
export function requestsJson(args: readonly string[]): boolean {
  let requested = false;
  const valueOptions = new Set(Object.values(commandSpecs).flatMap((spec) => Object.entries(spec.options).filter(([, type]) => type === "string").map(([name]) => name)));
  valueOptions.add("config");
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === "--") break;
    if (value === "--json" || value === "--json=true") requested = true;
    if (value === "--no-json" || value === "--json=false") requested = false;
    if (value === "--format=json") requested = true;
    if (value.startsWith("--") && !value.includes("=") && valueOptions.has(value.slice(2))) {
      const next = args[index + 1];
      if (value === "--format" && next === "json") requested = true;
      if (next !== undefined && !next.startsWith("--")) index++;
    }
  }
  return requested;
}
export function stringFlag(flags: ParsedFlags, name: string): string | undefined { const value = flags[name]; return typeof value === "string" ? value : undefined; }
export function booleanFlag(flags: ParsedFlags, name: string): boolean { return flags[name] === true; }
export function listFlag(flags: ParsedFlags, name: string): string[] | undefined { return stringFlag(flags, name)?.split(",").map((value) => value.trim()).filter(Boolean); }
