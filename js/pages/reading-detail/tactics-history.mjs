import {esc,number,finite,missing} from './format.mjs?v=20261022-assets-v1';
import {historyMarkup,selectHistoryRows} from './head-to-head.mjs?v=20261022-assets-v1';
import {installSpatialMatchup} from './spatial-matchup.mjs?v=20261101-spatial-clean-v3';
export function attackMarkup(channels){
 if(!channels)return missing('Ripartizione delle direzioni d’attacco non disponibile.');
 return `<div class="rd-channels">${[['left','Sinistra'],['central','Centro'],['right','Destra']].map(([key,label])=>`<div><span>${label}</span><i aria-hidden="true"><b style="width:${finite(channels[key])?Math.max(0,Math.min(100,channels[key])):0}%"></b></i><strong>${number(channels[key])}${finite(channels[key])?'%':''}</strong></div>`).join('')}</div>`;
}
function profileFor(model,evidence,i){
 const side=[model.home,model.away][i],id=side.id||model.prediction?.teamProjections?.[i]?.teamId;
 return evidence.analysis.styles?.profiles?.find(p=>p.teamId===id)||null;
}
export function tacticsMarkup(model,evidence){
 if(model.competition==='champions'&&evidence.championsTactics)return championsTacticsMarkup(model,evidence);
 const sides=[model.home,model.away],profiles=sides.map((_,i)=>profileFor(model,evidence,i));
 const panels=sides.map((side,i)=>{
  const p=profiles[i],channels=evidence.analysis.attackChannels?.profiles?.find(p=>p.team===side.name)?.attackChannels||model.prediction?.teamProjections?.[i]?.attackChannels||p?.attackChannels;
  return `<article class="rd-tactical-column" data-tactical-side="${i?'away':'home'}"><header class="rd-tactical-team"><span>${i?'Ospite':'Casa'}</span><h3>${esc(side.name)}</h3></header><p class="rd-footnote rd-tactical-baseline">Baseline ${esc(p?.season||'storica')} · ${esc(p?.competition||'Campione N/D')} · ${number(p?.summary?.appearances,0)} gare</p><dl class="rd-player-kpis rd-tactical-metrics"><div><dt>Possesso</dt><dd>${number(p?.summary?.possessionPct)}${finite(p?.summary?.possessionPct)?'%':''}</dd></div><div><dt>Tiri / gara</dt><dd>${number(p?.summary?.shotsPerGame)}</dd></div><div><dt>Gol / gara</dt><dd>${number(p?.derived?.goalsPerGame)}</dd></div></dl><div class="rd-tactical-directions">${attackMarkup(channels)}</div></article>`;
 });
 return `<div class="rd-tactical-comparison" aria-label="Confronto tattico Casa e Ospite">${panels.join('')}</div>`;
}
function championsTacticsMarkup(model,evidence){
 const sampleLabel=s=>`${s.competitionLabel}${s.id.endsWith('historical')?' · storico':''} ${s.season.replace('-','/')} · ${s.matches} gare`;
 const metrics=sample=>[['possessionPct','Possesso','%'],['passSuccessPct','Precisione passaggi','%'],['shots','Tiri / gara',''],['shotsAgainst','Tiri concessi / gara',''],['sot','SOT / gara',''],['goals','Gol / gara',''],['goalsAgainst','Gol subiti / gara',''],['corners','Corner / gara',''],['crosses','Cross / gara',''],['longBalls','Lanci lunghi / gara','']].map(([key,label,suffix])=>{const m=sample.metrics[key];return `<div data-tactical-metric="${key}"><dt>${label}</dt><dd>${number(m?.mean)}${finite(m?.mean)?suffix:''}</dd><small>${m?.n?`n=${m.n}`:'N/D'}</small></div>`;}).join('');
 return `<div class="rd-tactical-comparison" aria-label="Confronto tattico Casa e Ospite">${[model.home,model.away].map((side,i)=>{
  const p=evidence.championsTactics.teams[i],samples=p.samples.filter(s=>s.matches>0),primary=samples[0],formation=primary?.formations[0];
  const actual=evidence.lineups[i];
  const setup=actual?.formation?`${actual.formation} · ${actual.status==='official'?'ufficiale':actual.status==='probable'?'probabile':'da confermare'}`:formation?`${formation.code} · ${formation.matches} gare nel campione`:'N/D';
  const narrative=primary&&finite(primary.metrics.shots.mean)&&finite(primary.metrics.shotsAgainst.mean)?`Nel campione: ${number(primary.metrics.shots.mean)} tiri prodotti e ${number(primary.metrics.shotsAgainst.mean)} concessi per gara. ${finite(primary.metrics.possessionPct.mean)?`Possesso medio ${number(primary.metrics.possessionPct.mean)}%.`:''}`:'Profilo dei volumi N/D.';
  return `<article class="rd-tactical-column" data-tactical-team="${esc(p.teamId)}" data-tactical-side="${i?'away':'home'}"><header class="rd-tactical-team"><span>${i?'Ospite':'Casa'}</span><h3>${esc(side.name)}</h3></header><p class="rd-footnote">Modulo: ${esc(setup)}</p><p class="rd-tactical-reading">${esc(narrative)}</p>${primary?`<p class="rd-footnote rd-tactical-baseline">${esc(sampleLabel(primary))} · ${esc(primary.from)}–${esc(primary.to)}</p><dl class="rd-player-kpis rd-tactical-metrics">${metrics(primary)}</dl>${samples.slice(1).map(s=>`<details class="rd-disclosure"><summary>${esc(sampleLabel(s))}</summary><dl class="rd-player-kpis rd-tactical-metrics">${metrics(s)}</dl></details>`).join('')}`:missing('Campione tattico non disponibile.')}<div class="rd-tactical-directions"><h4>Direzioni d’attacco · ${esc(p.attackChannelsSeason.replace('-','/'))}</h4>${attackMarkup(p.attackChannels)}</div></article>`;
 }).join('')}</div>`;
}
export function priorMatches(model,evidence,side){
 return (evidence.analysis.matches||[]).filter(m=>m.id!==model.fixture.id&&m.status==='finished'&&m.score&&m.date<model.fixture.date&&[m.homeTeam,m.awayTeam].some(t=>t===side.id||t===side.name)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.kickoff||'').localeCompare(String(a.kickoff||'')));
}
function timeline(model,evidence,side){
 const name=id=>evidence.directory?.teams.find(t=>t.id===id)?.name||id;
 const rows=priorMatches(model,evidence,side).slice(0,5);
 return `<h3>${esc(side.name)}</h3>${rows.length?rows.map(m=>`<div class="rd-match-log"><div class="rd-match-log-row"><time>${esc(m.date)}</time><span>${esc(name(m.homeTeam))} – ${esc(name(m.awayTeam))}</span><b>${esc(m.score.home)}–${esc(m.score.away)}</b></div></div>`).join(''):missing('Gare precedenti con risultato verificato non disponibili nel calendario caricato.')}`;
}
export function installTacticsHistory(model,evidence,containers){
 const oldTactics=[...containers.tattica.childNodes],oldHistory=[...containers.storico.childNodes];
 const tactical=document.createElement('div');tactical.innerHTML=tacticsMarkup(model,evidence);
 const recent=document.createElement('div');recent.className='rd-recent-form';recent.innerHTML='<h3>Andamento recente</h3><div class="rd-two-col">'+[model.home,model.away].map(side=>recentFormMarkup(model,evidence,side)).join('')+'</div>';
 containers.tattica.replaceChildren(tactical,recent);
 const undoSpatial=installSpatialMatchup(model,evidence.spatial,containers);
 const history=document.createElement('div');
 history.innerHTML=historyMarkup(evidence.historyRows||selectHistoryRows(model,evidence.analysis.history));
 containers.storico.replaceChildren(history);
 return ()=>{undoSpatial();containers.tattica.replaceChildren(...oldTactics);containers.storico.replaceChildren(...oldHistory)};
}

export function recentFormMarkup(model,evidence,side){
 return '<article>'+timeline(model,evidence,side)+'</article>';
}
