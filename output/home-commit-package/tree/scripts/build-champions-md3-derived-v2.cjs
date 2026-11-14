'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Versioned MD3 derivation. Frozen pre-match forecasts, historical slips,
// MyCombo and original Sisal odds are read-only inputs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildSharedIndividualCatalog}=require('./champions/md3-shared-forecast-integration.cjs');
const {selectPreliminaryFixture}=require('./champions/md3-preliminary-pilot.cjs');
const root=path.resolve(__dirname,'..'),read=p=>storageReadJson(path.join(root,p));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const individualPath='data/derived/champions-md03/probable-individuals-v2-2026-10-20.json';
const outputPath='data/derived/champions-md03/market-catalog-v2-2026-10-20.json';
if(fs.existsSync(path.join(root,outputPath)))throw Error('Derived MD3 v2 already exists; use a new version');
const frozen=read('data/normalized/schedina-champions-md03.json');
const individuals=read(individualPath);
const odds=read('data/normalized/odds/sisal/champions-league.json');
const database=read('data/normalized/champions-md03-player-database-2026-27.json');
const original=frozen.marketCatalog.matches;
assert.equal(original.length,18);assert.equal(individuals.fixtures.length,18);
const bases=original.map(match=>({...structuredClone(match),selections:match.selections.filter(leg=>leg.marketScope!=='player')}));
const integration=buildSharedIndividualCatalog({baseMatches:bases,individuals,database,odds,
  identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
const matches=integration.matches.map(selectPreliminaryFixture);
for(const match of matches){
  const previous=original.find(item=>item.matchId===match.matchId);assert(previous);
  const oldLegs=new Map(previous.selections.filter(leg=>leg.marketScope!=='player').map(leg=>[leg.selectionId,leg]));
  for(const leg of match.selections){
    if(leg.marketScope==='player')continue;
    const old=oldLegs.get(leg.selectionId);assert(old,`new collective contract ${leg.selectionId}`);
    assert.equal(leg.odds,old.odds,`modified Sisal quote ${leg.selectionId}`);
    assert.equal(leg.betSelection.evaluation.modelProbabilityPct,old.betSelection.evaluation.modelProbabilityPct,`modified frozen probability ${leg.selectionId}`);
  }
  assert(match.selections.every(leg=>leg.selection!=='12'||!leg.suggestionAnalysis.suggested));
  for(const leg of match.selections.filter(leg=>leg.suggestionAnalysis.suggested)){
    assert(Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct),`unmodelled selection ${leg.selectionId}`);
    assert(leg.betSelection.identity.status==='VERIFIED_PROVIDER_IDS',`unverified contract ${leg.selectionId}`);
    assert(!leg.betSelection.market.bookmakerSemantics?.duo||Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct),`DUO probability absent ${leg.selectionId}`);
  }
}
const all=matches.flatMap(match=>match.selections),selected=all.filter(leg=>leg.suggestionAnalysis.suggested);
const key=leg=>leg.marketScope==='player'?(leg.suggestionAnalysis.family==='sot'?'individualSOT':'individualShots'):
  ({'team-shots':'teamShots','team-sot':'teamSOT','team-corners':'teamCorners',corners:'matchCorners',shots:'matchShots',result:'result','double-chance':'doubleChance',goals:'goals'}[leg.suggestionAnalysis.family]||'other');
const counts=Object.fromEntries([...new Set(selected.map(key))].sort().map(k=>[k,selected.filter(leg=>key(leg)===k).length]));
const coverage={detailedFixtures:read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json').fixtures.filter(f=>f.collective.dataQuality.detailedVolumesAvailable).length,
  modeledByMarket:Object.fromEntries(['team-shots','team-sot','team-corners','corners'].map(f=>[f,all.filter(l=>l.suggestionAnalysis.family===f&&Number.isFinite(l.betSelection.evaluation.modelProbabilityPct)).length])),
  missingByMarket:Object.fromEntries(['team-shots','team-sot','team-corners','corners'].map(f=>[f,all.filter(l=>l.suggestionAnalysis.family===f&&!Number.isFinite(l.betSelection.evaluation.modelProbabilityPct)).length]))};
const output={schemaVersion:1,version:'md3-v2-2026-10-20',status:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED',competition:'champions',season:'2026-27',matchday:3,
  frozenInputs:{schedina:'data/normalized/schedina-champions-md03.json',schedinaSha256:digest('data/normalized/schedina-champions-md03.json'),
    collective:'data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json',collectiveSha256:digest('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json'),
    odds:'data/normalized/odds/sisal/champions-league.json',oddsSha256:digest('data/normalized/odds/sisal/champions-league.json')},
  individuals:{path:individualPath,sha256:digest(individualPath),operationalPlayers:individuals.summary.operationalPlayers,
    operationalStarters:individuals.fixtures.flatMap(f=>f.teams.flatMap(t=>t.players)).filter(p=>p.projectedRole==='starter'&&Number.isFinite(p.projectedShots)).length},
  summary:{fixtures:matches.length,selections:all.length,selected:selected.length,selectedByMarket:counts,coverage,
    selectedPerFixture:matches.map(m=>({matchId:m.matchId,count:m.suggestions.length,byMarket:Object.fromEntries([...new Set(m.selections.filter(l=>l.suggestionAnalysis.suggested).map(key))].map(k=>[k,m.selections.filter(l=>l.suggestionAnalysis.suggested&&key(l)===k).length]))}))},
  integration:{added:integration.summary.added,quoted:integration.summary.quoted,unquoted:integration.summary.unquoted,excluded:integration.summary.excluded},
  matches};
fs.writeFileSync(path.join(root,outputPath),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({operationalPlayers:output.individuals.operationalPlayers,operationalStarters:output.individuals.operationalStarters,
  selected:output.summary.selected,counts,coverage}));
