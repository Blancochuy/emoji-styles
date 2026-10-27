import { emitKeypressEvents, type Key } from "node:readline";
import { stripVTControlCharacters } from "node:util";
import type { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import { StudioController, type Execute, type StudioOptions } from "./controller";

export interface StudioTerminal {
  input: Readable & { isTTY?: boolean; isRaw?: boolean; setRawMode?: (mode: boolean) => unknown };
  output: Writable & { isTTY?: boolean; columns?: number; rows?: number };
  signals: EventEmitter;
}
const ENTER = "\x1b[?1049h\x1b[?25l";
const LEAVE = "\x1b[?25h\x1b[?1049l";

/** Remove terminal controls from filenames/results before drawing them. */
export function clean(value: string): string {
  const withoutTitles = value.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\|$)/g, "");
  return stripVTControlCharacters(withoutTitles).replace(/[\p{Cc}\p{Cf}]/gu, "");
}
function clip(value: string, width: number): string {
  let used = 0;
  let output = "";
  for (const char of clean(value)) {
    const cells = /\p{Mark}/u.test(char) ? 0 : char.codePointAt(0)! > 127 ? 2 : 1;
    if (used + cells > width) break;
    used += cells; output += char;
  }
  return output;
}
export function renderStudio(state: StudioController, columns = 80, rows = 24): string {
  const width = Math.max(1, columns - 1);
  if (columns < 40 || rows < 12) return ["Emoji Styles / Studio", "Resize to at least 40 x 12.", "Esc / Ctrl+C to exit."].slice(0, Math.max(1, rows - 1)).map((line) => clip(line, width)).join("\n");
  const header = ["EMOJI STYLES / STUDIO", ...(rows >= 18 ? ["Local images. Deterministic processing.", ""] : []), `Input   ${state.input}`, `Output  ${state.output}`, `Export  ${state.size}px ${state.format.toUpperCase()} | safe area ${state.safeArea}`, ...(rows >= 18 ? [""] : [])];
  const footer = [state.busy ? `${state.busy}...${state.stopped ? " Stop requested; waiting for the current operation." : ""}` : state.notice, ""];
  let content: string[];
  const space = Math.max(1, rows - header.length - footer.length - 3);
  let keys = "Up/Down move | Enter select | Esc back | Ctrl+C exit";
  if (state.screen === "input" || state.screen === "output") {
    content = [`${state.screen === "input" ? "1. Source file or directory" : "2. Output file or directory"} (inside this project)`, `> ${state.draft}_`];
    keys = "Type path | Ctrl+U clear | Enter continue | Esc back";
  } else if (state.screen === "confirm") {
    content = [`Write ${state.preview?.changes?.length ?? 0} file(s) from the reviewed preview?`, `${state.selection === 0 ? ">" : " "} Keep preview; do not write`, `${state.selection === 1 ? ">" : " "} Write files and validate`];
    keys = "Up/Down choose | Enter confirm | Esc cancel";
  } else if (state.screen === "details") {
    const maxScroll = Math.max(0, state.details.length - space);
    state.scroll = Math.min(state.scroll, maxScroll);
    content = state.details.slice(state.scroll, state.scroll + space);
    keys = `Up/Down scroll (${state.scroll + 1}/${Math.max(1, state.details.length)}) | Enter/Esc menu`;
  } else {
    const menu = state.menu();
    const start = Math.max(0, Math.min(state.selection - Math.floor(space / 2), menu.length - space));
    content = menu.slice(start, start + space).map((item, index) => `${state.selection === start + index ? ">" : " "} ${item.label}`);
  }
  return [...header, ...content.slice(0, space), ...footer, keys].slice(0, rows - 1).map((line) => clip(line, width)).join("\n");
}

export async function runStudio(options: StudioOptions, execute: Execute, terminal: StudioTerminal = { input: process.stdin, output: process.stdout, signals: process }): Promise<number> {
  const { input, output, signals } = terminal;
  if (!input.isTTY || !output.isTTY || !input.setRawMode) throw new Error("Studio requires interactive stdin and stdout. Use assets commands with --json for automation.");
  const wasRaw = input.isRaw ?? false;
  const wasFlowing = input.readableFlowing;
  const state = new StudioController(options, execute, draw);
  const queue: { text: string; key: Key }[] = [];
  let wake: (() => void) | undefined;
  let failure: Error | undefined;
  let outputFailed = false;
  let active = false;
  function draw(): void { if (active && !failure) output.write(`\x1b[H\x1b[2J${renderStudio(state, output.columns, output.rows)}`); }
  function stop(code: number): void { state.stop(code); wake?.(); }
  function onKey(text: string, key: Key = {}): void {
    if (key.ctrl && (key.name === "c" || key.name === "d")) { stop(130); return; }
    if (key.name === "escape" && !state.busy && ((output.columns ?? 80) < 40 || (output.rows ?? 24) < 12)) { stop(0); return; }
    // Never queue actions typed during an image operation or pasted confirmations.
    if (state.busy || queue.length >= 4096) return;
    queue.push({ text, key }); wake?.();
  }
  function onEnd(): void { stop(130); }
  function onError(error: Error): void { failure = error; stop(1); }
  function onOutputError(error: Error): void { outputFailed = true; onError(error); }
  const onInterrupt = () => stop(130);
  const onTerminate = () => stop(143);
  const onHangup = () => stop(129);
  try {
    emitKeypressEvents(input);
    input.on("keypress", onKey);
    input.on("end", onEnd);
    input.on("close", onEnd);
    input.on("error", onError);
    output.on("error", onOutputError);
    output.on("resize", draw);
    signals.on("SIGINT", onInterrupt);
    signals.on("SIGTERM", onTerminate);
    signals.on("SIGHUP", onHangup);
    input.setRawMode(true);
    input.resume();
    output.write(ENTER); active = true; draw();
    while (!state.stopped) {
      if (!queue.length) await new Promise<void>((resolve) => { wake = resolve; });
      wake = undefined;
      if (state.stopped) break;
      const event = queue.shift();
      if (!event) continue;
      const { text, key } = event;
      if ((output.columns ?? 80) < 40 || (output.rows ?? 24) < 12) continue;
      const previousScreen = state.screen;
      if (key.name === "escape") state.back();
      else if (state.screen === "input" || state.screen === "output") {
        if (key.name === "return") await state.acceptPath();
        else if (key.name === "backspace") state.draft = Array.from(state.draft).slice(0, -1).join("");
        else if (key.ctrl && key.name === "u") state.draft = "";
        else if (!key.ctrl && !key.meta && text && !key.sequence?.startsWith("\x1b")) state.draft = (state.draft + clean(text)).slice(0, 4096);
      } else if (state.screen === "details") {
        if (key.name === "return") state.back();
        else if (key.name === "up") state.scroll = Math.max(0, state.scroll - 1);
        else if (key.name === "down") state.scroll++;
        else if (key.name === "pageup") state.scroll = Math.max(0, state.scroll - 8);
        else if (key.name === "pagedown") state.scroll += 8;
      } else {
        const length = state.screen === "confirm" ? 2 : state.menu().length;
        if (key.name === "up") state.selection = (state.selection + length - 1) % length;
        else if (key.name === "down" || key.name === "tab") state.selection = (state.selection + 1) % length;
        else if (key.name === "return") {
          if (state.screen === "confirm") await state.confirmApply();
          else await state.perform(state.menu()[state.selection].action);
        }
      }
      if (state.screen !== previousScreen) queue.length = 0;
      draw();
    }
    if (failure) throw failure;
    return state.exitCode;
  } finally {
    active = false;
    input.off("keypress", onKey); input.off("end", onEnd); input.off("close", onEnd); input.off("error", onError);
    output.off("error", onOutputError); output.off("resize", draw);
    signals.off("SIGINT", onInterrupt); signals.off("SIGTERM", onTerminate); signals.off("SIGHUP", onHangup);
    try { input.setRawMode(wasRaw); }
    finally {
      if (wasFlowing !== true) input.pause();
      if (!output.destroyed && !outputFailed) {
        output.write(LEAVE);
        output.write(`Studio closed.${state.lastApplied ? ` Output: ${clean(state.lastApplied)}.` : ""}\n`);
      }
    }
  }
}
