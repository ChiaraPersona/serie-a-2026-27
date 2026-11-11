const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const squads=read('data/normalized/champions-registered-squads-2026-27.json');
const stats=read('data/normalized/champions-player-stats-2026-27.json');
for(const [teamId,uefa,espn,minutes] of [['roma','250122785','242593',367],['roma','250212323','332354',432],['como','250101128','265912',26]]){
 const team=squads.teams.find(t=>t.id===teamId);
 const p=team.players.find(p=>String(p.uefaPlayerId)===uefa);
 assert.equal(String(p.providerIds.espn),espn,`${teamId}: mapping provider`);
 const matches=stats.teams.find(t=>t.id===teamId).players.filter(p=>String(p.providerPlayerId)===espn);
 assert.equal(matches.length,1);
 assert.equal(matches[0].currentSeason.totals.minutes,minutes);
 if(teamId==='como'){
  assert.equal(matches[0].currentSeason.totalsScope.competition,'UEFA Champions League');
  assert.equal(matches[0].currentSeason.totals.appearances,1);
  assert(matches[0].currentSeason.entries[0].matches.every(m=>m.minutesStatus==='estimated-regulation-time'));
 }
}
console.log('OK: tre identità collegate per ID esatti, totali separati e minuti stimati conservati.');
