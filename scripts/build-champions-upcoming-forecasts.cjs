'use strict';
// Additive publication overlay. Historical catalogs and all statistical inputs are read-only.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildSharedIndividualCatalog}=require('./champions/md3-shared-forecast-integration.cjs');
const {poissonAtLeast}=require('./champions/md3-lineup-policy');
const {evaluateRequirements}=require('./champions/md3-selection-requirements.cjs');
const selector=require('./md06-suggested-forecasts');
const {zonedLocalToUtc}=require('./champions/complete-forecast-snapshots');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const OUTPUT='data/derived/champions-md03/upcoming-forecasts.json';
const inputPath='data/derived/champions-md03/probable-individuals-v2-2026-10-20.json';
const lineupPath='data/sources/champions-probable-formations-md03-2026-27.json';
const eligible=(f,now)=>f.status==='scheduled'&&Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'))>now;
async function build(){
 const now=Date.now(),calendar=read('data/normalized/champions-league-2026-27.json');
 const {loadChampionsWorkspaceMd3Derived}=await import('../js/pages/champions-workspace-catalog.mjs');
 const workspace=await loadChampionsWorkspaceMd3Derived(async name=>read('data/normalized/'+name),3,{upcoming:false});
 const prior=fs.existsSync(OUTPUT)?read(OUTPUT):null;
 const originals=new Map(workspace.marketCatalog.matches.map(m=>[m.matchId,m]));
 const requested=process.argv.includes('--fixture')?process.argv[process.argv.indexOf('--fixture')+1]:null;
 if(requested&&!calendar.fixtures.some(f=>f.id===requested&&f.matchday===3&&eligible(f,now)))throw Error('Fixture non aggiornabile: inesistente, iniziata o conclusa');
 const upcoming=calendar.fixtures.filter(f=>f.matchday===3&&eligible(f,now)&&(!requested||f.id===requested));
 const ids=new Set(upcoming.map(f=>f.id));
 const full=read(inputPath),individuals={...full,fixtures:full.fixtures.filter(f=>ids.has(f.fixtureId))};
 assert.equal(full.source.sha256,hash(lineupPath),'Regenerate projections after a probable XI change');
 const database=read('data/normalized/champions-md03-player-database-2026-27.json');
 const odds=read('data/normalized/odds/sisal/champions-league.json');
 // DUO prices remain in the archived catalog. They are not prices for a named-player forecast.
 const integration=buildSharedIndividualCatalog({baseMatches:upcoming.map(f=>({...originals.get(f.id),selections:[]})),individuals,database,
  odds:{...odds,events:odds.events.map(e=>({...e,markets:[]}))},identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
 const preliminary=read('data/normalized/champions-md03-preliminary-2026-27.json');
 const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
 const evidence={preview,pilot:read('data/normalized/champions-pilot-volume-backtest.json'),calibration:read('data/analysis/champions/model-calibration-audit-2026-10-11.json')};
 const matches=upcoming.map(f=>{
  const original=structuredClone(originals.get(f.id)),fixture=individuals.fixtures.find(x=>x.fixtureId===f.id);
  const oldIds=new Set(original.selections.map(l=>l.selectionId));
  const newLegs=integration.matches.find(m=>m.matchId===f.id).selections.flatMap(admitted=>{
   const metric=admitted.suggestionAnalysis.family;
   const player=fixture.teams.flatMap(t=>t.players).find(p=>p.playerId===admitted.playerId);
   // Evaluate the full requested ladder after the unchanged per-player admission gate.
   return (metric==='shots'?[1,2,3,4]:[1,2,3]).map(count=>{
   const l=structuredClone(admitted),probability=poissonAtLeast(metric==='shots'?player.projectedShots:player.projectedSOT,count)*100;
   // New identity: never reinterpret an existing DUO or saved selection.
   l.selectionId=`forecast:v2:${f.id}:${l.playerId}:${metric}:${count}:individual`;l.betSelection.selectionId=l.selectionId;
   l.betSelection.identity.canonicalForecastId=l.selectionId;
   l.threshold=count-0.5;l.forecastIdentity.threshold=l.threshold;l.betSelection.forecastIdentity.threshold=l.threshold;
   l.label=`${l.playerName} ${count}+ ${metric==='shots'?'tiri':'tiri in porta'}`;l.variant=l.label;
   l.betSelection.market.threshold=l.threshold;l.betSelection.market.variant=l.label;
   l.modelProbabilityPct=probability;l.individualModelProbabilityPct=probability;
   l.betSelection.evaluation.modelProbabilityPct=probability;
   l.betSelection.evaluation.individualReference.modelProbabilityPct=probability;
   const target=`player:${l.playerId}:${metric}:${count}+`;
   l.betSelection.evaluation.individualReference.modelTarget=target;
   l.betSelection.evaluation.provenance.modelTarget=target;
   l.betSelection.evaluation.provenance.source=`${inputPath}#${f.id}/${l.playerId}/${metric==='shots'?'projectedShots':'projectedSOT'}`;
   l.betSelection.evaluation.provenance.thresholdMethod='EXISTING_POISSON_AT_LEAST';
   l.betSelection.compatibility.modelTarget=target;
   l.forecastEvidence.individualModelProbabilityPct=probability;l.forecastEvidence.individualModelTarget=target;
   l.context.forecastPolicy='SERIE_A_CURRENT';
   l.catalogOrigin='champions-upcoming-individual';
   return l;
   });
  });
  const evaluated=evaluateRequirements(newLegs,preliminary.fixtures.find(x=>x.fixtureId===f.id),fixture,evidence);
  // Statistical admission was already performed by evaluateCandidate in the shared integration.
  // Reuse portfolio ranking; a missing price is not a statistical rejection for a forecast.
  const selection=selector.chooseSuggestions({selections:evaluated},'probability-first',{probabilityKey:'modelProbabilityPct',assessment:l=>{
   const reasons=[];
   if(l.lineupEligibility?.eligible!==true||l.scenarioAnalysis?.status==='CONTRADICTORY')reasons.push('LINEUP_OR_SCENARIO_INELIGIBLE');
   if(!Number.isFinite(l.betSelection.evaluation.modelProbabilityPct))reasons.push('NOT_MODELLED');
   if(l.betSelection.evaluation.modelProbabilityPct<selector.minimumSportsSupportPct(l))reasons.push('SPORTS_SUPPORT_BELOW_MARKET_STANDARD');
   return {eligible:!reasons.length,reasons};
  }});
  const ranks=new Map(selection.accepted.map((l,i)=>[l.selectionId,i+1]));
  for(const leg of evaluated){
   assert(!oldIds.has(leg.selectionId));const selected=ranks.has(leg.selectionId);
   leg.selectionStatus=selected?'PRELIMINARY':'NOT_SELECTED';leg.qualifiedSelection=false;leg.approvedPreliminary=false;
   leg.publication={status:leg.selectionStatus,selectionGate:'EXISTING_PLAYER_ADMISSION_AND_PORTFOLIO_WITHOUT_QUOTE_GATE',reasons:['CHAMPIONS_EVENT_MODEL_NOT_VALIDATED',...(selected?[]:[selection.rejected.get(leg.selectionId)||'LOWER_RANKED'])]};
   leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:selected,rank:selected?original.suggestions.length+ranks.get(leg.selectionId):null};
  }
  const distributions=fixture.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter').map(p=>({
   playerId:p.playerId,teamId:t.teamId,role:p.role,expectedMinutes:p.expectedMinutes,blockers:p.blockers,
   conditionalOnProbableStart:true,
   shots:p.blockers.length||!Number.isFinite(p.projectedShots)?null:[1,2,3,4].map(n=>({count:n,probability:poissonAtLeast(p.projectedShots,n)})),
   sot:p.blockers.length||!Number.isFinite(p.projectedSOT)?null:[1,2,3].map(n=>({count:n,probability:poissonAtLeast(p.projectedSOT,n)})),
   discipline:{yellowCardProbability:null,foulsCommitted:null,foulsWon:null,reason:'NO_EXISTING_VALIDATED_PLAYER_DISCIPLINE_FORECAST_PIPELINE'}
  })));
  const forecast=preliminary.fixtures.find(x=>x.fixtureId===f.id).forecast;
  const xg=forecast.expectedGoals;
  // Same independent-Poisson expression as build-champions-player-markets.candidateLegs.
  const btts=Number.isFinite(xg?.home)&&Number.isFinite(xg?.away)?(1-Math.exp(-xg.home))*(1-Math.exp(-xg.away)):null;
  const excluded=integration.summary.excluded.filter(p=>p.matchId===f.id);
  return {matchId:f.id,selections:evaluated,suggestions:selection.accepted.map(l=>l.selectionId),originalPublished:original.suggestions.length,
   forecastCoverage:{distributions,generatedIndividualMarkets:distributions.reduce((n,p)=>n+(p.shots?.length||0)+(p.sot?.length||0),0),
    teamProjections:forecast.teamProjections,matchProjection:forecast.matchProjection,cards:forecast.cards,
    result:forecast.probabilities,doubleChance:{'1X':forecast.probabilities.home+forecast.probabilities.draw,'X2':forecast.probabilities.draw+forecast.probabilities.away},
    goals:forecast.goals,btts:btts===null?null:{goalPct:btts*100,noGoalPct:(1-btts)*100,status:'PRELIMINARY_INDEPENDENT_POISSON'},excluded,
    missing:['Ammonizioni e falli individuali: modello operativo non disponibile',
     ...new Set(distributions.filter(p=>p.role!=='goalkeeper').flatMap(p=>p.blockers).map(b=>({COLLECTIVE_ONLY_TEAM:'Squadra con soli dati collettivi',IDENTITY_UNRESOLVED:'Identità irrisolta',EXPECTED_MINUTES_UNAVAILABLE:'Minuti previsti insufficienti',BASELINE_UNAVAILABLE_OR_UNSAFE:'Baseline individuale insufficiente',TEAM_RECONCILIATION_NOT_PASSED:'Riconciliazione volumi non superata',DOUBTFUL:'Titolare in dubbio'}[b])).filter(Boolean)),
     ...(!selection.accepted.length&&newLegs.length?['Nessun individuale supera la selezione statistica']:[])],
    lineupStatus:'probable',kickoffAt:zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome')}};
 });
 // A later run retains the exact prior overlay for matches that have since started.
 const locked=(prior?.matches||[]).filter(m=>!ids.has(m.matchId));
 const output={schemaVersion:1,competition:'champions',matchday:3,generatedAt:new Date(now).toISOString(),
  inputs:{individuals:{path:inputPath,sha256:hash(inputPath)},lineups:{path:lineupPath,sha256:hash(lineupPath)}},matches:[...locked,...matches]};
 fs.writeFileSync(OUTPUT,JSON.stringify(output,null,2)+'\n');
 const report=calendar.fixtures.filter(f=>eligible(f,now)).map(f=>{
  const m=output.matches.find(m=>m.matchId===f.id),c=m?.forecastCoverage;
  return {fixtureId:f.id,matchday:f.matchday,match:`${f.homeTeam} - ${f.awayTeam}`,probableLineups:c?'22/22':'non disponibili',individualMarkets:c?.generatedIndividualMarkets||0,
   published:m?(m.originalPublished+m.selections.filter(l=>l.suggestionAnalysis?.suggested).length):0,publishedIndividual:m?.selections.filter(l=>l.marketScope==='player'&&l.suggestionAnalysis?.suggested).length||0,missing:c?.missing||['Probabili formazioni non presenti per questa giornata']};
 });
 fs.mkdirSync('output/champions-upcoming-forecasts',{recursive:true});
 fs.writeFileSync('output/champions-upcoming-forecasts/coverage.json',JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync('output/champions-upcoming-forecasts/coverage.md','| Partita | Probabili | Mercati individuali | Pubblicati (individuali) | Dati mancanti |\n|---|---|---:|---:|---|\n'+report.map(r=>`| G${r.matchday} ${r.match} | ${r.probableLineups} | ${r.individualMarkets} | ${r.published} (${r.publishedIndividual}) | ${r.missing.join('; ')} |`).join('\n')+'\n');
 console.log(JSON.stringify({upcomingFixtures:report.length,updated:matches.length,individualMarkets:matches.reduce((n,m)=>n+m.forecastCoverage.generatedIndividualMarkets,0),publishedIndividual:report.reduce((n,r)=>n+r.publishedIndividual,0)}));
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1});
module.exports={eligible,build};
