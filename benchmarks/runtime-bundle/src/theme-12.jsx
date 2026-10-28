import {EmojiToken} from 'react-emoji-styles';
import 'react-emoji-styles/styles.css';
import {emojiTheme} from './theme';
import {Page} from './page';
export default function App(){return <Page renderEmoji={item=><EmojiToken token={item.token} theme={emojiTheme} size={20} lazy={false}/>}/>;}
