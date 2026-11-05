import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {settleMd3Leg} from '../js/pages/champions-md3-results.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const file='data/sources/champions-results-md04-2026-27.json',results=read(file);
const before=structuredClone(results.fixtures),calendar=read('data/normalized/champions-league-2026-27.json');
const catalog=read('data/normalized/schedina-champions-md04.json');
const database=read('data/normalized/champions-md04-player-database-2026-27.json');
const identities=new Map(database.teams.flatMap(t=>t.players.filter(p=>p.providerPlayerId&&p.playerId).map(p=>[t.teamId+'|'+p.providerPlayerId,p.playerId])));
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const stats=rows=>Object.fromEntries((rows||[]).map(s=>[s.name,number(s.value??s.displayValue)]));
const jobs=read('data/raw/champions-results/2026-11-05/manifest.json').jobs;
for(const job of jobs){
 const raw=readRaw(job.rawPath),d=raw.payload,competition=d.header.competitions[0];
 const fixture=calendar.fixtures.find(f=>f.id===job.fixtureId);assert(fixture);assert(competition.status.type.completed);assert.equal(competition.date.slice(0,10),'2026-11-04');
 const sides=Object.fromEntries(['home','away'].map(s=>[s,competition.competitors.find(c=>c.homeAway===s)]));
 const teamId=s=>job[s+'TeamId'];
 const ref=(side,p)=>({player:p?.displayName||p?.fullName||null,providerPlayerId:p?.id?String(p.id):null,playerId:identities.get(teamId(side)+'|'+p?.id)||null});
 const sideFor=id=>['home','away'].find(s=>sides[s].id===String(id));
 const report={fixtureId:fixture.id,status:'finished',score:Object.fromEntries(['home','away'].map(s=>[s,number(sides[s].score)])),sourceUrl:job.sourceUrl,rawPath:job.rawPath,statistics:{},playerEvidence:[],observedSubstitutions:[],goalEvents:[],bookingEvents:[],actualLineups:{}};
 const teamStats=Object.fromEntries(['home','away'].map(s=>[s,stats(d.boxscore.teams.find(t=>t.team.id===sides[s].id).statistics)]));
 report.observedTeamStatistics=teamStats;
 const halves=['home','away'].map(s=>number(sides[s].linescores?.[0]?.displayValue));
 report.halfTimeScore=halves.every(v=>v!==null)?{home:halves[0],away:halves[1]}:null;
 for(const [key,field] of Object.entries({shots:'totalShots',shotsOnTarget:'shotsOnTarget',corners:'wonCorners',fouls:'foulsCommitted',yellowCards:'yellowCards',redCards:'redCards',possession:'possessionPct'}))report.statistics[key]=['home','away'].map(s=>teamStats[s][field]??null);
 for(const side of ['home','away']){
  const roster=d.rosters.find(r=>r.team.id===sides[side].id);assert.equal(roster.roster.filter(r=>r.starter).length,11);
  for(const row of roster.roster){
   const statistics=stats(row.stats),p={...ref(side,row.athlete),team:side,teamId:teamId(side),fixtureId:fixture.id,eventId:job.eventId,date:fixture.date,sourceUrl:job.sourceUrl,starter:row.starter===true,statistics};
   const minute=e=>{const n=String(e?.clock?.displayValue||'').match(/^\d+/);return n?Math.min(90,Number(n[0])):null};
   const subs=(row.plays||[]).filter(e=>e.substitution),dismissal=(row.plays||[]).find(e=>e.redCard);
   const start=row.starter?0:row.subbedIn?minute(subs[0]):null;
   const end=row.subbedOut?minute(subs.at(-1)):dismissal?minute(dismissal):90;
   p.minutes=statistics.appearances===0?0:start!==null&&end!==null&&end>=start?end-start:null;
   p.minutesStatus=statistics.appearances===0?'did-not-play':p.minutes===null?'unavailable':'estimated-regulation-time';
   const shots=(d.commentary||[]).filter(c=>/^(shot-|goal($|---)|penalty---scored)/.test(c.play?.type?.type||'')&&c.play.participants?.[0]?.athlete?.displayName===row.athlete.displayName);
   const uniqueName=d.rosters.flatMap(r=>r.roster).filter(r=>r.athlete.displayName===row.athlete.displayName).length===1;
   const target=shots.filter(c=>/^(shot-on-target|goal($|---)|penalty---scored)/.test(c.play.type.type)).length;
   if(uniqueName&&shots.length===statistics.totalShots&&target===statistics.shotsOnTarget&&new Set(shots.map(c=>c.play.id)).size===shots.length){p.statistics.hitWoodwork=shots.filter(c=>c.play.type.type==='shot-hit-woodwork').length;p.shotEventIds=shots.map(c=>c.play.id);}
   report.playerEvidence.push(p);
  }
  report.actualLineups[side]={teamId:teamId(side),formation:roster.formation,players:report.playerEvidence.filter(p=>p.team===side).map(({statistics,...p})=>p)};
  for(const metric of ['totalShots','shotsOnTarget'])assert.equal(report.playerEvidence.filter(p=>p.team===side&&p.statistics.appearances===1).reduce((n,p)=>n+p.statistics[metric],0),teamStats[side][metric]);
 }
 for(const e of d.keyEvents||[]){
  const side=sideFor(e.team?.id);if(!side)continue;
  const participants=(e.participants||[]).map(p=>{const r=d.rosters.find(r=>r.roster.some(row=>row.athlete.id===p.athlete.id));return ref(r?sideFor(r.team.id):side,p.athlete)});
  const event={eventId:e.id,team:side,teamId:teamId(side),minute:e.clock?.displayValue,...participants[0]};
  if(e.type.type==='substitution'){assert(participants.length===2);report.observedSubstitutions.push({...event,playerIn:participants[0].player,playerInId:participants[0].playerId,playerInProviderId:participants[0].providerPlayerId,playerOut:participants[1].player,playerOutId:participants[1].playerId,playerOutProviderId:participants[1].providerPlayerId});}
  if(e.scoringPlay)report.goalEvents.push({...event,ownGoal:e.ownGoal===true||e.type.type==='own-goal',assistPlayerId:participants[1]?.playerId||null});
  if(/^(yellow-card|red-card|yellow-red-card|second-yellow-card)$/.test(e.type.type))report.bookingEvents.push({...event,eventType:e.type.type});
 }
 assert.equal(report.goalEvents.length,report.score.home+report.score.away);
 report.scorers=Object.fromEntries(['home','away'].map(side=>[side,report.goalEvents.filter(e=>e.team===side).map(e=>e.player)]));
 report.observedStatistics=report.statistics;
 const adapted={...fixture,matchday:3,status:'finished',score:report.score,matchReport:report};
 report.verifiedSelections=catalog.marketCatalog.matches.find(m=>m.matchId===fixture.id).selections.map(leg=>{
  const settlement=settleMd3Leg(leg,adapted);
  const primary=report.playerEvidence.find(p=>p.playerId&&p.playerId===leg.playerId);
  const sub=primary&&report.observedSubstitutions.find(s=>s.playerOutProviderId===primary.providerPlayerId);
  const substitute=sub&&report.playerEvidence.find(p=>p.providerPlayerId===sub.playerInProviderId);
  const observed=p=>p?{playerId:p.playerId,providerPlayerId:p.providerPlayerId,player:p.player,starter:p.starter,shots:p.statistics.totalShots??null,shotsOnTarget:p.statistics.shotsOnTarget??null,hitWoodwork:p.statistics.hitWoodwork??null,shotEventIds:p.shotEventIds||null}:null;
  return {selectionId:leg.selectionId,providerSelectionId:leg.betSelection.identity.providerSelectionId,market:leg.market,selection:leg.selection,label:leg.label,playerId:leg.playerId||null,threshold:leg.betSelection.market.threshold??null,settlement:{...settlement,basis:'STATISTICAL_VERIFICATION',officiallySettled:false,sourceUrl:job.sourceUrl},observed:primary?{primary:observed(primary),substitute:observed(substitute)}:null};
 });
 const old=results.fixtures.findIndex(f=>f.fixtureId===fixture.id);if(old>=0)results.fixtures[old]=report;else results.fixtures.push(report);
}
assert.deepEqual(results.fixtures.filter(f=>!jobs.some(j=>j.fixtureId===f.fixtureId)),before.filter(f=>!jobs.some(j=>j.fixtureId===f.fixtureId)));
assert.equal(results.fixtures.length,18);results.verifiedAt=new Date().toISOString();
results.coverageNote='18/18 gare concluse. Esiti verificati statisticamente per i contratti con evidenza sufficiente; gli altri restano da verificare. Nessuna liquidazione certificata.';
fs.writeFileSync(file,JSON.stringify(results,null,2)+'\n');
// Reuse the canonical aggregation helpers, replacing only the Champions bucket
// for the eighteen teams updated here. Domestic entries and forecast inputs stay intact.
const require=createRequire(import.meta.url),builder=require('./build-champions-player-stats.js');
const currentFile='data/normalized/champions-player-stats-2026-27.json',current=read(currentFile);
const espn=builder.collectEspnRows({season:'2026-27',asOf:'2026-11-04'});
const selectedTeams=new Set(jobs.flatMap(j=>[j.homeTeamId,j.awayTeamId]));
for(const team of current.teams.filter(t=>selectedTeams.has(t.id))){
 for(const player of team.players){
  if(!player.providerPlayerId)continue;
  const rows=(espn.matchesByAthlete.get(String(player.providerPlayerId))||[]).filter(r=>r.league==='uefa.champions'&&String(r.teamId)===String(team.espnTeamId));
  for(const job of jobs.filter(j=>j.homeTeamId===team.id||j.awayTeamId===team.id)){
   const raw=readRaw(job.rawPath),roster=raw.payload.rosters.find(r=>String(r.team.id)===String(team.espnTeamId));
   const row=roster?.roster.find(r=>String(r.athlete.id)===String(player.providerPlayerId));
   const p=results.fixtures.find(f=>f.fixtureId===job.fixtureId).playerEvidence.find(p=>p.teamId===team.id&&p.providerPlayerId===String(player.providerPlayerId));
   if(!row||p?.statistics.appearances!==1)continue;
   const previous=rows.findIndex(r=>r.matchId===job.eventId);if(previous>=0)rows.splice(previous,1);
   rows.push({league:'uefa.champions',teamId:String(team.espnTeamId),team:roster.team.displayName,row,stats:p.statistics,minutes:p.minutes,retrievedAt:raw.retrievedAt,matchId:job.eventId,date:'2026-11-04',sourceUrl:job.sourceUrl});
  }
  if(!rows.some(r=>jobs.some(j=>j.eventId===r.matchId)))continue;
  const entries=builder.aggregateEntries(String(player.providerPlayerId),player.position,rows,{detailed:true}).map(e=>({...e,playerId:player.id,season:'2026/27',asOf:'2026-11-04',minutesReliability:{status:'includes-estimates',method:'regulation-time-from-lineup-substitution-and-dismissal-events'}}));
  const old=player.currentSeason,domestic=(old?.entries||[]).filter(e=>!(e.competition==='UEFA Champions League'&&String(e.teamId)===String(team.espnTeamId))),merged=[...domestic,...entries];
  const scope=old?.totalsScope||{teamId:team.espnTeamId,competitionType:'uefa-competition',competition:'UEFA Champions League'};
  const primary=merged.filter(e=>String(e.teamId)===String(scope.teamId)&&e.competitionType===scope.competitionType&&(!scope.competition||e.competition===scope.competition));
  player.currentSeason={...old,season:'2026/27',asOf:'2026-11-04',entries:merged,totals:primary.some(e=>entries.includes(e))?builder.currentAggregate(primary):old?.totals,totalsScope:scope,allEvidenceTotals:builder.currentAggregate(merged),totalsByCompetition:merged};
  player.championsObserved={asOf:'2026-11-04',matchdays:[1,2,3,4],totals:builder.currentAggregate(entries),matches:entries.flatMap(e=>e.matches),minutesStatus:'includes-estimates'};
 }
 team.championsObservedAsOf='2026-11-04';
}
fs.writeFileSync(currentFile,JSON.stringify(current,null,2)+'\n');
console.log(JSON.stringify(jobs.map(j=>{const f=results.fixtures.find(f=>f.fixtureId===j.fixtureId);return {fixtureId:f.fixtureId,score:f.score,selections:f.verifiedSelections.reduce((a,r)=>(a[r.settlement.status]=(a[r.settlement.status]||0)+1,a),{})}})));
function readRaw(p){return JSON.parse(zlib.gunzipSync(fs.readFileSync(p)))}
