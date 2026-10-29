import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { exportVisualReview } from "../export-visual-review";

const folders: string[] = [];
afterEach(async () => { await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))); });
async function fixture() {
  const base = await mkdtemp(join(tmpdir(), "emoji-blind-review-")); folders.push(base);
  const file = join(base, "SECRET-rocket-baseline.webp");
  await sharp({ create: { width: 256, height: 256, channels: 4, background: "#ff000080" } }).webp({ lossless: true }).toFile(file);
  const sha256 = createHash("sha256").update(await readFile(file)).digest("hex");
  return { base, output: join(base, "export"), input: { runId: "secret-run", protocolSha256: "a".repeat(64), tasks: [
    { id: "secret-task-A", style: "secret-style", case: "secret-subject", replicate: 1, condition: "secret-baseline" },
    { id: "secret-task-B", style: "secret-style", case: "secret-subject", replicate: 1, condition: "secret-challenger" },
  ], candidates: [{ taskId: "secret-task-A", file, sha256 }] } };
}
describe("blind visual review export", () => {
  it("renders exact-size opaque cells on both backgrounds without leaking labels or silently dropping missing attempts", async () => {
    const { base, output, input } = await fixture();
    expect(await exportVisualReview(input, base, output, "reviewer-one")).toMatchObject({ available: 1, missing: 1, rasterCells: 8 });
    const key = JSON.parse(await readFile(join(output, "operator-key.json"), "utf8"));
    expect(key.assignments).toHaveLength(2);
    expect(key.assignments.find((item: { status: string }) => item.status === "missing").normalizedSha256).toBeNull();
    for (const file of await readdir(join(output, "reviewer"))) {
      const data = await readFile(join(output, "reviewer", file));
      expect(data.toString()).not.toMatch(/secret-|SECRET|rocket|baseline|challenger/);
      if (file.endsWith(".png")) {
        const size = Number(file.split("-")[1]);
        expect([24, 32, 48, 64]).toContain(size);
        expect(await sharp(data).metadata()).toMatchObject({ width: size, height: size, hasAlpha: false });
      }
    }
    expect(key.recognition.map((item: { size: number }) => item.size)).toEqual([24, 24, 48, 48]);
    const second = join(base, "second"); await exportVisualReview(input, base, second, "reviewer-one");
    expect(await readFile(join(second, "operator-key.json"), "utf8")).toBe(await readFile(join(output, "operator-key.json"), "utf8"));
    await expect(exportVisualReview(input, base, output)).rejects.toThrow();
  });
  it("rejects changed source bytes and ambiguous assignments before writing an export", async () => {
    const { base, output, input } = await fixture();
    await expect(exportVisualReview({ ...input, candidates: [{ ...input.candidates[0], sha256: "0".repeat(64) }] }, base, output)).rejects.toThrow("hash mismatch");
    await expect(exportVisualReview({ ...input, candidates: [...input.candidates, ...input.candidates] }, base, output)).rejects.toThrow("Duplicate");
    await expect(exportVisualReview({ ...input, candidates: [{ ...input.candidates[0], taskId: "unknown" }] }, base, output)).rejects.toThrow("unknown");
    expect(await readdir(base)).toEqual(["SECRET-rocket-baseline.webp"]);
  });
  it("requires a loaded image and a real guess before recording recognition", async () => {
    const { base, output, input } = await fixture(); await exportVisualReview(input, base, output, "ui-check");
    const html = await readFile(join(output, "reviewer/recognition.html"), "utf8");
    const elements = new Map<string, any>();
    const get = (id: string) => { if (!elements.has(id)) elements.set(id, { value: "", disabled: false, style: {}, focus() {} }); return elements.get(id); };
    runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)![1], { document: { getElementById: get }, navigator: { userAgent: "test" }, devicePixelRatio: 1, visualViewport: { scale: 1 } });
    for (const id of ["reviewer", "display", "exposure"]) get(id).value = "test";
    get("download").disabled = true; get("start").onclick(); get("guess").value = "object"; get("guess").oninput();
    expect(get("next").disabled).toBe(true);
    get("image").onload(); expect(get("next").disabled).toBe(false);
    get("image").onerror(); get("guess").oninput(); expect(get("next").disabled).toBe(true);
    get("next").onclick(); expect(get("download").disabled).not.toBe(false);
    get("image").onload(); get("next").onclick(); expect(get("download").disabled).toBe(false);
    expect(get("guess").value).toBe(""); expect(get("next").disabled).toBe(true);
  });
  it("autosaves per export, resumes after a reload and warns before losing undownloaded answers", async () => {
    const { base, output, input } = await fixture(); await exportVisualReview(input, base, output, "autosave-check");
    const script = (await readFile(join(output, "reviewer/recognition.html"), "utf8")).match(/<script>([\s\S]*)<\/script>/)![1];
    const entries = new Map<string, string>();
    const localStorage = { getItem: (k: string) => entries.get(k) ?? null, setItem: (k: string, v: string) => void entries.set(k, v), removeItem: (k: string) => void entries.delete(k) };
    const page = () => {
      const elements = new Map<string, any>(); const listeners: Record<string, (event: any) => void> = {}; const downloads: string[] = [];
      const get = (id: string) => { if (!elements.has(id)) elements.set(id, { value: "", disabled: false, hidden: false, style: {}, focus() {} }); return elements.get(id); };
      runInNewContext(script, {
        document: { getElementById: get, createElement: () => ({ download: "", click() { downloads.push(this.download); } }) },
        navigator: { userAgent: "test" }, devicePixelRatio: 1, visualViewport: { scale: 1 }, localStorage,
        addEventListener: (type: string, listener: (event: any) => void) => { listeners[type] = listener; },
        Blob: class { constructor(readonly parts: string[]) {} }, URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} }, setTimeout: () => 0,
      });
      const leave = () => { const event = { returnValue: undefined as unknown, prevented: false, preventDefault() { this.prevented = true; } }; listeners.beforeunload(event); return event.prevented; };
      return { get, leave, downloads };
    };

    const first = page();
    expect(first.get("autosave").textContent).toMatch(/automáticamente/);
    for (const id of ["reviewer", "display", "exposure"]) first.get(id).value = "test";
    first.get("start").onclick(); expect(first.leave()).toBe(false);
    first.get("image").onload(); first.get("guess").value = "object"; first.get("next").onclick();
    expect(first.leave()).toBe(true);
    const [storedKey] = [...entries.keys()];
    expect(storedKey).toMatch(/^emoji-styles-recognition:[a-f0-9]{24}$/);

    const reloaded = page();
    expect(reloaded.get("setup").hidden).toBe(true);
    expect(reloaded.get("resume").hidden).toBe(false);
    expect(reloaded.get("resume-count").textContent).toBe("1");
    reloaded.get("continue").onclick();
    expect(reloaded.get("progress").textContent).toMatch(/^2 \/ 4/);
    expect(reloaded.get("download").disabled).toBe(false);
    reloaded.get("image").onload(); reloaded.get("guess").value = "object"; reloaded.get("next").onclick();
    const saved = JSON.parse(entries.get(storedKey)!);
    expect(saved.responses.map((item: { sequence: number }) => item.sequence)).toEqual([1, 2]);
    expect(saved.resumes).toHaveLength(1);
    expect(reloaded.leave()).toBe(true);
    reloaded.get("download").onclick();
    expect(reloaded.downloads).toEqual([`recognition-${storedKey.split(":")[1]}.json`]);
    expect(reloaded.leave()).toBe(false);
  });
  it("keeps working and says so when the browser blocks storage", async () => {
    const { base, output, input } = await fixture(); await exportVisualReview(input, base, output, "no-storage");
    const script = (await readFile(join(output, "reviewer/recognition.html"), "utf8")).match(/<script>([\s\S]*)<\/script>/)![1];
    const elements = new Map<string, any>();
    const get = (id: string) => { if (!elements.has(id)) elements.set(id, { value: "", disabled: false, hidden: false, style: {}, focus() {} }); return elements.get(id); };
    const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); }, removeItem() {} };
    runInNewContext(script, { document: { getElementById: get }, navigator: { userAgent: "test" }, devicePixelRatio: 1, visualViewport: { scale: 1 }, localStorage: blocked });
    expect(get("autosave").textContent).toMatch(/no permite guardar/);
    for (const id of ["reviewer", "display", "exposure"]) get(id).value = "test";
    get("start").onclick(); get("image").onload(); get("guess").value = "object"; get("next").onclick();
    expect(get("download").disabled).toBe(false);
  });
});
