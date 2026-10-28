import {Emoji} from 'react-emoji-styles';
import 'react-emoji-styles/styles.css';
import {Page} from './page';
export default function App(){return <Page renderEmoji={(item,index)=>index===0?<Emoji emoji={item.emoji} label={item.label} size={20} lazy={false} provider="fluent-3d" fallbacks={['twemoji']} nativeFallback={false}/>:<span aria-hidden="true">{item.emoji}</span>}/>;}
