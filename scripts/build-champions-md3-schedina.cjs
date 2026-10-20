'use strict';
// MD3 orchestration: existing Champions projections -> shared Serie A admission,
// exact provider contract -> one catalog for Schedina, Lettura and MyCombo.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {buildSharedIndividualCatalog}=require('./champions/md3-shared-forecast-integration.cjs');
const {playablePolicyFor}=require('./betting-market-policy');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function build(){
  if(!process.argv.includes('--catalog-only')){
    for(const script of ['scripts/build-champions-md3-probable.cjs','scripts/build-champions-md3-preliminary.js'])execFileSync(process.execPath,[script],{stdio:'inherit'});
  }
  const individualPath='data/normalized/champions-md03-probable-individuals-2026-27.json';
  const sourcePath='data/sources/champions-probable-formations-md03-2026-27.json';
  const oddsPath='data/normalized/odds/sisal/champions-league.json';
  const file='data/normalized/schedina-champions-md03.json';
  const previous=read(file),individuals=read(individualPath),database=read('data/normalized/champions-md03-player-database-2026-27.json');
  const calendar=read('data/normalized/champions-league-2026-27.json');
  assert.equal(individuals.source.sha256,hash(sourcePath),'Regenerate individual projections after lineup change');
  assert(calendar.fixtures.filter(f=>f.matchday===3).every(f=>f.status!=='finished'),'Do not regenerate completed fixtures');
  const {loadChampionsWorkspace}=await import('../js/pages/champions-workspace-catalog.mjs');
  const workspace=await loadChampionsWorkspace(async name=>{
    const value=read('data/normalized/'+name);
    if(name==='schedina-champions-md03.json'){const {marketCatalog,...archive}=value;return archive;}
    return value;
  },3);
  const policyExcluded=[];
  const baseMatches=workspace.marketCatalog.matches.map(m=>({...m,selections:m.selections.filter(l=>{
    if(l.catalogOrigin==='champions-md03-individual-model')return false;
    const policy=playablePolicyFor(l,{matchday:7});
    if(policy.status==='NOT_PLAYABLE'){policyExcluded.push({...l,exclusionReason:policy.code});return false;}
    l.context={...l.context,forecastPolicy:'SERIE_A_CURRENT'};return true;
  })}));
  const result=buildSharedIndividualCatalog({baseMatches,individuals,database,odds:read(oddsPath),identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
  const all=result.matches.flatMap(m=>m.selections),selected=all.filter(l=>l.suggestionAnalysis?.suggested),players=all.filter(l=>l.marketScope==='player');
  for(const leg of all)leg.context={...leg.context,forecastPolicy:'SERIE_A_CURRENT'};
  assert.equal(new Set(all.map(l=>l.selectionId)).size,all.length);
  for(const leg of players){
    const p=individuals.fixtures.find(f=>f.fixtureId===leg.matchId).teams.find(t=>t.teamId===leg.teamId).players.find(p=>p.playerId===leg.playerId);
    assert(p&&p.projectedRole==='starter'&&p.availability==='probable-starter'&&!p.blockers.length);
    if(leg.betSelection.market.bookmakerSemantics?.duo){for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[key],null);}
  }
  const marketCatalog={schemaVersion:4,policy:'SHARED_SERIE_A_LINEUP_FORECASTS',matchday:3,matches:result.matches,
    playerForecastIntegration:{...result.summary,source:individualPath,identitySource:'data/normalized/champions-md02-integration-2026-27.json',identityConflicts:result.identityConflicts},
    totals:{finalSelections:all.length,suggestions:selected.length,playerForecasts:players.length,quotedPlayerForecasts:players.filter(l=>l.odds!==null).length,unquotedPlayerForecasts:players.filter(l=>l.odds===null).length},
    policyDetails:{primaryShortlist:'predictions/rank-shooter-candidates',admission:'md06-player-forecast-integration.evaluateCandidate',collectiveAdmission:'md06-suggested-forecasts.selectMatchSuggestions',playability:'betting-market-policy current Serie A rules',probableIsNotOfficial:true,benchUsedForTeamAllocation:true,benchEligibleForStarterMarkets:false,formulasChanged:false}};
  const out={...previous,status:'PROBABLE_LINEUP_FORECASTS',oddsRetrievedAt:read(oddsPath).retrievedAt,
    lineupInput:{path:sourcePath,sha256:hash(sourcePath)},individualInput:{path:individualPath,sha256:hash(individualPath)},
    selectionRule:'Criteri Serie A condivisi per minuti, soglie, sostegno statistico e contratti; panchina provvisoria dalla rosa in assenza dei convocati. Probabilità dei contratti DUO ed EV non validati: N/D.',
    marketCatalog};
  assert.deepEqual(out.slips,previous.slips,'Original approved contracts must remain unchanged');
  fs.mkdirSync('data/technical-archive/champions-md03',{recursive:true});
  fs.writeFileSync('data/technical-archive/champions-md03/policy-excluded.json',JSON.stringify(policyExcluded,null,2)+'\n');
  const temporary=file+'.md3.tmp';fs.writeFileSync(temporary,JSON.stringify(out,null,2)+'\n');
  for(let attempt=0;;attempt++)try{fs.renameSync(temporary,file);break;}catch(error){if(attempt>=5)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}
  console.log(JSON.stringify(marketCatalog.totals));
}
build().catch(e=>{console.error(e);process.exitCode=1;});
