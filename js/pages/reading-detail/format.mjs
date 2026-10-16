export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const number=(v,d=1)=>finite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:d}):'—';
export const pct=(v,fraction=false)=>finite(v)?`${number(fraction?v*100:v)}%`:'—';
export const missing=text=>`<p class="rd-empty">${esc(text)}</p>`;
export const metric=(label,value,unit='')=>`<div class="rd-metric"><dt>${esc(label)}</dt><dd>${number(value)}${finite(value)?esc(unit):''}</dd></div>`;
export const details=(title,html)=>`<details class="rd-disclosure"><summary>${esc(title)}</summary><div>${html}</div></details>`;
// Provenance remains in the input artifacts; it is not a public UI element.
export const sourceLink=()=>'';
export function recordList(value){
 if(value==null)return '—';
 if(Array.isArray(value))return value.length?`<ul>${value.map(v=>`<li>${recordList(v)}</li>`).join('')}</ul>`:'Nessun elemento disponibile';
 if(typeof value==='object')return `<dl class="rd-record">${Object.entries(value).filter(([k])=>!/^(?:sources?(?:[a-z_].*)?|references?|referenceUrl|provider|fonti|provenance|origine|retrievedAt|importedAt)$/i.test(k)).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${recordList(v)}</dd></div>`).join('')}</dl>`;
 return esc(value);
}
export function tabs(id,items){return `<div class="rd-tabs" data-tabs><div role="tablist" aria-label="${esc(id)}">${items.map(([key,label],i)=>`<button type="button" id="${id}-tab-${key}" role="tab" aria-selected="${i===0}" aria-controls="${id}-panel-${key}" tabindex="${i===0?0:-1}">${esc(label)}</button>`).join('')}</div>${items.map(([key,,html],i)=>`<section role="tabpanel" tabindex="0" id="${id}-panel-${key}" aria-labelledby="${id}-tab-${key}" ${i?'hidden':''}>${html}</section>`).join('')}</div>`;}
export function mountTabs(root){
 root.querySelectorAll('[data-tabs]').forEach(t=>{
  const buttons=[...t.querySelectorAll(':scope > [role=tablist] > [role=tab]')];
  const choose=(button,focus=false)=>{buttons.forEach(b=>{const active=b===button;b.tabIndex=active?0:-1;b.setAttribute('aria-selected',String(active));t.querySelector('#'+b.getAttribute('aria-controls')).hidden=!active});if(focus)button.focus()};
  buttons.forEach((b,i)=>{b.addEventListener('click',()=>choose(b));b.addEventListener('keydown',e=>{const index=e.key==='ArrowRight'?(i+1)%buttons.length:e.key==='ArrowLeft'?(i+buttons.length-1)%buttons.length:e.key==='Home'?0:e.key==='End'?buttons.length-1:null;if(index!==null){e.preventDefault();choose(buttons[index],true)}})});
 });
}
