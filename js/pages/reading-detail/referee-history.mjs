import {mountRefereeDashboard} from './referee-dashboard.mjs?v=20261018-referee-dashboard-v1';
import {esc} from './format.mjs';
import {readArtifact} from './evidence.mjs';
const known=v=>typeof v==='number'&&Number.isFinite(v);
const value=(v,digits=0)=>known(v)?v.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—';
export function refereeHistoryMarkup(entry){
 if(entry?.analysis)return analysisMarkup(entry);
 const rows=(entry?.rows||[]).filter(r=>r.date<entry.cutoffDate).slice(0,5);
 if(!rows.length)return '<section class="rd-referee-history"><h3>Ultime partite arbitrate</h3><p class="rd-footnote">Storico delle gare non disponibile per questa designazione.</p></section>';
 // Summaries use precisely the visible rows, and never a partial sum as a full total.
 const total=key=>rows.every(r=>known(r[key]))?rows.reduce((n,r)=>n+r[key],0):null;
 const yellows=total('yellowCards');
 const summary=[['Media ammonizioni',yellows===null?null:yellows/rows.length,1],['Totale espulsioni',total('dismissals'),0],['Totale rigori',total('penaltiesAwarded'),0]];
 return `<section class="rd-referee-history" aria-label="Ultime partite arbitrate"><div class="rd-referee-history-heading"><h3>Ultime partite arbitrate</h3><span>${rows.length} gare disponibili</span></div><dl class="rd-referee-history-summary">${summary.map(([label,n,d])=>`<div><dt>${label}</dt><dd>${value(n,d)}</dd></div>`).join('')}</dl><table class="rd-referee-history-table"><caption class="rd-accessible-title">Ultime ${rows.length} gare disponibili, dalla più recente. Espulsioni conteggiate una sola volta; dettaglio doppia ammonizione e rosso diretto separato.</caption><thead><tr><th scope="col">Data / torneo</th><th scope="col">Partita</th><th scope="col" aria-label="Ammonizioni"><i class="rd-card-mark rd-card-mark--yellow" aria-hidden="true"></i><span>Amm.</span></th><th scope="col" aria-label="Espulsioni"><i class="rd-card-mark rd-card-mark--red" aria-hidden="true"></i><span>Esp.</span></th><th scope="col">Rig.</th></tr></thead><tbody>${rows.map(r=>{
  const date=new Date(r.date+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'Europe/Rome'});
  return `<tr data-referee-history-date="${esc(r.date)}"><td><time datetime="${esc(r.date)}">${esc(date)}</time><small>${esc(r.competition||'—')}</small></td><td><span class="rd-referee-match"><span>${esc(r.home)}<br>${esc(r.away)}</span><b>${value(r.score?.home)}<br>${value(r.score?.away)}</b></span></td><td>${value(r.yellowCards)}</td><td><b>${value(r.dismissals)}</b><small class="rd-referee-dismissal-split">2G ${value(r.secondYellowCards)}<br>R ${value(r.directRedCards)}</small></td><td>${value(r.penaltiesAwarded)}</td></tr>`;
 }).join('')}</tbody></table><p class="rd-referee-history-key">2G: doppia ammonizione · R: rosso diretto. Rigori durante la gara, esclusa la serie finale. —: dato non disponibile.</p></section>`;
}
function analysisMarkup(entry){
 const a=entry.analysis;
 // Use the established table and styling. Disputed values stay in the internal archive.
 const rows=entry.rows.map(r=>{const copy={...r};for(const k of r.disputedMetrics||[])copy[k]=null;return copy;});
 let html=refereeHistoryMarkup({...entry,analysis:null,rows});
 const labels={yellowCards:'Gialli',dismissals:'Espulsioni',totalCards:'Cartellini complessivi',fouls:'Falli fischiati'};
 const cards=Object.entries(labels).map(([key,label])=>{
  const recent=a.recent[key],season=a.seasonal[key],delta=a.percentDifference[key];
  return `<div><dt>${label} · ultime 5 (n=${recent.n})</dt><dd>${value(recent.average,2)}</dd><dt>2026/27: ${value(season.average,2)} (n=${season.n})<br>Δ ${known(delta)?(delta>0?'+':'')+value(delta,1)+'%':'—'}</dt></div>`;
 }).join('');
 html=html.replace(/<dl class="rd-referee-history-summary">[\s\S]*?<\/dl>/,`<p class="rd-footnote">${esc(entry.refereeName)} · ${esc(a.trend)}</p><dl class="rd-referee-history-summary">${cards}</dl>`);
 html=html.replace('<th scope="col">Rig.</th>','<th scope="col">Falli</th>');
 let index=0;
 html=html.replace(/<td>([^<]*)<\/td><\/tr>/g,()=>{const r=rows[index++];return `<td>${value(r?.fouls)}<small>Rig. ${value(r?.penaltiesAwarded)}</small></td></tr>`;});
 return html.replace('</section>',`<p class="rd-referee-history-key">${esc(a.counting)} Δ = (media recente / media stagionale − 1) × 100; non definita con base zero. ${esc(a.seasonLabel)}. ${esc(a.limitations)}</p></section>`);
}
export async function installRefereeHistory(model,container,read=readArtifact){
 const panel=container.querySelector('.reading-referee-assignment');if(!panel)return ()=>{};
 const data=await read('data/generated/reading-referee-history.json');
 return mountRefereeHistory(model,container,data);
}
export function mountRefereeHistory(model,container,data,teams=[]){
 const panel=container.querySelector('.reading-referee-assignment');if(!panel)return ()=>{};
 const entry=data?.fixtures?.find(f=>f.fixtureId===model.fixture.id&&f.competition===model.competition&&f.cutoffDate===model.fixture.date);
 return mountRefereeDashboard(model,panel,entry,teams);
}
