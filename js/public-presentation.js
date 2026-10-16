// Public presentation only: never writes application data or selection storage.
(() => {
 'use strict';
 const legalSelector='[data-required-attribution],[data-legal-notice],.photo-credit,.image-attribution,.license-credit,[rel~="license"],a[href*="creativecommons.org"]';
 const protectedNode=n=>!!n.closest(legalSelector);
 const hide=n=>{if(!protectedNode(n)&&!n.querySelector(legalSelector)){n.hidden=true;n.style.setProperty('display','none','important');n.dataset.privateProvenance='';}};
 const style=document.createElement('style');
 style.textContent='[data-private-provenance],a[href$="fonti.html"],.source-list,.source-directory-list,.champions-source-links,.reading-post-match-source{display:none!important}';
 document.head.append(style);
 const provider=/^(?:fonte(?:\s.*)?|apri la fonte|snapshot provider|source|UEFA(?: ↗)?|ESPN(?: ↗)?|WhoScored(?: ↗)?|StatMuse(?: ↗)?|Transfermarkt(?: ↗)?|Fantacalcio(?:\.it)?(?: ↗)?)$/i;
 const privateKey=/^(?:font[ei]|sources?|sourceUrl|sourceName|sourceProvider|sourcePages|provider|provenienza|provenance|origine|retrievedAt|importedAt|sourceUpdatedAt|sourceMetadata)$/i;
 const dedicated='.source-list,.source-directory-list,.source-team-grid,.sources-directory,.champions-source-links,.reading-post-match-source,.fantasy-price-source,[data-source-section]';
 function apply(root){
  if(!root?.querySelectorAll||protectedNode(root))return;
  root.querySelectorAll(dedicated).forEach(hide);
  root.querySelectorAll('a').forEach(a=>{
   if(protectedNode(a))return;
   if(/(?:^|\/)fonti\.html(?:[?#]|$)/i.test(a.getAttribute('href')||'')||provider.test(a.textContent.trim()))hide(a);
  });
  root.querySelectorAll('dt').forEach(dt=>{if(privateKey.test(dt.textContent.trim()))hide(dt.parentElement)});
  root.querySelectorAll('table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead tr:first-child th')];
   headers.forEach((th,i)=>{if(/^(?:font[ei]|provenienza|provider)$/i.test(th.textContent.trim()))table.querySelectorAll('tr').forEach(row=>{if(row.children[i])hide(row.children[i])})});
  });
  root.querySelectorAll('h1,h2,h3,h4,summary').forEach(h=>{
   if(protectedNode(h))return;
   const title=h.textContent.trim();
   if(/^(?:Fonti(?: dei dati| e riferimenti)?|Provenienza(?: dei dati)?|Riferimenti delle fonti)$/i.test(title)){hide(h.closest('section,details')||h);return}
   // Mixed sections retain their actual statistics and lineup lists.
   for(const node of h.childNodes)if(node.nodeType===3)node.nodeValue=node.nodeValue.replace(/,\s*fonti\s*e\s*/gi,' e ').replace(/\s+e fonti\b/gi,'').replace(/,?\s*e fonte\b/gi,'');
  });
  root.querySelectorAll('p,small,span,div').forEach(n=>{
   if(protectedNode(n)||n.hasAttribute('data-private-provenance'))return;
   const direct=[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.nodeValue).join('').trim();
   if(/^(?:Fonte(?:\s+(?:statistica|statistiche|storica))?\s*:|Fonte (?:non disponibile|ufficiale|non integrata)|Fonti consultabili)/i.test(direct)&&n.children.length<3)hide(n);
   if(/^(?:Fonte statistica|Dati disponibili e provenienza)$/i.test(n.textContent.trim())){if(n.textContent.trim()==='Fonte statistica')hide(n.parentElement);else hide(n)}
  });
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let text;
  while((text=walker.nextNode())){
   const parent=text.parentElement;if(!parent||parent.closest('script,style,textarea,code,pre,[data-private-provenance]')||protectedNode(parent))continue;
   let value=text.nodeValue;
   value=value.replace(/\s*·?\s*Fonti consultabili nella pagina dedicata/gi,'')
    .replace(/Fonte storica:[^.]*\bESPN\./gi,'')
    .replace(/\b(?:WhoScored|StatMuse|ESPN|Transfermarkt|Fantacalcio\.it)\s*·\s*/gi,'')
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
  if(!scheduled&&pending.size){scheduled=true;queueMicrotask(()=>{scheduled=false;const roots=[...pending];pending.clear();for(const root of roots)if(root.isConnected)apply(root)})}
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 if(document.body)apply(document.body);
 document.addEventListener('DOMContentLoaded',()=>apply(document.body),{once:true});
})();
