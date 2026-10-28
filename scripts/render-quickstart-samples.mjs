import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Draws two original sample images for docs/QUICKSTART.md. They are hand-written
// SVG shapes, rasterized with real transparency; no image model is involved.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "docs/assets/quickstart");
await mkdir(output, { recursive: true });

const rocket = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="body" x1="0" x2="1"><stop stop-color="#f4f1ff"/><stop offset=".55" stop-color="#ddd6fb"/><stop offset="1" stop-color="#b8acef"/></linearGradient>
    <linearGradient id="flame" y2="1"><stop stop-color="#ffd23f"/><stop offset="1" stop-color="#ff7a2f"/></linearGradient>
  </defs>
  <g transform="rotate(45 256 256)">
    <path d="M256 438c-34 0-46 20-36 56 14-14 22-12 36 18 14-30 22-32 36-18 10-36-2-56-36-56z" fill="url(#flame)"/>
    <path d="M196 300l-62 58c-10 10-6 34 12 34h70z" fill="#ff5d6c"/>
    <path d="M316 300l62 58c10 10 6 34-12 34h-70z" fill="#ff5d6c"/>
    <path d="M256 36c-74 62-96 170-82 290 4 36 18 82 26 102h112c8-20 22-66 26-102 14-120-8-228-82-290z" fill="url(#body)" stroke="#5b4bc4" stroke-width="10"/>
    <path d="M256 36c-34 28-58 66-72 110h144c-14-44-38-82-72-110z" fill="#7b61ff" stroke="#5b4bc4" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="256" cy="236" r="44" fill="#4cc9ff" stroke="#5b4bc4" stroke-width="14"/>
    <circle cx="242" cy="222" r="12" fill="#e8f9ff"/>
    <path d="M256 330v98" stroke="#ff5d6c" stroke-width="26" stroke-linecap="round"/>
  </g>
</svg>`;

const padlock = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" y2="1"><stop stop-color="#ffd55a"/><stop offset="1" stop-color="#f29b13"/></linearGradient>
    <linearGradient id="steel" x2="1"><stop stop-color="#c9d1d9"/><stop offset=".5" stop-color="#f1f4f7"/><stop offset="1" stop-color="#9aa6b2"/></linearGradient>
  </defs>
  <path d="M150 236v-62a106 106 0 0 1 212 0v62" fill="none" stroke="#56606b" stroke-width="64" stroke-linecap="round"/>
  <path d="M150 236v-62a106 106 0 0 1 212 0v62" fill="none" stroke="url(#steel)" stroke-width="40" stroke-linecap="round"/>
  <rect x="86" y="216" width="340" height="252" rx="54" fill="url(#gold)" stroke="#b86a00" stroke-width="12"/>
  <rect x="112" y="236" width="288" height="34" rx="17" fill="#fff" opacity=".35"/>
  <circle cx="256" cy="326" r="36" fill="#3b2a12"/>
  <path d="M238 340h36l10 70h-56z" fill="#3b2a12"/>
</svg>`;

for (const [name, svg] of [["1f680", rocket], ["1f512", padlock]]) {
  await writeFile(join(output, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(output, `${name}.png`));
}
console.log("Rendered docs/assets/quickstart/1f680.png and 1f512.png from original SVG shapes; no generation calls.");
