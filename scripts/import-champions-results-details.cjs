'use strict';
// Observed Champions evidence only: no forecasts, odds or betting settlements.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const builder=require('./build-champions-player-stats');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{
 const file=path.join(root,p),text=JSON.stringify(d,null,2)+'\n';
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===text)return;
 const temporary=file+'.import-tmp';fs.writeFileSync(temporary,text);fs.renameSync(temporary,file);
};
const rawBase='data/raw/champions-results/2026-10-22',auditBase='data/analysis/champions/results-2026-10-22';
const currentPath='data/normalized/champions-player-stats-2026-27.json';
const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const statsMap=stats=>Object.fromEntries((stats||[]).map(s=>[s.name,number(s.value??s.displayValue)]));
const current=read(currentPath),calendar=read('data/normalized/champions-league-2026-27.json');
const jobs=read(rawBase+'/manifest.json').jobs;
assert.equal(jobs.length,54);assert(jobs.every(j=>!j.error));
const snapshot=p=>{const dest=auditBase+'/before/'+p;if(!fs.existsSync(path.join(root,dest)))write(dest,read(p));};
snapshot(currentPath);snapshot('data/normalized/champions-league-2026-27.json');
const identities=new Map();
function identity(teamId,providerId,playerId,name,position,priority=0){
 if(!teamId||!providerId||!playerId)return;
 const key=teamId+'|'+providerId,old=identities.get(key);
 if(old&&old.priority>priority)return;
 if(old&&old.playerId!==playerId&&old.priority===priority)throw Error('Ambiguous identity '+key);
 identities.set(key,{teamId,providerId:String(providerId),playerId,name,position,priority});
}
for(const t of current.teams)for(const p of t.players)identity(t.id,p.providerPlayerId,p.id,p.name,p.position);
const md3=read('data/sources/champions-md03-squads-2026-27.json');
for(const p of read('data/sources/champions-player-identity-overlay-md02-2026-27.json').players)identity(p.teamId,p.providerIds?.espn,p.canonicalPlayerId,p.canonicalName,p.position,1);
for(const t of md3.teams)for(const p of t.players)identity(t.teamId,p.providerPlayerId,p.playerId,p.canonicalName,p.role,2);
for(const p of read('data/sources/champions-md03-identity-corrections-2026-10-20.json').corrections)identity(p.teamId,p.providerPlayerId,p.playerId,p.canonicalName,p.position,3);
const unresolved=new Map(),conflicts=[],performances=[],reportUpdates=new Map(),pendingRaw=[];
const summaries={fixtures:0,appearances:0,unusedBench:0,goals:0,assists:0,yellowCardEvents:0,redCardEvents:0,substitutions:0,minutesEstimated:0,minutesUnavailable:0};
const rawCache=new Map(jobs.map(j=>[j.eventId,read(rawBase+'/'+j.eventId+'.json')]));
function playerRef(teamId,p){const id=String(p?.id||'');const found=identities.get(teamId+'|'+id);return {playerId:found?.playerId||null,providerPlayerId:id||null,player:p?.fullName||p?.displayName||null};}
function estimatedMinutes(row){
 const stats=statsMap(row.stats);if(stats.appearances!==1)return {minutes:stats.appearances===0?0:null,minutesStatus:stats.appearances===0?'did-not-play':'unavailable'};
 const minute=play=>{const m=String(play?.clock?.displayValue||'').match(/^(\d+)(?:'?(?:\+)(\d+))?/);return m?Math.min(90,Number(m[1])):null;};
 const substitutions=(row.plays||[]).filter(p=>p.substitution);
 const dismissal=(row.plays||[]).find(p=>p.redCard);
 let value=null;
 if(row.starter){value=row.subbedOut?minute(substitutions[0]):dismissal?minute(dismissal):90;}
 else if(row.subbedIn&&substitutions.length){const start=minute(substitutions[0]);const end=row.subbedOut?minute(substitutions.at(-1)):dismissal?minute(dismissal):90;if(start!==null&&end!==null&&end>=start)value=end-start;}
 return {minutes:value,minutesStatus:value===null?'unavailable':'estimated-regulation-time'};
}
for(const job of jobs){
 const raw=rawCache.get(job.eventId),d=raw.payload,competition=d.header.competitions[0];
 assert.equal(String(d.header.id),job.eventId);assert.equal(competition.date.slice(0,10),job.date);assert.equal(competition.status.type.completed,true);
 const fixture=calendar.fixtures.find(f=>f.id===job.fixtureId);assert(fixture);
 const teams=Object.fromEntries(['home','away'].map(side=>[side,competition.competitors.find(c=>c.homeAway===side)]));
 for(const side of ['home','away'])assert.equal(number(teams[side].score),fixture.score[side]);
 const sideFor=id=>['home','away'].find(side=>teams[side].id===String(id));
 const teamStats=Object.fromEntries(['home','away'].map(side=>[side,statsMap(d.boxscore.teams.find(t=>t.team.id===teams[side].id)?.statistics)]));
 const goalEvents=[],bookingEvents=[],substitutions=[],playerEvidence=[],lineups={};
 for(const e of d.keyEvents||[]){
  const side=sideFor(e.team?.id);if(!side)continue;
  const teamId=job[side+'TeamId'],participants=(e.participants||[]).map(p=>{
   const actualRoster=d.rosters.find(r=>r.roster.some(row=>row.athlete.id===p.athlete.id));
   const actualSide=actualRoster?sideFor(actualRoster.team.id):side;
   return playerRef(job[actualSide+'TeamId']||teamId,p.athlete);
  });
  const event={eventId:e.id,team:side,teamId,minute:e.clock?.displayValue||null,...participants[0]};
  if(e.scoringPlay){const ownGoal=e.type?.type==='own-goal'||e.ownGoal===true;goalEvents.push({...event,assist:!ownGoal?participants[1]?.player||null:null,assistPlayerId:!ownGoal?participants[1]?.playerId||null:null,assistProviderPlayerId:!ownGoal?participants[1]?.providerPlayerId||null:null,ownGoal,penalty:e.type?.type==='penalty---scored'||e.penaltyKick===true});}
  if(/^(yellow-card|red-card|yellow-red-card|second-yellow-card)$/.test(e.type?.type||''))bookingEvents.push({...event,eventType:e.type.type});
  if(e.type?.type==='substitution')substitutions.push({...event,playerIn:participants[0]?.player||null,playerInId:participants[0]?.playerId||null,playerInProviderId:participants[0]?.providerPlayerId||null,playerOut:participants[1]?.player||null,playerOutId:participants[1]?.playerId||null,playerOutProviderId:participants[1]?.providerPlayerId||null});
 }
 for(const side of ['home','away']){
  assert.equal(goalEvents.filter(e=>e.team===side).length,fixture.score[side],job.fixtureId+' goals');
  const roster=d.rosters.find(r=>r.team.id===teams[side].id);assert(roster);
  assert.equal(roster.roster.filter(p=>p.starter).length,11);
  const teamId=job[side+'TeamId'];
  lineups[side]={teamId,formation:roster.formation||null,players:[]};
  const playing=roster.roster.filter(row=>statsMap(row.stats).appearances===1);
  for(const metric of ['totalShots','shotsOnTarget','foulsCommitted','yellowCards']){
   const values=playing.map(p=>statsMap(p.stats)[metric]);
   if(values.every(v=>v!==null&&v!==undefined)&&teamStats[side][metric]!==undefined)assert.equal(values.reduce((n,v)=>n+v,0),teamStats[side][metric],job.fixtureId+' '+side+' '+metric);
  }
  for(const row of roster.roster){
   const ref=playerRef(teamId,row.athlete),stats=statsMap(row.stats),minutes=estimatedMinutes(row);
   const entry={...ref,teamId,team:side,fixtureId:job.fixtureId,eventId:job.eventId,date:job.date,starter:row.starter===true,subbedIn:row.subbedIn===true,subbedOut:row.subbedOut===true,shirtNumber:number(row.jersey),position:row.position?.name||null,...minutes,statistics:stats,events:(row.plays||[]).map(p=>({minute:p.clock?.displayValue||null,goal:p.didScore===true,assist:p.didAssist===true,substitution:p.substitution===true,yellowCard:p.yellowCard===true,redCard:p.redCard===true,ownGoal:p.ownGoal===true,penalty:p.penaltyKick===true})),identityStatus:ref.playerId?'canonical-provider-id':'unresolved-provider-only',sourceUrl:raw.url};
   playerEvidence.push(entry);lineups[side].players.push({playerId:ref.playerId,providerPlayerId:ref.providerPlayerId,name:ref.player,starter:row.starter===true,shirtNumber:entry.shirtNumber});
   if(stats.appearances===1){
    performances.push(entry);summaries.appearances++;
    if(minutes.minutes===null)summaries.minutesUnavailable++;else summaries.minutesEstimated++;
    if(!ref.playerId)unresolved.set(teamId+'|'+ref.providerPlayerId,{teamId,providerPlayerId:ref.providerPlayerId,name:ref.player});
   }else if(stats.appearances===0)summaries.unusedBench++;
  }
 }
 const statistics={sourceUrl:raw.url};
 for(const [key,providerKey] of Object.entries({shots:'totalShots',shotsOnTarget:'shotsOnTarget',corners:'wonCorners',fouls:'foulsCommitted',possessionPct:'possessionPct',yellowCards:'yellowCards',redCards:'redCards',goalkeeperSaves:'saves',offsides:'offsides',passes:'totalPasses',accuratePasses:'accuratePasses',crosses:'totalCrosses',tackles:'totalTackles',interceptions:'interceptions',clearances:'totalClearance'}))statistics[key]=['home','away'].map(side=>teamStats[side][providerKey]??null);
 const halves=['home','away'].map(side=>number(teams[side].linescores?.[0]?.displayValue));
 const old=read(`data/sources/champions-results-md0${fixture.matchday}-2026-27.json`).fixtures.find(f=>f.fixtureId===fixture.id);
 for(const field of ['shots','shotsOnTarget','corners','fouls'])if(old.statistics?.[field]&&JSON.stringify(old.statistics[field])!==JSON.stringify(statistics[field]))conflicts.push({fixtureId:fixture.id,field,existing:old.statistics[field],acquired:statistics[field],resolution:'preserve-existing-primary-report',sourceUrl:raw.url});
 const report={...old,halfTimeScore:halves.every(v=>v!==null)?{home:halves[0],away:halves[1]}:null,scorers:old.scorers??{home:goalEvents.filter(e=>e.team==='home').map(e=>e.player),away:goalEvents.filter(e=>e.team==='away').map(e=>e.player)},statistics:old.statistics??statistics,cards:old.cards??{yellow:Object.fromEntries(['home','away'].map(side=>[side,bookingEvents.filter(e=>e.team===side&&e.eventType==='yellow-card').map(e=>e.player)])),sourceUrl:raw.url,coverage:'Player card events; staff excluded.'},substitutions:old.substitutions??substitutions,goalEvents,bookingEvents,observedSubstitutions:substitutions,playerEvidence,observedStatistics:statistics,observedTeamStatistics:teamStats,actualLineups:lineups,detailedReportSource:{provider:'ESPN',url:raw.url,rawPath:rawBase+'/'+job.eventId+'.json',retrievedAt:raw.retrievedAt},coverageNote:'Referto partita acquisito: eventi, statistiche di squadra e individuali. Minuti derivati da titolarità, sostituzioni ed espulsioni su 90 minuti regolamentari: stimati, recupero escluso. Metriche assenti null; nessuna liquidazione certificata dedotta.'};
 reportUpdates.set(fixture.id,report);summaries.fixtures++;summaries.goals+=goalEvents.length;summaries.assists+=goalEvents.filter(e=>e.assist).length;summaries.yellowCardEvents+=bookingEvents.filter(e=>e.eventType==='yellow-card').length;summaries.redCardEvents+=bookingEvents.filter(e=>e.eventType!=='yellow-card').length;summaries.substitutions+=substitutions.length;
 pendingRaw.push({file:`data/raw/champions-pilot/espn/summaries/2026-27/uefa.champions/2026-10-22/${job.eventId}.json.gz`,raw});
}
// Aggregate only the acquired Champions bucket; all domestic buckets remain intact.
const rowsByPlayer=new Map();
for(const e of performances){if(!e.playerId)continue;const job=jobs.find(j=>j.eventId===e.eventId),raw=rawCache.get(e.eventId),r=raw.payload.rosters.find(r=>r.team.id===raw.payload.header.competitions[0].competitors.find(c=>c.homeAway===e.team).id),row=r.roster.find(p=>p.athlete.id===e.providerPlayerId),key=e.teamId+'|'+e.playerId;
 if(!rowsByPlayer.has(key))rowsByPlayer.set(key,[]);
 rowsByPlayer.get(key).push({league:'uefa.champions',teamId:r.team.id,team:r.team.displayName,name:e.player,row,stats:e.statistics,minutes:e.minutes,retrievedAt:raw.retrievedAt,matchId:e.eventId,date:job.date,sourceUrl:raw.url});
}
let updatedPlayers=0,addedPlayers=0;
for(const [key,rows] of rowsByPlayer){
 const [teamId,playerId]=key.split('|'),team=current.teams.find(t=>t.id===teamId);assert(team);
 const id=identities.get(teamId+'|'+rows[0].row.athlete.id);assert.equal(id.playerId,playerId);
 let player=team.players.find(p=>p.id===playerId);
 if(!player){player={id:playerId,name:id.name,position:id.position||null,providerPlayerId:id.providerId,identitySource:'existing-canonical-champions-registry',sourceMode:'espn-match-rosters',currentSeason:null,dataQuality:'partial'};team.players.push(player);addedPlayers++;}
 const old=player.currentSeason,entries=builder.aggregateEntries(id.providerId,player.position,rows,{detailed:true}).map(e=>({...e,playerId,season:'2026/27',asOf:'2026-10-22',minutesReliability:{status:'includes-estimates',method:'regulation-time-from-lineup-substitution-and-dismissal-events'},matches:e.matches.map(m=>({...m,fixtureId:jobs.find(j=>j.eventId===m.matchId).fixtureId,minutes:rows.find(r=>r.matchId===m.matchId).minutes,minutesStatus:rows.find(r=>r.matchId===m.matchId).minutes===null?'unavailable':'estimated-regulation-time'}))}));
 const untouched=(old?.entries||[]).filter(e=>!(e.competition==='UEFA Champions League'&&String(e.teamId)===String(team.espnTeamId)));
 const merged=[...untouched,...entries];
 const scope=old?.totalsScope||{teamId:team.espnTeamId,competitionType:'uefa-competition',competition:'UEFA Champions League',evidenceMode:'observed-uefa-matches-only'};
 const primary=merged.filter(e=>String(e.teamId)===String(scope.teamId)&&e.competitionType===scope.competitionType&&(!scope.competition||e.competition===scope.competition));
 const scopeTouched=primary.some(e=>entries.includes(e));
 player.providerPlayerId=id.providerId;
 player.currentSeason={...old,season:'2026/27',asOf:'2026-10-22',entries:merged,totals:scopeTouched?builder.currentAggregate(primary):old?.totals||builder.currentAggregate(primary),totalsScope:scope,allEvidenceTotals:builder.currentAggregate(merged),totalsByCompetition:merged};
 player.championsObserved={asOf:'2026-10-22',matchdays:[1,2,3],totals:builder.currentAggregate(entries),matches:entries.flatMap(e=>e.matches),minutesStatus:'includes-estimates'};
 if(!old)player.dataQuality='partial';updatedPlayers++;
}
current.asOf='2026-10-22';current.cutoffDate='2026-10-22';if(current.dateInterval)current.dateInterval.to='2026-10-22';
current.championsResultsImport={asOf:'2026-10-22',source:'data/sources/champions-observed-performances-2026-27.json',fixtures:54,appearances:performances.length,updatedPlayers,addedPlayers:(current.championsResultsImport?.addedPlayers||0)+addedPlayers,domesticEvidencePreserved:true};
const allPlayers=current.teams.flatMap(t=>t.players);
current.summary={...current.summary,players:allPlayers.length,withMinutes:allPlayers.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,complete:allPlayers.filter(p=>p.dataQuality==='complete').length,partial:allPlayers.filter(p=>p.dataQuality==='partial').length,unavailable:allPlayers.filter(p=>p.dataQuality==='unavailable').length};
for(const team of current.teams){team.summary={...team.summary,players:team.players.length,withMinutes:team.players.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,complete:team.players.filter(p=>p.dataQuality==='complete').length,partial:team.players.filter(p=>p.dataQuality==='partial').length,unavailable:team.players.filter(p=>p.dataQuality==='unavailable').length};team.championsObservedAsOf='2026-10-22';}
// All validation above precedes canonical writes.
for(let day=1;day<=3;day++){
 const file=`data/sources/champions-results-md0${day}-2026-27.json`;snapshot(file);const source=read(file);
 source.previousCoverageNote=source.previousCoverageNote||source.coverageNote;
 source.coverageNote='18/18 referti acquisiti con eventi, statistiche di squadra e individuali. Dati preesistenti conservati; discrepanze archiviate nel report interno. Minuti stimati su tempo regolamentare; nessuna liquidazione certificata dedotta.';
 source.verifiedAt='2026-10-22';source.fixtures=source.fixtures.map(f=>reportUpdates.get(f.fixtureId)||f);
 source.detailedReportCoverage={fixtures:18,asOf:'2026-10-22',minutes:'estimated-regulation-time',settlements:'unchanged'};
 write(file,source);
}
for(const item of pendingRaw){const file=path.join(root,item.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(item.raw)));}
write('data/sources/champions-observed-performances-2026-27.json',{schemaVersion:1,competition:'UEFA Champions League',season:'2026-27',asOf:'2026-10-22',scope:'League phase MD1–MD3 observed match appearances; distinct from domestic statistics and pre-match forecasts',minutesMethod:'Estimated regulation time, capped at 90; no stoppage time imputed',performances});
write(currentPath,current);
write(auditBase+'/import-report.json',{...summaries,updatedPlayers,addedPlayers,unresolvedIdentities:[...unresolved.values()],statisticalConflicts:conflicts,rawFiles:pendingRaw.map(r=>r.file)});
console.log(JSON.stringify({...summaries,updatedPlayers,addedPlayers,unresolvedIdentities:unresolved.size,statisticalConflicts:conflicts.length},null,2));
