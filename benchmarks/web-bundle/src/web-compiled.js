// Published emoji-styles-web/compiled with the committed compiled theme of ../runtime-bundle.
import {installCompiledEmojiFallbacks,renderCompiledEmojiTokenToHTML} from 'emoji-styles-web/compiled';
import 'emoji-styles-web/styles.css';
import {compiledEmojiTheme} from '../../runtime-bundle/src/theme.compiled.ts';
import {renderPage} from './page.js';
export async function render(root){root.innerHTML=await renderPage(item=>renderCompiledEmojiTokenToHTML(item.token,compiledEmojiTheme,{size:20,loading:'eager'}));installCompiledEmojiFallbacks(root);}
