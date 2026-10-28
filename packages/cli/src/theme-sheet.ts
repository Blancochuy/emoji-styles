import type { Candidate, ReuseHint, SheetProvider, StatusArtworkHint } from "./commands/theme-draft";

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function artwork(provider: SheetProvider, candidate: Candidate, size: number): string {
  const url = provider.assets.get(candidate.emoji);
  return url
    ? `<img src="${escape(url)}" width="${size}" height="${size}" alt="${escape(`${candidate.label} (${provider.id})`)}" referrerpolicy="no-referrer">`
    : '<span class="missing">Artwork unavailable</span>';
}
function overview(candidates: Candidate[], sheetProviders: SheetProvider[]): string {
  return `<section id="overview" class="overview"><h2>Set overview <small>20 px</small></h2>
<p>Compare the complete set before reviewing individual tokens. Select a token to jump to its detailed samples. Excluded rows remain review-only until their status is resolved.</p>
<div class="overview-grid">${["light", "dark"].map((mode) => `<div class="matrix ${mode}"><table>
<caption>${mode === "light" ? "Light" : "Dark"} background · 20 px</caption>
<thead><tr><th scope="col">Proposed token</th>${sheetProviders.map((provider) => `<th scope="col">${escape(provider.id)}</th>`).join("")}</tr></thead>
<tbody>${candidates.map((candidate, index) => `<tr><th scope="row"><a href="#token-${index + 1}" title="${escape(candidate.label)}">${escape(candidate.token)}</a>${candidate.themeIncluded ? "" : ' <span class="excluded">Excluded</span>'}</th>${sheetProviders.map((provider) => `<td>${artwork(provider, candidate, 20)}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`).join("")}</div></section>`;
}
function reuseReview(hints: ReuseHint[], candidates: Candidate[]): string {
  if (!hints.length) return "";
  return `<aside class="reuse" aria-labelledby="reuse-title"><h2 id="reuse-title">Shared control artwork <small>Review, do not auto-merge</small></h2><ul>${hints.map((hint) => `<li><p>${escape(hint.message)}</p><p>${hint.tokens.map((token) => `<a href="#token-${candidates.findIndex((candidate) => candidate.token === token) + 1}">${escape(token)}</a>`).join(" · ")}</p></li>`).join("")}</ul></aside>`;
}
function unresolvedStatuses(candidates: Candidate[], hints: StatusArtworkHint[]): string {
  const conflicts = candidates.filter((candidate) => candidate.statusConflict);
  if (!conflicts.length && !hints.length) return "";
  const links = (tokens: string[]) => tokens.map((token) => `<a href="#token-${candidates.findIndex((candidate) => candidate.token === token) + 1}">${escape(token)}</a>`).join(" · ");
  return `<aside class="reuse" aria-labelledby="status-review-title"><h2 id="status-review-title">Unresolved states <small>Excluded from theme</small></h2><p>Resolve wording/glyph conflicts and choose one icon per canonical state before integration. See review.json for the complete evidence.</p><ul>${conflicts.map((candidate) => `<li><p>${escape(candidate.reason)}</p>${links([candidate.token])}</li>`).join("")}${hints.map((hint) => `<li><p>${escape(hint.message)}</p>${links(hint.tokens)}</li>`).join("")}</ul></aside>`;
}
export function renderSheet(candidates: Candidate[], sheetProviders: SheetProvider[], hints: ReuseHint[], statusHints: StatusArtworkHint[]): string {
  const rows = candidates.map((candidate, index) => {
    const sampleLabel = candidate.sourceLabels?.[0] ?? candidate.label;
    const sourceMessages = candidate.sourceLabels ? `<ul class="evidence">${candidate.usages.map((usage) => `<li>${escape(usage.context)} (${escape(usage.path)}:${usage.start.line})</li>`).join("")}</ul>` : "";
    return `<section id="token-${index + 1}" class="token"><h3>${escape(candidate.token)} <small>${candidate.themeIncluded ? "Review required" : "Unresolved: excluded from theme"}</small></h3><p>${escape(candidate.label)}</p>${sourceMessages}<p class="evidence">${escape(candidate.usages[0].path)}:${candidate.usages[0].start.line} · ${escape(candidate.reason)}</p>${["light", "dark"].map((mode) => `<div class="samples ${mode}">${sheetProviders.map((provider) => `<div class="provider"><h4>${escape(provider.id)}</h4>${[16, 20, 24].map((size) => `<div class="sample"><span class="size">${size} px</span><span class="inline">${artwork(provider, candidate, size)} <span>${escape(sampleLabel)}</span></span></div>`).join("")}</div>`).join("")}</div>`).join("")}<a class="back" href="#overview">Back to set overview</a></section>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Emoji token draft review</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:20px;background:#f1f3f5;color:#17212b;font:16px/1.5 system-ui,sans-serif}
main{max-width:1200px;margin:auto}h1{font-size:26px;margin:0 0 8px}h2{font-size:20px;margin:0 0 6px}h3{font-size:19px}h4{font-size:15px}
.excluded{font-size:10px;color:#79530b;white-space:nowrap}.dark .excluded{color:#ffd384}
small,.size{font-size:12px}small{font-weight:500;color:#465561}.dark small{color:#cad3da}
a{color:#215b99;text-underline-offset:3px}.dark a{color:#a7d1ff}
section,.reuse{background:white;border:1px solid #c5cbd1;border-radius:12px;padding:20px;margin:20px 0}
section>p,.reuse p{overflow-wrap:anywhere}.reuse{background:#fff8e7;border-color:#bd8a24}.reuse p{margin:8px 0}.reuse li+li{margin-top:16px}
header p{margin:8px 0}.overview>p{margin:6px 0 12px}
.overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:16px}
.light{background:#fff;color:#17212b}.dark{background:#17212b;color:#f5f7fa}
.matrix{border:1px solid #84909b;border-radius:8px;overflow:hidden;padding:6px}
table{width:100%;table-layout:fixed;border-collapse:collapse}caption{text-align:left;font-weight:650;padding:6px}
th,td{padding:6px;vertical-align:middle;overflow-wrap:anywhere;border-bottom:1px solid #c5cbd1}
.dark th,.dark td{border-color:#53616e}thead th{font-size:12px;font-weight:600}thead th:first-child{width:44%;text-align:left}
tbody th{text-align:left;font-size:13px;font-weight:600}td{text-align:center}td img{display:block;margin:auto}
.missing{font-size:12px;display:inline-block;max-width:100%;overflow-wrap:anywhere}
.samples{display:flex;flex-wrap:wrap;gap:24px;padding:16px;border:1px solid #84909b}
.provider{flex:1;min-width:220px}.sample,.inline{display:flex;align-items:center;gap:8px}.sample{min-height:40px}.inline{font-size:16px}.size{min-width:48px}
img{object-fit:contain;flex-shrink:0}.back{display:inline-block;margin-top:16px;font-size:13px}.evidence,footer{font-size:13px;overflow-wrap:anywhere}
@media(max-width:480px){body{padding:12px}section,.reuse{padding:12px}th,td{padding:6px}.provider{min-width:0;flex-basis:100%}}
</style></head><body><main>
<header><h1>Emoji token draft</h1><p>Review names, meanings, action labels and artwork at 100% zoom. All candidates require review.</p></header>
${candidates.length ? overview(candidates, sheetProviders) : "<p>No supported token candidates. See review.json for decorative and unknown occurrences.</p>"}
${unresolvedStatuses(candidates, statusHints)}
${reuseReview(hints, candidates)}
<h2 id="details">Detailed review · 16, 20 and 24 px</h2>
${rows}
<footer><p>This is a draft, not a completed migration or accessibility certification. Built-in artwork needs internet when opened; failed images retain their alt text. Missing custom artwork is shown explicitly, without Unicode fallback.</p>${sheetProviders.map((provider) => `<p>${escape(provider.id)}: ${escape(provider.attribution)}${provider.unavailable ? ` (${escape(provider.unavailable)})` : ""}</p>`).join("")}</footer>
</main></body></html>\n`;
}
