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
