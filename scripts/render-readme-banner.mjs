import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "docs/assets");
await mkdir(output, { recursive: true });
const logo = (await readFile(join(root, "demo/src/assets/favicon.svg"), "utf8"))
  .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">', '<svg x="64" y="54" width="58" height="58" viewBox="0 0 64 64">');
const examples = [
  { file: "custom-soft-3d/assets/1f680.webp", x: 770, y: 98, width: 176, label: "Soft 3D", token: "action.launch" },
  { file: "custom-emoji/assets/1f916.webp", x: 966, y: 148, width: 176, label: "Agent Core", token: "agent.ready" },
];
const cards = [];
for (const item of examples) {
  const image = await sharp(join(root, "demo/src/custom-emoji", item.file)).png().toBuffer();
  cards.push(`<g transform="translate(${item.x} ${item.y})">
    <rect width="${item.width}" height="214" rx="22" fill="#14191b" stroke="#30393c"/>
    <path d="M18 158H158" stroke="#30393c"/>
    <image x="14" y="8" width="148" height="148" href="data:image/png;base64,${image.toString("base64")}"/>
    <text x="18" y="183" fill="#f2f3ed" font-size="15" font-weight="600">${item.label}</text>
    <text x="18" y="202" fill="#939e9c" font-family="monospace" font-size="10">${item.token}</text>
  </g>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="480" viewBox="0 0 1280 480" role="img" aria-labelledby="title desc">
  <title id="title">Emoji Styles. Your emoji. Your style.</title>
  <desc id="desc">The original lime smile logo, with the project's soft 3D rocket and Agent Core artwork. Custom packs, consistent rendering and Unicode fallback.</desc>
  <defs><linearGradient id="back" x2="1" y2="1"><stop stop-color="#111719"/><stop offset="1" stop-color="#080b0d"/></linearGradient></defs>
  <rect width="1280" height="480" rx="24" fill="url(#back)"/>
  <rect x=".5" y=".5" width="1279" height="479" rx="23.5" fill="none" stroke="#293235"/>
  <path d="M716 48V384" stroke="#283235"/>
  <g font-family="Helvetica Neue, Arial, sans-serif">
    ${logo}
    <text x="137" y="91" font-size="27" font-weight="700" letter-spacing="-.8" fill="#f4f5ee">Emoji <tspan fill="#c8ff3d">Styles</tspan></text>
    <text x="65" y="190" font-size="58" font-weight="700" letter-spacing="-2" fill="#f4f5ee">Your emoji.</text>
    <text x="65" y="256" font-size="58" font-weight="700" letter-spacing="-2" fill="#c8ff3d">Your style.</text>
    <text x="67" y="305" font-size="20" fill="#aeb9b6">Original packs. Consistent rendering.</text>
    <text x="67" y="335" font-size="20" fill="#aeb9b6">Accessible Unicode fallback.</text>
    <text x="772" y="68" font-family="monospace" font-size="11" letter-spacing="2" fill="#9ea9a6">ONE TOOLKIT. YOUR VISUAL LANGUAGE.</text>
    ${cards.join("\n")}
    <path d="M66 400H1214" stroke="#283235"/>
    <circle cx="72" cy="435" r="4" fill="#c8ff3d"/>
    <text x="87" y="440" font-size="13" fill="#bdc7c3">Built for products and coding agents</text>
    <text x="1214" y="440" text-anchor="end" font-family="monospace" font-size="12" fill="#9aa6a2">REACT / WEB / CLI / MCP</text>
  </g>
</svg>`;
await writeFile(join(output, "readme-banner.svg"), svg);
await sharp(Buffer.from(svg)).resize(2560, 960).png({ compressionLevel: 9 }).toFile(join(output, "readme-banner.png"));
console.log("Rendered docs/assets/readme-banner.svg and 2x PNG using the existing logo and demo artwork; no generation calls.");
