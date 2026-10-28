'use strict';
// Observed reports only: preserve every published forecast and provider quote.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {parseStatmuseGame}=require('./parse-statmuse-game');
const {importStatmuseResult}=require('./import-statmuse-result');
const {loadPlayerIdentities,normalizePlayerName}=require('./player-identity');
const root=path.resolve(__dirname,'..'),dir='output/md09-final-2026-10-28';process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,d)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(d,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
const run=(p,args=[])=>execFileSync(process.execPath,['--experimental-require-module',p,...args],{stdio:'inherit'});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const games=[["roma","ROM","cagliari","CAG",112158,4,2],["torino","TOR","como","COM",112161,1,3]];
const protectedFiles=['data/normalized/predictions.json','data/normalized/readings.json','data/normalized/schedina-md09.json','data/normalized/reading-md09-market-catalog.json','data/normalized/odds/sisal/serie-a.json','data/sources/official-lineups-2026-27.json'];
fs.mkdirSync(dir,{recursive:true});
assert(!fs.existsSync(dir+'/baseline.json'),'Baseline already exists; inspect before rerunning');
const before=read('data/normalized/matches.json'),teamsBefore=Object.fromEntries(fs.readdirSync('data/teams').filter(f=>f.endsWith('.json')).map(f=>[f,read('data/teams/'+f)]));
const baseline={protectedHashes:Object.fromEntries(protectedFiles.map(p=>[p,hash(p)])),matchIds:[],rawHashes:{}};
const official=read('data/sources/official-lineups-2026-27.json'),identities=loadPlayerIdentities(root),staged=[];
const aliases={'Matteo Chichella':'Matteo Cichella','Jon Rowe':'Jonathan Rowe','Francesco Esposito':'Pio Esposito','Yann Aurel Bisseck':'Yann Bisseck','André-Frank Zambo Anguissa':'Frank Anguissa','Oliver Nielsen':'Oliver Provstgaard','Nicolás Paz':'Nico Paz','Kialonda':'Kialonda Gaspar','Amar Ahmed':'Amar Fatah','Juan David Cabal':'Juan Cabal'};
const resolve=(team,name)=>{name=aliases[name]||name;return identities.resolve(team,name)?.playerId||teamsBefore[team+'.json'].squad.find(p=>normalizePlayerName(p.name)===normalizePlayerName(name))?.id||null;};
for(const [home,ha,away,aa,n,hg,ag]of games){
 const id=`${home}-${away}-2026-27-md-09`,config={matchId:id,file:`md09-final-${n}.html`,url:`https://www.statmuse.com/fc/match/-${n}`,home:{slug:home,abbr:ha},away:{slug:away,abbr:aa}};
 const raw=parseStatmuseGame('tmp/'+config.file);assert.equal(raw.gameData.gameStatus,'played');
 assert.deepEqual(raw.gameData.summary.filter(s=>s.type==='entity').map(s=>s.text.toLowerCase()),[home,away]);
 const {result,overlay}=importStatmuseResult({root,config});assert.deepEqual(result.score,{home:hg,away:ag});result.coverage.teamMarketSubjects='canonical';
 const lineup=official.fixtures.find(f=>f.matchId===id);assert.equal(lineup.status,'official');
 const unresolved=[];
 for(const side of ['home','away']){
  const team=config[side].slug,stats=raw.gameData[side+'Team'].stats.player;
  const woodwork=new Map(stats.splits.flatMap(g=>g.splits).map(s=>[normalizePlayerName(raw.players[String(s.playerId)].longName),stats.statsLookup[s.statsLookupKey]?.HitWoodwork?.value??null]));
  const players=result.playerStats[side];assert.equal(players.filter(p=>p.starter).length,11);
  const officialTeam=lineup.teams.find(t=>t.teamId===team);
  assert.deepEqual(players.filter(p=>p.starter).map(p=>p.playerId).sort(),officialTeam.players.map(p=>p.playerId).sort());
  for(const p of players){
   // Reject surname-only matches from the shared legacy importer.
   const exact=resolve(team,p.player);if(p.playerId)assert.equal(p.playerId,exact,team+': '+p.player);
   if(!exact)unresolved.push({team,player:p.player});
   const provider=Object.values(raw.players).find(r=>resolve(team,r.longName)===p.playerId&&p.playerId);
   p.hitWoodwork=woodwork.get(normalizePlayerName(provider?.longName||p.player))??null;
  }
  for(const [field,tf]of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls'],['hitWoodwork','hitWoodwork']]){
   assert(players.every(p=>Number.isFinite(p[field])),id+' '+field+' '+JSON.stringify(players.filter(p=>!Number.isFinite(p[field])).map(p=>p.player)));assert.equal(players.reduce((n,p)=>n+p[field],0),result.teamStats[side][tf],id+' '+field);
  }
 }
 for(const scorer of result.scorers){const event=raw.playByPlay.events.find(e=>e.type==='goal'&&resolve(config[e.teamId===raw.gameData.homeTeam.teamId?'home':'away'].slug,raw.players[String(e.playerId)]?.longName)===scorer.playerId&&((e.clock.minute>=90?90:e.clock.minute+1)===scorer.minute));if(event){scorer.sourceClock=event.clock;if(event.clock.extraMinute){scorer.minute=90+event.clock.extraMinute;scorer.addedTime=event.clock.extraMinute;}if(event.shotContext==='penalty')scorer.penalty=true;}}
 baseline.matchIds.push(id);baseline.rawHashes[config.file]=hash('tmp/'+config.file);staged.push({config,result,overlay,unresolved});
}
// All reports validated before the first canonical mutation.
write(dir+'/baseline.json',baseline);write(dir+'/matches-before.json',before);write(dir+'/teams-before.json',teamsBefore);
write(dir+'/official-before.json',read('data/sources/official-lineups-2026-27.json'));
write('data/sources/official-lineups-2026-27.json',official);
const results=read('data/sources/match-results-2026-27.json'),overlays=read('data/sources/statmuse-player-stats-2026-27.json');
write(dir+'/results-before.json',results);
for(const {config,result,overlay}of staged){const i=results.matches.findIndex(r=>r.matchId===config.matchId);if(i<0)results.matches.push(result);else results.matches[i]=result;const oi=overlays.matches.findIndex(r=>r[0]===config.url);if(oi<0)overlays.matches.push(overlay);else overlays.matches[oi]=overlay;if(!results.sources.some(s=>s.url===config.url))results.sources.push({url:config.url,provider:'StatMuse',sourceType:'match-report-stats',retrievedAt:'2026-10-28'});}
results.retrievedAt='2026-10-28';overlays.updatedAt='2026-10-28';write('data/sources/match-results-2026-27.json',results);fs.writeFileSync('data/sources/statmuse-player-stats-2026-27.json',JSON.stringify(overlays)+'\n');
run('scripts/import-official-calendar.js');
assert.deepEqual(read('data/normalized/matches.json').filter(m=>!baseline.matchIds.includes(m.id)),before.filter(m=>!baseline.matchIds.includes(m.id)));
run('scripts/team-pages/build.js');
const affected=games.flatMap(g=>[g[0],g[2]]);
for(const [file,original]of Object.entries(teamsBefore)){if(['index.json','player-leaderboards.json'].includes(file))continue;if(!affected.includes(file.replace('.json',''))){write('data/teams/'+file,original);continue;}const next=read('data/teams/'+file);for(const key of ['probableLineup','projectedLineup']){if(key in original)next[key]=original[key];else delete next[key];}write('data/teams/'+file,next);}
const index=read('data/teams/index.json');index.teams=teamsBefore['index.json'].teams.map(t=>affected.includes(t.id)?{...t,lastUpdated:read('data/teams/'+t.id+'.json').lastUpdated}:t);index.officialLineups=teamsBefore['index.json'].officialLineups;
write('data/teams/index.json',index);
run('scripts/apply-official-starter-policy.js');run('scripts/build-site.js',['--presentation-only','--matchday','9']);
for(const [p,d]of Object.entries(baseline.protectedHashes))if(!p.endsWith('official-lineups-2026-27.json'))assert.equal(hash(p),d,p+' changed');
write(dir+'/import-report.json',staged.map(({config,result,unresolved})=>({matchId:config.matchId,score:result.score,players:result.playerStats.home.length+result.playerStats.away.length,bookings:result.bookings.length,substitutions:result.substitutions.length,unresolved,certifiedProviderSettlement:false})));
console.log('Final two MD9 reports integrated; forecasts, odds and unrelated fixtures preserved.');


