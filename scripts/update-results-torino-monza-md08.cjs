'use strict';
// Observed results only. Never regenerate historical forecasts or provider quotes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {parseStatmuseGame}=require('./parse-statmuse-game');
const {importStatmuseResult}=require('./import-statmuse-result');
const {loadPlayerIdentities,normalizePlayerName}=require('./player-identity');
const root=path.resolve(__dirname,'..'),id='torino-monza-2026-27-md-08',dir='output/torino-monza-md08-postmatch';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{fs.writeFileSync(path.join(root,p+'.tmp'),JSON.stringify(d,null,2)+'\n');fs.renameSync(path.join(root,p+'.tmp'),path.join(root,p));};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const config={matchId:id,file:'md08-112153.html',url:'https://www.statmuse.com/fc/match/-112153',home:{slug:'torino',abbr:'TOR'},away:{slug:'monza',abbr:'MON'}};
const raw=parseStatmuseGame(path.join(root,'tmp',config.file));
assert.equal(raw.gameData.gameStatus,'played');
assert.deepEqual(raw.gameData.summary.filter(s=>s.type==='entity').map(s=>s.text.toLowerCase()),['torino','monza']);
const {result,overlay}=importStatmuseResult({root,config}),identities=loadPlayerIdentities(root);
const resolveExact=(teamId,name)=>identities.resolve(teamId,name)?.playerId||read('data/teams/'+teamId+'.json').squad.find(p=>normalizePlayerName(p.name)===normalizePlayerName(name))?.id||null;
assert.deepEqual(result.score,{home:3,away:2});
// Opt in this newly verified report to canonical team-subject settlement.
// Historical reports retain their existing recorded interpretation.
result.coverage.teamMarketSubjects='canonical';
const official=read('data/sources/official-lineups-2026-27.json').fixtures.find(f=>f.matchId===id);
for(const side of ['home','away']){
 const teamId=config[side].slug,stats=raw.gameData[side+'Team'].stats.player;
 const woodwork=new Map(stats.splits.flatMap(g=>g.splits).map(s=>{
  const name=raw.players[String(s.playerId)].longName;
  const playerId=resolveExact(teamId,name);assert(playerId,'Unresolved provider identity: '+name);
  return [playerId,stats.statsLookup[s.statsLookupKey]?.HitWoodwork?.value??null];
 }));
 const players=result.playerStats[side];
 assert.equal(players.length,16);assert.equal(players.filter(p=>p.starter).length,11);
 assert.deepEqual(players.filter(p=>p.starter).map(p=>p.playerId).sort(),official.teams.find(t=>t.teamId===teamId).players.map(p=>p.playerId).sort());
 for(const p of players){assert(p.playerId,p.player);assert(resolveExact(teamId,p.player)===p.playerId,'Exact canonical identity required: '+p.player);p.hitWoodwork=woodwork.get(p.playerId)??null;}
}
// Keep the established scorer.team convention (player's team for an own goal).
// Preserve the provider clock and its verified stoppage minute without altering the shared importer.
for(const scorer of result.scorers){
 const event=raw.playByPlay.events.find(e=>e.type==='goal'&&resolveExact(config[e.teamId===raw.gameData.homeTeam.teamId?'home':'away'].slug,raw.players[String(e.playerId)]?.longName)===scorer.playerId);
 if(event?.clock?.extraMinute){scorer.minute=90+event.clock.extraMinute;scorer.addedTime=event.clock.extraMinute;scorer.sourceClock=event.clock;}
}
assert.equal(result.substitutions.length,10);assert.equal(result.bookings.length,1);
const protectedFiles=['data/normalized/predictions.json','data/normalized/readings.json','data/normalized/schedina-md08.json','data/normalized/reading-md08-market-catalog.json','data/normalized/odds/sisal/serie-a.json','data/sources/official-lineups-2026-27.json','data/technical-archive/official-nonstarter-markets.json'];
fs.mkdirSync(path.join(root,dir),{recursive:true});
if(!fs.existsSync(path.join(root,dir,'baseline.json'))){
 write(dir+'/baseline.json',{matchId:id,protectedHashes:Object.fromEntries(protectedFiles.map(p=>[p,hash(p)])),rawHash:hash('tmp/'+config.file)});
 write(dir+'/matches-before.json',read('data/normalized/matches.json'));
 write(dir+'/results-before.json',read('data/sources/match-results-2026-27.json'));
 write(dir+'/teams-before.json',Object.fromEntries(fs.readdirSync(path.join(root,'data/teams')).filter(f=>f.endsWith('.json')).map(f=>[f,read('data/teams/'+f)])));
}
const baseline=read(dir+'/baseline.json');
for(const [p,digest]of Object.entries(baseline.protectedHashes))assert.equal(hash(p),digest,p+' changed since baseline');
const results=read('data/sources/match-results-2026-27.json'),overlays=read('data/sources/statmuse-player-stats-2026-27.json');
const replace=(rows,predicate,value)=>{const i=rows.findIndex(predicate);if(i<0)rows.push(value);else rows[i]=value;};
replace(results.matches,r=>r.matchId===id,result);replace(overlays.matches,r=>r[0]===config.url,overlay);
const retrievedAt='2026-10-24';
for(const [url,provider,sourceType]of [[config.url,'StatMuse','match-report-stats'],['https://www.legaseriea.it/serie-a/news/torino-monza-2026-2027-3-2-cronaca-risultato-gol','Lega Serie A','official-match-result'],['https://www.torinofc.it/news/23/10/2026/torino-monza-3-2_45431','Torino FC','official-match-report'],['https://www.acmonza.com/it/news/torino-monza-23102026-report/','AC Monza','official-match-report']]){
 if(!results.sources.some(s=>s.url===url))results.sources.push({url,provider,sourceType,retrievedAt});
}
results.retrievedAt=retrievedAt;overlays.updatedAt=retrievedAt;
write('data/sources/match-results-2026-27.json',results);
fs.writeFileSync(path.join(root,'data/sources/statmuse-player-stats-2026-27.json'),JSON.stringify(overlays)+'\n');
execFileSync(process.execPath,['--experimental-require-module','scripts/import-official-calendar.js'],{cwd:root,stdio:'inherit'});
assert.deepEqual(read('data/normalized/matches.json').filter(m=>m.id!==id),read(dir+'/matches-before.json').filter(m=>m.id!==id),'Unrelated fixtures changed');
for(const [p,digest]of Object.entries(baseline.protectedHashes))assert.equal(hash(p),digest,p+' changed');
write(dir+'/import-report.json',{matchId:id,score:result.score,players:32,starters:22,substitutions:10,bookings:1,unresolvedDidNotPlay:result.didNotPlay.home.filter(p=>!p.playerId),protectedFilesVerified:true,otherFixturesUnchanged:true,sourceDiscrepancies:['Official narrative reports contain inconsistent goal/substitution minutes; structured match clock retained.','Secondary descriptions of woodwork differ; structured provider reports zero for both teams.'],certifiedProviderSettlement:false});
console.log('Torino–Monza final result imported; historical forecasts and other fixtures unchanged.');
