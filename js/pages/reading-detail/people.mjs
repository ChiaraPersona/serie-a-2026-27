import {esc,number,pct,finite,metric,details,recordList,missing,tabs,mountTabs,sourceLink} from './format.mjs';
import {lineupPositions} from '../../components/lineup-field.mjs';
import {renderLineupKit} from '../../components/lineup-kit.mjs';
import {individualPlayers} from './evidence.mjs';
const label=s=>s==='official'?'Ufficiale':s==='probable'?'Probabile':s==='reference'?'Riferimento':'Da confermare';
function preserve(container,content,title){
 const original=[...container.childNodes];
 if(title){const backup=document.createElement('details');backup.className='rd-disclosure rd-original-detail';backup.innerHTML=`<summary>${esc(title)}</summary>`;original.forEach(n=>backup.append(n));container.replaceChildren(content,backup)}
 else container.replaceChildren(content);
 return ()=>container.replaceChildren(...original);
}
export function formationMarkup(evidence){
 const field=evidence.lineups.map((l,i)=>{
  const valid=typeof l.formation==='string'&&/^\d+(?:-\d+)+$/.test(l.formation)&&l.formation.split('-').map(Number).reduce((a,b)=>a+b,1)===11&&l.players.length===11;
  if(!valid)return '';
  const team=evidence.directory?.teams?.find(t=>t.id===l.side.id)||l.side;
  return lineupPositions({formation:l.formation,players:l.players},i===1).map(pos=>`<div class="rd-field-player is-${i?'away':'home'}${pos.goalkeeper?' is-goalkeeper':''}" style="left:${pos.x}%;top:${pos.y}%"><span class="rd-kit" aria-label="Numero ${pos.name.shirtNumber??'non disponibile'}">${renderLineupKit(team,{goalkeeper:pos.goalkeeper})}<b>${esc(pos.name.shirtNumber??'—')}</b></span><strong>${esc(pos.name.name)}</strong></div>`).join('');
 }).join('');
 const headings=`<div class="rd-lineup-head">${evidence.lineups.map(l=>`<div><h3>${esc(l.side.name)}</h3><b>${esc(l.formation||'Modulo N/D')} · ${label(l.status)}</b><span>Allenatore: ${esc(l.coach||'N/D')}</span></div>`).join('')}</div>`;
 // Internal note: one shared pitch; narrow screens retain horizontal scrolling and lists.
 // Missing shirt numbers are displayed as an em dash.
 const pitch=`<div class="rd-pitch-scroll" tabindex="0" role="region" aria-label="Campo delle formazioni, scorrimento orizzontale"><div class="rd-pitch"><svg viewBox="0 0 1080 600" aria-hidden="true"><g fill="none" stroke="currentColor"><rect x="14" y="14" width="1052" height="572"/><path d="M540 14V586M14 170H165V430H14M1066 170H915V430H1066"/><circle cx="540" cy="300" r="70"/></g></svg>${field}</div></div>`;
 const lists=details('Elenchi titolari, panchine e fonti',`<div class="rd-two-col">${evidence.lineups.map(l=>`<article><h3>${esc(l.side.name)}</h3><ol class="rd-lineup-list">${l.players.map(p=>`<li><b>${esc(p.shirtNumber??'—')}</b> ${esc(p.name)}</li>`).join('')}</ol><p class="rd-footnote">Panchina: ${l.bench.length?l.bench.map(p=>esc(typeof p==='string'?p:p.canonicalName||p.suppliedName||p.currentName||p.name)).join(', '):'N/D'}</p>${sourceLink(l.source?.url,l.source?.provider||'Fonte formazione')}<p class="rd-footnote">${esc(l.updatedAt||'Data non disponibile')}</p></article>`).join('')}</div>`);
 return headings+(field?pitch:missing('Disposizione tattica non disponibile: consulta gli elenchi titolari verificati.'))+lists;
}
export function playersMarkup(model,evidence){
 const players=individualPlayers(model,evidence);
 const rows=players.map(p=>{
  const s=p.source,a=p.available,shots=a?s.projectedShots:null,sot=a?s.projectedShotsOnTarget:null;
  const historical=p.member?.previousSeason?.totals;
  const recent=(evidence.analysis.matches||[]).filter(m=>m.id!==model.fixture.id&&m.date<model.fixture.date&&m.status==='finished').flatMap(m=>['home','away'].flatMap(side=>(m.playerStats?.[side]||[]).filter(q=>p.id&&q.playerId===p.id).map(q=>({date:m.date,minutes:q.minutes,shots:q.shots,sot:q.shotsOnTarget})))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return {player:p,html:`<details class="rd-player-row" data-player-card data-player-id="${esc(p.id||'')}" data-player-outsider="${p.outsider}" data-player-lineup="${p.lineupStatus}"><summary title="Espandi statistiche di ${esc(p.name)}"><span class="rd-row-number" aria-label="Numero di maglia ${esc(p.number??'non disponibile')}">${esc(p.number??'—')}</span><span class="rd-row-identity"><h3>${esc(p.name)}</h3>${p.outsider?'<small class="rd-compact-outsider">Outsider</small>':''}</span><span class="rd-row-shot" data-player-shots aria-label="Tiri previsti: ${number(shots)}">${number(shots)}</span><span class="rd-row-sot" data-player-sot aria-label="SOT previsti: ${number(sot)}">${number(sot)}</span><span class="rd-row-chevron" aria-hidden="true">＋</span></summary><div class="rd-player-expanded"><p class="rd-player-role">${esc(p.team)} · ${esc(p.role||'Ruolo N/D')}</p><dl class="rd-player-kpis">${metric('Tiri previsti',shots)}${metric('SOT previsti',sot)}${metric('Minuti attesi',a?s.expectedMinutes:null,"′")}</dl><div class="rd-player-probabilities"><span>2+ tiri <b>${pct(a?s.shotProbabilities?.over15:null,true)}</b></span><span>1+ SOT <b>${pct(a?s.shotOnTargetProbabilities?.over05:null,true)}</b></span></div><p class="rd-footnote">Proiezione del singolo: non quantifica DUO, sostituto o pali/traverse.</p>${a?`<p>Rischio sostituzione: ${esc(s.substitutionRisk||'N/D')} · Ruolo: ${esc(s.allocationClass||s.role||'N/D')}</p>`:missing('Identità o baseline individuale insufficienti: proiezioni N/D.')}<h4>Ultime presenze osservate disponibili</h4>${recent.length?`<ul class="rd-mini-log">${recent.map(r=>`<li><time>${esc(r.date)}</time><span>${number(r.minutes,0)}′</span><b>${number(r.shots,0)} tiri · ${number(r.sot,0)} SOT</b></li>`).join('')}</ul>`:missing('Serie individuale per gara non disponibile. Gli aggregati non vengono trasformati in un andamento.')}<h4>Storico individuale</h4><dl class="rd-player-kpis">${metric('Minuti storico',historical?.minutes??s.minutes, '')}${metric('Tiri /90',historical?.per90?.shots??s.per90?.shots)}${metric('SOT /90',historical?.per90?.shotsOnTarget??s.per90?.shotsOnTarget)}</dl>${details('Evidenze e soglie originali',recordList(s))}</div></details>`};
 });
 const assigned=new Set();
 const columns=[model.home,model.away].map((side,i)=>{
  const sideRows=rows.filter(({player:p})=>!assigned.has(p)&&(p.team===side.name||p.team===side.id||p.source.teamId===side.id||evidence.lineups[i]?.players.some(q=>q.id&&q.id===p.id)));sideRows.forEach(r=>assigned.add(r.player));
  return `<section class="rd-player-team" data-player-team="${i?'away':'home'}" aria-label="Giocatori ${esc(side.name)}"><h3 class="rd-player-team-name">${esc(side.name)}</h3><div class="rd-player-column-labels" aria-hidden="true"><span>Giocatore</span><span>Tiri</span><span>SOT</span></div>${sideRows.map(r=>r.html).join('')||missing('Proiezioni individuali non disponibili.')}</section>`;
 }).join('');
 const unassigned=rows.filter(r=>!assigned.has(r.player));
 return `<div class="rd-player-toolbar"><div class="rd-player-mode" role="group" aria-label="Filtra per formazione"><button type="button" data-player-lineup-filter="starter" aria-pressed="false">Titolari</button><button type="button" data-player-lineup-filter="bench" aria-pressed="false">Panchinari</button></div></div><p data-player-empty role="status" hidden></p><div class="rd-player-columns">${columns}</div>${unassigned.length?`<div class="rd-player-unassigned">${missing('Squadra non identificata nella fonte.')}${unassigned.map(r=>r.html).join('')}</div>`:''}`;
}
export function mountMarketLinks(root,shell){root.addEventListener('click',event=>{const b=event.target.closest('[data-market-link]');if(!b)return;const row=[...shell.querySelectorAll('[data-forecast-id]')].find(n=>n.dataset.forecastId===b.dataset.marketLink);if(!row)return;const form=shell.querySelector('.rd-filters');form?.reset();queueMicrotask(()=>{row.hidden=false;row.querySelector('details').open=true;row.scrollIntoView({block:'center',behavior:'instant'});row.querySelector('summary').focus()})})}
export function installPeople(model,evidence,containers,shell){
 const undo=[];
 const formations=document.createElement('div');formations.className='rd-formations';formations.innerHTML=formationMarkup(evidence);
 undo.push(preserve(containers.formazioni,formations));
 const players=document.createElement('div');players.innerHTML=playersMarkup(model,evidence);
 undo.push(preserve(containers.giocatori,players));
 let active=null;const buttons=[...players.querySelectorAll('[data-player-lineup-filter]')];
 const filter=()=>{let visible=0;players.querySelectorAll('[data-player-card]').forEach(card=>{card.hidden=active!==null&&card.dataset.playerLineup!==active;if(!card.hidden)visible++});buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.playerLineupFilter===active)));const empty=players.querySelector('[data-player-empty]');empty.hidden=visible>0;empty.textContent=visible?'':active==='bench'?'Nessun panchinaro identificato nelle formazioni per i giocatori presenti.':'Nessun titolare identificato nelle formazioni per i giocatori presenti.';};
 buttons.forEach(b=>b.addEventListener('click',()=>{active=active===b.dataset.playerLineupFilter?null:b.dataset.playerLineupFilter;filter()}));filter();mountMarketLinks(players,shell);
 // Keep the original discipline and referee components, including their explanations.
 return ()=>undo.reverse().forEach(fn=>fn());
}
