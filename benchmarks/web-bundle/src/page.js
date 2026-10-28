// Same 12 rows as ../runtime-bundle without React: one static HTML string per row.
import items from '../../runtime-bundle/src/items.json';
const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export async function renderPage(renderEmoji){
 const rows=await Promise.all(items.map(async item=>`<li><span class="artwork">${await renderEmoji(item)}</span><div><strong>${escape(item.label)}</strong><code>${item.token}</code></div></li>`));
 return `<main><header><p>Product workspace</p><h1>Deployment and settings</h1></header><section aria-label="Product tokens"><h2>Workspace controls</h2><ul>${rows.join('')}</ul></section><footer>Production build · 12 token fixture · image requests excluded from JS totals</footer></main>`;
}
