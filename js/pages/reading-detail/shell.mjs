import {installScenario} from './scenario.mjs';
import {installForecasts} from './forecasts.mjs';
import {loadEvidence} from './evidence.mjs';
import {installPeople} from './people.mjs';
import {installTacticsHistory} from './tactics-history.mjs';
import {loadVerification,installVerification} from './verification.mjs';
import {esc,recordList,details} from './format.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const definitions=[
  ['scenario','Scenario','01','M4 16l5-5 4 3 7-10'],
  ['pronostici','Pronostici','02','M5 4h14v16H5z M8 8h8 M8 12h5 M8 16h8'],
  ['formazioni','Formazioni','03','M3 5h18v14H3z M12 5v14 M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  ['giocatori','Giocatori','04','M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2'],
  ['disciplina','Disciplina','05','M7 3h10v18H7z'],
  ['tattica','Analisi tattica','06','M4 4h5v5H4z M15 15h5v5h-5z M6 9v8h9 M15 6h5 M18 3v6'],
  ['storico','Precedenti e storico','07','M4 8a9 9 0 1 1-1 8 M4 3v6h6 M12 7v6l4 2'],
  ['verifica','Tabellino e risultati','08','M4 4h16v16H4z M8 12l3 3 5-6'],
  ['fonti','Fonti e metodo','09','M5 3h10l4 4v14H5z M15 3v5h4 M8 12h8 M8 16h6']
];
const icon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

function classify(node){
  if(node.matches('.reading-post-match,.reading-archive-banner,.champions-match-report'))return 'verifica';
  if(node.matches('.prediction-v2-numbers,.prediction-v2-why,.champions-reading-volume'))return 'scenario';
  if(node.matches('.reading-shared-forecasts,.champions-selected-forecasts'))return 'pronostici';
  if(node.matches('.reading-info-grid'))return 'formazioni';
  if(node.matches('.prediction-v2-shooters,.prediction-v2-outsiders'))return 'giocatori';
  if(node.matches('.prediction-v2-discipline,.reading-referee-assignment'))return 'disciplina';
  if(node.matches('.reading-tactical-baseline,.reading-pilot-evidence'))return 'tattica';
  if(node.matches('.reading-h2h-section'))return 'storico';
  return null;
}

function heroMarkup(model){
  const label=model.theme==='champions'?'UEFA Champions League':'Serie A';
  const date=model.fixture.date?new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(model.fixture.date+'T12:00:00Z')):'Data N/D';
  const side=(team,position)=>`<div class="rd-team rd-team--${position}">${team.logo?`<img src="${escape(team.logo)}" alt="" width="100" height="100">`:''}<span class="rd-side">${position==='home'?'Casa':'Ospite'}</span><span class="rd-team-name">${escape(team.name)}</span></div>`;
  const score=model.fixture.status==='finished'&&model.fixture.score?`<span class="rd-result">Finale <b>${escape(model.fixture.score.home)} — ${escape(model.fixture.score.away)}</b></span>`:'';
  return `<header class="rd-hero" id="lettura-testata"><div class="rd-overline"><span class="rd-edition">${escape(label)} <i aria-hidden="true">/</i> Giornata ${escape(model.fixture.matchday??'N/D')}</span><span class="rd-status">${model.fixture.status==='finished'?'Partita conclusa':'Analisi prepartita'}</span></div><h1 class="rd-accessible-title">${escape(model.home.name)} – ${escape(model.away.name)}</h1><div class="rd-matchup">${side(model.home,'home')}<div class="rd-versus"><span>VS</span>${score}</div>${side(model.away,'away')}</div><div class="rd-match-meta"><time datetime="${escape(model.fixture.date||'')}">${escape(date)}</time><span>${escape(model.fixture.kickoff||'Orario N/D')}</span>${model.fixture.stadium?`<span>${escape(model.fixture.stadium)}</span>`:''}</div><div class="rd-editorial-note"><span>LA LETTURA</span><p>Numeri, protagonisti e chiavi della partita.</p></div></header>`;
}

export async function mountReadingShell(model,root=document.querySelector('#app'),options={}){
  if(!root||root.querySelector('.rd-shell'))return;
  // Await the isolated stylesheet before changing the page. Failure leaves legacy intact.
  const href=new URL('../../../css/reading-detail.css?v=20261016-bc1',import.meta.url).href;
  let sheet=document.querySelector('link[data-reading-detail-css]');
  if(!sheet){
    sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=href;sheet.dataset.readingDetailCss='';
    await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=()=>{sheet.remove();reject(new Error('Reading stylesheet unavailable'))};document.head.append(sheet)});
  }
  const evidence=await loadEvidence(model),verification=await loadVerification(model);
  const original=[...root.childNodes];
  const oldHero=root.querySelector('.reading-match-hero');
  if(!oldHero)return;
  const shell=document.createElement('div');shell.className='rd-shell';shell.dataset.readingFixture=model.fixture.id;
  const hero=document.createElement('div');hero.innerHTML=heroMarkup(model);
  const nav=document.createElement('nav');nav.className='rd-nav';nav.setAttribute('aria-label','Sezioni della lettura');
  const linkStrip=document.createElement('div');linkStrip.className='rd-nav-links';nav.append(linkStrip);
  const groups=new Map(definitions.map(([key,title,number,path])=>{
    const section=document.createElement('section');section.className='rd-section';section.id='lettura-'+key;
    section.innerHTML=`<header class="rd-section-heading"><span class="rd-section-number">${number}</span>${icon(path)}<h2>${title}</h2></header><div class="rd-section-content"></div>`;
    return [key,section];
  }));
  const placements=[];
  const undo=[];
  const move=(node,parent)=>{placements.push({node,parent:node.parentNode,next:node.nextSibling});parent.append(node)};
  try{
    const back=root.querySelector('.reading-back');
    if(back){back.classList.add('rd-back');move(back,shell);}
    const fallback=document.createElement('a');const previous=new URL(location.href);previous.searchParams.set('layout','legacy');fallback.href=previous.href;fallback.className='rd-fallback';fallback.textContent='Vista precedente';
    if(back)back.append(fallback);else shell.append(fallback);
    shell.append(hero.firstElementChild,nav);
    const summary=oldHero.querySelector('.reading-summary');
    if(summary){summary.classList.add('rd-original-summary');move(summary,groups.get('scenario').lastElementChild);}
    const referee=oldHero.querySelector('.reading-referee-assignment');
    if(referee)move(referee,groups.get('disciplina').lastElementChild);
    // The Champions report is nested inside the scenario in the original renderer.
    const report=root.querySelector('.champions-match-report');
    if(report)move(report,groups.get('verifica').lastElementChild);
    for(const node of original){
      if(node===oldHero||node===back||node===report)continue;
      if(node.nodeType!==1){move(node,shell);continue;}
      const key=classify(node);
      if(key)move(node,groups.get(key).lastElementChild);
      else move(node,shell); // Preserve unknown original content instead of dropping it.
    }
    for(const [key,title] of definitions){
      const group=groups.get(key);
      shell.append(group);
      const link=document.createElement('a');link.href='#'+group.id;link.textContent=title;link.dataset.sectionLink=key;linkStrip.append(link);
    }
    const mini=document.createElement('div');mini.className='rd-mini';mini.innerHTML=`<span>${escape(model.home.name)}</span><b>VS</b><span>${escape(model.away.name)}</span>`;mini.setAttribute('aria-hidden','true');nav.prepend(mini);
    undo.push(installScenario(model,groups.get('scenario').lastElementChild));
    const forecastUi=installForecasts(model,groups.get('pronostici').lastElementChild,shell,options.store);undo.push(forecastUi.undo);
    undo.push(installPeople(model,evidence,Object.fromEntries([...groups].map(([key,group])=>[key,group.lastElementChild])),shell));
    undo.push(installTacticsHistory(model,evidence,Object.fromEntries([...groups].map(([key,group])=>[key,group.lastElementChild]))));
    undo.push(installVerification(model,evidence,verification,groups.get('verifica').lastElementChild,groups.get('pronostici').lastElementChild));
    groups.get('fonti').lastElementChild.innerHTML=`<p class="rd-footnote">Dati osservati, proiezioni e interpretazioni hanno fonti e periodi distinti. Quote riferite allo snapshot provider, senza aggiornamenti in tempo reale.</p>${details('Provenienza e copertura',recordList({fontiFixture:evidence.analysis.match?.sources||evidence.analysis.match?.matchReport?.sourceUrl,fontiFormazioni:evidence.lineups.map(l=>({squadra:l.side.name,fonte:l.source,aggiornamento:l.updatedAt})),qualita:model.quality,previsioneAggiornata:model.prediction?.generatedAt??null,snapshot:verification.snapshot?{id:verification.snapshot.snapshotId,generatedAt:verification.snapshot.generatedAt,hash:verification.snapshot.integrity.sha256}:verification.snapshotReason}))}`;
    root.replaceChildren(shell);document.body.dataset.readingDetailTheme=model.theme;
    const siteHeader=document.querySelector('.site-header');
    const headerOffset=()=>siteHeader?siteHeader.getBoundingClientRect().height+(parseFloat(getComputedStyle(siteHeader).top)||0):0;
    const resize=()=>shell.style.setProperty('--rd-header-height',`${Math.ceil(headerOffset())}px`);
    resize();const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(siteHeader)sizeObserver?.observe(siteHeader);
    nav.addEventListener('click',event=>{
      const link=event.target.closest('[data-section-link]');
      if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const target=groups.get(link.dataset.sectionLink);if(!target)return;
      event.preventDefault();nav.classList.add('is-condensed');
      const offset=headerOffset()+nav.getBoundingClientRect().height+18;
      history.pushState(null,'',link.hash);
      window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top-offset,behavior:'instant'});
      target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    });
    const heroObserver=new IntersectionObserver(([entry])=>nav.classList.toggle('is-condensed',!entry.isIntersecting&&entry.boundingClientRect.top<0),{threshold:0});heroObserver.observe(shell.querySelector('.rd-hero'));
    const sectionObserver=new IntersectionObserver(entries=>{const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(active)nav.querySelectorAll('[data-section-link]').forEach(link=>{if(link.hash==='#'+active.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')})},{rootMargin:'-20% 0px -65% 0px'});
    groups.forEach(group=>{if(group.isConnected)sectionObserver.observe(group)});
    window.addEventListener('pagehide',()=>{heroObserver.disconnect();sectionObserver.disconnect();sizeObserver?.disconnect()},{once:true});
  }catch(error){
    undo.reverse().forEach(fn=>fn());
    // Restore moved nodes to their original parents in reverse order.
    for(const item of placements.reverse())item.parent.insertBefore(item.node,item.next?.parentNode===item.parent?item.next:null);
    root.replaceChildren(...original);delete document.body.dataset.readingDetailTheme;
    root.querySelector('.rd-fallback')?.remove();root.querySelector('.rd-back')?.classList.remove('rd-back');
    root.querySelector('.rd-original-summary')?.classList.remove('rd-original-summary');
    throw error;
  }
}
