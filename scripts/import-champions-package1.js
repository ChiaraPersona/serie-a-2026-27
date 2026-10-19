"use strict";
// Local statistical import only. No forecasts, odds, site builds or settlements.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert/strict');
const builder = require('./build-champions-player-stats');
const root = path.resolve(__dirname, '..');
const base = 'data/analysis/champions/package1-2026-10-19';
const sourcePath = 'data/sources/champions-package1-performances-2026-10-19.json';
const currentPath = 'data/normalized/champions-player-stats-2026-27.json';
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write = (p,d) => {fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');};
const audit = read(`${base}/row-audit.json`);
assert.equal(audit.length,817);
const replay=process.argv.includes('--replay');
const current = read(replay?`${base}/normalized-before.json`:currentPath);
if(!fs.existsSync(path.join(root,`${base}/normalized-before.json`)))write(`${base}/normalized-before.json`,current);
const ledger = !replay&&fs.existsSync(path.join(root,sourcePath)) ? read(sourcePath) : {schemaVersion:1,season:'2026/27',scope:'Domestic evidence for Champions registered players; not UEFA appearances',performances:[]};
const known = new Set(ledger.performances.map(r=>r.auditKey));
const approved = audit.filter(r=>r.disposition==='approved'&&!known.has(r.auditKey));
if (!approved.length) { console.log('No new approved performances; idempotent import.'); process.exit(0); }
const oldRows = builder.collectEspnRows({season:'2026-27',asOf:'2026-10-19'});
const byEvent = Map.groupBy(approved,r=>r.event_id);
// Validate everything before writing canonical files.
const pendingRaw=[];
for(const [id,rows] of byEvent){
  const evidence=read(`${base}/evidence/${id}.json`);
  const payload=structuredClone(evidence.payload);
  const ids=new Set(rows.map(r=>r.player_id_espn));
  payload.rosters=payload.rosters.map(t=>({...t,roster:t.roster.filter(p=>ids.has(String(p.athlete.id)))})).filter(t=>t.roster.length);
  pendingRaw.push({file:`data/raw/champions-pilot/espn/summaries/2026-27/${rows[0].league}/2026-10-19/${id}.json.gz`,raw:{season:'2026-27',league:rows[0].league,eventId:id,eventDate:rows[0].date,asOf:'2026-10-19',url:evidence.url,retrievedAt:evidence.retrievedAt,validation:{package:'package1-2026-10-19',status:'match-source-reverified',minutesStatus:'estimated',approvedPlayerIds:[...ids]},payload}});
}
const config=read('data/sources/champions-pilot-match-stats-2025-27.json');
const changedTeams=new Set(),changedPlayers=new Set();
// Feed the existing aggregation functions with old raw evidence plus approved rows.
for(const [playerKey,rows] of Map.groupBy(approved,r=>`${r.canonicalTeamId}|${r.canonicalPlayerId}`)){
  const team=current.teams.find(t=>t.id===rows[0].canonicalTeamId);
  const player=team.players.find(p=>p.id===rows[0].canonicalPlayerId);
  assert.equal(String(player.providerPlayerId),rows[0].player_id_espn);
  const oldIds=new Set((player.currentSeason?.entries||[]).flatMap(e=>e.matches||[]).map(m=>m.matchId));
  const rawRows=(oldRows.matchesByAthlete.get(player.providerPlayerId)||[]).filter(r=>oldIds.has(r.matchId));
  for(const r of rows){
    assert(!rawRows.some(x=>x.league===r.league&&x.matchId===r.event_id),'duplicate raw performance');
    const raw=pendingRaw.find(x=>x.raw.eventId===r.event_id).raw;
    const roster=raw.payload.rosters.find(t=>String(t.team.id)===team.espnTeamId);
    const row=roster.roster.find(p=>String(p.athlete.id)===player.providerPlayerId);
    const stats=Object.fromEntries(row.stats.map(s=>[s.name,s.value??null]));
    rawRows.push({league:r.league,teamId:team.espnTeamId,team:roster.team.displayName,name:row.athlete.fullName,row,stats,minutes:r.minutesEstimated,retrievedAt:raw.retrievedAt,matchId:r.event_id,date:r.date,sourceUrl:raw.url});
  }
  const entries=builder.aggregateEntries(player.providerPlayerId,player.position,rawRows,{detailed:true}).map(e=>({...e,playerId:player.id,season:'2026/27',asOf:'2026-10-19'}));
  const oldEntries=player.currentSeason?.entries||[];
  // Replace only competition buckets to which approved performances were added.
  const newMatchIds=new Set(rows.map(r=>r.event_id));
  const touched=entries.filter(e=>e.matches.some(m=>newMatchIds.has(m.matchId)));
  for(const e of oldEntries.filter(e=>touched.some(n=>n.competition===e.competition&&n.teamId===(e.teamId||(e.team===team.team?team.espnTeamId:null)))))for(const m of e.matches||[]){
    assert(touched.some(n=>n.competition===e.competition&&n.teamId===(e.teamId||(e.team===team.team?team.espnTeamId:null))&&n.matches.some(x=>x.matchId===m.matchId)),`lost historical evidence ${playerKey}/${m.matchId}`);
  }
  const merged=[...oldEntries.filter(e=>!touched.some(n=>n.competition===e.competition&&n.teamId===(e.teamId||(e.team===team.team?team.espnTeamId:null)))),...touched];
  for(const e of touched){
    e.minutesReliability={status:'includes-estimates',package1EstimatedAppearances:e.matches.filter(m=>newMatchIds.has(m.matchId)).length};
    e.matches=e.matches.map(m=>newMatchIds.has(m.matchId)?{...m,minutesStatus:'estimated',minutesEstimated:rows.find(r=>r.event_id===m.matchId).minutesEstimated,validationStatus:'match-source-reverified',package:'package1-2026-10-19'}:m);
  }
  const cfg=config.teams.find(t=>t.espnTeamId===team.espnTeamId);
  const same=merged.filter(e=>e.teamId===team.espnTeamId);
  // Preserve the established totals scope, including non-domestic baselines.
  const oldScope=player.currentSeason?.totalsScope;
  const primary=oldScope ? same.filter(e=>(!oldScope.competition||e.competition===oldScope.competition)&&e.competitionType===oldScope.competitionType) : cfg.baselineKind==='domestic'?same.filter(e=>e.competitionType==='domestic-league'):same.filter(e=>e.competitionType==='uefa-competition');
  player.currentSeason={...(player.currentSeason||{}),season:'2026/27',asOf:'2026-10-19',entries:merged,totals:builder.currentAggregate(primary),totalsScope:oldScope||{teamId:team.espnTeamId,competitionType:cfg.baselineKind==='domestic'?'domestic-league':'uefa-competition',evidenceMode:cfg.baselineKind},allEvidenceTotals:merged.length===primary.length?null:builder.currentAggregate(merged),totalsByCompetition:merged};
  player.dataQuality=primary.length?(primary.every(e=>e.dataQuality==='complete')?'complete':'partial'):'unavailable';
  player.otherEvidenceQuality=merged.every(e=>e.dataQuality==='complete')?'complete':'partial';
  changedTeams.add(team.id);changedPlayers.add(playerKey);
}
for(const item of pendingRaw){
  const target=path.join(root,item.file);
  if(fs.existsSync(target))assert.deepEqual(JSON.parse(zlib.gunzipSync(fs.readFileSync(target))),item.raw);
}
for(const item of pendingRaw){const target=path.join(root,item.file);if(fs.existsSync(target))continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,zlib.gzipSync(JSON.stringify(item.raw)));}
ledger.performances.push(...approved.map(r=>({...r,reliability:'match-source-reverified',competitionType:'domestic-league'})));
ledger.summary={performances:ledger.performances.length,players:new Set(ledger.performances.map(r=>r.canonicalPlayerId+'|'+r.canonicalTeamId)).size,teams:new Set(ledger.performances.map(r=>r.canonicalTeamId)).size,minutesObserved:0,minutesEstimated:ledger.performances.filter(r=>r.minutesStatus==='estimated').length};
write(sourcePath,ledger);
current.package1Import={source:sourcePath,asOf:'2026-10-19',...ledger.summary};
current.asOf='2026-10-19';current.cutoffDate='2026-10-19';current.dateInterval.to='2026-10-19';
current.retrievedAt=approved.map(r=>r.evidenceRetrievedAt).sort().at(-1);
current.generatedAt=new Date().toISOString();
current.selection={teams:[...changedTeams],league:null};
current.merge={mode:'preserve-unselected-players-and-competitions',preservedTeams:current.teams.filter(t=>!changedTeams.has(t.id)).map(t=>t.id)};
const allPlayers=current.teams.flatMap(t=>t.players);
for(const team of current.teams.filter(t=>changedTeams.has(t.id))){
  team.asOf='2026-10-19';
  current.teamSnapshots[team.id]={...current.teamSnapshots[team.id],asOf:'2026-10-19',retrievedAt:approved.filter(r=>r.canonicalTeamId===team.id).map(r=>r.evidenceRetrievedAt).sort().at(-1),status:'updated-individual-package1',source:sourcePath};
  team.package1IndividualEvidence={source:sourcePath,asOf:'2026-10-19',performances:approved.filter(r=>r.canonicalTeamId===team.id).length};
  team.summary={...team.summary,withMinutes:team.players.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,complete:team.players.filter(p=>p.dataQuality==='complete').length,partial:team.players.filter(p=>p.dataQuality==='partial').length,unavailable:team.players.filter(p=>p.dataQuality==='unavailable').length};
}
current.summary={...current.summary,withMinutes:allPlayers.filter(p=>(p.currentSeason?.totals?.minutes??0)>0).length,complete:allPlayers.filter(p=>p.dataQuality==='complete').length,partial:allPlayers.filter(p=>p.dataQuality==='partial').length,unavailable:allPlayers.filter(p=>p.dataQuality==='unavailable').length,sourceMatchesWithRosters:current.summary.sourceMatchesWithRosters+pendingRaw.length};
write(currentPath,current);
write(`${base}/import-result.json`,{imported:approved.length,players:changedPlayers.size,teams:changedTeams.size,rawFiles:pendingRaw.map(x=>x.file),sourcePath,currentPath});
console.log(JSON.stringify({imported:approved.length,players:changedPlayers.size,teams:changedTeams.size}));
