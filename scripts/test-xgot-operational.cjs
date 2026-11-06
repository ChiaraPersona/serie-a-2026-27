"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {predictScenario}=require('./predictions/engine.js');
const {contextFor}=require('./predictions/xgot-operational.cjs');
const {withEuropeanXgot}=require('./champions/xgot-result.cjs');
const input={homeTeam:{id:'home'},awayTeam:{id:'away'},homeSquad:{players:[]},awaySquad:{players:[]},
  homeProfile:{competition:'Serie A'},awayProfile:{competition:'Serie A'},leagueSummary:{homeGoalsPerMatch:1.4,awayGoalsPerMatch:1.1}};
const base=predictScenario(input);
const changed=predictScenario({...input,xgotContext:{status:'experimental-user-authorized',weight:.1,factors:[1.5,.7],sample:[20,20]}});
assert(changed.expected.home>base.expected.home);assert(changed.expected.away<base.expected.away);
assert(changed.expected.components.xgot.applied);assert.equal(changed.expected.components.xgot.statisticallyValidated,false);
const volumes=result=>result.teamProjections.map(({expectedGoals,...rest})=>rest);
assert.deepEqual(volumes(changed),volumes(base),'xGOT must not alter shot/SOT/corner/card/foul models');
const european={status:'PRELIMINARY',probabilities:{home:45,draw:30,away:25},statisticallyValidated:false};
const adjusted=withEuropeanXgot(european,changed.expected);
assert(adjusted.probabilities.home>european.probabilities.home);assert.equal(adjusted.statisticallyValidated,false);
assert(Math.abs(Object.values(adjusted.probabilities).reduce((n,v)=>n+v,0)-100)<1e-9);
assert.equal(withEuropeanXgot({...european,status:'INSUFFICIENT_DATA'},changed.expected).xgot,undefined,'xGOT cannot bypass missing European identities/history');
assert.deepEqual(predictScenario({...input,xgotContext:{status:'insufficient-data',weight:.1,factors:null}}).final,base.final);
assert.equal(contextFor({homeTeamId:'inter',awayTeamId:'como',date:'2026-11-08',generatedAt:new Date().toISOString(),eligible:false}).status,'not-applied');
assert.equal(contextFor({homeTeamId:'inter',awayTeamId:'como',date:'2026-11-08',generatedAt:'2026-11-03T12:00:00Z',eligible:true}).status,'not-applied','Activation must never affect an earlier as-of prediction');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const before=read('data/analysis/xgot/operational-before.json'),data=read('data/normalized/predictions.json'),ids=new Set(before.predictions.map(p=>p.matchId));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(JSON.stringify(data.predictions.filter(p=>!ids.has(p.matchId)))),before.nonMd11Hash,'Historical/unrelated predictions changed');
assert.equal(sha(fs.readFileSync('data/normalized/odds/sisal/serie-a.json')),before.savedOddsHash,'Provider odds changed');
const current=data.predictions.filter(p=>ids.has(p.matchId));
assert.equal(current.filter(p=>p.expectedGoals.components.xgot.applied).length,7);
for(const p of current){assert.equal(p.expectedGoals.components.xgot.statisticallyValidated,false);if(!p.expectedGoals.components.xgot.applied){const prior=before.predictions.find(q=>q.matchId===p.matchId);assert.equal(p.expectedGoals.home,prior.goals.home);assert.equal(p.expectedGoals.away,prior.goals.away)}}
const stats=read('data/generated/xgot-statistics.json');
for(const [id,periods] of Object.entries(stats.players))for(const [period,total]of Object.entries(periods)){
 const rows=stats.playerMatches[id].filter(r=>period==='total'||r.period===period);
 assert.equal(total.matches,rows.length);assert.equal(total.minutes,rows.reduce((n,r)=>n+r.minutes,0));
 assert(Math.abs(total.xgot-rows.reduce((n,r)=>n+r.xgot,0))<1e-9);
 assert(Math.abs(total.per90-total.xgot*90/total.minutes)<1e-9);
}
console.log('OK operational xGOT: authorized 10% goal effect, unchanged volume models, missing-data fallback, scoped MD11, unchanged quotes/history and observed statistical denominators');
