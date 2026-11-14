import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readingCases} from './readings/fixtures.mjs';
import {individualPlayers} from '../js/pages/reading-detail/evidence.mjs';
import {playersMarkup} from '../js/pages/reading-detail/people.mjs';
import {currentPlayerEvidence} from './readings/bench-starter-scenarios.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),manifest=read('data/generated/reading-bench-starter-scenarios.json'),cases=await readingCases(),matches=read('data/normalized/matches.json');
let starters=0,bench=0,estimated=0;const md7=[];
for(const entry of manifest.fixtures){
 const f=read(entry.path),c=cases.find(c=>c.model.fixture.id===f.fixtureId),{model,evidence}=c,original=JSON.stringify(c),before=individualPlayers(model,evidence),after=individualPlayers(model,{...evidence,starterScenarios:f});
 assert.deepEqual(after.filter(p=>p.lineupStatus==='starter'),before.filter(p=>p.lineupStatus==='starter'));starters+=before.filter(p=>p.lineupStatus==='starter').length;
 for(const p of after.filter(p=>p.lineupStatus==='bench')){bench++;const s=p.starterScenario;if(p.id)assert(s,model.fixture.id+' missing scenario join '+p.id);if(!s)continue;assert.equal(s.playerId,p.id);assert.equal(s.team,p.team);assert(!('expectedMinutes' in s));assert(!('selectionId' in s));if(Number.isFinite(s.projectedShots)){estimated++;assert(Number.isFinite(s.projectedShotsOnTarget));assert(s.projectedShots>=s.projectedShotsOnTarget&&s.projectedShotsOnTarget>=0);assert(s.assumedStarterMinutes>0&&s.assumedStarterMinutes<=90);assert(s.evidence.historicalMinutes>=700||s.evidence.currentMinutes>=270);assert(s.evidence.minutes.starts>0||s.evidence.minutes.currentStarterAppearances>0);}else assert(s.reason);}
 assert.equal(JSON.stringify(c),original,'Original case mutated');
 const stale=individualPlayers(model,{...evidence,starterScenarios:{...f,context:f.context+'stale'}}).filter(p=>p.lineupStatus==='bench');assert(stale.every(p=>p.starterScenario===null));
 const html=playersMarkup(model,{...evidence,starterScenarios:f});assert.equal((html.match(/Stime ipotizzando la partenza da titolare\./g)||[]).length,1);assert(!html.includes('NaN'));
 if(model.fixture.matchday===7)md7.push({id:f.fixtureId,players:f.players.length,estimated:f.players.filter(p=>Number.isFinite(p.projectedShots)).length});
}
assert.equal(bench,manifest.summary.players);assert.equal(estimated,manifest.summary.estimated);
const parma=read(manifest.fixtures.find(f=>f.fixtureId==='parma-torino-2026-27-md-07').path);assert.equal(parma.players.filter(p=>p.team==='Parma'&&Number.isFinite(p.projectedShots)).length,5);assert.equal(parma.players.filter(p=>p.team==='Torino'&&Number.isFinite(p.projectedShots)).length,7);
const target=matches.find(m=>m.id===parma.fixtureId),previous=currentPlayerEvidence(matches,'parma',target),future=matches.find(m=>m.matchday<7&&m.status==='finished'&&(m.homeTeam==='parma'||m.awayTeam==='parma'));assert.deepEqual(currentPlayerEvidence([...matches,{...future,id:'TEST_ONLY_FUTURE_COPY',matchday:8}], 'parma',target),previous,'future data accepted');
const store=createPersonalBetslipStore({storage:{getItem:()=>null,setItem:()=>{}}});store.setContext({competition:'serie-a',season:'2026-27',matchday:7});assert.equal(store.add(parma.players.find(p=>Number.isFinite(p.projectedShots))).status,'UNVERIFIED_IDENTITY');
const results={fixtures:manifest.fixtures.length,startersUnchanged:starters,bench,estimated,md7,staleContext:'rejected',futureData:'excluded',scenarioCannotBecomeSelection:'PASS'};fs.writeFileSync('reports/reading-bench-starter-20261019/unit.json',JSON.stringify(results,null,2));console.log(results);

// The scratch reconstruction must exactly reproduce already-published starters.
const {reconcileStarterScenarioRows}=await import('./readings/bench-starter-scenarios.mjs');
const {default:profileBuilder}=await import('./build-team-matchup-profiles.js');
const profiles=new Map(profileBuilder.buildProfiles({asOfMatchday:7}).profiles.map(p=>[p.teamId,p]));let replayed=0;
for(const {model} of cases.filter(c=>c.model.competition==='serie-a'&&c.model.fixture.matchday===7&&c.model.prediction))for(const t of model.prediction.teamProjections){const original=model.prediction.shooters.allPlayers.filter(p=>p.teamId===t.teamId),scratch=original.map(p=>({...p,projectedShots:p.playerBaselineStability.value*p.shotsMatchupFactor*p.minutesFactor,projectedShotsOnTarget:Math.min(p.playerBaselineStability.value,p.playerSotBaselineStability.value)*p.shotsOnTargetMatchupFactor*p.minutesFactor}));reconcileStarterScenarioRows(scratch,t,profiles.get(t.teamId));for(let i=0;i<scratch.length;i++){assert.equal(scratch[i].projectedShots,original[i].projectedShots);assert.equal(scratch[i].projectedShotsOnTarget,original[i].projectedShotsOnTarget);replayed++;}}
fs.writeFileSync('reports/reading-bench-starter-20261019/unit.json',JSON.stringify({...results,engineReplay:{players:replayed,maximumDifference:0}},null,2));console.log('PASS exact engine replay:',replayed,'published starters');
