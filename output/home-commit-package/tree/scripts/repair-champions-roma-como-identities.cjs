const fs=require('node:fs');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const builder=require('./build-champions-player-stats.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,d)=>{const compact=fs.readFileSync(p,'utf8').trim().split('\n').length===1;fs.writeFileSync(p,JSON.stringify(d,null,compact?undefined:2)+'\n')};
const sourcePath='data/sources/champions-registered-squads-2026-27.json';
const squadsPath='data/normalized/champions-registered-squads-2026-27.json';
const statsPath='data/normalized/champions-player-stats-2026-27.json';
const source=read(sourcePath),squads=read(squadsPath),stats=read(statsPath);
const mappings=[['roma','250122785','242593','evan-ndicka'],['roma','250212323','332354','wesley'],['como','250101128','265912','maxence-caqueret']];
for(const [teamId,uefa,espn,canonicalId] of mappings){
 const team=squads.teams.find(t=>t.id===teamId);
 const player=team.players.find(p=>String(p.uefaPlayerId)===uefa);
 const local=read(`data/teams/${teamId}.json`).squad.find(p=>p.id===canonicalId);
 assert.equal(String(local.providerIds.espn),espn);
 const identity=source.teams.find(t=>t.team===team.team).playerIdentities.find(p=>String(p.uefaPlayerId)===uefa);
 assert(identity); identity.providerIds={...identity.providerIds,espn};
 identity.canonicalStatisticsPlayerId=canonicalId;
 player.providerIds={...player.providerIds,espn};
}
// Replay only the observed Caqueret appearance, with the existing aggregation functions.
const observedPath='data/sources/champions-observed-performances-2026-27.json';
const observed=read(observedPath);
const performances=observed.performances.filter(p=>p.teamId==='como'&&String(p.providerPlayerId)==='265912');
assert(performances.length>0);
const team=stats.teams.find(t=>t.id==='como');
const rows=performances.map(p=>{
 const rawPath=`data/raw/champions-pilot/espn/summaries/2026-27/uefa.champions/2026-10-22/${p.eventId}.json.gz`;
 const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(rawPath)).toString('utf8'));
 const roster=raw.payload.rosters.find(r=>String(r.team.id)===String(team.espnTeamId));
 const athlete=roster.roster.find(r=>String(r.athlete.id)==='265912');
 assert(athlete); assert.equal(p.eventId,String(raw.payload.header.id));
 return {league:'uefa.champions',teamId:String(team.espnTeamId),team:team.team,row:athlete,stats:p.statistics,minutes:p.minutes,retrievedAt:raw.retrievedAt,matchId:p.eventId,date:p.date,sourceUrl:p.sourceUrl};
});
const entries=builder.aggregateEntries('265912','midfielder',rows,{detailed:true}).map(e=>({...e,playerId:'maxence-caqueret',season:'2026/27',asOf:observed.asOf,matches:e.matches.map(m=>({...m,minutes:performances.find(p=>p.eventId===m.matchId).minutes,minutesStatus:'estimated-regulation-time'}))}));
const currentSeason={season:'2026/27',asOf:observed.asOf,entries,totals:builder.currentAggregate(entries),totalsScope:{teamId:String(team.espnTeamId),competitionType:'uefa-competition',competition:'UEFA Champions League',evidenceMode:'observed-uefa-matches-only'},totalsByCompetition:entries,minutesReliability:{status:'includes-estimates',method:'regulation-time-from-lineup-substitution-and-dismissal-events'}};
const existing=team.players.find(p=>String(p.providerPlayerId)==='265912');
assert(!existing||existing.id==='maxence-caqueret');
const repaired={...existing,id:'maxence-caqueret',name:'Maxence Caqueret',position:'midfielder',providerPlayerId:'265912',identitySource:'verified-domestic-profile-and-uefa-registration',sourceMode:'espn-match-rosters',currentSeason,dataQuality:'partial'};
if(existing)team.players[team.players.indexOf(existing)]=repaired;else team.players.push(repaired);
for(const p of performances){p.playerId='maxence-caqueret';p.identityStatus='canonical-provider-id';}
for(const t of [team])t.summary={...t.summary,players:t.players.length,withMinutes:t.players.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,partial:t.players.filter(p=>p.dataQuality==='partial').length};
const players=stats.teams.flatMap(t=>t.players);
stats.summary={...stats.summary,players:players.length,withMinutes:players.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,partial:players.filter(p=>p.dataQuality==='partial').length};
// All identity assertions precede writes. No selections or fixture forecasts are touched.
write(sourcePath,source);write(squadsPath,squads);write(statsPath,stats);write(observedPath,observed);
console.log('OK: N’Dicka, Wesley e Caqueret collegati; competizioni e altre squadre preservate.');
