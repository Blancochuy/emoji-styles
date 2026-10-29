// Baseline: page shell and native Unicode, no emoji library imports.
import {renderPage} from './page.js';
export async function render(root){root.innerHTML=await renderPage(item=>item.emoji);}
