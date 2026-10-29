import {imageSource} from '../../core/image-source.mjs?v=20261022-assets-v1';
import {installForecasts} from './forecasts.mjs?v=20261025-clean-copy';
import {installScenario} from './scenario.mjs?v=20261024-no-coverage-label';
import {loadEvidence,readArtifact} from './evidence.mjs?v=20261029-spatial-v1';
import {installPeople} from './people.mjs?v=20261025-player-history';
import {installTacticsHistory} from './tactics-history.mjs?v=20261029-continuity-v1';
import {loadHistoryRows} from './head-to-head.mjs?v=20261022-assets-v1';
import {mountRefereeHistory} from './referee-history.mjs?v=20261022-assets-v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const definitions=[
  ['scenario','Scenario','01','M4 16l5-5 4 3 7-10'],
  ['pronostici','Pronostici','02','M4 6h16 M4 12h16 M4 18h16'],
  ['formazioni','Formazioni','03','M3 5h18v14H3z M12 5v14 M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  ['giocatori','Giocatori','04','M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2'],
  ['disciplina','Disciplina','05','M7 3h10v18H7z'],
  ['tattica','Analisi tattica','06','M4 4h5v5H4z M15 15h5v5h-5z M6 9v8h9 M15 6h5 M18 3v6'],
  ['storico','Precedenti','07','M4 8a9 9 0 1 1-1 8 M4 3v6h6 M12 7v6l4 2'],
  ['verifica','Tabellino e risultati','08','M4 4h16v16H4z M8 12l3 3 5-6'],
  ['fonti','Fonti e metodo','09','M5 3h10l4 4v14H5z M15 3v5h4 M8 12h8 M8 16h6']
];
const icon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

export function readingSections(model){
  return definitions.filter(([key])=>!['verifica','fonti'].includes(key)&&(key!=='pronostici'||model.competition==='champions'||model.forecasts?.length>0))
    .map(([key,title,,path],i)=>[key,title,String(i+1).padStart(2,'0'),path]);
}

export async function readingResultsDestination(model,read=readArtifact){
  if(model.fixture.status!=='finished')return null;
  try{
    // These are the existing result-capable routes, not an extension of market gates.
    if(model.competition==='serie-a'&&[6,8].includes(Number(model.fixture.matchday))){
      const day=Number(model.fixture.matchday),code=String(day).padStart(2,'0');
      const data=await read(`data/normalized/schedina-md${code}.json`);
      const fixture=data.marketCatalog?.matches?.find(f=>f.matchId===model.fixture.id);
      if(Number(data.matchday)===day&&fixture?.selections?.length)return `schedina.html?giornata=${day}`;
    }
    if(model.competition==='champions'&&Number(model.fixture.matchday)===2){
      const data=await read('data/normalized/champions-md02-audit-display.json');
      const fixture=data.fixtures?.find(f=>f.fixtureId===model.fixture.id);
      if(Number(data.matchday)===2&&fixture?.status==='finished'&&fixture.contractIds?.length)return 'schedina.html?giornata=2&competizione=champions';
    }
  }catch{/* An unavailable archive must not produce a misleading link. */}
  return null;
}

function classify(node){
  if(node.matches('.reading-shared-forecasts'))return 'pronostici';
  if(node.matches('.reading-post-match,.reading-archive-banner,.champions-match-report'))return 'verifica';
  if(node.matches('.prediction-v2-numbers,.prediction-v2-why,.champions-reading-volume'))return 'scenario';
  if(node.matches('.reading-info-grid'))return 'formazioni';
  if(node.matches('.prediction-v2-shooters,.prediction-v2-outsiders'))return 'giocatori';
  if(node.matches('.prediction-booked-panel,.champions-player-predictions:has(.prediction-booked-panel),.reading-referee-assignment'))return 'disciplina';
  if(node.matches('.reading-tactical-baseline,.reading-pilot-evidence'))return 'tattica';
  if(node.matches('.reading-h2h-section'))return 'storico';
  return null;
}

export function heroMarkup(model){
  const label=model.theme==='champions'?'UEFA Champions League':'Serie A';
  const date=model.fixture.date?new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(model.fixture.date+'T12:00:00Z')):'Data N/D';
  const side=(team,position)=>`<div class="rd-team rd-team--${position}">${team.logo?`<img src="${imageSource(`${escape(team.logo)}`)}" alt="" width="100" height="100">`:''}<span class="rd-side">${position==='home'?'Casa':'Ospite'}</span><span class="rd-team-name">${escape(team.name)}</span></div>`;
  const score=model.fixture.status==='finished'&&model.fixture.score?`<span class="rd-result">Finale <b>${escape(model.fixture.score.home)} — ${escape(model.fixture.score.away)}</b></span>`:'';
  return `<header class="rd-hero" id="lettura-testata"><div class="rd-overline"><span class="rd-edition">${escape(label)} <i aria-hidden="true">/</i> Giornata ${escape(model.fixture.matchday??'N/D')}</span><span class="rd-status">${model.fixture.status==='finished'?'Partita conclusa':['live','in_progress'].includes(model.fixture.status)?'In corso':model.fixture.status==='postponed'?'Rinviata':model.fixture.status==='cancelled'?'Annullata':'Analisi prepartita'}</span></div><div class="rd-match-meta"><time datetime="${escape(model.fixture.date||'')}">${escape(date)}</time><span>${escape(model.fixture.kickoff||'Orario N/D')}</span>${model.fixture.stadium?`<span>${escape(model.fixture.stadium)}</span>`:''}</div><h1 class="rd-accessible-title">${escape(model.home.name)} – ${escape(model.away.name)}</h1><div class="rd-matchup">${side(model.home,'home')}<div class="rd-versus">${score||'<span class="rd-vs">VS</span>'}</div>${side(model.away,'away')}</div><div class="rd-editorial-note"><span>LA LETTURA</span></div></header>`;
}

export async function prepareReadingShell(model){
  const [evidence,resultsHref,refereeHistory,refereeTeams]=await Promise.all([loadEvidence(model),readingResultsDestination(model),readArtifact('data/generated/reading-referee-history.json').catch(error=>{console.warn('Storico arbitrale non disponibile',error);return null}),readArtifact('data/normalized/champions-league-2026-27.json').then(d=>(d.teamBranding||[]).map(t=>({name:t.team,logo:t.logo}))).catch(()=>[])]);
  return {evidence:{...evidence,historyRows:await loadHistoryRows(model,evidence,readArtifact)},resultsHref,refereeHistory,refereeTeams};
}

export async function mountReadingShell(model,root=document.querySelector('#app'),options={}){
  if(!root||root.querySelector('.rd-shell'))return;
  const {evidence,resultsHref,refereeHistory,refereeTeams=[]}=options.prepared||await prepareReadingShell(model);
  const visibleDefinitions=readingSections(model);
  const original=[...root.childNodes];
  const oldHero=root.querySelector('.reading-match-hero');
  if(!oldHero)return;
  const shell=document.createElement('div');shell.className='rd-shell';shell.dataset.readingFixture=model.fixture.id;
  const hero=document.createElement('div');hero.innerHTML=heroMarkup(model);
  const nav=document.createElement('nav');nav.className='rd-nav';nav.setAttribute('aria-label','Sezioni della lettura');
  const linkStrip=document.createElement('div');linkStrip.className='rd-nav-links';nav.append(linkStrip);
  const groups=new Map(definitions.map(([key,title,number,path])=>{
    const collapsible=key==='pronostici';
    const section=document.createElement(collapsible?'details':'section');section.className='rd-section';section.id='lettura-'+key;
    const heading=collapsible?'summary':'header';
    section.innerHTML=`<${heading} class="rd-section-heading"><span class="rd-section-number">${number}</span>${icon(path)}<h2>${title}</h2>${collapsible?'<span class="rd-forecast-toggle" aria-hidden="true">⌄</span>':''}</${heading}><div class="rd-section-content"></div>`;
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
    shell.append(hero.firstElementChild);
    if(resultsHref){
      const results=document.createElement('p');results.className='rd-footnote';
      results.innerHTML=`<a data-reading-results-link href="${escape(resultsHref)}">Esiti nella Schedina · ${model.competition==='champions'?'Champions League':'Serie A'} · Giornata ${escape(model.fixture.matchday)} ↗</a>`;
      shell.append(results);
    }
    shell.append(nav);
    const summary=oldHero.querySelector('.reading-summary');
    if(summary){summary.classList.add('rd-original-summary');move(summary,groups.get('scenario').lastElementChild);}
    const referee=oldHero.querySelector('.reading-referee-assignment');
    if(referee)move(referee,groups.get('disciplina').lastElementChild);
    // The Champions report is nested inside the scenario in the original renderer.
    const report=root.querySelector('.champions-match-report');
    if(report)move(report,groups.get('verifica').lastElementChild);
    for(const node of original){
      if(node===oldHero||node===back||node===report)continue;
      if(node.nodeType!==1)continue;
      const key=node.dataset.readingSection||classify(node);
      if(key)move(node,groups.get(key).lastElementChild);
      else if(node.matches('[data-required-attribution],[data-legal-notice]')||node.querySelector('[data-required-attribution],[data-legal-notice]'))move(node,shell);
    }
    for(const [key,title,number] of visibleDefinitions){
      const group=groups.get(key);
      group.querySelector('.rd-section-number').textContent=number;
      shell.append(group);
      const link=document.createElement('a');link.href='#'+group.id;link.textContent=title;link.dataset.sectionLink=key;linkStrip.append(link);
    }
    const mini=document.createElement('div');mini.className='rd-mini';mini.innerHTML=`<span>${escape(model.home.name)}</span><b>VS</b><span>${escape(model.away.name)}</span>`;mini.setAttribute('aria-hidden','true');nav.prepend(mini);
    if(model.competition==='serie-a'&&visibleDefinitions.some(([key])=>key==='pronostici')){const forecasts=installForecasts(model,groups.get('pronostici').lastElementChild,shell,options.store);undo.push(forecasts.undo);}
    undo.push(installScenario(model,groups.get('scenario').lastElementChild));
    undo.push(installPeople(model,evidence,Object.fromEntries([...groups].map(([key,group])=>[key,group.lastElementChild])),shell));
    undo.push(installTacticsHistory(model,evidence,Object.fromEntries([...groups].map(([key,group])=>[key,group.lastElementChild]))));
    if(options.extend){root.replaceChildren(shell);document.body.dataset.readingDetailTheme=model.theme;await options.extend({shell,groups,evidence});}
    // An unavailable informational archive must not prevent the existing reading from mounting.
    try{undo.push(mountRefereeHistory(model,groups.get('disciplina').lastElementChild,refereeHistory,[...(evidence.directory?.teams||[]),...refereeTeams]));}catch(error){console.warn('Storico arbitrale non disponibile',error);}
    if(model.fixture.status==='finished'){
      // Existing player/discipline references now lead to the result archive, never a missing section.
      shell.querySelectorAll('[data-market-link]').forEach(button=>{
        if(resultsHref)button.addEventListener('click',()=>location.assign(resultsHref));
        else button.disabled=true;
      });
    }
    // Build navigation from mounted, nonempty sections, after component installation.
    linkStrip.replaceChildren();let sectionNumber=0;
    for(const [key,title] of visibleDefinitions){
      const group=groups.get(key);
      if(!group.lastElementChild.textContent.trim()&&!group.lastElementChild.children.length){group.remove();continue;}
      group.querySelector('.rd-section-number').textContent=String(++sectionNumber).padStart(2,'0');
      const link=document.createElement('a');link.href='#'+group.id;link.textContent=title;link.dataset.sectionLink=key;linkStrip.append(link);
    }
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
      nav.querySelectorAll('[data-section-link]').forEach(item=>{if(item===link)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current')});
      const offset=headerOffset()+nav.getBoundingClientRect().height+18;
      history.pushState(null,'',link.hash);
      window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top-offset,behavior:'instant'});
      target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    });
    const heroObserver=new IntersectionObserver(([entry])=>nav.classList.toggle('is-condensed',!entry.isIntersecting&&entry.boundingClientRect.top<0),{threshold:0});heroObserver.observe(shell.querySelector('.rd-hero'));
    const sectionObserver=new IntersectionObserver(entries=>{const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(active)nav.querySelectorAll('[data-section-link]').forEach(link=>{if(link.hash==='#'+active.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')})},{rootMargin:'-20% 0px -65% 0px'});
    groups.forEach(group=>{if(group.isConnected)sectionObserver.observe(group)});
    window.addEventListener('pagehide',()=>{heroObserver.disconnect();sectionObserver.disconnect();sizeObserver?.disconnect()},{once:true});
    shell.dataset.readingReady='true';
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
