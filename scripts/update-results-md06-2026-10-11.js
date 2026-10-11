'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {importStatmuseResult}=require('./import-statmuse-result');
const {parseStatmuseGame}=require('./parse-statmuse-game');
const {execFileSync}=require('child_process');
const {loadPlayerIdentities}=require('./player-identity');
const root=path.resolve(__dirname,'..');
const resultsPath=path.join(root,'data/sources/match-results-2026-27.json');
const results=JSON.parse(fs.readFileSync(resultsPath,'utf8'));
const overlaysPath=path.join(root,'data/sources/statmuse-player-stats-2026-27.json');
const overlays=JSON.parse(fs.readFileSync(overlaysPath,'utf8'));
const games=[['genoa','GEN','fiorentina','FIO',112133,'10-10-2026'],['inter','INT','parma','PAR',112128,'10-10-2026'],['napoli','NAP','frosinone','FRO',112127,'10-10-2026'],['como','COM','roma','ROM',112135,'10-11-2026']];
const normalizedPath=path.join(root,'data/normalized/matches.json');
const matches=JSON.parse(fs.readFileSync(normalizedPath,'utf8'));
for(const [home,habbr,away,aabbr,id,date] of games){
 const config={matchId:`${home}-${away}-2026-27-md-06`,file:`md06-${id}.html`,url:`https://www.statmuse.com/fc/match/${date}-${habbr.toLowerCase()}-vs-${aabbr.toLowerCase()}-${id}`,home:{slug:home,abbr:habbr},away:{slug:away,abbr:aabbr}};
 fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
 const rawPath=path.join(root,'tmp',config.file);
 if(!fs.existsSync(rawPath))execFileSync('curl',['--fail','-L','-s','--max-time','30',config.url,'-o',rawPath]);
 const raw=parseStatmuseGame(rawPath);
 assert.equal(raw.gameData.summary.filter(s=>s.type==='entity')[0].text,home[0].toUpperCase()+home.slice(1));
 assert.equal(raw.gameData.summary.filter(s=>s.type==='entity')[1].text,away[0].toUpperCase()+away.slice(1));

 const {result,overlay}=importStatmuseResult({root,config});
 const oi=overlays.matches.findIndex(x=>x[0]===config.url);if(oi<0)overlays.matches.push(overlay);else overlays.matches[oi]=overlay;
 for(const side of ['home','away']){
  const team=raw.gameData[`${side}Team`],stats=team.stats.player;
  const woodwork=new Map(stats.splits.flatMap(g=>g.splits).map(s=>[raw.players[String(s.playerId)].longName,stats.statsLookup[s.statsLookupKey]?.HitWoodwork?.value]));
  for(const p of result.playerStats[side]){
   const key=[...woodwork.keys()].find(n=>n===p.player||n==='Francesco Esposito'&&p.player==='Pio Esposito'||n==='Nicolás Paz'&&p.player==='Nico Paz');
   const identities=loadPlayerIdentities(root);
   const identityKey=[...woodwork.keys()].find(n=>identities.resolve(side==='home'?home:away,n)?.playerId===p.playerId&&p.playerId);
   p.hitWoodwork=woodwork.get(identityKey||key)??(result.teamStats[side].hitWoodwork===0?0:null);
  }
 }
 const index=results.matches.findIndex(m=>m.matchId===config.matchId);if(index<0)results.matches.push(result);else results.matches[index]=result;
 const match=matches.find(m=>m.id===config.matchId);assert(match);
 const {matchId,coverage,...fields}=result;Object.assign(match,fields,{resultCoverage:coverage});
 if(!results.sources.some(s=>s.url===config.url))results.sources.push({provider:'StatMuse',sourceType:'match-report-stats',url:config.url,retrievedAt:'2026-10-11'});
 console.log(config.matchId,result.score);
}
results.retrievedAt='2026-10-11';
fs.writeFileSync(resultsPath,JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(normalizedPath,JSON.stringify(matches,null,2)+'\n');
overlays.updatedAt='2026-10-11';
fs.writeFileSync(overlaysPath,JSON.stringify(overlays)+'\n');
