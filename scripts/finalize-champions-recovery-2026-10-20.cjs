"use strict";
const fs = require('fs');
const assert = require('assert/strict');
const base = 'data/analysis/champions/recovery-2026-10-20/';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p,d) => fs.writeFileSync(p, JSON.stringify(d,null,2)+'\n');
const old = read(base+'player-stats-before.json');
const file = 'data/normalized/champions-player-stats-2026-27.json';
const next = read(file);
const retained = [];
const key = e => `${e.competition}|${e.teamId}`;
for (const t of old.teams) {
  const nt = next.teams.find(n=>n.id===t.id);
  assert(nt);
  for (const p of t.players) {
    const index = nt.players.findIndex(n=>n.id===p.id);
    assert(index>=0);
    const np = nt.players[index];
    const lost = (p.currentSeason?.entries||[]).some(e => (e.matches||[]).some(m => !np.currentSeason?.entries.some(ne=>key(ne)===key(e)&&ne.matches.some(nm=>nm.matchId===m.matchId))));
    if (lost || (p.providerPlayerId && np.providerPlayerId!==p.providerPlayerId)) {
      nt.players[index]=structuredClone(p);
      retained.push({team:t.id,player:p.id,reason:'Preserved previous player: identity or historical evidence changed during rebuild'});
      continue;
    }
    for (const e of np.currentSeason?.entries||[]) {
      const previous=p.currentSeason?.entries.find(pe=>key(pe)===key(e));
      if (previous?.minutesReliability) e.minutesReliability=previous.minutesReliability;
      e.matches=e.matches.map(m=>({...previous?.matches.find(pm=>pm.matchId===m.matchId),...m,...(previous?.matches.find(pm=>pm.matchId===m.matchId)?.minutesStatus ? {minutesStatus:previous.matches.find(pm=>pm.matchId===m.matchId).minutesStatus,minutesEstimated:previous.matches.find(pm=>pm.matchId===m.matchId).minutesEstimated,validationStatus:previous.matches.find(pm=>pm.matchId===m.matchId).validationStatus,package:previous.matches.find(pm=>pm.matchId===m.matchId).package}: {})}));
    }
  }
}
const sourceFile='data/sources/champions-pilot-match-stats-2025-27.json';
const source=read(sourceFile), oldSource=read(base+'team-source-before.json');
const mk=m=>`${m.season}|${m.league}|${m.eventId}`;
const existing=new Set(source.matches.map(mk));
const restored=oldSource.matches.filter(m=>!existing.has(mk(m)));
source.matches.push(...restored);
source.matches.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
source.summary.matches=source.matches.length;
source.summary.completeMatches=source.matches.filter(m=>m.coverage==='complete').length;
for(const c of source.teamCoverage){const cfg=source.teams.find(t=>t.id===c.teamId);const rows=source.matches.filter(m=>m.home.providerTeamId===cfg.espnTeamId||m.away.providerTeamId===cfg.espnTeamId);c.matches=rows.length;c.completeMatches=rows.filter(m=>m.coverage==='complete').length;}
const rows=next.teams.map(t=>{const ot=old.teams.find(x=>x.id===t.id); const covered=x=>x.players.filter(p=>p.currentSeason?.totals?.minutes>0&&Number.isFinite(p.currentSeason?.totals?.shots)&&Number.isFinite(p.currentSeason?.totals?.shotsOnTarget)).length;return {team:t.team,teamId:t.id,players:t.players.length,coveredBefore:covered(ot),coveredAfter:covered(t),missingPlayers:t.players.filter(p=>!(p.currentSeason?.totals?.minutes>0&&Number.isFinite(p.currentSeason?.totals?.shots)&&Number.isFinite(p.currentSeason?.totals?.shotsOnTarget))).map(p=>({id:p.id,name:p.name,providerPlayerId:p.providerPlayerId,reason:p.unmatchedReason||'Incomplete minutes/shots/SOT'}))};});
const players=next.teams.flatMap(t=>t.players);
next.summary.withMinutes=players.filter(p=>p.currentSeason?.totals?.minutes>0).length;
for(const q of ['complete','partial','unavailable'])next.summary[q]=players.filter(p=>p.dataQuality===q).length;
for(const t of next.teams){for(const q of ['complete','partial','unavailable'])t.summary[q]=t.players.filter(p=>p.dataQuality===q).length;t.summary.withMinutes=t.players.filter(p=>p.currentSeason?.totals?.minutes>0).length;}
assert.equal(next.teams.length,36);assert.equal(players.length,970);
write(file,next);write(sourceFile,source);
write(base+'audit.json',{asOf:'2026-10-20',before:old.summary,after:next.summary,retainedPlayers:retained,restoredTeamMatches:restored.map(mk),teams:rows});
fs.writeFileSync(base+'REPORT.md','# Recupero Champions — 20 ottobre 2026\n\nAcquisiti 290 referti correnti per le 36 squadre. Conservati gli incontri precedenti non restituiti dalla nuova acquisizione e i giocatori con disallineamenti di identita o perdita di storico. Nessun pronostico o sito rigenerato.\n\n| Squadra | Rosa | Minuti+tiri+SOT prima | Dopo |\n|---|---:|---:|---:|\n'+rows.map(r=>`| ${r.team} | ${r.players} | ${r.coveredBefore} | ${r.coveredAfter} |`).join('\n')+'\n\nI valori mancanti restano null. Minuti Package 1 conservati come stimati. Dettagli nominativi e casi conservati in audit.json.\n');
console.log(JSON.stringify({before:old.summary,after:next.summary,retained:retained.length,restoredMatches:restored.length}));
