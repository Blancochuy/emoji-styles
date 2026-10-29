import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

interface Candidate { taskId: string; file: string; sha256: string }
interface Input {
  runId: string; protocolSha256: string; rehearsal?: boolean;
  tasks: Array<{ id: string; style: string; case: string; replicate: number; condition: string }>;
  candidates: Candidate[];
}
const sizes = [24, 32, 48, 64] as const;
const backgrounds = ["#ffffff", "#171717"] as const;
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Seeded ordering is private to the operator; condition labels never enter public files. */
export function shuffled<T>(items: T[], seed: string): T[] {
  return items.map((value, index) => ({ value, key: hash(`${seed}:${index}`) }))
    .sort((a, b) => a.key.localeCompare(b.key)).map(({ value }) => value);
}

export async function exportVisualReview(input: Input, base: string, destination: string, seed = randomBytes(32).toString("hex")) {
  if (!input.runId || !/^[a-f0-9]{64}$/.test(input.protocolSha256)) throw new Error("Run ID and frozen protocol hash required.");
  const taskIds = new Set(input.tasks.map((task) => task.id));
  if (!taskIds.size || taskIds.size !== input.tasks.length) throw new Error("Empty or duplicate task IDs.");
  const candidates = new Map(input.candidates.map((candidate) => [candidate.taskId, candidate]));
  if (candidates.size !== input.candidates.length || [...candidates.keys()].some((id) => !taskIds.has(id))) throw new Error("Duplicate or unknown candidate task ID.");
  // Read and verify every source before creating output. Missing attempts remain in the private key.
  const sources = new Map<string, Buffer>();
  for (const [id, candidate] of candidates) {
    const source = await readFile(resolve(base, candidate.file));
    const metadata = await sharp(source).metadata();
    if (hash(source) !== candidate.sha256) throw new Error(`Source hash mismatch: ${id}`);
    if (metadata.width !== 256 || metadata.height !== 256 || metadata.format !== "webp" || (metadata.pages ?? 1) !== 1) throw new Error(`Expected static normalized 256 px WebP: ${id}`);
    sources.set(id, source);
  }
  // Exclusive directory creation prevents mixing reviewers or overwriting frozen exports.
  await mkdir(destination);
  const publicFolder = join(destination, "reviewer");
  await mkdir(publicFolder);
  const assignments = shuffled(input.tasks, `${seed}:candidate-order`).map((task, index) => ({
    candidateId: `C${String(index + 1).padStart(3, "0")}`, id: task.id, style: task.style, case: task.case, replicate: task.replicate, condition: task.condition,
    normalizedSha256: candidates.get(task.id)?.sha256 ?? null,
    status: sources.has(task.id) ? "available" : "missing",
  }));
  const available = assignments.filter((item) => item.status === "available");
  const cells: Array<{ candidateId: string; size: number; background: string; file: string }> = [];
  for (const assignment of available) for (const size of sizes) for (const [backgroundIndex, background] of backgrounds.entries()) {
    const file = `${assignment.candidateId}-${size}-${backgroundIndex}.png`;
    await sharp(sources.get(assignment.id)!).resize(size, size).flatten({ background }).png().toFile(join(publicFolder, file));
    cells.push({ candidateId: assignment.candidateId, size, background, file });
  }
  // All 24 px trials precede all 48 px trials. Background order is independently shuffled.
  const recognition = [24, 48].flatMap((size) => shuffled(available, `${seed}:recognition:${size}`).flatMap((item) =>
    shuffled(cells.filter((cell) => cell.candidateId === item.candidateId && cell.size === size), `${seed}:background:${size}:${item.candidateId}`)));
  const exportId = hash(JSON.stringify({ runId: input.runId, protocolSha256: input.protocolSha256, seed, assignments, rehearsal: input.rehearsal === true })).slice(0, 24);
  const manifest = { schemaVersion: 1, exportId, rehearsal: input.rehearsal === true, availableCount: available.length, missingCount: assignments.length - available.length, sizes, backgrounds, cells, recognition };
  await writeFile(join(publicFolder, "recognition.html"), recognitionHtml(manifest));
  await writeFile(join(publicFolder, "inspection.html"), inspectionHtml(manifest));
  await writeFile(join(publicFolder, "README.txt"), "Open recognition.html FIRST at 100% browser zoom. Record guesses before opening inspection.html. Images use CSS pixels; record device scaling and zoom. Answers autosave in this browser when it allows storage; reopening the page offers to continue. Still download responses before closing. This export does not score correctness or establish acceptance. Share only this reviewer folder. A second reviewer needs a separate export/seed.\n");
  await writeFile(join(destination, "operator-key.json"), `${JSON.stringify({ schemaVersion: 1, runId: input.runId, protocolSha256: input.protocolSha256, exportId: manifest.exportId, seed, rehearsal: manifest.rehearsal, assignments, cells, recognition }, null, 2)}\n`);
  return { output: destination, reviewer: publicFolder, available: available.length, missing: assignments.length - available.length, rasterCells: cells.length };
}

function shell(title: string, body: string, script = "") {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f5f2;color:#24242a;font:16px/1.5 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:40px 24px}h1{font-size:28px;letter-spacing:-.7px}p{max-width:68ch}button,input,textarea{font:inherit;padding:10px;border:1px solid #888;border-radius:6px}button{cursor:pointer;background:#26252c;color:white}button:disabled{opacity:.4;cursor:default}label{display:block;margin:12px 0}input,textarea{display:block;width:100%;max-width:500px}input[type=checkbox]{display:inline;width:auto}img{max-width:none;flex-shrink:0}#stage,.cell{display:flex;align-items:center;justify-content:center;min-height:128px;border:1px solid #aaa;border-radius:8px}#stage{width:220px;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:12px;overflow-x:auto}.card{background:white;padding:20px;margin:20px 0;border-radius:12px}.note{color:#615565}small{display:block}a{color:inherit}</style><main>${body}</main>${script ? `<script>${script}</script>` : ""}</html>`;
}

type Manifest = { exportId: string; rehearsal: boolean; availableCount: number; missingCount: number; sizes: readonly number[]; backgrounds: readonly string[]; cells: Array<{ candidateId: string; size: number; background: string; file: string }>; recognition: Array<{ candidateId: string; size: number; background: string; file: string }> };
function recognitionHtml(manifest: Manifest) {
  // Only internally produced IDs, filenames and numeric/hex values enter this document.
  return shell("Reconocimiento | Emoji Styles", `<h1>Primero, la silueta</h1><p>Una imagen a la vez. Escribe qué reconoces sin abrir la inspección ni ampliar la imagen. Primero verás todas las pruebas de 24 px y después las de 48 px.</p>${manifest.rehearsal ? '<p class="note">ENSAYO con imágenes históricas. No es evidencia del piloto nuevo.</p>' : ""}<p>${manifest.availableCount} candidatos disponibles; ${manifest.missingCount} intentos sin imagen. Los ausentes siguen registrados por el operador.</p><p id="autosave" class="note"></p><section id="resume" hidden><p>Este navegador tiene una revisión guardada de este paquete con <strong id="resume-count"></strong> respuestas. Continúa donde la dejaste; no empieces otra revisión con el mismo paquete.</p><button id="continue">Continuar</button></section><section id="setup"><label>Identificador del revisor<input id="reviewer" required></label><label>Zoom del navegador y escala del sistema<input id="display" placeholder="Por ejemplo: navegador 100%, sistema 2×" required></label><label>¿Has visto estas imágenes o conoces los sujetos?<input id="exposure" required></label><button id="start">Comenzar</button></section><section id="trial" hidden><p id="progress" aria-live="polite"></p><div id="stage"><img id="image" alt="Candidato para reconocimiento visual"></div><label>¿Qué reconoces?<input id="guess" autocomplete="off"></label><label><input id="uncertain" type="checkbox"> No estoy seguro</label><button id="next" disabled>Guardar y continuar</button></section><p id="done" hidden>Reconocimiento terminado. Descarga tus respuestas antes de abrir inspection.html. La inspección permite ver todos los tamaños; esas vistas ya no cuentan como reconocimiento sin pistas.</p><p><button id="download" disabled>Descargar respuestas JSON</button></p>`, `const data=${JSON.stringify(manifest)};const $=id=>document.getElementById(id);
// Autosave per export so a closed tab, reload or crash does not lose a partial review.
const key='emoji-styles-recognition:'+data.exportId;let store=null;try{store=globalThis.localStorage;store.setItem(key+':probe','1');store.removeItem(key+':probe')}catch{store=null}
let index=0;let ready=false;let responses=[];let setup;let resumes=[];let saved=0;let previous=null;
try{previous=store&&JSON.parse(store.getItem(key)||'null')}catch{previous=null}
$('autosave').textContent=store?'Tus respuestas se guardan automáticamente en este navegador. Aun así, descarga el JSON al terminar.':'Este navegador no permite guardar automáticamente: descarga tus respuestas con frecuencia y antes de cerrar.';
function persist(){if(!store)return;try{store.setItem(key,JSON.stringify({setup,responses,resumes}))}catch{$('autosave').textContent='No se pudo guardar automáticamente: descarga tus respuestas ahora.'}}
function begin(){$('setup').hidden=true;$('resume').hidden=true;$('trial').hidden=false;show()}
function show(){if(index>=data.recognition.length){$('trial').hidden=true;$('done').hidden=false;return}ready=false;const item=data.recognition[index];$('progress').textContent=(index+1)+' / '+data.recognition.length+' · '+item.size+' px';$('stage').style.background=item.background;$('image').src=item.file;$('image').width=item.size;$('image').height=item.size;$('guess').value='';$('uncertain').checked=false;$('next').disabled=true;$('guess').focus()}
if(previous&&previous.setup&&Array.isArray(previous.responses)){$('setup').hidden=true;$('resume').hidden=false;$('resume-count').textContent=String(previous.responses.length)}
$('continue').onclick=()=>{setup=previous.setup;responses=previous.responses;index=responses.length;resumes=[...(previous.resumes||[]),new Date().toISOString()];persist();$('download').disabled=!responses.length;begin()};
$('image').onload=()=>{ready=true;$('next').disabled=!$('guess').value.trim()};$('image').onerror=()=>{ready=false;$('next').disabled=true;$('progress').textContent+=' · ERROR de imagen: detén la revisión'};
$('start').onclick=()=>{if(!['reviewer','display','exposure'].every(id=>$(id).value.trim()))return;setup={reviewerId:$('reviewer').value,display:$('display').value,priorExposure:$('exposure').value,userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,viewportScale:visualViewport?.scale??null};persist();begin()};
$('guess').oninput=()=>{$('next').disabled=!ready||!$('guess').value.trim()};
$('next').onclick=()=>{if(!ready||!$('guess').value.trim())return;responses.push({...data.recognition[index],guess:$('guess').value,uncertain:$('uncertain').checked,sequence:index+1,recordedAt:new Date().toISOString()});index++;persist();$('download').disabled=false;show()};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:1,exportId:data.exportId,rehearsal:data.rehearsal,setup,complete:index===data.recognition.length,autosave:Boolean(store),resumes,responses},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='recognition-'+data.exportId+'.json';a.click();saved=responses.length;setTimeout(()=>URL.revokeObjectURL(url),1000)};
// Warn before leaving with responses that were never downloaded.
globalThis.addEventListener?.('beforeunload',event=>{if(responses.length>saved){event.preventDefault();event.returnValue=''}});`);
}
function inspectionHtml(manifest: Manifest) {
  return shell("Inspección | Emoji Styles", `<h1>Contorno, contraste y detalle</h1><p>Abre esta lámina después de terminar el reconocimiento. Cada PNG tiene exactamente el tamaño indicado. Usa zoom 100%. Esta vista sin etiquetas permite diagnosticar bordes y contraste; la evaluación de significado y estilo requiere después las etiquetas, referencias aprobadas y la rúbrica del operador.</p>${manifest.rehearsal ? '<p class="note">ENSAYO con imágenes históricas. No es evidencia del piloto nuevo.</p>' : ""}${[...new Set(manifest.cells.map((cell) => cell.candidateId))].map((id) => `<section class="card"><h2>${id}</h2><div class="grid">${manifest.cells.filter((cell) => cell.candidateId === id).map((cell) => `<div><small>${cell.size} px · ${cell.background}</small><div class="cell" style="background:${cell.background}"><img src="${cell.file}" width="${cell.size}" height="${cell.size}" alt="${id}"></div></div>`).join("")}</div></section>`).join("")}`);
}

async function main() {
  const [manifestPath, output, ...extra] = process.argv.slice(2);
  if (!manifestPath || !output || extra.length) throw new Error("Usage: pnpm benchmark:visual-review <input.json> <new-output-folder>");
  const path = resolve(manifestPath);
  console.log(JSON.stringify(await exportVisualReview(JSON.parse(await readFile(path, "utf8")), dirname(path), resolve(output)), null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
