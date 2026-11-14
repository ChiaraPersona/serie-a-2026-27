"use strict";
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),zlib=require('zlib');
const {evaluate,verifyAekBuilderCompatibility}=require('./champions/offline-collective');
const {canonicalTeam,TEAM_ONLY,exactPlayer,rateCandidate,projectDocumentedTeam}=require('./champions/current-season-offline');
const {collectEspnRows}=require('./build-champions-player-stats');
const context=require('./champions/context-adjusted-player-baseline');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/analysis/champions/md3-offline-engine-2026-10-19');
const read=p=>storageReadJson(path.join(root,p));
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
fs.mkdirSync(out,{recursive:true});
const code=fs.readFileSync(path.join(root,'scripts/build-champions-pilot-predictions.js'),'utf8');
let compatibility,collective;
if(process.argv.includes('--reuse-collective')){
 const crypto=require('crypto'),before=read('data/analysis/champions/md3-offline-engine-2026-10-19/protected-before.json');
 for(const file of ['data/sources/champions-pilot-match-stats-2025-27.json','data/normalized/champions-league-2026-27.json','data/normalized/champions-history-2023-26.json','data/normalized/champions-1x2-2026-27.json','data/normalized/champions-motivation-md01-2026-27.json','data/normalized/odds/sisal/champions-league.json','scripts/build-champions-pilot-predictions.js','scripts/champions/context-adjusted-player-baseline.js'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),before[file],`stale collective cache ${file}`);
 compatibility=read('data/analysis/champions/md3-offline-engine-2026-10-19/aek-compatibility.json');
 collective=read('data/analysis/champions/md3-offline-engine-2026-10-19/collective-baseline-md03.json');
}else{
 compatibility=verifyAekBuilderCompatibility();write('aek-compatibility.json',compatibility);
 collective=evaluate(code,3);write('collective-baseline-md03.json',collective);
}
const current=read('data/normalized/champions-player-stats-2026-27.json');
const history=read('data/normalized/champions-player-stats-2025-26.json');
const squads=read('data/normalized/champions-registered-squads-2026-27.json');
const calendar=read('data/normalized/champions-league-2026-27.json');
const source=read('data/sources/champions-pilot-match-stats-2025-27.json');
const strength=read('data/normalized/champions-team-strength-2026-27.json');
const registry=read('data/analysis/champions/md3-readiness-2026-10-19/md3-preparation-manifest.json');
const package1Keys=new Set(read('data/sources/champions-package1-performances-2026-10-19.json').performances.map(r=>[r.league,r.event_id,r.player_id_espn].join('|')));
const rows=collectEspnRows({season:'2026-27',asOf:'2026-10-19'});
const neutral=context.neutralStrength(strength.teams),direct=new Map(strength.teams.map(t=>[t.team,t.europeanStrengthIndex]));
const scoreboards=new Map();
function standings(league){
 if(scoreboards.has(league))return scoreboards.get(league);
 const dir=path.join(root,'data/raw/champions-pilot/espn/scoreboards/2026-27',league);let chosen=null;
 if(fs.existsSync(dir))for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json.gz'))){
  const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,file))));
  const cutoff=raw.asOf||file.match(/as-of-(\d{4}-\d{2}-\d{2})/)?.[1];
  if(cutoff&&cutoff<='2026-10-19'&&raw.retrievedAt&&raw.retrievedAt<'2026-10-20'&&(!chosen||cutoff>chosen.cutoff))chosen={cutoff,raw};
 }
 const result=chosen?context.buildStandings(chosen.raw.payload?.events||[],{from:'2026-07-01',asOf:chosen.cutoff}):{rows:[],leagueAveragePointsPerMatch:null};
 scoreboards.set(league,result);return result;
}
const matchIndex=new Map(source.matches.filter(m=>m.season==='2026-27').map(m=>[m.eventId,m]));
function opponent(row){
 const m=matchIndex.get(row.matchId);
 if(m){const s=m.home.providerTeamId===row.teamId?m.away:m.away.providerTeamId===row.teamId?m.home:null;if(s)return {team:s.name,providerTeamId:s.providerTeamId};}
 const file=path.join(root,'data/analysis/champions/package1-2026-10-19/evidence',row.matchId+'.json');
 if(fs.existsSync(file)){const d=storageReadJson(file);const other=d.payload.header.competitions[0].competitors.find(t=>String(t.id)!==row.teamId);if(other)return {team:other.team.displayName,providerTeamId:String(other.id)};}
 return null;
}
const forecasts=[],identityMappings=[];let excludedFuture=0,excludedOutsideCurrent=0;
for(const f of calendar.fixtures.filter(f=>f.matchday===3)){
 const baseline=collective.fixtures.find(x=>x.fixtureId===f.id);assert(baseline);
 const readiness=registry.fixtures.find(x=>x.fixtureId===f.id);const teamRows=[];
 for(const venue of ['home','away']){
  const name=f[venue+'Team'],team=current.teams.find(t=>t.team===name);assert(team);
  const id=canonicalTeam(team.id),historic=history.teams.find(t=>canonicalTeam(t.id)===id),reg=squads.teams.find(t=>canonicalTeam(t.id)===id);assert(historic&&reg);
  const cfg=source.teams.find(t=>t.id===id);assert(cfg);
  identityMappings.push({fixtureId:f.id,teamId:id,historicalTeamId:historic.id,registeredTeamId:reg.id});
  const collectiveOnly=TEAM_ONLY.has(id),players=[];
  if(!collectiveOnly)for(const player of team.players){
   if(player.position==='goalkeeper')continue;
   const registered=reg.players.find(p=>p.id===player.id||(player.providerPlayerId&&String(p.providerIds?.espn)===String(player.providerPlayerId)));
   const joined=exactPlayer(historic.players,player);
   const allowedIds=new Set((player.currentSeason?.entries||[]).flatMap(e=>e.matches||[]).map(m=>String(m.matchId)));
   const historicalIds=new Set((joined.player?.previousSeason?.entries||[]).flatMap(e=>e.matches||[]).map(m=>String(m.matchId)));
   const selected=[];let overlap=0;
   for(const r of rows.matchesByAthlete.get(player.providerPlayerId)||[]){
    if(!allowedIds.has(r.matchId)||r.teamId!==team.espnTeamId){excludedOutsideCurrent++;continue;}
    if(!r.date||r.date>='2026-10-20'||!r.retrievedAt||r.retrievedAt>='2026-10-20'){excludedFuture++;continue;}
    if(historicalIds.has(r.matchId)){overlap++;continue;}
    const observed=['minutesPlayed','minutes','timePlayed'].map(k=>r.stats[k]).find(v=>Number.isFinite(v)&&v>0);
    selected.push({league:r.league,matchId:r.matchId,providerPlayerId:player.providerPlayerId,minutes:observed??r.minutes,minutesQuality:observed!==undefined?'observed':'estimated-or-uncertified',shots:r.stats.totalShots,sot:r.stats.shotsOnTarget,date:r.date,retrievedAt:r.retrievedAt,raw:r});
   }
   const domestic=selected.filter(r=>!r.league.startsWith('uefa.'));
   const fallback=context.deriveLeagueStrengthFallback(cfg.league,source.teams,strength.teams);let total=0,weighted=0,contextMissing=0;
   for(const r of domestic){const op=opponent(r.raw);if(!op){contextMissing++;continue;}const s=context.opponentStrength({opponent:op,standings:standings(r.league),directStrengthByTeam:direct,leagueFallback:fallback.value,neutralFallback:neutral});if(s.value!==null&&r.minutes>0){total+=r.minutes;weighted+=r.minutes*s.value;}}
   const contextFactor=total?context.transferFactor(weighted/total,neutral):1;
   const eligibleRows=contextMissing?selected.filter(r=>r.league.startsWith('uefa.')):selected;
   const primary=rateCandidate({historical:joined.player,role:player.position,rows:eligibleRows,contextFactor});
   const sensitivity=rateCandidate({historical:joined.player,role:player.position,rows:eligibleRows,contextFactor,includeEstimated:true});
   const sensitivityWithoutPackage1=rateCandidate({historical:joined.player,role:player.position,rows:eligibleRows.filter(r=>!package1Keys.has([r.league,r.matchId,r.providerPlayerId].join('|'))),contextFactor,includeEstimated:true});
   const noCurrent=rateCandidate({historical:joined.player,role:player.position,rows:eligibleRows,contextFactor,disableCurrent:true});
   assert.deepEqual(noCurrent.candidate,noCurrent.old);
   const formation=f.probableFormation?.[venue];
   const blockers=['MD3_LINEUP_AND_BENCH_UNDOCUMENTED','EXPECTED_MINUTES_UNAVAILABLE'];
   if(!registered)blockers.push('UNRESOLVED_REGISTERED_ID');if(!player.providerPlayerId)blockers.push('PROVIDER_ID_MISSING');
   if(overlap)blockers.push('HISTORICAL_CURRENT_OVERLAP');if(primary.status.startsWith('blocked'))blockers.push(primary.status);
   if(contextMissing)blockers.push('DOMESTIC_CONTEXT_INCOMPLETE_CHANNEL_EXCLUDED');
   if(formation?.players?.length||formation?.bench?.length)blockers.push('LINEUP_AVAILABLE_REQUIRES_EXACT_ID_MINUTES_GATE');
   players.push({playerId:player.id,providerPlayerId:player.providerPlayerId,registeredPlayerId:registered?.id||null,name:player.name,role:player.position,identityJoin:joined.method,historicalMinutes:joined.player?.previousSeason?.totals?.minutes??null,historyLabel:(joined.player?.previousSeason?.totals?.minutes??0)>=700?'verified-history':'limited-history',primary,sensitivity,sensitivityWithoutPackage1,sample:{rows:selected.length,observed:selected.filter(r=>r.minutesQuality==='observed').length,estimated:selected.filter(r=>r.minutesQuality!=='observed').length,overlap},expectedMinutes:null,availability:null,projectedShots:null,projectedSOT:null,eventProbabilities:null,selectionIds:[],blockers});
  }
  const tp=baseline.teamProjections.find(t=>t.venue===venue);
  if(id==='sabah'){assert.equal(tp.shotsTotal,null);assert.equal(tp.shotsOnTarget,null);}
  const projectionGate=projectDocumentedTeam({teamId:id,players:[],lineupVerified:false,benchVerified:false,targetShots:tp.shotsTotal?.central,targetSOT:tp.shotsOnTarget?.central});
  teamRows.push({teamId:id,team:name,venue,mode:collectiveOnly?'collective-only':'individual-candidate-offline',individuals:players,expectedMinuteBudget:null,reconciliation:{...projectionGate,shotsDifference:null,sotDifference:null},teamProjection:tp});
 }
 forecasts.push({fixtureId:f.id,date:f.date,home:f.homeTeam,away:f.awayTeam,collective:baseline,teams:teamRows,marketsBlocked:['player-shots','player-sot','player-card','player-goals','player-assists','DUO','substitutes'],reasons:['NO_DOCUMENTED_MD3_LINEUP_OR_BENCH','NO_DOCUMENTED_EXPECTED_MINUTES','CANDIDATE_NOT_CALIBRATED_OUT_OF_SAMPLE'],providerContractsAvailable:readiness.odds,refereeStatisticsApplied:false});
}
const players=forecasts.flatMap(f=>f.teams.flatMap(t=>t.individuals));
const diff=(p,variant,key)=>p[variant].candidate&&p[variant].old?p[variant].candidate[key]-p[variant].old[key]:null;
const finite=xs=>xs.filter(Number.isFinite),mean=xs=>xs.length?xs.reduce((s,v)=>s+v,0)/xs.length:null;
const comparison={};
for(const variant of ['primary','sensitivity']){
 const valid=players.filter(p=>p[variant].candidate);
 const deltas=key=>finite(valid.map(p=>Math.abs(diff(p,variant,key))));
 comparison[variant]={players:valid.length,changedPlayers:valid.filter(p=>Math.abs(diff(p,variant,'shots'))>1e-10||Math.abs(diff(p,variant,'sot'))>1e-10).length,meanAbsoluteShotsPer90Delta:mean(deltas('shots')),meanAbsoluteSOTPer90Delta:mean(deltas('sot')),maxShotsPer90Delta:Math.max(0,...deltas('shots')),maxSOTPer90Delta:Math.max(0,...deltas('sot'))};
}
const output={schemaVersion:1,kind:'isolated-md3-offline-preview',productionEnabled:false,matchday:3,cutoff:'2026-10-19',qualityPolicy:'Observed-only primary; estimated/uncertified minutes have weight zero in primary. Estimated-inclusive sensitivity uses existing AEK weights only and is not eligible for forecasts.',calibrationStatus:'NOT_VALIDATED_NO_MD3_ACTUALS_OR_NEW_WALK_FORWARD_SAMPLE',compatibility,comparison,summary:{fixtures:forecasts.length,teams:36,individualTeams:32,players:players.length,observedRows:players.reduce((s,p)=>s+p.sample.observed,0),estimatedRows:players.reduce((s,p)=>s+p.sample.estimated,0),matchSpecificIndividualForecasts:0,excludedFuture,excludedOutsideCurrent},fixtures:forecasts};
write('identity-mappings.json',identityMappings);write('preview-md03.json',output);write('comparison.json',comparison);
console.log(JSON.stringify({summary:output.summary,comparison}));
