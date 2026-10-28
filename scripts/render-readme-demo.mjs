import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

// Captures the built workspace web component rendering one emoji through several
// providers, then a missing custom image falling back to native Unicode.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "docs/assets/readme-demo.gif");
const origin = "http://readme-demo.localhost";
const width = 880;
const height = 360;
const scale = 1.5;

const frames = [
  { step: "Native", provider: "native", code: "publicProviders.native", note: "Native Unicode · varies by OS", delay: 1700 },
  { step: "Twemoji", provider: "twemoji", code: "publicProviders.twemoji", note: "Twemoji · CC BY 4.0", delay: 1700 },
  { step: "Fluent 3D", provider: "fluent-3d", code: "publicProviders.fluent3d", note: "Fluent Emoji 3D · MIT", delay: 1700 },
  { step: "Your pack", provider: "pack", code: "productPack", note: "Your pack · local WebP", delay: 2000 },
  { step: "Fallback", provider: "missing", code: "productPack", note: "Image missing → Unicode fallback", delay: 2600 },
];

const files = {
  "/m/emoji-styles.js": { path: "packages/core/dist/index.js", type: "text/javascript" },
  "/m/emoji-styles-data.js": { path: "packages/data/dist/index.js", type: "text/javascript" },
  "/m/emoji-styles-web.js": { path: "packages/web/dist/index.js", type: "text/javascript" },
  "/m/styles.css": { path: "packages/web/styles.css", type: "text/css" },
  "/pack/assets/1f680.webp": { path: "demo/src/custom-emoji/custom-soft-3d/assets/1f680.webp", type: "image/webp" },
};
const manifest = JSON.parse(await readFile(join(root, "demo/src/custom-emoji/custom-soft-3d/emoji-provider.json"), "utf8"));

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="/m/styles.css" />
<script type="importmap">{"imports":{"emoji-styles":"/m/emoji-styles.js","emoji-styles-data":"/m/emoji-styles-data.js","emoji-styles-web":"/m/emoji-styles-web.js"}}</script>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${width}px; height: ${height}px; background: #080b0d; color: #f4f5ee; font: 15px/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; }
  .frame { position: absolute; inset: 0; border: 1px solid #293235; border-radius: 20px; background: linear-gradient(135deg, #111719, #080b0d); padding: 30px 36px; display: grid; grid-template-columns: 230px 1fr; grid-template-rows: 1fr auto; gap: 22px 34px; }
  .tile { display: grid; place-items: center; align-content: center; gap: 14px; border: 1px solid #30393c; border-radius: 18px; background: #14191b; }
  .note { color: #aeb9b6; font-size: 13px; text-align: center; padding: 0 10px; min-height: 36px; }
  .side { display: grid; align-content: center; gap: 18px; }
  .eyebrow { font: 11px/1 ui-monospace, Menlo, monospace; letter-spacing: 2px; color: #9ea9a6; }
  .row { display: flex; align-items: center; gap: 12px; border: 1px solid #30393c; border-radius: 12px; background: #14191b; padding: 12px 14px; font-weight: 600; }
  .pill { margin-left: auto; font-size: 12px; font-weight: 600; color: #0b0f10; background: #c8ff3d; border-radius: 999px; padding: 3px 10px; }
  pre { min-height: 90px; font: 14px/1.5 ui-monospace, Menlo, monospace; color: #d9ded9; background: #0c1012; border: 1px solid #283235; border-radius: 12px; padding: 12px 14px; white-space: pre-wrap; }
  .hl { color: #c8ff3d; }
  .dim { color: #6f7a77; }
  .steps { grid-column: 1 / -1; display: flex; gap: 8px; }
  .steps span { flex: 1; text-align: center; font-size: 12px; color: #7f8a87; border-top: 3px solid #283235; padding-top: 8px; }
  .steps span.on { color: #f4f5ee; border-color: #c8ff3d; }
</style>
</head>
<body>
<div class="frame">
  <div class="tile">
    <styled-emoji id="hero" emoji="🚀" label="Deploy" size="120" loading="eager" fallbacks="" native-fallback="true"></styled-emoji>
    <p class="note" id="note"></p>
  </div>
  <div class="side">
    <p class="eyebrow">SAME CODE. YOUR ARTWORK.</p>
    <div class="row">
      <styled-emoji id="inline" emoji="🚀" label="Deploy" size="24" loading="eager" fallbacks="" native-fallback="true"></styled-emoji>
      Deploy to production <span class="pill">Ready</span>
    </div>
    <pre id="code"></pre>
  </div>
  <div class="steps" id="steps"></div>
</div>
<script type="module">
  import { createManifestProvider } from "emoji-styles";
  import { defineStyledEmoji } from "emoji-styles-web";
  defineStyledEmoji();
  const manifest = ${JSON.stringify(manifest)};
  const providers = {
    pack: createManifestProvider({ ...manifest, basePath: "/pack/assets" }),
    missing: createManifestProvider({ ...manifest, basePath: "/missing" }),
  };
  const frames = ${JSON.stringify(frames)};
  document.getElementById("steps").innerHTML = frames.map((frame) => "<span>" + frame.step + "</span>").join("");
  window.showFrame = async (index) => {
    const frame = frames[index];
    const renders = [];
    for (const element of document.querySelectorAll("styled-emoji")) {
      element.providerObject = providers[frame.provider];
      if (element.providerObject) element.removeAttribute("provider");
      else element.setAttribute("provider", frame.provider);
      renders.push(element.render());
    }
    document.getElementById("note").textContent = frame.note;
    const comment = frame.provider === "missing" ? '\\n<span class="dim">// 1f680.webp unavailable → label "Deploy" kept</span>' : "";
    document.getElementById("code").innerHTML = '&lt;Emoji emoji="🚀" label="Deploy"\\n  provider={<span class="hl">' + frame.code + "</span>} /&gt;" + comment;
    document.querySelectorAll("#steps span").forEach((step, position) => step.classList.toggle("on", position === index));
    await Promise.all(renders);
  };
  window.demoReady = true;
</script>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const tab = await context.newPage();
  await tab.route(`${origin}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/") return route.fulfill({ body: page, contentType: "text/html" });
    const file = files[pathname];
    if (!file) return route.fulfill({ status: 404, body: "Not found" });
    return route.fulfill({ body: await readFile(join(root, file.path)), contentType: file.type });
  });
  await tab.goto(`${origin}/`);
  await tab.waitForFunction(() => window.demoReady === true);

  const shots = [];
  for (const [index, frame] of frames.entries()) {
    await tab.evaluate((position) => window.showFrame(position), index);
    await tab.waitForFunction((expectNative) => [...document.querySelectorAll("styled-emoji")].every((element) => {
      const image = element.querySelector("img:not([hidden])");
      if (expectNative) return !image && element.dataset.provider === "native" && element.querySelector(".styled-emoji__native svg");
      return image?.complete && image.naturalWidth > 0;
    }), frame.provider === "native" || frame.provider === "missing", { timeout: 15000 });
    await tab.evaluate(() => document.fonts.ready);
    shots.push(await tab.screenshot({ type: "png" }));
  }

  const gif = await sharp(shots, { join: { animated: true } })
    .gif({ delay: frames.map((frame) => frame.delay), loop: 0, effort: 10, colours: 128, dither: 0.6 })
    .toBuffer();
  await writeFile(output, gif);
  console.log(`Rendered docs/assets/readme-demo.gif (${frames.length} frames, ${(gif.length / 1024).toFixed(0)} KB) with the web component; Twemoji and Fluent load from their pinned CDNs; no generation calls.`);
} finally {
  await browser.close();
}
