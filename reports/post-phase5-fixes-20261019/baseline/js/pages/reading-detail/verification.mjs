import {esc,number,finite,metric,details,recordList,missing,sourceLink} from './format.mjs';
import {readArtifact} from './evidence.mjs';
import {settleArchivedLeg} from '../betting-settlement.mjs';

const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export async function verifySnapshot(snapshot,entry,fixture){
 if(!snapshot||!entry||snapshot.matchId!==fixture.id||entry.matchId!==fixture.id)return false;
 if(snapshot.generatedAt!==entry.generatedAt||snapshot.kickoff?.date!==fixture.date||snapshot.kickoff?.time!==fixture.kickoff||snapshot.kickoff?.timezone!=='Europe/Rome')return false;
 const nominal=Date.parse(`${fixture.date}T${fixture.kickoff}:00Z`);
 if(!Number.isFinite(nominal)||!Number.isFinite(Date.parse(snapshot.generatedAt)))return false;
 const zone=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Rome',timeZoneName:'longOffset'}).formatToParts(new Date(nominal)).find(p=>p.type==='timeZoneName')?.value;
 const offset=zone?.match(/GMT([+-])(\d{2}):(\d{2})/);if(!offset)return false;
 const kickoff=nominal-(Number(offset[2])*60+Number(offset[3]))*(offset[1]==='+'?1:-1)*60000;
 if(Date.parse(snapshot.generatedAt)>=kickoff)return false;
 const {integrity,...payload}=snapshot;
 if(integrity?.algorithm!=='SHA-256'||integrity.sha256!==entry.hash||!globalThis.crypto?.subtle)return false;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(stable(payload))));
 const hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 return hash===entry.hash;
}
export async function loadVerification(model){
 let snapshot=null,snapshotReason='Snapshot originario verificabile non disponibile per questa competizione e fixture.';
 if(model.competition==='serie-a'&&model.fixture.status==='finished'){
  try{
   const manifest=await readArtifact('data/predictions/snapshots/manifest.json'),entry=manifest.snapshots.find(e=>e.matchId===model.fixture.id);
   if(entry&&/^data\/predictions\/snapshots\/\d{4}-\d{2}\/md-\d{2}\.json$/.test(entry.snapshotFile)){
    const archive=await readArtifact(entry.snapshotFile),candidate=archive.snapshots.find(s=>s.matchId===model.fixture.id);
    if(await verifySnapshot(candidate,entry,model.fixture)){snapshot=candidate;snapshotReason=null}else snapshotReason='Snapshot presente, ma integrità o cronologia non verificabili: confronto disattivato.';
   }
  }catch{snapshotReason='Archivio prepartita non leggibile o non verificabile: confronto disattivato.'}
 }
 const records=model.competition==='serie-a'?(await readArtifact('data/normalized/card-settlement-records.json')).records:[];
 return {snapshot,snapshotReason,records};
}
export function resultFor(model,leg,evidence,verification){
 if(model.fixture.status!=='finished')return null;
 return model.competition==='champions'?leg.settlement||{status:'pending',label:'Da verificare'}:settleArchivedLeg(leg,evidence.analysis.match,verification.records);
}
function observedStats(model,evidence){
 if(model.competition==='serie-a')return evidence.analysis.match?.teamStats||{};
 const stats=evidence.analysis.match?.matchReport?.statistics;
 if(!stats)return {};
 const home={},away={};for(const [key,pair] of Object.entries(stats)){if(Array.isArray(pair)){home[key]=pair[0];away[key]=pair[1]}}
 return {home,away};
}
function eventsMarkup(title,events,teamLabels={}){
 if(events==null)return `<article><h3>${title}</h3>${missing('Eventi non disponibili dalla fonte.')}</article>`;
 const rows=Array.isArray(events)?events:Object.entries(events).flatMap(([side,items])=>Array.isArray(items)?items.map(item=>typeof item==='string'?{player:item,team:side}:{...item,team:item.team||side}):[]);
 return `<article><h3>${title}</h3>${rows.length?`<ol class="rd-event-list">${rows.map(p=>`<li><time>${p.minute!=null?esc(p.minute)+'′':'—'}</time><div><strong>${esc(p.player||p.name||p.playerIn||'Nome N/D')}</strong>${p.playerOut?`<span>Esce ${esc(p.playerOut)}</span>`:''}<small>${esc(teamLabels[p.team]||p.team||'')}${p.assist?' · Assist '+esc(p.assist):''}${p.ownGoal?' · Autogol':''}${p.card||p.eventType?' · '+esc(p.eventType||p.card):''}</small></div></li>`).join('')}</ol>`:missing('Nessun evento presente nel dataset. Lo stato di copertura è disponibile nelle fonti.')}</article>`;
}
export function verificationMarkup(model,evidence,verification){
 if(model.fixture.status!=='finished')return missing('La partita deve ancora disputarsi. Tabellino, esiti e confronto saranno disponibili soltanto con risultati verificati.');
 const match=evidence.analysis.match||{},report=match.matchReport,stats=observedStats(model,evidence),sides=[model.home,model.away];
 const keys=[['possessionPct','Possesso','%'],['expectedGoals','xG osservato',''],['shots','Tiri',''],['shotsOnTarget','SOT',''],['corners','Corner',''],['fouls','Falli',''],['yellowCards','Gialli',''],['goalkeeperSaves','Parate','']];
 const statsTable=Object.keys(stats).length?`<div class="rd-stat-table"><table><caption>Statistiche finali osservate</caption><thead><tr><th>${esc(model.home.name)}</th><th>Metrica</th><th>${esc(model.away.name)}</th></tr></thead><tbody>${keys.map(([key,label,unit])=>`<tr><td>${number(stats.home?.[key])}${finite(stats.home?.[key])?unit:''}</td><th scope="row">${label}</th><td>${number(stats.away?.[key])}${finite(stats.away?.[key])?unit:''}</td></tr>`).join('')}</tbody></table></div>`:missing('Statistiche aggregate finali non disponibili. Le evidenze individuali rimangono distinte.');
 const snapshot=verification.snapshot;
 const comparison=snapshot?`<p class="rd-footnote">Snapshot ${esc(snapshot.generatedAt)} · hash SHA-256 e timestamp antecedente al calcio d’inizio verificati rispetto al manifest. Non è la previsione corrente ricalcolata.</p><div class="rd-stat-table"><table><caption>Previsione archiviata e risultato osservato</caption><thead><tr><th>Squadra / metrica</th><th>Previsto originario</th><th>Osservato</th></tr></thead><tbody>${sides.flatMap((side,i)=>{const projection=snapshot.prediction.teamProjections.find(p=>p.teamId===side.id);return [['Tiri',projection?.predictedTeamShots,stats[i?'away':'home']?.shots],['SOT',projection?.predictedTeamSOT,stats[i?'away':'home']?.shotsOnTarget]].map(([label,value,actual])=>`<tr><th>${esc(side.name)} · ${label}</th><td>${number(value,2)}</td><td>${number(actual,0)}</td></tr>`)}).join('')}</tbody></table></div>`:missing(verification.snapshotReason||'Confronto previsto/reale non disponibile.');
 const results=model.forecasts.map(leg=>({leg,result:resultFor(model,leg,evidence,verification)}));
 const outcomes=`<ul class="rd-result-list">${results.map(({leg,result})=>`<li><div><strong>${esc(leg.label||leg.selection)}</strong><small>${esc(result?.reason||result?.verificationStatus||'Esito statistico sul contratto esistente')}</small></div><b data-outcome="${esc(result?.status||'pending')}">${esc(result?.label||'Da verificare')}</b>${sourceLink(result?.sourceUrl,'Fonte')}</li>`).join('')}</ul><p class="rd-footnote">Gli esiti statistici, gli esiti precedentemente registrati e le liquidazioni certificate rimangono distinti. ${results.some(r=>r.result?.officiallySettled===true)?'La certificazione è indicata solo per i record che la dichiarano.':'Nessuna liquidazione provider certificata viene dedotta dal risultato sportivo.'}</p>`;
 const scorers=match.scorers??report?.scorers,bookings=match.bookings??report?.cards,substitutions=match.substitutions??report?.substitutions;
 const teamLabels={home:model.home.name,away:model.away.name,[model.home.id]:model.home.name,[model.away.id]:model.away.name};
 return `<div class="rd-final-score"><span>${esc(model.home.name)}</span><strong>${esc(model.fixture.score?.home??'—')} — ${esc(model.fixture.score?.away??'—')}</strong><span>${esc(model.away.name)}</span></div><p class="rd-footnote">Risultato finale${match.halfTimeScore?` · Intervallo ${esc(match.halfTimeScore.home)}–${esc(match.halfTimeScore.away)}`:''} ${sourceLink(match.resultSource?.url||report?.sourceUrl,'Fonte risultato')}</p>${match.mvp?`<p class="rd-interpretation">MVP ufficiale: ${esc(match.mvp.player)} ${sourceLink(match.mvp.sourceUrl,'Fonte MVP')}</p>`:''}<div class="rd-event-grid">${eventsMarkup('Marcatori',scorers,teamLabels)}${eventsMarkup('Cartellini',bookings,teamLabels)}${eventsMarkup('Sostituzioni',substitutions,teamLabels)}</div>${statsTable}${details('Statistiche finali complete e dati dei calciatori',recordList({squadre:match.teamStats||report?.statistics,giocatori:match.playerStats||report?.playerEvidence,copertura:match.resultCoverage||report?.coverageNote,fonti:match.resultSource||report?.statisticsSourceUrl}))}<h3>Previsto e reale</h3>${comparison}<h3>Esiti dei contratti pubblicati</h3>${outcomes}<h3>Riepilogo economico della partita</h3>${missing('N/D: non è disponibile un rendiconto economico verificato con stake e perimetro coerenti con questa singola fixture. Il rendimento di giornata non viene attribuito alla partita.')}`;
}
export function installVerification(model,evidence,verification,container,forecastRoot){
 const original=[...container.childNodes],content=document.createElement('div');content.innerHTML=verificationMarkup(model,evidence,verification);
 const backup=document.createElement('details');backup.className='rd-disclosure rd-original-detail';backup.innerHTML='<summary>Tabellino originale e dettagli delle fonti</summary>';original.forEach(n=>backup.append(n));
 // Keep one page H1. Restore the original heading nodes on automatic fallback.
 const changedHeadings=[];backup.querySelectorAll('h1').forEach(h=>{const replacement=document.createElement('h3');replacement.innerHTML=h.innerHTML;h.replaceWith(replacement);changedHeadings.push([h,replacement])});
 container.replaceChildren(content,backup);
 for(const leg of model.forecasts){
  const result=resultFor(model,leg,evidence,verification);if(!result)continue;
  const row=[...forecastRoot.querySelectorAll('[data-forecast-id]')].find(n=>n.dataset.forecastId===leg.selectionId);if(!row)continue;
  let badge=row.querySelector('.rd-outcome');if(!badge){badge=document.createElement('span');badge.className='rd-outcome';row.querySelector('.rd-row-actions').prepend(badge)}
  badge.dataset.outcome=result.status||'pending';badge.textContent=`${result.label||'Da verificare'} · ${result.officiallySettled?'liquidazione certificata':result.verificationStatus==='LEGACY_RECORDED_OUTCOME'?'esito registrato':'verifica statistica'}`;
 }
 return ()=>{changedHeadings.forEach(([h,replacement])=>replacement.replaceWith(h));container.replaceChildren(...original)};
}
