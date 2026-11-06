const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('it-IT',{maximumFractionDigits:2}):'N/D';
export function recentTeamMatches(dataset,teamId,{before=null,limit=10}={}){
 return (dataset?.teams?.[teamId]||[]).filter(row=>!before||row.date.slice(0,10)<before.slice(0,10)).slice(0,limit);
}
export function teamMatchHistoryMarkup(dataset,teamId,{before=null,limit=10,name=''}={}){
 const rows=recentTeamMatches(dataset,teamId,{before,limit});
 const metrics=[['shots','Tiri'],['shotsOnTarget','SOT'],['corners','Corner'],['fouls','Falli'],['yellowCards','Gialli'],['redCards','Rossi'],['possessionPct','Possesso %'],['expectedGoals','xG']];
 return `<section class="team-match-history" data-team-history="${esc(teamId)}"><h3>Storico recente${name?` · ${esc(name)}`:''}</h3><p>Serie A e coppe europee · ultime ${limit} gare concluse disponibili${before?' prima della partita':''}. Risultato e statistiche dalla prospettiva della squadra.</p>${rows.length?`<div class="team-history-scroll" tabindex="0" role="region" aria-label="Storico ${esc(name||teamId)}, tabella scorribile"><table><thead><tr>${['Data','Competizione','Avversario','Campo','Risultato',...metrics.map(([,label])=>label)].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr data-history-fixture="${esc(row.id)}" data-history-competition="${esc(row.competition)}"><td><time datetime="${esc(row.date)}">${esc(row.date.slice(0,10).split('-').reverse().join('/'))}</time></td><td>${esc(row.competitionLabel)}</td><th scope="row">${esc(row.opponent)}</th><td>${esc(row.venue)}</td><td>${row.goalsFor}–${row.goalsAgainst} · ${esc(row.result)}</td>${metrics.map(([key])=>`<td>${value(row.stats[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p>Gare concluse non disponibili.</p>'}</section>`;
}
