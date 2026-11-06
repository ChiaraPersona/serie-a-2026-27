const finite=v=>typeof v==='number'&&Number.isFinite(v);
const n=v=>finite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:2}):'N/D';
let cached;
export function loadXgotStatistics(){return cached||=(fetch(new URL('../../data/generated/xgot-statistics.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('xGOT unavailable');return r.json()}).catch(()=>null))}
export function withXgotLeaderboards(data,stats){
 const out=structuredClone(data),metric={id:'xgot',field:'xgot',label:'xGOT · campione',hasPer90:true};
 out.comparator.metrics.push(metric);
 for(const [period,rows] of Object.entries(out.comparator.periods)){
  for(const row of rows){const x=stats?.players?.[row.id]?.[period];row.values.xgot=x?.xgot??null;row.per90.xgot=x?.per90??null;row.xgotCoverage=x?.matches??0}
  out.periods[period].rankings.xgot={...metric,availablePlayers:rows.filter(r=>finite(r.values.xgot)).length,players:rows.filter(r=>finite(r.values.xgot))};
 }
 return out;
}
export function xgotTeamMarkup(stats,teamId){
 const periods=stats?.teams?.[teamId]||{};
 return `<section class="section" data-xgot-statistics><h3>xG sui tiri in porta · xGOT</h3><p>Valori osservati nelle gare coperte, distinti dai gol attesi. Campione parziale tra campionato e coppe europee.</p><div class="table-wrap"><table><thead><tr><th>Periodo</th><th>xGOT</th><th>xGOT / gara</th><th>Gare coperte</th></tr></thead><tbody>${['2026/27',...(periods['2026']?['2026']:[]),'2025/26'].map(period=>{const r=periods[period];return `<tr><th>${period==='2026'?'2026 · anno solare':period}</th><td>${n(r?.xgot)}</td><td>${n(r?.matches?r.xgot/r.matches:null)}</td><td>${r?.matches??'N/D'}</td></tr>`}).join('')}</tbody></table></div></section>`;
}
export function playerXgotMarkup(stats,id,before=null){
 let periods=stats?.players?.[id]||{};
 if(before){periods={};for(const row of stats?.playerMatches?.[id]||[]){if(row.date>=before)continue;const p=periods[row.period]||={xgot:0,matches:0,minutes:0};p.xgot+=row.xgot;p.matches++;p.minutes+=row.minutes;p.per90=p.minutes?p.xgot*90/p.minutes:null}}
 return `<section data-player-xgot><h4>xGOT osservato · campione</h4><dl class="rd-player-kpis">${['2026/27',...(periods['2026']?['2026']:[]),'2025/26'].map(period=>{const r=periods[period];return `<div><dt>xGOT ${period==='2026'?'2026 · anno solare':period}</dt><dd>${n(r?.xgot)}</dd><small>${r?.matches??0} presenze coperte · ${n(r?.per90)} /90</small></div>`}).join('')}</dl><p class="rd-footnote">Rapporti calcolati sui soli minuti delle presenze coperte; non sono probabilità individuali o DUO.</p></section>`;
}
