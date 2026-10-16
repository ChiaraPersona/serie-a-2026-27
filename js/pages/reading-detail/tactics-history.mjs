import {esc,number,finite,recordList,details,missing,tabs,mountTabs,sourceLink} from './format.mjs';
const labelled=list=>(list||[]).map(x=>typeof x==='string'?x:x.label).filter(Boolean);
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
 const summary=sides.map((side,i)=>{const strengths=labelled(profiles[i]?.strengths).slice(0,2),weaknesses=labelled(profiles[i]?.weaknesses).slice(0,2);return `<p><strong>${esc(side.name)}</strong> — ${strengths.length?`Punti di forza: ${strengths.map(esc).join(' · ')}.`:'Punti di forza documentati N/D.'} ${weaknesses.length?`Vulnerabilità: ${weaknesses.map(esc).join(' · ')}.`:''}</p>`}).join('');
 const panels=sides.map((side,i)=>{
  const p=profiles[i],channels=evidence.analysis.attackChannels?.profiles?.find(p=>p.team===side.name)?.attackChannels||model.prediction?.teamProjections?.[i]?.attackChannels||p?.attackChannels;
  return [i?'away':'home',i?'Ospite':'Casa',`<h3>${esc(side.name)}</h3><p class="rd-footnote">Baseline ${esc(p?.season||'storica')} · ${esc(p?.competition||'Campione N/D')} · ${number(p?.summary?.appearances,0)} gare</p><dl class="rd-player-kpis"><div><dt>Possesso</dt><dd>${number(p?.summary?.possessionPct)}${finite(p?.summary?.possessionPct)?'%':''}</dd></div><div><dt>Tiri / gara</dt><dd>${number(p?.summary?.shotsPerGame)}</dd></div><div><dt>Gol / gara</dt><dd>${number(p?.derived?.goalsPerGame)}</dd></div></dl>${attackMarkup(channels)}${details('Statistiche, campione e fonte',p?recordList({campione:p.summary,derivate:p.derived,qualita:p.dataQuality,note:p.notes})+sourceLink(p.source?.url,p.source?.provider||'Fonte'):missing('Profilo tattico strutturato non disponibile.'))}`];
 });
 return `<div class="rd-tactical-summary"><h3>Le chiavi del confronto</h3>${summary}<small>Descrizione della baseline della fonte; non è un nuovo pronostico.</small></div>`+tabs('rd-tactics',panels);
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
 const tactical=document.createElement('div');tactical.innerHTML=tacticsMarkup(model,evidence);mountTabs(tactical);
 const recent=document.createElement('div');recent.className='rd-recent-form';recent.innerHTML='<h3>Andamento recente</h3><div class="rd-two-col">'+[model.home,model.away].map(side=>recentFormMarkup(model,evidence,side)).join('')+'</div>';
 containers.tattica.replaceChildren(tactical,recent);
 const history=document.createElement('div');
 history.innerHTML=tabs('rd-history',[
  ['h2h','Precedenti','<div data-original-h2h></div>'],
 ]);
 const target=history.querySelector('[data-original-h2h]');if(oldHistory.length)oldHistory.forEach(n=>target.append(n));else target.innerHTML=missing('Precedenti verificati non disponibili per questa coppia.');mountTabs(history);containers.storico.replaceChildren(history);
 return ()=>{containers.tattica.replaceChildren(...oldTactics);containers.storico.replaceChildren(...oldHistory)};
}

export function recentFormMarkup(model,evidence,side){
 const rows=priorMatches(model,evidence,side).filter(m=>finite(m.score.home)&&finite(m.score.away)).slice(0,5).reverse();
 if(!rows.length)return '<article><h4>'+esc(side.name)+'</h4>'+missing('Andamento recente N/D: nessuna gara conclusa precedente disponibile.')+'</article>';
 const values=rows.map(m=>{const home=m.homeTeam===side.id||m.homeTeam===side.name;const own=m.score[home?'home':'away'],other=m.score[home?'away':'home'];return own>other?3:own===other?1:0});
 const points=values.map((v,i)=>[35+i*(250/Math.max(1,values.length-1)),110-v*28]);
 return '<article><h4>'+esc(side.name)+'</h4><svg class="rd-form-chart" viewBox="0 0 320 150" role="img" aria-label="'+esc(side.name)+': punti nelle ultime gare disponibili"><path d="M25 26H300M25 54H300M25 82H300M25 110H300" fill="none" stroke="var(--rd-line)"/><polyline points="'+points.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="var(--rd-accent)" stroke-width="2"/>'+points.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="var(--rd-accent)"><title>'+esc(rows[i].date)+': '+values[i]+' punti</title></circle><text x="'+x+'" y="137" text-anchor="middle" fill="currentColor" font-size="10">'+esc(rows[i].date.slice(5))+'</text>').join('')+'</svg><p class="rd-footnote">Vittoria 3 · Pareggio 1 · Sconfitta 0. Gare precedenti disponibili.</p>'+timeline(model,evidence,side)+'</article>';
}
