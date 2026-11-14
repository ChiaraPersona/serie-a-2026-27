// Read-only audit of existing outputs. Does not import acquisitions or builders.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {md3IndividualMarkets} from '../js/pages/champions-md3-individual-markets.mjs';
const require=createRequire(import.meta.url),{assessSuggestion}=require('./md06-suggested-forecasts');
const {poissonAtLeast}=require('./champions/md3-lineup-policy');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/normalized/champions-md03-probable-individuals-2026-27.json'),db=read('data/normalized/champions-md03-player-database-2026-27.json');
const probable=read('data/sources/champions-probable-formations-md03-2026-27.json'),squads=read('data/sources/champions-md03-squads-2026-27.json');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const revision=git('rev-parse','HEAD');assert.equal(git('merge-base','65f47d1c','HEAD'),git('rev-parse','65f47d1c'));
assert.equal(git('diff','HEAD','--name-only','--','data'),'','Canonical data changed during final audit');
const selections=md3IndividualMarkets(data);assert.equal(selections.length,48);
const unique=new Set(),subjects=new Set();
const rows=selections.map(s=>{
 const f=data.fixtures.find(f=>f.fixtureId===s.matchId),t=f.teams.find(t=>t.teamId===s.teamId),p=t.players.find(p=>p.playerId===s.playerId);
 assert(p);assert(!unique.has(s.selectionId));unique.add(s.selectionId);
 const subject=`${s.matchId}:${s.teamId}:${s.playerId}`;assert(!subjects.has(subject),'Multiple correlated thresholds/player');subjects.add(subject);
 assert.equal(p.projectedRole,'starter');assert.equal(p.availability,'probable-starter');assert(!p.blockers.length);
 assert(probable.teams.find(t=>t.teamId===s.teamId).starters.some(x=>x.playerId===p.playerId));
 assert(!t.potentialBench.some(x=>x.playerId===p.playerId));assert(!t.doubtful.some(x=>x.playerId===p.playerId));
 assert(p.expectedMinutes>0&&p.expectedMinutes<=90);assert(p.projectedShots>=p.projectedSOT);
 const lambda=s.marketFamily==='SOT'?p.projectedSOT:p.projectedShots;
 assert.equal(s.modelProbability,poissonAtLeast(lambda,s.threshold));
 const md3Minimum=s.threshold===2?.45:s.marketFamily==='SOT'?.35:.65;assert(s.modelProbability>=md3Minimum);
 const serieAThresholdMinimum=s.marketFamily==='SOT'?.4:s.threshold===2?.42:.58;
 const serieAMinutesMinimum=s.marketFamily==='SOT'?60:55;
 assert(s.modelProbability>=serieAThresholdMinimum&&p.expectedMinutes>=serieAMinutesMinimum);
 // Normalize only the audit descriptor to the Serie A assessor's vocabulary;
 // do not supply missing reliability, robust probabilities or quote evidence.
 const approval=assessSuggestion({...s,marketFamily:s.marketFamily==='SOT'?'Tiri in porta':'Tiri totali'});assert(!approval.eligible);assert.equal(s.odds,null);
 return {fixtureId:f.fixtureId,home:f.teams[0].team,away:f.teams[1].team,team:t.team,teamId:t.teamId,player:p.canonicalName||p.sourceName,playerId:p.playerId,providerPlayerId:p.providerPlayerId,market:s.marketFamily,threshold:s.threshold,probability:s.modelProbability,expectedMinutes:p.expectedMinutes,shots:p.projectedShots,sot:p.projectedSOT,lineup:p.availability,md3PreliminaryValid:true,serieANumericMinimumsPassed:true,serieAApprovalEligible:approval.eligible,approvalBlockers:approval.reasons};
});
const players=data.fixtures.flatMap(f=>f.teams.flatMap(t=>t.players)),projected=players.filter(p=>p.projectedShots!==null);
assert.equal(projected.length,248);assert.equal(data.summary.operationalPlayers,248);
for(const p of players){
 assert.equal(p.projectedShots===null,p.projectedSOT===null);
 if(p.projectedShots===null)assert.equal(p.eventProbabilities,null);
 else{assert(Number.isFinite(p.projectedShots)&&Number.isFinite(p.projectedSOT));assert(p.expectedMinutes>0);assert(!p.blockers.length);}
}
const identities=db.identityResolutions.map(c=>{
 const team=db.teams.find(t=>t.teamId===c.teamId),hits=team.players.filter(p=>p.playerId===c.playerId);assert.equal(hits.length,1);
 const p=hits[0];assert.equal(p.providerPlayerId,c.providerPlayerId);assert.equal(p.uefaPlayerId,c.uefaPlayerId);
 const roster=JSON.parse(zlib.gunzipSync(fs.readFileSync(c.rosterPath))).payload.athletes;
 assert.equal(roster.filter(a=>String(a.id)===c.providerPlayerId).length,1);
 const registry=squads.teams.find(t=>t.teamId===c.teamId).players.filter(p=>p.playerId===c.playerId);assert.equal(registry.length,1);
 for(const e of p.previousSeason?.entries||[]){
  if(e.providerPlayerId)assert.equal(String(e.providerPlayerId),c.providerPlayerId,`Wrong history owner ${c.alias}`);
  if(e.playerId)assert.equal(e.playerId,c.playerId,`Wrong canonical history owner ${c.alias}`);
  const id=e.sourceUrl?.match(/\/player\/(?:[^/]+\/)*id\/(\d+)/)?.[1];if(id)assert.equal(id,c.providerPlayerId);
 }
 return {...c,historyEntries:p.previousSeason?.entries?.length||0,historyMinutes:p.historicalMinutes,identityCheck:'PASS'};
});
assert.equal(identities.length,15);assert.equal(new Set(identities.map(c=>c.providerPlayerId)).size,15);
const distribution=data.fixtures.map(f=>({fixtureId:f.fixtureId,fixture:`${f.teams[0].team} – ${f.teams[1].team}`,selections:rows.filter(r=>r.fixtureId===f.fixtureId).length,teams:f.teams.map(t=>({team:t.team,selections:rows.filter(r=>r.fixtureId===f.fixtureId&&r.teamId===t.teamId).length}))}));
assert(distribution.every(f=>f.selections<=4&&f.teams.every(t=>t.selections<=2)));
const summary={validPreliminarySelections:rows.length,coveredFixtures:distribution.filter(f=>f.selections).length,coveredTeams:new Set(rows.map(r=>r.teamId)).size,projectedPlayers:projected.length,unprojectedPlayers:players.length-projected.length,identitiesVerified:identities.length,serieANumericMinimumsPassed:rows.filter(r=>r.serieANumericMinimumsPassed).length,serieAApprovedSelections:0,markets:rows.reduce((a,r)=>(a[`${r.market}:${r.threshold}`]=(a[`${r.market}:${r.threshold}`]||0)+1,a),{}),minimumExpectedMinutes:Math.min(...rows.map(r=>r.expectedMinutes)),canonicalDataUnchanged:true};
const result={summary,baselineRevision:revision,externalCommit:'65f47d1c',policy:'Preliminary conditional forecasts only. Serie A approval gates require verified contracts, robust probability, reliability and model validation; these are not supplied by the MD3 shortlist.',distribution,rows,identities};
const out='output/champions-md3-final-verification-20261020';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2)+'\n');
const columns=['fixtureId','home','away','team','player','playerId','market','threshold','probability','expectedMinutes','shots','sot','lineup','md3PreliminaryValid','serieANumericMinimumsPassed','serieAApprovalEligible'];
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'selections.csv'),'\uFEFF'+columns.join(',')+'\n'+rows.map(r=>columns.map(k=>csv(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary));
