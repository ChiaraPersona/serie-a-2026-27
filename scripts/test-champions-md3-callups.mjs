import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {md3ProbableMarkup} from '../js/pages/champions-md3-probable.mjs';
const require=createRequire(import.meta.url),{derivePredictedBench,projectMd3Team,allocateMinuteBudget,poissonAtLeast}=require('./champions/md3-lineup-policy'),{estimateExpectedMinutes}=require('./champions/substitute-minutes');
const read=p=>JSON.parse(fs.readFileSync(p));
const probable={fixtureId:'target',teamId:'target',starters:[{playerId:'a'}],unavailable:[{playerId:'injured'}],suspended:[{playerId:'suspended'}],doubtful:[{playerId:'doubt'}]};
const callups={fixtureId:'target',teamId:'target',status:'documented',source:{scope:'match-specific-callups',complete:true,url:'internal-test'},players:['a','b','injured','suspended','doubt'].map(playerId=>({playerId,sourceName:playerId}))};
assert.equal(derivePredictedBench(probable,null).bench,null);assert.deepEqual(derivePredictedBench(probable,callups).bench.map(p=>p.playerId),['b']);assert.equal(derivePredictedBench(probable,callups).doubtful.length,1);assert.equal(derivePredictedBench(probable,callups).excluded.length,2);
assert.throws(()=>derivePredictedBench(probable,{...callups,source:{...callups.source,scope:'season-registered-squad'}}));assert.throws(()=>derivePredictedBench(probable,{...callups,fixtureId:'another'}));assert.throws(()=>derivePredictedBench(probable,{...callups,players:[...callups.players,callups.players[0]]}));
const args={teamId:'liverpool',players:[{playerId:'a',roleKey:'forward',expectedMinutes:90,per90:{shots:2,shotsOnTarget:1}}],targetShots:2,targetSOT:1};
assert.equal(projectMd3Team({...args,mode:'probable',documentation:{probableXI:true,matchCallups:true,predictedBench:true,officialBench:false}}).players.length,1);
assert.equal(projectMd3Team({...args,mode:'official',documentation:{officialXI:true,officialBench:true}}).players.length,1);
assert.equal(projectMd3Team({...args,mode:'official',documentation:{probableXI:true,matchCallups:true,predictedBench:true}}).players.length,0);
assert.equal(projectMd3Team({...args,mode:'probable',documentation:{probableXI:false}}).status,'blocked-match-callups-undocumented');
assert.equal(projectMd3Team({...args,teamId:'sabah',mode:'probable',documentation:{probableXI:true,matchCallups:true,predictedBench:true}}).status,'blocked-collective-only');
const budget=Array.from({length:12},()=>({expectedMinutes:90}));const allocation=allocateMinuteBudget(budget);assert.equal(allocation.rawExpectedMinutes,1080);assert.equal(allocation.allocatedExpectedMinutes,990);
assert.equal(estimateExpectedMinutes([],'potential-substitute','2026-10-20T19:00:00Z').expectedMinutes,null);
const code=fs.readFileSync('scripts/build-champions-player-markets.js','utf8').match(/const poissonAtLeast = \(lambda, threshold\) => \{[\s\S]*?\n\};/)[0];const reference=vm.runInNewContext(`${code};poissonAtLeast`,{Math,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))});for(const lambda of [0,.3,1,2.5,6])for(const k of [1,2])assert.equal(poissonAtLeast(lambda,k),reference(lambda,k));
const data=read('data/normalized/champions-md03-probable-individuals-2026-27.json'),source=read('data/sources/champions-callups-md03-2026-27.json'),teams=data.fixtures.flatMap(f=>f.teams),players=teams.flatMap(t=>t.players);
assert.equal(source.teams.length,36);assert.equal(teams.filter(t=>t.callupDocumentation.documented).length,3);assert.equal(players.filter(p=>p.projectedRole==='starter').length,396);assert.equal(players.filter(p=>p.projectedRole==='bench').length,data.summary.predictedBench);
for(const t of teams){
 const produced=t.players.filter(p=>p.projectedShots!==null);
 assert(t.minuteBudget.allocatedExpectedMinutes<=990);assert(t.players.every(p=>p.roleCertainty==='probable'&&p.lineupStatus==='probable'));
 if(!t.callupDocumentation.documented){assert.equal(t.bench,null);assert(t.players.every(p=>p.projectedRole==='starter'));}
 if(t.collectiveOnly)assert(t.players.every(p=>p.projectedShots===null&&p.expectedMinutes===null));
 if(produced.length){assert(Math.abs(produced.reduce((n,p)=>n+p.projectedShots,0)-t.reconciliation.targetShots)<=.020001);assert(Math.abs(produced.reduce((n,p)=>n+p.projectedSOT,0)-t.reconciliation.targetSOT)<=.020001);}
 for(const p of t.players){
  assert(!['unavailable','suspended'].includes(p.availability));if(p.availability==='doubtful'||!p.playerId){assert.equal(p.expectedMinutes,null);assert.equal(p.projectedShots,null);}
  if(p.expectedMinutes!==null){const f=data.fixtures.find(f=>f.teams.includes(t));assert.equal(estimateExpectedMinutes(p.minutesEstimate.evidence,p.projectedRole==='bench'?'potential-substitute':'starter',f.kickoffAt).expectedMinutes,p.minutesEstimate.expectedMinutes);if(p.projectedRole==='bench'){assert(p.minutesEstimate.sample.namedBenchAppearances>=3);assert(p.minutesEstimate.sample.exactSubstituteEntries>=2);}}
  if(p.projectedShots!==null){assert(p.expectedMinutes>0);assert(p.projectedSOT<=p.projectedShots);assert(p.blockers.length===0);if(p.projectedRole==='starter')assert(p.eventProbabilities.shotsOver15<=p.eventProbabilities.shotsOver05);else assert.equal(p.eventProbabilities,null);}
 }
}
assert.equal(players.filter(p=>p.projectedShots!==null).length,data.summary.operationalPlayers);
for(const f of data.fixtures){const html=md3ProbableMarkup(f);assert(!/https?:|sourceUrl|provenienza|Tiri \/90|<img/.test(html));assert(html.includes('non ufficiali'));assert.equal((html.match(/data-projected-role="starter"/g)||[]).length,22);}
console.log('OK call-ups minus XI/absences/doubts; no roster fallback; official/probable gates; historical bench entry/minutes; minute budgets; exact existing Poisson; reconciled projections verified; CL exclusions.');
