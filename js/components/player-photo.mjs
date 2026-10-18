// Shared ID-based, local-only delivery. Fail closed if the registry is unavailable.
let registryPromise;
export function loadPlayerPhotos(){
  return registryPromise ||= fetch(new URL('../../data/player-photos.json',import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Photo registry');return r.json()}).catch(()=>({entries:[]}));
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink=url=>{try{const u=new URL(url);return u.protocol==='https:'?escape(u.href):null}catch{return null}};
const local=p=>/^assets\/images\/players\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g|avif)$/i.test(p||'')&&!p.includes('..');
export function playerPhoto(registry,playerId,{compact=false}={}){
 const e=registry.entries.find(e=>e.playerId===playerId),allowed=e?.rightsStatus==='VERIFIED'&&local(e.localPath)&&e.attribution?.text&&e.attribution.license&&safeLink(e.attribution.url)&&safeLink(e.attribution.licenseUrl);
 const src=new URL('../../'+(allowed?e.localPath:'assets/images/players/player-placeholder.png'),import.meta.url).href;
 const source=allowed?safeLink(e.attribution.url):null,license=allowed?safeLink(e.attribution.licenseUrl):null;
 const credit=allowed?`<figcaption data-required-attribution><details class="player-photo-credit"><summary aria-label="Attribuzione della fotografia">© Foto</summary><span class="player-photo-credit-body">${source?`<a href="${source}" target="_blank" rel="noreferrer">${escape(e.attribution.artist||e.attribution.text)}</a>`:escape(e.attribution.text)}${license?` · <a href="${license}" target="_blank" rel="noreferrer">${escape(e.attribution.license)}</a>`:""}<small>Visualizzazione proporzionata; file originale invariato.</small></span></details></figcaption>`:'';
 return `<figure class="player-photo${compact?' player-photo-compact':''}" data-photo-player-id="${escape(playerId)}"><img src="${escape(src)}" alt="" width="80" height="96" loading="lazy" decoding="async" data-registry-photo>${credit}</figure>`;
}
export function installPhotoFallback(container){container.addEventListener('error',event=>{const img=event.target;if(img?.matches?.('[data-registry-photo]')&&!img.dataset.failed){img.dataset.failed='true';img.src=new URL('../../assets/images/players/player-placeholder.png',import.meta.url).href;img.closest('figure')?.querySelector('figcaption')?.remove()}},true)}
