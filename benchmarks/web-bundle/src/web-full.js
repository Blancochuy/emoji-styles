// Published emoji-styles-web 0.2.0: resolves the theme in the browser with the full catalog.
import {parseEmojiTheme} from 'emoji-styles';
import {renderEmojiTokenToHTML} from 'emoji-styles-web';
import 'emoji-styles-web/styles.css';
import themeSource from '../../runtime-bundle/src/theme.json';
import {renderPage} from './page.js';
const theme=parseEmojiTheme(themeSource);
export async function render(root){root.innerHTML=await renderPage(item=>renderEmojiTokenToHTML(item.token,theme,{size:20,loading:'eager'}));}
