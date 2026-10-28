import items from './items.json';
export function Page({renderEmoji}) {
  return <main><header><p>Product workspace</p><h1>Deployment and settings</h1><nav aria-label="Sections"><a href="#actions">Actions</a><a href="#status">Status</a></nav></header><section id="actions" aria-label="Product tokens"><h2>Workspace controls</h2><ul>{items.map((item,index)=><li key={item.token}><span className="artwork">{renderEmoji(item,index)}</span><div><strong>{item.label}</strong><code>{item.token}</code></div></li>)}</ul></section><footer id="status">Production build · 12 token fixture · image requests excluded from JS totals</footer></main>;
}
