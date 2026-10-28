import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PassThrough, Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { runCli } from "../src/index";
import { StudioController } from "../src/studio/controller";
import { clean, renderStudio, runStudio } from "../src/studio/terminal";

const directories: string[] = [];
async function fixture() {
  const cwd = await mkdtemp(resolve(tmpdir(), "emoji-studio-")); directories.push(cwd);
  await mkdir(resolve(cwd, "raw images"));
  const foreground = await sharp({ create: { width: 40, height: 30, channels: 4, background: "#ed6655" } }).png().toBuffer();
  await sharp({ create: { width: 80, height: 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: foreground, left: 20, top: 15 }]).png().toFile(resolve(cwd, "raw images", "1f680.png"));
  return cwd;
}
afterEach(async () => { await Promise.all(directories.splice(0).map((cwd) => rm(cwd, { recursive: true, force: true }))); });

class Input extends PassThrough {
  isTTY = true;
  isRaw = false;
  setRawMode(mode: boolean) { this.isRaw = mode; return this; }
}
class Output extends Writable {
  isTTY = true;
  columns = 80;
  rows = 24;
  text = "";
  _write(chunk: Buffer, _encoding: string, callback: () => void) { this.text += chunk.toString(); callback(); }
}
function terminal() { const input = new Input(); input.pause(); return { input, output: new Output(), signals: new EventEmitter() }; }
function key(input: Input, name: string, ctrl = false) { input.emit("keypress", "", { name, ctrl }); }
const unused = async () => ({ command: "assets inspect", ok: true, summary: "Nothing to inspect" });

// These exercise image operations and filesystem effects, not just menu snapshots.
describe("Studio workflow", () => {
  it("inspects, previews without writes, defaults to cancel, then applies and validates", async () => {
    const cwd = await fixture();
    const state = new StudioController({ input: "raw images", output: "normalized" }, (args) => runCli(args, { cwd }));
    await state.acceptPath();
    await state.acceptPath();
    expect(state.details.join("\n")).toContain("Transparent pixels: 75.0%");
    await state.perform("preview");
    expect(state.preview?.ok).toBe(true);
    await expect(readdir(resolve(cwd, "normalized"))).rejects.toThrow();
    await state.perform("apply");
    expect(state.selection).toBe(0);
    await state.confirmApply();
    await expect(readdir(resolve(cwd, "normalized"))).rejects.toThrow();
    await state.perform("apply"); state.selection = 1;
    await state.confirmApply();
    expect(state.lastApplied).toBe("normalized");
    expect(state.details.join("\n")).toContain("OK  Validated 1 asset(s)");
    expect((await sharp(await readFile(resolve(cwd, "normalized", "1f680.webp"))).metadata()).width).toBe(256);
    expect(await readdir(resolve(cwd, "raw images"))).toEqual(["1f680.png"]);
    await state.perform("preview");
    await state.perform("apply");
    expect(state.screen).not.toBe("confirm");
    expect(state.notice).toContain("already exist");
  });

  it("requires another review if the output changes after confirmation", async () => {
    const cwd = await fixture();
    const state = new StudioController({ input: "raw images", output: "normalized" }, (args) => runCli(args, { cwd }));
    await state.perform("preview");
    await state.perform("apply"); state.selection = 1;
    await mkdir(resolve(cwd, "normalized"));
    await writeFile(resolve(cwd, "normalized", "1f680.webp"), "keep this file");
    await state.confirmApply();
    expect(state.details[0]).toContain("changed");
    expect(await readFile(resolve(cwd, "normalized", "1f680.webp"), "utf8")).toBe("keep this file");
  });

  it("invalidates previews after settings changes and makes failures recoverable", async () => {
    const state = new StudioController({}, async () => { throw new Error("Unreadable image"); });
    await state.perform("inspect");
    expect(state.details.join("\n")).toContain("Unreadable image");
    state.preview = { command: "assets normalize", ok: true, summary: "Preview" };
    state.back(); await state.perform("format");
    expect(state.format).toBe("png"); expect(state.preview).toBeUndefined();
    await state.perform("apply"); expect(state.notice).toContain("Preview normalization");
  });

  it("returns from path editing without losing the preview or exiting", async () => {
    const state = new StudioController({}, unused);
    state.screen = "menu";
    state.preview = { command: "assets normalize", ok: true, summary: "Ready" };
    await state.perform("input"); state.draft = "cancelled"; state.back();
    expect(state.screen).toBe("menu"); expect(state.stopped).toBe(false);
    expect(state.input).toBe("./raw"); expect(state.preview).toBeDefined();
    await state.perform("output"); state.back();
    expect(state.screen).toBe("menu"); expect(state.stopped).toBe(false);
    await state.perform("input"); state.draft = "new input"; await state.acceptPath();
    expect(state.screen).toBe("details"); expect(state.input).toBe("new input");
    expect(state.preview).toBeUndefined();
  });

  it("reports empty folders without writes", async () => {
    const cwd = await fixture(); await mkdir(resolve(cwd, "empty"));
    const state = new StudioController({ input: "empty", output: "output" }, (args) => runCli(args, { cwd }));
    await state.perform("inspect"); expect(state.details.join("\n")).toContain("No raster assets");
    await state.perform("preview"); expect(state.preview).toBeUndefined();
    expect(await readdir(cwd)).toEqual(["empty", "raw images"]);
  });
});

describe("Studio terminal", () => {
  it("edits pasted paths, navigates menus, and restores terminal state on Ctrl+C", async () => {
    const io = terminal();
    const execute = vi.fn(unused);
    const running = runStudio({}, execute, io);
    expect(io.input.isRaw).toBe(true);
    key(io.input, "u", true);
    io.input.write("raw images");
    await vi.waitFor(() => expect(clean(io.output.text)).toContain("> raw images_"));
    key(io.input, "return");
    await vi.waitFor(() => expect(io.output.text).toContain("2. Output"));
    key(io.input, "return");
    await vi.waitFor(() => expect(io.output.text).toContain("Source inspection"));
    expect(execute.mock.calls[0][0]).toEqual(["assets", "inspect", "--", "raw images"]);
    key(io.input, "escape");
    await vi.waitFor(() => expect(io.output.text).toContain("> Inspect source images"));
    key(io.input, "down");
    await vi.waitFor(() => expect(io.output.text).toContain("> Preview normalization"));
    key(io.input, "c", true);
    expect(await running).toBe(130);
    expect(io.input.isRaw).toBe(false); expect(io.input.isPaused()).toBe(true);
    expect(io.input.listenerCount("keypress")).toBe(0);
    expect(io.signals.listenerCount("SIGINT")).toBe(0);
    expect(io.output.text).toContain("\x1b[?25h\x1b[?1049l");
  });

  it("discards buffered confirmations when entering the write dialog", async () => {
    const io = terminal();
    const execute = vi.fn(async (args: readonly string[]) => ({ command: "assets normalize", ok: true, summary: "Ready", changes: [{ path: "/project/output/1f680.webp", action: "create" as const, description: "Normalize" }], data: { previews: [] } }));
    const running = runStudio({}, execute, io);
    key(io.input, "return"); await vi.waitFor(() => expect(io.output.text).toContain("2. Output"));
    key(io.input, "return"); await vi.waitFor(() => expect(io.output.text).toContain("Source inspection"));
    key(io.input, "return"); await vi.waitFor(() => expect(io.output.text).toContain("> Inspect source images"));
    key(io.input, "down"); key(io.input, "return");
    await vi.waitFor(() => expect(io.output.text).toContain("Normalization preview"));
    key(io.input, "return"); await vi.waitFor(() => expect(io.output.text).toContain("> Apply reviewed preview"));
    key(io.input, "return"); key(io.input, "down"); key(io.input, "return");
    await vi.waitFor(() => expect(io.output.text).toContain("> Keep preview; do not write"));
    expect(execute.mock.calls.every(([args]) => !args.includes("--yes"))).toBe(true);
    key(io.input, "c", true); expect(await running).toBe(130);
  });

  it("handles resize and Esc even when the terminal is too small", async () => {
    const io = terminal(); io.output.columns = 24; io.output.rows = 6;
    const running = runStudio({}, unused, io);
    expect(io.output.text).toContain("Resize to at least");
    io.output.columns = 70; io.output.rows = 20; io.output.emit("resize");
    expect(io.output.text).toContain("Source file or directory");
    io.output.columns = 24; key(io.input, "escape");
    expect(await running).toBe(0); expect(io.input.isRaw).toBe(false);
  });

  it("waits for in-flight work on SIGTERM and discards keys typed while busy", async () => {
    const io = terminal();
    let finish!: (value: Awaited<ReturnType<typeof unused>>) => void;
    const execute = vi.fn(() => new Promise<Awaited<ReturnType<typeof unused>>>((resolve) => { finish = resolve; }));
    const running = runStudio({}, execute, io);
    key(io.input, "return"); await vi.waitFor(() => expect(io.output.text).toContain("2. Output"));
    key(io.input, "return"); await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
    key(io.input, "return"); key(io.input, "down");
    io.signals.emit("SIGTERM");
    expect(io.input.isRaw).toBe(true);
    finish(await unused());
    expect(await running).toBe(143);
    expect(io.input.isRaw).toBe(false); expect(execute).toHaveBeenCalledOnce();
  });

  it("preserves an already-raw stream and cleans up after setup failure", async () => {
    const io = terminal(); io.input.isRaw = true;
    const running = runStudio({}, unused, io); io.signals.emit("SIGINT");
    expect(await running).toBe(130); expect(io.input.isRaw).toBe(true);
    const broken = terminal();
    broken.input.setRawMode = (mode) => { if (mode) throw new Error("raw mode unavailable"); return broken.input; };
    await expect(runStudio({}, unused, broken)).rejects.toThrow("raw mode unavailable");
    expect(broken.signals.listenerCount("SIGTERM")).toBe(0);
    expect(broken.output.text).toContain("\x1b[?25h");
  });

  it("restores the cursor on input errors and raw mode on output errors", async () => {
    const io = terminal();
    const running = runStudio({}, unused, io);
    io.input.emit("error", new Error("input lost"));
    await expect(running).rejects.toThrow("input lost");
    expect(io.input.isRaw).toBe(false);
    expect(io.output.text).toContain("\x1b[?25h\x1b[?1049l");
    const broken = terminal();
    const failed = runStudio({}, unused, broken);
    broken.output.emit("error", new Error("output lost"));
    await expect(failed).rejects.toThrow("output lost");
    expect(broken.input.isRaw).toBe(false);
    expect(broken.signals.listenerCount("SIGTERM")).toBe(0);
  });

  it("bounds frames, sanitizes terminal escapes, and keeps focused menu items visible", () => {
    const state = new StudioController({ input: "\x1b[31mred\x1b[0m\nsecret" }, unused);
    state.screen = "menu"; state.selection = 8;
    const frame = renderStudio(state, 40, 12);
    expect(frame).toContain("> Exit Studio"); expect(frame).not.toContain("\x1b");
    expect(frame.split("\n").length).toBeLessThan(12);
    expect(frame.split("\n").every((line) => line.length < 40)).toBe(true);
    expect(clean("\x1b]0;change title\x07ok")).toBe("ok");
    state.screen = "confirm"; state.selection = 0;
    const confirmation = renderStudio(state, 40, 12);
    expect(confirmation).toContain("> Keep preview; do not write");
    expect(confirmation).toContain("Write files and validate");
  });

  it("rejects pipes before changing terminal state", async () => {
    const io = terminal(); io.input.isTTY = false;
    await expect(runStudio({}, unused, io)).rejects.toThrow("interactive stdin and stdout");
    expect(io.input.isRaw).toBe(false); expect(io.output.text).toBe("");
  });
});
