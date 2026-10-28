'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {buildSharedIndividualCatalog}=require('./champions/md3-shared-forecast-integration.cjs');
const {buildPublication}=require('./champions/md3-publication-policy.cjs');
const read=p=>storageReadJson(p);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const individualPath='data/derived/champions-md03/official-individuals-seven-v2-2026-10-20.json';
const outputPath='data/derived/champions-md03/market-catalog-official-seven-v2-2026-10-20.json';
async function build(){
 const individuals=read(individualPath),ids=new Set(individuals.fixtures.map(f=>f.fixtureId));assert.equal(ids.size,7);
 const calendar=read('data/normalized/champions-league-2026-27.json');
 for(const id of ids){const f=calendar.fixtures.find(f=>f.id===id);assert(f.status==='scheduled'&&Date.parse(`${f.date}T${f.kickoff}:00+02:00`)>Date.now());}
 const source=read('data/sources/champions-official-formations-md03-2026-27.json');
 assert.equal(individuals.source.sha256,hash('data/sources/champions-official-formations-md03-2026-27.json'));
 const old=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
 const originals=old.matches.filter(m=>ids.has(m.matchId));
 const archive=originals.flatMap(m=>m.selections.filter(l=>l.marketScope==='player'));
 const database=require('./champions/md3-identity-corrections.cjs').applyIdentityCorrections(process.cwd(),read('data/normalized/champions-md03-player-database-2026-27.json'));
 const integration=buildSharedIndividualCatalog({baseMatches:originals.map(m=>({...structuredClone(m),selections:m.selections.filter(l=>l.marketScope!=='player')})),individuals,
  database,odds:read('data/normalized/odds/sisal/champions-league.json'),identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
 // Official replacements require an exact verified quote. Unquoted single-player
 // diagnostics remain in the technical archive and are never new operative legs.
 for(const m of integration.matches){
  archive.push(...m.selections.filter(l=>l.marketScope==='player'&&l.odds===null));
  m.selections=m.selections.filter(l=>l.marketScope!=='player'||l.odds!==null);
 }
 const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
 const publication=await buildPublication({matches:integration.matches,fixtures:read('data/normalized/champions-md03-preliminary-2026-27.json').fixtures,individuals,evidence:{preview,
  officialRegistry:read('data/normalized/official-starter-registry.json'),pilot:read('data/normalized/champions-pilot-volume-backtest.json'),calibration:read('data/analysis/champions/model-calibration-audit-2026-10-11.json')}});
 const odds=read('data/normalized/odds/sisal/champions-league.json');
 for(const m of publication.matches){
  const fixture=individuals.fixtures.find(f=>f.fixtureId===m.matchId);
  const starters=new Set(fixture.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter').map(p=>p.playerId)));
  const prior=originals.find(x=>x.matchId===m.matchId);
  for(const leg of m.selections){
   if(leg.marketScope==='player'){
    assert(starters.has(leg.playerId));assert.equal(leg.lineupEligibility.status,'official-starter');
    assert.equal(leg.betSelection.identity.status,'VERIFIED_PROVIDER_IDS');
    const event=odds.events.find(e=>e.canonicalMatchId===m.matchId),market=event.markets.find(x=>x.providerMarketId===leg.providerMarketId);
    assert(market&&market.status==='open');const selection=market.selections.find(x=>x.providerSelectionId===leg.providerSelectionId);assert.equal(selection.odds,leg.odds);assert.equal(selection.status,'open');
    if(leg.betSelection.market.bookmakerSemantics?.duo){
     for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[key],null);
     leg.betSelection.evaluation.probabilitySemantics='DUO_CONTRACT_UNAVAILABLE';
    }
   }else{
    const original=prior.selections.find(l=>l.selectionId===leg.selectionId);assert(original);
    assert.equal(leg.odds,original.odds);assert.equal(leg.betSelection.evaluation.modelProbabilityPct,original.betSelection.evaluation.modelProbabilityPct);
   }
  }
  const collective=preview.fixtures.find(f=>f.fixtureId===m.matchId).collective;
  const xg=collective.expectedGoals,btts=Number.isFinite(xg?.home)&&Number.isFinite(xg?.away)?(1-Math.exp(-xg.home))*(1-Math.exp(-xg.away)):null;
  m.forecastCoverage={lineupStatus:'official',kickoffAt:fixture.kickoffAt,distributions:fixture.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter').map(p=>({playerId:p.playerId,teamId:t.teamId,role:p.role,expectedMinutes:p.expectedMinutes,projectedShots:p.projectedShots,projectedSOT:p.projectedSOT,blockers:p.blockers,conditionalOnProbableStart:false}))),teamProjections:collective.teamProjections,matchProjection:collective.matchProjection,cards:collective.cards,result:collective.probabilities,
   generatedIndividualMarkets:fixture.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter')).reduce((n,p)=>n+Object.values(p.eventProbabilities||{}).filter(Number.isFinite).length,0),
   doubleChance:{'1X':collective.probabilities.home+collective.probabilities.draw,X2:collective.probabilities.draw+collective.probabilities.away},btts:btts===null?null:{goalPct:btts*100,noGoalPct:(1-btts)*100,status:'PRELIMINARY_INDEPENDENT_POISSON'},
   missing:fixture.teams.filter(t=>!t.players.some(p=>p.projectedRole==='starter'&&p.projectedShots!==null)).map(t=>({teamId:t.teamId,team:t.team,reason:t.reconciliation.status}))};
 }
 const selected=publication.matches.flatMap(m=>m.selections.filter(l=>l.suggestionAnalysis.suggested));
 const summary={fixtures:7,starters:154,projectedStarters:individuals.fixtures.flatMap(f=>f.teams.flatMap(t=>t.players)).filter(p=>p.projectedRole==='starter'&&p.projectedShots!==null).length,
  selected:selected.length,individualSelected:selected.filter(l=>l.marketScope==='player').length,duoSelected:selected.filter(l=>l.betSelection.market.bookmakerSemantics?.duo).length,
  byFixture:publication.matches.map(m=>({fixtureId:m.matchId,selected:m.suggestions.length,individual:m.selections.filter(l=>l.marketScope==='player'&&l.suggestionAnalysis.suggested).length,byFamily:Object.fromEntries([...new Set(m.selections.filter(l=>l.suggestionAnalysis.suggested).map(l=>l.suggestionAnalysis.family))].map(k=>[k,m.selections.filter(l=>l.suggestionAnalysis.suggested&&l.suggestionAnalysis.family===k).length]))}))};
 const out={schemaVersion:1,version:'official-seven-v2-2026-10-20',status:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED',matchday:3,generatedAt:new Date().toISOString(),
  source:{path:individuals.source.path,sha256:individuals.source.sha256},individuals:{path:individualPath,sha256:hash(individualPath)},summary,integration:integration.summary,myCombo:publication.myCombo,matches:publication.matches};
 fs.writeFileSync(outputPath,JSON.stringify(out,null,2)+'\n');
 fs.mkdirSync('data/technical-archive/champions-md03',{recursive:true});fs.writeFileSync('data/technical-archive/champions-md03/seven-official-excluded-2026-10-20.json',JSON.stringify(archive,null,2)+'\n');
 fs.writeFileSync('data/analysis/champions/official-seven-2026-10-20/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}
build().catch(e=>{console.error(e);process.exitCode=1});
