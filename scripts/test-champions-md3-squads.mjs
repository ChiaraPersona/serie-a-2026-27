import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {md3IndividualMarkets} from '../js/pages/champions-md3-individual-markets.mjs';
import {md3ProbableMarkup} from '../js/pages/champions-md3-probable.mjs';
const require=createRequire(import.meta.url),{poissonAtLeast}=require('./champions/md3-lineup-policy');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const squads=read('data/sources/champions-md03-squads-2026-27.json'),db=read('data/normalized/champions-md03-player-database-2026-27.json'),probable=read('data/sources/champions-probable-formations-md03-2026-27.json'),output=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
assert.equal(squads.teams.length,36);assert.equal(new Set(squads.teams.map(t=>t.teamId)).size,36);assert.equal(new Set(squads.teams.map(t=>t.fixtureId)).size,18);
assert.equal(squads.identityResolutions.length,15);assert.equal(new Set(squads.identityResolutions.map(p=>p.providerPlayerId)).size,15);
const allPlayers=squads.teams.flatMap(t=>t.players);
assert.equal(new Set(allPlayers.map(p=>p.stablePlayerId)).size,allPlayers.length);
const homonyms=allPlayers.filter(p=>p.playerId==='ruben-gomez');assert.equal(homonyms.length,2);assert.notEqual(homonyms[0].stablePlayerId,homonyms[1].stablePlayerId);assert.notEqual(homonyms[0].providerPlayerId,homonyms[1].providerPlayerId);
for(const c of squads.identityResolutions){
 const t=db.teams.find(t=>t.teamId===c.teamId),hits=t.players.filter(p=>p.playerId===c.playerId);
 assert.equal(hits.length,1);assert.equal(hits[0].providerPlayerId,c.providerPlayerId);assert(c.uefaPlayerId,`missing UEFA id ${c.alias}`);
 const tCurrent=output.fixtures.flatMap(f=>f.teams).find(t=>t.teamId===c.teamId);const p=tCurrent.players.find(p=>p.playerId===c.playerId)||t.players.find(p=>p.playerId===c.playerId);assert.equal(p.playerId,c.playerId);
}
for(const t of squads.teams){
 assert.equal(t.unmatchedProbableStarters.length,0);assert.equal(new Set(t.players.map(p=>p.playerId)).size,t.players.length);
 assert(t.players.every(p=>Number.isInteger(p.shirtNumber)&&p.role&&p.playerId));
 const pt=probable.teams.find(p=>p.teamId===t.teamId);assert.equal(pt.starters.length,11);
 const excluded=new Set(['starters','unavailable','suspended','doubtful']);assert(t.potentialBench.every(p=>!excluded.has(p.availability)));
 const ids=new Set(t.players.filter(p=>p.availability==='starters').map(p=>p.playerId));assert(t.potentialBench.every(p=>!ids.has(p.playerId)));
 for(const p of db.teams.find(x=>x.teamId===t.teamId).players){
  assert.equal(p.statistics,null);if(p.previousSeason)assert(p.historicalSource);
  if(p.primary.candidate){assert(p.historicalMinutes>0);assert(p.primary.candidate.sot<=p.primary.candidate.shots);}
 }
}
for(const f of output.fixtures){
 const html=md3ProbableMarkup(f);assert.equal((html.match(/data-md3-potential-bench/g)||[]).length,2);assert(!/https?:|<img|provenienza/i.test(html));
 for(const t of f.teams){
  const ids=new Set(t.players.map(p=>p.playerId).filter(Boolean));assert(t.potentialBench.every(p=>!ids.has(p.playerId)));
  assert(t.minuteBudget.allocatedExpectedMinutes<=990.1);
  for(const p of t.players){
   assert.equal(p.startingProbability,null);
   if(p.projectedShots===null)assert.equal(p.eventProbabilities,null);
   else if(p.projectedRole==='starter'){
    for(const [key,lambda,k] of [['shotsOver05',p.projectedShots,1],['shotsOver15',p.projectedShots,2],['shotsOver25',p.projectedShots,3],['sotOver05',p.projectedSOT,1],['sotOver15',p.projectedSOT,2]])assert.equal(p.eventProbabilities[key],poissonAtLeast(lambda,k));
   }
  }
 }
}
const selections=md3IndividualMarkets(output);assert(selections.every(s=>s.odds===null&&s.betSelection.evaluation.expectedValuePct===null));assert(selections.every(s=>s.threshold<=2));
console.log(JSON.stringify({status:'PASS',...output.summary,eligibleSquadPlayers:db.summary.players,selectedIndividualModelForecasts:selections.length,quotedIndividualRecommendations:0}));
