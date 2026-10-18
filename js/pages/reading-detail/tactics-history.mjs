import {esc,number,finite,recordList,details,missing} from './format.mjs';
import {historyMarkup,selectHistoryRows} from './head-to-head.mjs?v=20261018-h2h-timeline-v1';
export function attackMarkup(channels){
 if(!channels)return missing('Ripartizione delle direzioni d’attacco non disponibile.');
 return `<div class="rd-channels">${[['left','Sinistra'],['central','Centro'],['right','Destra']].map(([key,label])=>`<div><span>${label}</span><i aria-hidden="true"><b style="width:${finite(channels[key])?Math.max(0,Math.min(100,channels[key])):0}%"></b></i><strong>${number(channels[key])}${finite(channels[key])?'%':''}</strong></div>`).join('')}</div><p class="rd-footnote">Canali d’attacco della fonte, non coordinate dei tiri.</p>`;
}
function profileFor(model,evidence,i){
 const side=[model.home,model.away][i],id=side.id||model.prediction?.teamProjections?.[i]?.teamId;
 return evidence.analysis.styles?.profiles?.find(p=>p.teamId===id)||null;
}
export function tacticsMarkup(model,evidence){
 const sides=[model.home,model.away],profiles=sides.map((_,i)=>profileFor(model,evidence,i));
 const panels=sides.map((side,i)=>{
  const p=profiles[i],channels=evidence.analysis.attackChannels?.profiles?.find(p=>p.team===side.name)?.attackChannels||model.prediction?.teamProjections?.[i]?.attackChannels||p?.attackChannels;
  return `<article class="rd-tactical-column" data-tactical-side="${i?'away':'home'}"><header class="rd-tactical-team"><span>${i?'Ospite':'Casa'}</span><h3>${esc(side.name)}</h3></header><p class="rd-footnote rd-tactical-baseline">Baseline ${esc(p?.season||'storica')} · ${esc(p?.competition||'Campione N/D')} · ${number(p?.summary?.appearances,0)} gare</p><dl class="rd-player-kpis rd-tactical-metrics"><div><dt>Possesso</dt><dd>${number(p?.summary?.possessionPct)}${finite(p?.summary?.possessionPct)?'%':''}</dd></div><div><dt>Tiri / gara</dt><dd>${number(p?.summary?.shotsPerGame)}</dd></div><div><dt>Gol / gara</dt><dd>${number(p?.derived?.goalsPerGame)}</dd></div></dl><div class="rd-tactical-directions">${attackMarkup(channels)}</div></article>`;
 });
 return `<div class="rd-tactical-comparison" aria-label="Confronto tattico Casa e Ospite">${panels.join('')}</div>`;
}
export function priorMatches(model,evidence,side){
 return (evidence.analysis.matches||[]).filter(m=>m.id!==model.fixture.id&&m.status==='finished'&&m.score&&m.date<model.fixture.date&&[m.homeTeam,m.awayTeam].some(t=>t===side.id||t===side.name)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.kickoff||'').localeCompare(String(a.kickoff||'')));
}
function timeline(model,evidence,side){
 const name=id=>evidence.directory?.teams.find(t=>t.id===id)?.name||id;
 const rows=priorMatches(model,evidence,side).slice(0,5);
 return `<h3>${esc(side.name)}</h3>${rows.length?rows.map(m=>`<details class="rd-match-log"><summary><time>${esc(m.date)}</time><span>${esc(name(m.homeTeam))} – ${esc(name(m.awayTeam))}</span><b>${esc(m.score.home)}–${esc(m.score.away)}</b></summary><div><p class="rd-footnote">Solo gare concluse del calendario disponibile, antecedenti alla fixture.</p><a href="${model.competition==='champions'?'champions-league':'lettura'}.html?match=${encodeURIComponent(m.id)}">Apri la lettura ↗</a>${details('Tabellino e dati osservati disponibili',recordList({risultato:m.score,statistiche:m.teamStats||m.matchReport?.statistics,fonti:m.resultSource||m.matchReport?.sourceUrl||m.sources}))}</div></details>`).join(''):missing('Gare precedenti con risultato verificato non disponibili nel calendario caricato.')}`;
}
export function installTacticsHistory(model,evidence,containers){
 const oldTactics=[...containers.tattica.childNodes],oldHistory=[...containers.storico.childNodes];
 const tactical=document.createElement('div');tactical.innerHTML=tacticsMarkup(model,evidence);
 const recent=document.createElement('div');recent.className='rd-recent-form';recent.innerHTML='<h3>Andamento recente</h3><div class="rd-two-col">'+[model.home,model.away].map(side=>recentFormMarkup(model,evidence,side)).join('')+'</div>';
 containers.tattica.replaceChildren(tactical,recent);
 const history=document.createElement('div');
 history.innerHTML=historyMarkup(evidence.historyRows||selectHistoryRows(model,evidence.analysis.history));
 containers.storico.replaceChildren(history);
 return ()=>{containers.tattica.replaceChildren(...oldTactics);containers.storico.replaceChildren(...oldHistory)};
}

export function recentFormMarkup(model,evidence,side){
 return '<article>'+timeline(model,evidence,side)+'</article>';
}
