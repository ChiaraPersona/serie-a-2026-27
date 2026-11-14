"use strict";
const assert=require('assert/strict'),fs=require('fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='data/analysis/champions/package1-2026-10-19';
const ledger=read('data/sources/champions-package1-performances-2026-10-19.json');
const data=read('data/normalized/champions-player-stats-2026-27.json');
const before=read(`${base}/normalized-before.json`);
const builder=require('./build-champions-player-stats');
const raw=builder.collectEspnRows({season:'2026-27',asOf:'2026-10-19'});
const keys=new Set(ledger.performances.map(r=>r.auditKey));assert.equal(keys.size,817);assert.equal(ledger.performances.length,817);
assert.equal(data.teams.length,36);assert.equal(ledger.summary.players,519);assert.equal(ledger.summary.teams,31);
const fields={shots:'shots',sot:'shotsOnTarget',goals:'goals',assists:'assists',yellow_cards:'yellowCards',red_cards:'redCards',fouls_committed:'foulsCommitted',fouls_suffered:'foulsWon'};
for(const team of data.teams){
  const oldTeam=before.teams.find(t=>t.id===team.id);
  const changes=ledger.performances.filter(r=>r.canonicalTeamId===team.id);
  if(!changes.length)assert.deepEqual(team,oldTeam);
  for(const player of team.players){
    const oldPlayer=oldTeam.players.find(p=>p.id===player.id);
    const rows=changes.filter(r=>r.canonicalPlayerId===player.id);
    if(!rows.length){assert.deepEqual(player,oldPlayer);continue;}
    for(const [league,group] of Map.groupBy(rows,r=>r.league)){
      const ids=new Set(group.map(r=>r.event_id));
      const newEntry=player.currentSeason.entries.find(e=>e.teamId===team.espnTeamId&&e.matches.some(m=>ids.has(m.matchId)));
      assert(newEntry);
      const oldEntry=oldPlayer.currentSeason?.entries.find(e=>(e.teamId||(e.team===team.team?team.espnTeamId:null))===newEntry.teamId&&e.competition===newEntry.competition);
      assert.equal(newEntry.appearances,(oldEntry?.appearances||0)+group.length,`${team.id}/${player.id}/${league} appearances`);
      assert.equal(newEntry.minutes,(oldEntry?.minutes??0)+group.reduce((s,r)=>s+r.minutesEstimated,0),`${team.id}/${player.id} minutes preserved`);
      for(const [csv,field] of Object.entries(fields)){
        const sum=group.reduce((s,r)=>s+Number(r[csv]),0);
        assert.equal(newEntry[field],(oldEntry?.[field]??0)+sum,`${team.id}/${player.id}/${league}/${field}`);
      }
      assert(newEntry.shotsOnTarget<=newEntry.shots);
      for(const m of newEntry.matches.filter(m=>ids.has(m.matchId)))assert.equal(m.minutesStatus,'estimated');
      for(const r of group){const matching=(raw.matchesByAthlete.get(r.player_id_espn)||[]).filter(x=>x.league===league&&x.matchId===r.event_id);assert.equal(matching.length,1);}
    }
    for(const oldEntry of oldPlayer.currentSeason?.entries||[]){
      if(!player.currentSeason.entries.some(e=>e.competition===oldEntry.competition&&(e.teamId===oldEntry.teamId||(e.teamId===team.espnTeamId&&oldEntry.team===team.team))&&e.matches.some(m=>rows.some(r=>r.event_id===m.matchId))))assert.deepEqual(player.currentSeason.entries.find(e=>e.competition===oldEntry.competition&&(e.teamId===oldEntry.teamId||(e.teamId===team.espnTeamId&&oldEntry.team===team.team))),oldEntry);
    }
  }
}
assert.equal(ledger.performances.filter(r=>r.resolved14Reviewed).length,14);
assert(ledger.performances.some(r=>r.player_id_espn==='93197'&&r.canonicalTeamId==='club-brugge'));
const calendar=read('data/normalized/champions-league-2026-27.json');
const fixtures=calendar.fixtures.filter(f=>f.matchday===3);assert.equal(fixtures.length,18);
const coverage=fixtures.map(f=>({fixtureId:f.id,home:f.homeTeam,away:f.awayTeam,teams:[f.homeTeam,f.awayTeam].map(name=>{const t=data.teams.find(t=>t.team===name);assert(t);return {teamId:t.id,players:t.players.length,updatedPlayers:ledger.performances.filter(r=>r.canonicalTeamId===t.id).map(r=>r.canonicalPlayerId).filter((x,i,a)=>a.indexOf(x)===i).length,withShots:t.players.filter(p=>p.currentSeason?.totals?.shots!=null).length,withSOT:t.players.filter(p=>p.currentSeason?.totals?.shotsOnTarget!=null).length,withMinutes:t.players.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length};}),lineup:f.probableFormation?.status||'N/D',benchAvailable:!!f.probableFormation?.home?.bench?.length}));
fs.writeFileSync(`${base}/md3-coverage.json`,JSON.stringify(coverage,null,2)+'\n');
console.log('OK Package 1: 817 deduplicated performances, 519 players, 31 updated/36 preserved squads, exact statistical deltas, 14 rechecks, 18 fixture coverage.');
