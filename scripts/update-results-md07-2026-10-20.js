'use strict';
// Observed results only. Never rebuild historical predictions or odds.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {importStatmuseResult}=require('./import-statmuse-result');
const {parseStatmuseGame}=require('./parse-statmuse-game');
const {loadPlayerIdentities,normalizePlayerName}=require('./player-identity');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const results=read('data/sources/match-results-2026-27.json'),overlays=read('data/sources/statmuse-player-stats-2026-27.json');
const games=[['juventus','JUV','lazio','LAZ',112137,0,3],['fiorentina','FIO','como','COM',112138,1,3],['milan','MIL','atalanta','ATA',112140,3,2],['parma','PAR','torino','TOR',112141,0,3],['udinese','UDI','lecce','LEC',112142,0,3],['monza','MON','cagliari','CAG',112146,4,0],['roma','ROM','genoa','GEN',112139,2,0]];
const identities=loadPlayerIdentities(root),staged=[];
const officialLineups=read('data/sources/official-lineups-2026-27.json');
for(const [home,habbr,away,aabbr,id,hg,ag] of games){
 const config={matchId:`${home}-${away}-2026-27-md-07`,file:`md07-${id}.html`,url:`https://www.statmuse.com/fc/match/-${id}`,home:{slug:home,abbr:habbr},away:{slug:away,abbr:aabbr}};
 const raw=parseStatmuseGame(path.join(root,'tmp',config.file));
 assert.equal(raw.gameData.gameStatus,'played');
 assert.deepEqual(raw.gameData.summary.filter(s=>s.type==='entity').map(s=>s.text.toLowerCase()),[home,away]);
 const {result,overlay}=importStatmuseResult({root,config});
 assert.deepEqual(result.score,{home:hg,away:ag});
 for(const side of ['home','away']){
  const teamId=side==='home'?home:away,stats=raw.gameData[`${side}Team`].stats.player;
  const woodwork=new Map(stats.splits.flatMap(g=>g.splits).map(s=>{
   const name=raw.players[String(s.playerId)].longName;
   // Fixture-specific provider name defect: the club lists Diallo Thiao replacing Britschgi.
   // Do not register Djibril and Ousmane as global aliases: they are different players.
   const correctedId=config.matchId==='parma-torino-2026-27-md-07'&&teamId==='parma'&&name==='Djibril Diallo'?'ousmane-diallo':null;
   const playerId=correctedId||identities.resolve(teamId,name)?.playerId||result.playerStats[side].find(p=>normalizePlayerName(p.player)===normalizePlayerName(name))?.playerId;
   return [playerId,stats.statsLookup[s.statsLookupKey]?.HitWoodwork?.value];
  }));
  assert.equal(result.playerStats[side].filter(p=>p.starter).length,11);
  for(const p of result.playerStats[side]){assert(p.playerId,`${teamId}: ${p.player}`);p.hitWoodwork=woodwork.get(p.playerId)??null;}
 }
 if(home==='parma')result.identityResolutions=[{providerName:'Djibril Diallo',playerId:'ousmane-diallo',canonicalName:'Ousmane Diallo',scope:config.matchId,reason:'Il tabellino ufficiale del club identifica Diallo Thiao come subentrante a Britschgi al 69 minuto; nome provider errato.',sourceUrl:'https://www.parmacalcio1913.com/news/seria-a-enilive-parma-torino-0-3/'}];
 staged.push({config,result,overlay,official:`https://www.legaseriea.it/serie-a/news/${home}-${away}-2026-2027-${hg}-${ag}-cronaca-risultato-gol`});
}
for(const {config,result,overlay,official} of staged){
 const index=results.matches.findIndex(m=>m.matchId===config.matchId);if(index<0)results.matches.push(result);else results.matches[index]=result;
 // Replace any previous URL alias for the same fixture, rather than duplicating an overlay.
 const oi=overlays.matches.findIndex(x=>x[0].endsWith(`-${config.file.match(/(\d+)\.html$/)[1]}`));if(oi<0)overlays.matches.push(overlay);else overlays.matches[oi]=overlay;
 for(const [url,provider,sourceType] of [[config.url,'StatMuse','match-report-stats'],[official,'Lega Serie A','official-match-result']])if(!results.sources.some(s=>s.url===url))results.sources.push({provider,sourceType,url,retrievedAt:'2026-10-20'});
 console.log(config.matchId,result.score);
 const officialIndex=officialLineups.fixtures.findIndex(f=>f.matchId===config.matchId);
 if(officialIndex<0 || (officialLineups.fixtures[officialIndex].provider==='StatMuse'&&officialLineups.fixtures[officialIndex].retrievedAt==='2026-10-20')){
  const fixture=read('data/normalized/matches.json').find(m=>m.id===config.matchId);
  const officialFixture={matchId:config.matchId,label:`${config.home.slug} - ${config.away.slug}`,status:'official',matchday:7,date:fixture.date,kickoff:fixture.kickoff,provider:'StatMuse',sourceUrl:config.url,retrievedAt:'2026-10-20',teams:['home','away'].map(side=>({teamId:config[side].slug,team:config[side].slug,formation:result.formations[side],benchCoverage:'complete',players:result.playerStats[side].filter(p=>p.starter).map((p,index)=>({playerId:p.playerId,currentName:p.player,sourceName:p.player,lineupStatus:'starter',positionIndex:index})),substitutes:[...result.playerStats[side].filter(p=>!p.starter),...result.didNotPlay[side]].map(p=>({playerId:p.playerId,currentName:p.player,sourceName:p.player,lineupStatus:'bench'}))}))};
  if(officialIndex<0)officialLineups.fixtures.push(officialFixture);else officialLineups.fixtures[officialIndex]=officialFixture;
 }
}
results.retrievedAt='2026-10-20';overlays.updatedAt='2026-10-20';
fs.writeFileSync(path.join(root,'data/sources/match-results-2026-27.json'),JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(path.join(root,'data/sources/statmuse-player-stats-2026-27.json'),JSON.stringify(overlays)+'\n');
fs.writeFileSync(path.join(root,'data/sources/official-lineups-2026-27.json'),JSON.stringify(officialLineups,null,2)+'\n');

