// Shared ID-based, local-only delivery. Fail closed if the registry is unavailable.
let registryPromise;
export function loadPlayerPhotos(){
  return registryPromise ||= fetch(new URL('../../data/player-photos.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Photo registry');return r.json()}).catch(()=>({entries:[]}));
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=p=>/^assets\/images\/players\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g|avif)$/i.test(p||'')&&!p.includes('..');
export function playerPhoto(registry,playerId,{compact=false}={}){
 const e=registry.entries.find(e=>e.playerId===playerId),allowed=e?.rightsStatus==='VERIFIED'&&local(e.localPath)&&e.attribution?.text;
 const src=new URL('../../'+(allowed?e.localPath:'assets/images/players/player-placeholder.png'),import.meta.url).href;
 const credit=allowed?`<figcaption data-required-attribution>${escape(e.attribution.text)}</figcaption>`:'';
 return `<figure class="player-photo${compact?' player-photo-compact':''}" data-photo-player-id="${escape(playerId)}"><img src="${escape(src)}" alt="" width="80" height="96" loading="lazy" decoding="async" data-registry-photo>${credit}</figure>`;
}
export function installPhotoFallback(container){container.addEventListener('error',event=>{const img=event.target;if(img?.matches?.('[data-registry-photo]')&&!img.dataset.failed){img.dataset.failed='true';img.src=new URL('../../assets/images/players/player-placeholder.png',import.meta.url).href;img.closest('figure')?.querySelector('figcaption')?.remove()}},true)}
