"use strict";
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {analysis}=require('./recover-champions-season-shots.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,d)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const primary=read(path.join(analysis,'shooting-candidate.json'));
const fotmob=read(path.join(analysis,'fotmob-shooting-candidate.json'));
const secondary=read(path.join(analysis,'secondary-season-totals.json'));
const fmMatches=read(path.join(analysis,'fotmob-match-reconciliation.json'));
const fmAcquisition=read(path.join(analysis,'fotmob-match-acquisition.json'));
const config=read('data/sources/champions-pilot-match-stats-2025-27.json');
const fTeam=new Map(fmAcquisition.teams.map(t=>[String(t.providerTeamId),t.teamId]));
const eTeam=new Map(config.teams.map(t=>[String(t.espnTeamId),t.id]));
const complete=x=>x&&Number.isInteger(x.shots)&&Number.isInteger(x.shotsOnTarget)&&x.shots>=0&&x.shotsOnTarget>=0&&x.shotsOnTarget<=x.shots;
const conflicts=[],supplemented=[],teams=[];
for(const teamId of new Set(primary.players.map(p=>p.teamId))){
 const teamPlayers=[];
 for(const p of primary.players.filter(p=>p.teamId===teamId)){
   const fp=fotmob.players.find(f=>f.teamId===teamId&&f.playerId===p.playerId);
   const buckets=new Map();
   function add(row,provider,club){const key=`${club}|${row.league}`;if(!buckets.has(key))buckets.set(key,{clubId:club,league:row.league,competition:row.competition,alternatives:[]});buckets.get(key).alternatives.push({...row,provider});}
   for(const c of p.competitions)add(c,'ESPN',eTeam.get(c.providerTeamId)||`espn:${c.providerTeamId}`);
   for(const c of fp.competitions)add(c,'FotMob',fTeam.get(c.providerTeamId)||`fotmob:${c.providerTeamId}`);
   for(const c of secondary.filter(s=>s.teamId===teamId&&s.playerId===p.playerId))add(c,c.provider,teamId);
   const competitions=[];
   for(const bucket of buckets.values()){
     const ep=bucket.alternatives.find(a=>a.provider==='ESPN');
     const fm=bucket.alternatives.find(a=>a.provider==='FotMob');
     const official=bucket.alternatives.find(a=>a.provider==='Chance Liga');
     const season=bucket.alternatives.find(a=>a.provider==='Statz/Sportmonks');
     let chosen=complete(ep)?ep:complete(fm)?fm:complete(official)?official:complete(season)?season:null;
     let discrepancy=false;
     // Compare only like-for-like samples. Unequal appearance counts remain explicit coverage differences.
     if(chosen)for(const other of bucket.alternatives.filter(complete))if(other.appearances===chosen.appearances&&(other.shots!==chosen.shots||other.shotsOnTarget!==chosen.shotsOnTarget))discrepancy=true;
     if(discrepancy){conflicts.push({teamId,playerId:p.playerId,league:bucket.league,clubId:bucket.clubId,alternatives:bucket.alternatives});chosen=null;}
     if(chosen&&chosen.provider!=='ESPN')supplemented.push({teamId,playerId:p.playerId,league:bucket.league,provider:chosen.provider});
     const observations=bucket.alternatives.map(a=>({provider:a.provider,appearances:a.appearances,shots:a.shots,shotsOnTarget:a.shotsOnTarget,sourceUrl:a.sourceUrl||null,sourceUrls:a.sourceUrls||null}));
     competitions.push({clubId:bucket.clubId,league:bucket.league,competition:bucket.competition,appearances:chosen?.appearances??ep?.appearances??fm?.appearances??null,shots:chosen?.shots??null,shotsOnTarget:chosen?.shotsOnTarget??null,status:discrepancy?'source-conflict':chosen?'available':'missing-shooting-values',selectedProvider:chosen?.provider||null,coverageDifference:new Set(bucket.alternatives.map(a=>a.appearances)).size>1,observations});
   }
   const catalogue=fmAcquisition.teams.find(t=>t.teamId===teamId);
   const covered=fmMatches.filter(m=>m.canonicalTeamId===teamId&&m.fullLineup);
   const noAppearances=!!fp.providerPlayerId&&!fp.performances.length&&!p.performances.length&&catalogue.expectedFinishedMatches.length>0&&catalogue.expectedFinishedMatches.every(id=>covered.some(m=>m.eventId===id));
   const available=competitions.length>0&&competitions.every(complete);
   const coveredTotals=available?{appearances:competitions.reduce((s,c)=>s+(c.appearances||0),0),shots:competitions.reduce((s,c)=>s+c.shots,0),shotsOnTarget:competitions.reduce((s,c)=>s+c.shotsOnTarget,0)}:{appearances:null,shots:null,shotsOnTarget:null};
   const status=available?'available-in-covered-competitions':competitions.some(c=>c.status==='source-conflict')?'source-conflict':competitions.length?'partial-shooting-evidence':noAppearances?'no-appearance-in-verified-current-club-catalogue':'unresolved';
   teamPlayers.push({id:p.playerId,name:p.name,providerIds:{espn:p.providerPlayerId,fotmob:fp.providerPlayerId},status,fullSeasonVerified:false,coveredTotals,currentClubCatalogueZero:noAppearances?{shots:0,shotsOnTarget:0,appearances:0,scope:'Current club only, completed official fixtures listed by the provider; not a certification of every competition or other clubs',verifiedMatches:catalogue.expectedFinishedMatches.length}:null,competitions});
 }
 teams.push({id:teamId,team:primary.players.find(p=>p.teamId===teamId).team,players:teamPlayers});
}
const all=teams.flatMap(t=>t.players);
assert.equal(teams.length,36);assert.equal(all.length,970);
const summary={teams:36,players:970,availableForCoveredCompetitions:all.filter(p=>p.status==='available-in-covered-competitions').length,partial:all.filter(p=>p.status==='partial-shooting-evidence').length,conflicts:all.filter(p=>p.status==='source-conflict').length,noAppearanceInVerifiedClubCatalogue:all.filter(p=>p.currentClubCatalogueZero).length,unresolved:all.filter(p=>p.status==='unresolved').length,supplementedCompetitionBuckets:supplemented.length};
const sourceFile='data/sources/champions-player-shooting-evidence-2026-10-20.json';
save(sourceFile,{schemaVersion:1,asOf:'2026-10-20',scope:'Official club competitions; July 1 to October 20 inclusive, Eliteserien calendar 2026 separate. Completed matches only. Unknowns remain null.',primaryPerformances:primary.players.map(p=>({teamId:p.teamId,playerId:p.playerId,providerPlayerId:p.providerPlayerId,performances:p.performances})),fotmobPerformances:fotmob.players.map(p=>({teamId:p.teamId,playerId:p.playerId,providerPlayerId:p.providerPlayerId,performances:p.performances})),secondarySeasonTotals:secondary});
const output={schemaVersion:1,season:'2026/27',asOf:'2026-10-20',generatedAt:new Date().toISOString(),scope:'All official club competitions captured; competitions and clubs remain separate. Norwegian league uses calendar season 2026. No friendlies, youth national-team games, live or future matches.',coverageNotice:'Coverage is not certified exhaustive. coveredTotals sum the approved available competition buckets; gaps and conflicting sources keep totals null. A zero from a verified club catalogue is explicitly limited to that club catalogue.',sourceLedger:sourceFile,summary,teams};
save('data/normalized/champions-player-shooting-2026-27.json',output);
const currentFile='data/normalized/champions-player-stats-2026-27.json';
const current=read(currentFile),before=structuredClone(current);
require('./champions/season-shooting-overlay.cjs').attachSeasonShooting(current,'2026-10-20');
const stripped=structuredClone(current);for(const t of stripped.teams)for(const p of t.players)delete p.officialClubShooting;
const original=structuredClone(before);for(const t of original.teams)for(const p of t.players)delete p.officialClubShooting;
assert.deepEqual(stripped,original,'Non-shooting database fields changed');
save(currentFile,current);
save(path.join(analysis,'source-conflicts.json'),conflicts);save(path.join(analysis,'supplemented-buckets.json'),supplemented);
save(path.join(analysis,'import-result.json'),{...summary,legacyStatisticsPreserved:true,sourceFile,outputFile:'data/normalized/champions-player-shooting-2026-27.json'});
console.log(JSON.stringify(summary));
