import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createDataService} from '../js/services/data-service.js';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {loadEvidence,individualPlayers} from '../js/pages/reading-detail/evidence.mjs';
import {setReadingArtifacts} from '../js/pages/reading-detail/projected-artifacts.mjs';
import {fixtureLineupForMatch} from '../js/pages/readings.js';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),cache=new Map();
globalThis.fetch=async url=>{const f=url instanceof URL?decodeURIComponent(url.pathname).replace(/^\/(\w:)/,'$1'):String(url).split('?')[0];if(!cache.has(f))cache.set(f,read(f));return {ok:true,json:async()=>structuredClone(cache.get(f))}};
const service=createDataService('projection-test',{deduplicate:true});
const [matches,predictions,directory]=[read('data/normalized/matches.json'),read('data/normalized/predictions.json'),read('data/teams/index.json')];
const index=read('data/generated/readings/index.json');assert.deepEqual(index.fixtureIds,matches.map(m=>m.id));
for(const match of matches){
 const projected=await service.loadReading(match.id),raw=projected.matches.find(m=>m.id===match.id);
 assert.deepEqual(raw,match,'full result/report lost '+match.id);
 const canonicalProjection=structuredClone(projected.predictionDataset);
 for(const p of canonicalProjection.predictions||[])for(const c of p.likelyBooked||[])delete c.readingDuels;
 assert.deepEqual(canonicalProjection,globalThis.officialStarterPolicy.filter({predictions:predictions.predictions.filter(p=>p.matchId===match.id)}));
 const file=Number(match.matchday)===1?'schedina.json':`schedina-md${String(match.matchday).padStart(2,'0')}.json`;
 if(fs.existsSync('data/normalized/'+file)){
  const original=await service.load(file);
  for(const result of [null,match])assert.deepEqual(sharedForecastsForMatch(projected.forecastDataset?.marketCatalog,match.id,result),sharedForecastsForMatch(original.marketCatalog,match.id,result),'contract changed '+match.id);
  const saved=await service.loadReadingCatalog(match.id);assert.deepEqual(saved,projected.forecastDataset,'saved-selection catalog differs');
 }
 // Include MD1, MD6 (signed snapshots/results), MD7, and future fixtures.
 if([1,6,7,8].includes(match.matchday)){
  const base={competition:'serie-a',fixture:match,home:directory.teams.find(t=>t.id===match.homeTeam),away:directory.teams.find(t=>t.id===match.awayTeam),prediction:projected.predictionDataset.predictions[0],forecasts:[]};
  const model=(data)=>({...base,analysis:{match,matches:data.matches,teamDirectory:data.teamDirectory,lineups:[match.homeTeam,match.awayTeam].map(id=>({lineup:fixtureLineupForMatch(match,data.teamDirectory.teams.find(t=>t.id===id),data.teamDirectory)}))}});
  setReadingArtifacts(null);const original=await loadEvidence(model({matches,teamDirectory:directory}));
  setReadingArtifacts(projected.artifacts);const compact=await loadEvidence(model(projected));
  assert.deepEqual(compact.lineups,original.lineups,'lineup identity changed '+match.id);
  assert.deepEqual(individualPlayers(model(projected),compact),individualPlayers(model({matches,teamDirectory:directory}),original),'player content changed '+match.id);
  assert.deepEqual(compact.starterScenarios,original.starterScenarios);
 }
}
setReadingArtifacts(null);
console.log(`OK ${matches.length} fixtures: complete results, predictions, published contracts, saved catalogs; MD1/6/7/8 lineups and players identical.`);
