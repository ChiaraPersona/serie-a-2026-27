// Public presentation only: never writes application data or selection storage.
(() => {
 'use strict';
 const key=Symbol.for('serie-a.public-presentation');if(globalThis[key])return;globalThis[key]=true;
 const legalSelector='[data-required-attribution],[data-legal-notice],[data-attribution],.attribution,.copyright,.photo-credit,.image-attribution,.license-credit,[rel~="license"],a[href*="creativecommons.org"],a[href*="gnu.org/licenses"]';
 const protectedNode=n=>!!n.closest(legalSelector);
 const hide=n=>{if(!protectedNode(n)&&!n.querySelector(legalSelector)){n.hidden=true;n.style.setProperty('display','none','important');n.dataset.privateProvenance='';}};
 const style=document.createElement('style');
 style.textContent='[data-private-provenance]{display:none!important}';
 document.head.append(style);
 const provider=/^(?:fonte(?:\s.*)?|apri la fonte|snapshot provider|source|(?:UEFA(?:\.com)?|ESPN|WhoScored|StatMuse|Transfermarkt|Fantacalcio(?:\.it)?|Diretta(?:\.it)?|Lega (?:Calcio )?Serie A|AIA|FBref|FootyStats|Soccerbase|Sofascore)(?:\s*↗)?)$/i;
 const privateKey=/^(?:font[ei]|sources?(?:[a-z_].*)?|references?|referenceUrl|provider|provenienza|provenance|origine|retrievedAt|importedAt)$/i;
 // Selection rows use source-section as an internal catalog group, not provenance UI.
 const dedicated='.source-list,.source-directory-list,.source-team-grid,.sources-directory,.champions-source-links,.reading-post-match-source,.fantasy-price-source,.team-referee-source,.source-check,[data-source-section]:not([data-selection-row])';
 function apply(root){
  if(!root?.querySelectorAll||protectedNode(root))return;
  root.querySelectorAll('figcaption,p,small').forEach(n=>{if(/©|copyright|CC[ -]BY|Creative Commons|tutti i diritti riservati/i.test(n.textContent))n.dataset.requiredAttribution=''});
  root.querySelectorAll(dedicated).forEach(n=>{if(n.querySelector(legalSelector))n.querySelectorAll('li').forEach(hide);else hide(n)});
  root.querySelectorAll('a').forEach(a=>{
   if(protectedNode(a))return;
   const external=/^https?:/i.test(a.getAttribute('href')||'')&&new URL(a.href).origin!==location.origin;
   if(/(?:^|\/)fonti\.html(?:[?#]|$)/i.test(a.getAttribute('href')||'')||(external&&provider.test(a.textContent.trim()))||/\bfont[ei]\b/i.test(a.textContent))hide(a);
  });
  root.querySelectorAll('dt').forEach(dt=>{if(privateKey.test(dt.textContent.trim()))hide(dt.parentElement)});
  root.querySelectorAll('table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead tr:first-child th')];
   headers.forEach((th,i)=>{if(/^(?:font[ei]|provenienza|provider|Confronto ESPN)$/i.test(th.textContent.trim()))table.querySelectorAll('tr').forEach(row=>{if(row.children[i])hide(row.children[i])})});
  });
  root.querySelectorAll('h1,h2,h3,h4,summary').forEach(h=>{
   if(protectedNode(h))return;
   const title=h.textContent.trim();
   if(/^(?:Fonti(?: dei dati| e riferimenti| e metodo)?|Metodo e fonti|Provenienza(?: dei dati)?|Riferimenti delle fonti|Data sources|Data provenance|Sources)$/i.test(title)){
    const block=h.closest('section,details')||h;
    if(block.querySelector(legalSelector)){hide(h);if(block.tagName==='DETAILS')block.open=true;block.querySelectorAll('p,small').forEach(hide)}else hide(block);
    return;
   }
   // Mixed sections retain their actual statistics and lineup lists.
   for(const node of h.childNodes)if(node.nodeType===3)node.nodeValue=node.nodeValue.replace(/,\s*fonti\s*e\s*/gi,' e ').replace(/\s+e fonti\b/gi,'').replace(/,?\s*e fonte\b/gi,'');
  });
  root.querySelectorAll('p,small,span,div').forEach(n=>{
   if(protectedNode(n)||n.hasAttribute('data-private-provenance'))return;
   const direct=[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.nodeValue).join('').trim();
   if(/^(?:Fonte(?:\s+(?:statistica|statistiche|storica))?\s*:|Fonte (?:non disponibile|ufficiale|non integrata)|Fonti consultabili)/i.test(direct)&&n.children.length<3)hide(n);
   if(n.tagName==='SPAN'&&/\bfonte statistica integrata\b/i.test(direct))hide(n);
   if(/^(?:Righe WhoScored|Collegate a ESPN)$/i.test(n.textContent.trim()))hide(n.closest('article')||n.parentElement);
   if(n.tagName==='P'&&/(?:URL fonte|fonti autonome|collegate, dove possibile, ai confronti ESPN)/i.test(n.textContent))hide(n.closest('aside.method-note')||n);
   if(/^(?:Fonte statistica|Dati disponibili e provenienza)$/i.test(n.textContent.trim())){if(n.textContent.trim()==='Fonte statistica')hide(n.parentElement);else hide(n)}
  });
  root.querySelectorAll('.goalkeeper-note').forEach(n=>{let citation=false;for(const child of n.childNodes){if(child.nodeType===3){const i=child.nodeValue.search(/\bFonte gerarchie:/i);if(i>=0){child.nodeValue=child.nodeValue.slice(0,i);citation=true}else if(citation)child.nodeValue=''}else if(citation&&!protectedNode(child))hide(child)}});
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let text;
  while((text=walker.nextNode())){
   const parent=text.parentElement;if(!parent||parent.closest('script,style,textarea,code,pre,[data-private-provenance]')||protectedNode(parent))continue;
   let value=text.nodeValue;
   value=value.replace(/\s*·?\s*Fonti consultabili nella pagina dedicata/gi,'')
    .replace(/\s*Ogni dato resta collegato alla propria fonte\./gi,'')
    .replace(/\bDati ESPN e schede Serie A\b/gi,'Dati storici')
    .replace(/Associazione giocatore-provider (da verificare|verificata)\.\s*Metodo:[^.]*\.?/gi,(_,status)=>`Identità ${status}.`)
    .replace(/\bnella fonte\b/gi,'nei dati disponibili')
    .replace(/Fonte storica:[^.]*\bESPN\./gi,'')
    .replace(/\b(?:WhoScored|StatMuse|ESPN|Transfermarkt|Fantacalcio\.it)\s*·\s*/gi,'')
    .replace(/\s*·\s*(?:WhoScored|StatMuse|ESPN|Transfermarkt|Diretta(?:\.it)?|Sofascore|FootyStats)\b/gi,'')
    .replace(/\b(?:WhoScored|StatMuse|ESPN)\b/gi,'')
    .replace(/Unione trasparente delle fonti/gi,'Indicazioni di utilizzo')
    .replace(/\bProvider ESPN\s*·?\s*/gi,'')
    .replace(/\bFixture e fonti consultabili nella tabella\.?/gi,'')
    .replace(/\bCopertura: dettagli nelle fonti\b/gi,'Copertura dei dati')
    .replace(/\bOrdine fonte\b/gi,'Ordine originale')
    .replace(/\bVerifica fonte aperta\b/gi,'Verifica disponibile')
    .replace(/\bFonte non integrata\b/gi,'Non disponibile')
    .replace(/\bFonte ufficiale\b/gi,'Ufficiale')
    .replace(/\bnelle fonti\b/gi,'nei dati disponibili')
    .replace(/\bdalla fonte(?: UEFA)?\b/gi,'nei dati disponibili')
    .replace(/\bdella fonte\b/gi,'dei dati disponibili')
    .replace(/\b(?:dal provider|dal modello e dalla fonte)\b/gi,'nei dati disponibili');
   if(value!==text.nodeValue)text.nodeValue=value;
  }
 }
 const pending=new Set();let scheduled=false;
 const observer=new MutationObserver(records=>{
  for(const r of records)for(const n of r.addedNodes){const el=n.nodeType===1?n:n.parentElement;if(el&&!el.closest('script,style'))pending.add(el.parentElement||el)}
  if(!scheduled&&pending.size){scheduled=true;queueMicrotask(()=>{scheduled=false;const roots=new Set(pending);pending.clear();for(const root of roots){let ancestor=root.parentElement;while(ancestor&&!roots.has(ancestor))ancestor=ancestor.parentElement;if(root.isConnected&&!ancestor)apply(root)}})}
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 if(document.body)apply(document.body);
 document.addEventListener('DOMContentLoaded',()=>apply(document.body),{once:true});
})();
