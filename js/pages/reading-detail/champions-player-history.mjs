import {esc,number} from './format.mjs?v=20261022-assets-v1';
export function recentPlayerMatches(history,teamId,playerId,date){
 if(!teamId||!playerId||!date)return [];
 return (history?.players?.[teamId+':'+playerId]||[])
  .filter(r=>r.date<date&&r.availableAt?.slice(0,10)<=date)
  .sort((a,b)=>b.date.localeCompare(a.date)||a.matchId.localeCompare(b.matchId)).slice(0,5);
}
export function playerHistoryMarkup(rows){
 return `<section data-player-match-history><h4>Ultime presenze osservate disponibili</h4>${rows.length?`<ul class="rd-mini-log">${rows.map(r=>`<li><time datetime="${esc(r.date)}">${esc(r.date)}</time><span class="rd-player-opponent">vs ${esc(r.opponent)}</span><span>${number(r.minutes,0)}′</span><b>${number(r.shots,0)} tiri · ${number(r.sot,0)} SOT</b></li>`).join('')}</ul>`:'<p class="rd-missing">Serie individuale per gara non disponibile. Gli aggregati non vengono trasformati in un andamento.</p>'}</section>`;
}
