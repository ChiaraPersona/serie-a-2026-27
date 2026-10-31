'use strict';
// Observed post-match data only; never recalculate published forecasts.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {execFileSync}=require('child_process');
const {importStatmuseResult}=require('./import-statmuse-result');
const {parseStatmuseGame}=require('./parse-statmuse-game');
const {loadPlayerIdentities,normalizePlayerName}=require('./player-identity');
const root=path.resolve(__dirname,'..');process.chdir(root);
const dir='output/fiorentina-atalanta-complete-2026-10-31',id='fiorentina-atalanta-2026-27-md-09';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,args=[])=>execFileSync(process.execPath,['--experimental-require-module',p,...args],{stdio:'inherit'});
assert(!fs.existsSync(dir+'/baseline.json'),'Already imported: inspect baseline before rerunning');
const config={matchId:id,file:'fiorentina-atalanta-complete.html',url:'https://www.statmuse.com/fc/match/10-29-2026-fio-vs-ata-112157',home:{slug:'fiorentina',abbr:'FIO'},away:{slug:'atalanta',abbr:'ATA'}};
const raw=parseStatmuseGame('tmp/'+config.file),{result,overlay}=importStatmuseResult({root,config});
assert.equal(raw.gameData.gameStatus,'played');assert.deepEqual(result.score,{home:2,away:2});
const official=read('data/sources/official-lineups-2026-27.json').fixtures.find(f=>f.matchId===id),identities=loadPlayerIdentities(root);
assert.equal(official.status,'official');
for(const side of ['home','away']){
 const team=config[side].slug,players=result.playerStats[side],stats=raw.gameData[side+'Team'].stats.player;
 const squad=read('data/teams/'+team+'.json').squad;
 const resolve=name=>identities.resolve(team,name)?.playerId||squad.find(p=>normalizePlayerName(p.name)===normalizePlayerName(name))?.id;
 assert.deepEqual(players.filter(p=>p.starter).map(p=>p.playerId).sort(),official.teams.find(t=>t.teamId===team).players.map(p=>p.playerId).sort());
 const rows=stats.splits.flatMap(g=>g.splits);
 for(const p of players){
  assert.equal(resolve(p.player),p.playerId,'Unverified identity '+p.player);
  const provider=Object.values(raw.players).find(r=>resolve(r.longName)===p.playerId);assert(provider,'Provider identity '+p.player);
  const row=rows.find(r=>String(r.playerId)===String(provider.id??provider.playerId))||rows.find(r=>normalizePlayerName(raw.players[String(r.playerId)].longName)===normalizePlayerName(provider.longName));assert(row);
  p.hitWoodwork=stats.statsLookup[row.statsLookupKey]?.HitWoodwork?.value??null;
 }
 for(const [pf,tf]of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls'],['hitWoodwork','hitWoodwork']]){assert(players.every(p=>Number.isFinite(p[pf])));assert.equal(players.reduce((n,p)=>n+p[pf],0),result.teamStats[side][tf]);}
}
result.coverage.teamMarketSubjects='canonical';result.coverage.scorers='complete';
result.coverage.note='Statistiche finali di squadra e individuali, marcatori, cartellini e sostituzioni disponibili.';
const matches=read('data/normalized/matches.json'),teams=Object.fromEntries(fs.readdirSync('data/teams').filter(f=>f.endsWith('.json')).map(f=>[f,read('data/teams/'+f)]));
const protectedFiles=['data/normalized/predictions.json','data/normalized/readings.json','data/normalized/schedina-md09.json','data/normalized/reading-md09-market-catalog.json','data/normalized/odds/sisal/serie-a.json','data/sources/official-lineups-2026-27.json'];
const baseline={protectedHashes:Object.fromEntries(protectedFiles.map(p=>[p,hash(p)])),rawHash:hash('tmp/'+config.file)};
write(dir+'/baseline.json',baseline);write(dir+'/matches-before.json',matches);write(dir+'/teams-before.json',teams);
fs.writeFileSync(dir+'/statmuse-112157.html.gz',require('zlib').gzipSync(fs.readFileSync('tmp/'+config.file)));
const results=read('data/sources/match-results-2026-27.json'),overlays=read('data/sources/statmuse-player-stats-2026-27.json');
write(dir+'/result-before.json',results.matches.find(m=>m.matchId===id));
results.matches[results.matches.findIndex(m=>m.matchId===id)]=result;results.retrievedAt='2026-10-31';
results.sources.push({url:config.url,provider:'StatMuse',sourceType:'match-report-stats',retrievedAt:'2026-10-31'});
const oi=overlays.matches.findIndex(r=>r[0]===config.url||r[0].endsWith('/-112157'));if(oi<0)overlays.matches.push(overlay);else overlays.matches[oi]=overlay;
overlays.updatedAt='2026-10-31';write('data/sources/match-results-2026-27.json',results);fs.writeFileSync('data/sources/statmuse-player-stats-2026-27.json',JSON.stringify(overlays)+'\n');
run('scripts/import-official-calendar.js');
assert.deepEqual(read('data/normalized/matches.json').filter(m=>m.id!==id),matches.filter(m=>m.id!==id));
run('scripts/team-pages/build.js');
for(const [file,original]of Object.entries(teams)){
 if(['index.json','player-leaderboards.json'].includes(file))continue;
 if(!['fiorentina.json','atalanta.json'].includes(file)){write('data/teams/'+file,original);continue;}
 const next=read('data/teams/'+file);for(const key of ['probableLineup','projectedLineup']){if(key in original)next[key]=original[key];else delete next[key];}write('data/teams/'+file,next);
}
const index=read('data/teams/index.json');index.teams=teams['index.json'].teams.map(t=>['fiorentina','atalanta'].includes(t.id)?{...t,lastUpdated:read('data/teams/'+t.id+'.json').lastUpdated}:t);index.officialLineups=teams['index.json'].officialLineups;write('data/teams/index.json',index);
run('scripts/apply-official-starter-policy.js');
process.env.SPATIAL_CAPTURE_DISABLED='1';
execFileSync(process.execPath,['-e',"const fs=require('fs'),write=fs.writeFileSync;fs.writeFileSync=function(f,d,...r){if(typeof f==='string'&&f.endsWith('.html')){const t=f+'.results-build.tmp';write.call(fs,t,d,...r);fs.renameSync(t,f);return;}return write.call(fs,f,d,...r)};process.argv.push('--presentation-only','--matchday','9');require('./scripts/build-site.js');"],{stdio:'inherit'});
for(const [p,h]of Object.entries(baseline.protectedHashes))assert.equal(hash(p),h,p+' changed');
write(dir+'/report.json',{matchId:id,score:result.score,players:result.playerStats.home.length+result.playerStats.away.length,scorers:result.scorers.length,bookings:result.bookings.length,substitutions:result.substitutions.length,unrelatedFixturesPreserved:true,publishedForecastsAndQuotesPreserved:true,certifiedProviderSettlement:false,remainingUnavailable:['attendance','mvp']});
console.log('PASS complete Fiorentina–Atalanta, canonical identities, starters and team totals; forecasts and quotes preserved');
