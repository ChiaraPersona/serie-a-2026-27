import {esc} from './format.mjs?v=20261022-assets-v1';
const percent=v=>typeof v==='number'?`${Math.round(v*100)}%`:'N/D';
const nameFor=(model,id)=>[model.home,model.away].find(t=>t.id===id)?.name||id;
export function spatialNarrative(model,data,direction){
 const attack=data.teams.find(t=>t.teamId===direction.attackingTeamId),defence=data.teams.find(t=>t.teamId===direction.defendingTeamId);
 const a=nameFor(model,attack.teamId),d=nameFor(model,defence.teamId),zone=direction.rows.find(z=>z.key===direction.focusKey);
 if(direction.continuityLimited)return `${a} contro ${d}: ${direction.transition?'assetto in transizione, campione limitato':'continuità tecnica N/D, campione limitato'}. Le zone restano descrittive; non viene evidenziato un punto debole dell'assetto attuale. Le gare dei cicli precedenti sono escluse quando è documentato un cambio tecnico.`;
 if(!zone)return `${a} contro ${d}: campione limitato; nessuna zona d'incontro evidenziata. Servono almeno ${data.minimumMatches} gare per squadra e ${data.minimumShotsPerZone} tiri per ciascun lato nella stessa zona.`;
 return `${a} contro ${d}: incrocio da osservare in ${zone.label.toLocaleLowerCase('it-IT')}. ${a} ha effettuato qui ${zone.shotsFor} tiri (${percent(zone.shareFor)} dei tiri localizzati), con ${zone.goalsFor} gol; ${d} ha concesso ${zone.shotsAgainst} tiri (${percent(zone.shareAgainst)}), con ${zone.goalsAgainst} gol subiti. È una ricorrenza storica, non una vulnerabilità dimostrata.`;
}
export function continuityMarkup(model,data){
 if(!data.teams.some(t=>t.continuity))return '';
 const rate=v=>typeof v==='number'?`${Math.round(v*100)}%`:'N/D';
 return `<div class="rd-spatial-continuity"><h3>Continuità dell'assetto</h3><div class="rd-spatial-context-grid">${data.teams.map(team=>{
  const c=team.continuity;if(!c)return '';
  const label=c.status==='transition'?'Assetto in transizione, campione limitato':c.status==='unknown'?'Continuità tecnica N/D':'Continuità osservata nelle gare recenti';
  return `<article data-continuity-status="${esc(c.status)}"><h4>${esc(nameFor(model,team.teamId))}</h4><p class="rd-spatial-context-status">${label}</p><dl><div><dt>Ultimo allenatore noto</dt><dd>${esc(c.coachName||'N/D')}</dd></div><div><dt>Gare osservate nel ciclo</dt><dd>${c.cycleMatches??'N/D'}</dd></div><div><dt>Titolari in comune · ultime due gare</dt><dd>${typeof c.starterOverlap==='number'?Math.round(c.starterOverlap*11)+'/11':'N/D'}</dd></div><div><dt>Minuti a giocatori già impiegati · ultima gara</dt><dd>${rate(c.minuteRetention)}</dd></div><div><dt>Moduli nominali recenti</dt><dd>${esc(c.recentFormations.join(' · ')||'N/D')}</dd></div></dl>${team.historyScope==='observed-coach-cycle'?`<p>La mappa usa le gare del ciclo tecnico osservato; ${team.outOfCycleMatches} gare precedenti restano fuori dal confronto.</p>`:''}${c.stale?'<p>Contesto non aggiornato abbastanza recentemente per descrivere l’assetto attuale.</p>':''}</article>`;
 }).join('')}</div><p class="rd-footnote">Il modulo nominale da solo non stabilisce la continuità tattica. Titolari e minuti descrivono le gare precedenti; i ruoli effettivi in possesso e non possesso restano N/D.</p></div>`;
}
function pitch(model,data,direction,goalsOnly){
 const attack=data.teams.find(t=>t.teamId===direction.attackingTeamId),defence=data.teams.find(t=>t.teamId===direction.defendingTeamId);
 const dots=(points,layer)=>points.filter(p=>!goalsOnly||p.isGoal).map(p=>`<circle class="rd-spatial-dot rd-spatial-dot--${layer}${p.isGoal?' rd-spatial-dot--goal':''}" cx="${p.x}" cy="${p.y*.6}" r="${p.isGoal?.85:.48}"><title>${esc(nameFor(model,layer==='for'?attack.teamId:defence.teamId))}: ${layer==='for'?'tiro effettuato':'tiro concesso'}${p.isGoal?' · gol':''}${p.playerName?' · '+esc(p.playerName):''}${p.minute!==null?' · '+esc(p.minute)+'′':''}</title></circle>`).join('');
 return `<svg class="rd-spatial-pitch" viewBox="-2 -3 104 66" role="img" aria-label="${esc(goalsOnly?'Gol':'Tiri')} di ${esc(nameFor(model,attack.teamId))} e ${esc(goalsOnly?'gol subiti':'tiri concessi')} da ${esc(nameFor(model,defence.teamId))}"><title>Zone di conclusione · attacco verso destra</title><rect class="rd-spatial-grass" width="100" height="60" rx="1"/><g class="rd-spatial-lines" fill="none"><path d="M50 0v60 M0 10h16.67v40H0 M100 10H83.33v40H100 M0 20h5.56v20H0 M100 20h-5.56v20H100"/><circle cx="50" cy="30" r="9"/><circle cx="50" cy="30" r=".5"/><path d="M99 26h2v8h-2"/></g>${dots(defence.against.points,'against')}${dots(attack.for.points,'for')}</svg>`;
}
export function spatialMarkup(model,data,index=0,goalsOnly=false){
 const direction=data.directions[index],attack=data.teams.find(t=>t.teamId===direction.attackingTeamId),defence=data.teams.find(t=>t.teamId===direction.defendingTeamId);
 const a=nameFor(model,attack.teamId),d=nameFor(model,defence.teamId);
 const cell=(r,side)=>`<strong>${r[side==='for'?'shotsFor':'shotsAgainst']} tiri</strong><span>${percent(r[side==='for'?'shareFor':'shareAgainst'])} · ${r[side==='for'?'goalsFor':'goalsAgainst']} gol</span>`;
 return `<header class="rd-spatial-heading"><h3>Dove si incontrano attacco e difesa</h3><p>Gare di Serie A precedenti al ${esc(data.cutoffExclusive.split('-').reverse().join('/'))}. Rigori e autogol esclusi dal confronto.</p></header><div class="rd-spatial-directions" role="group" aria-label="Direzione del confronto">${data.directions.map((v,i)=>`<button type="button" data-spatial-direction="${i}" aria-pressed="${i===index}">${esc(nameFor(model,v.attackingTeamId))} attacca</button>`).join('')}</div><div class="rd-spatial-samples"><p><b>${esc(a)}</b> · ${attack.matches}/${attack.expectedMatches} gare · ${attack.for.mappedShots}/${attack.for.totalShots} tiri localizzati</p><p><b>${esc(d)}</b> · ${defence.matches}/${defence.expectedMatches} gare · ${defence.against.mappedShots}/${defence.against.totalShots} tiri concessi localizzati</p></div><div class="rd-spatial-map-controls"><label>Mostra <select data-spatial-mode><option value="shots"${goalsOnly?'':' selected'}>Tiri e gol</option><option value="goals"${goalsOnly?' selected':''}>Solo gol</option></select></label><span>Attacco verso destra →</span></div>${pitch(model,data,direction,goalsOnly)}<div class="rd-spatial-legend"><span class="rd-spatial-legend-for">${esc(a)} · ${goalsOnly?'gol segnati':'tiri effettuati'}</span><span class="rd-spatial-legend-against">${esc(d)} · ${goalsOnly?'gol subiti':'tiri concessi'}</span><span>Punti grandi: gol</span></div><div class="rd-spatial-table-wrap"><table class="rd-spatial-table"><caption>Confronto per zona · tiri localizzati senza rigori e autogol</caption><thead><tr><th scope="col">Zona</th><th scope="col">${esc(a)}<small>Attacco</small></th><th scope="col">${esc(d)}<small>Difesa</small></th></tr></thead><tbody>${direction.rows.map(r=>`<tr${direction.focusKey===r.key?' class="rd-spatial-focus"':''}><th scope="row">${esc(r.label)}</th><td>${cell(r,'for')}</td><td>${cell(r,'against')}</td></tr>`).join('')}</tbody></table></div>`;
}
export function installSpatialMatchup(model,data,containers){
 if(model.competition!=='serie-a'||!data||data.fixtureId!==model.fixture.id)return ()=>{};
 const section=document.createElement('section');section.className='rd-spatial';section.dataset.spatialFixture=model.fixture.id;
 let index=0,goalsOnly=false;
 const draw=()=>{section.innerHTML=spatialMarkup(model,data,index,goalsOnly)};
 const click=e=>{const button=e.target.closest('[data-spatial-direction]');if(!button)return;index=Number(button.dataset.spatialDirection);draw();section.querySelector(`[data-spatial-direction="${index}"]`).focus({preventScroll:true})};
 const change=e=>{if(!e.target.matches('[data-spatial-mode]'))return;goalsOnly=e.target.value==='goals';draw();section.querySelector('[data-spatial-mode]').focus({preventScroll:true})};
 draw();section.addEventListener('click',click);section.addEventListener('change',change);
 containers.tattica.append(section);
 return ()=>{section.removeEventListener('click',click);section.removeEventListener('change',change);section.remove()};
}
