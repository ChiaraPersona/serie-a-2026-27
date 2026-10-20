'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildSharedIndividualCatalog}=require('./champions/md3-shared-forecast-integration.cjs');
const {selectPreliminaryFixture}=require('./champions/md3-preliminary-pilot.cjs');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const ids=['ucl-2026-27-md03-01','ucl-2026-27-md03-02'];
const outputPath='data/derived/champions-md03/market-catalog-official-two-v1-2026-10-20.json';
if(fs.existsSync(path.join(root,outputPath)))throw Error('Official MD3 version exists; use a new version');
const individualsPath='data/derived/champions-md03/official-individuals-two-v1-2026-10-20.json';
const individuals=read(individualsPath),previous=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
assert.equal(individuals.status,'official');assert.deepEqual(individuals.fixtures.map(f=>f.fixtureId),ids);
const official=read('data/sources/champions-official-formations-md03-2026-27.json');
assert.deepEqual(official.fixtures.map(f=>f.fixtureId),ids);
const originals=previous.matches.filter(m=>ids.includes(m.matchId));assert.equal(originals.length,2);
const bases=originals.map(m=>({...structuredClone(m),selections:m.selections.filter(l=>l.marketScope!=='player')}));
const integration=buildSharedIndividualCatalog({baseMatches:bases,individuals,database:read('data/normalized/champions-md03-player-database-2026-27.json'),
 odds:read('data/normalized/odds/sisal/champions-league.json'),identityArchive:read('data/normalized/champions-md02-integration-2026-27.json')});
const matches=integration.matches.map(selectPreliminaryFixture);
for(const match of matches){
 const source=originals.find(m=>m.matchId===match.matchId),old=new Map(source.selections.filter(l=>l.marketScope!=='player').map(l=>[l.selectionId,l]));
 const starters=new Set(official.fixtures.find(f=>f.fixtureId===match.matchId).home.players.concat(official.fixtures.find(f=>f.fixtureId===match.matchId).away.players).map(p=>p.playerId));
 for(const leg of match.selections){
  if(leg.marketScope!=='player'){
   const archived=old.get(leg.selectionId);assert(archived);assert.equal(leg.odds,archived.odds);assert.equal(leg.betSelection.evaluation.modelProbabilityPct,archived.betSelection.evaluation.modelProbabilityPct);
  }
  if(leg.suggestionAnalysis.suggested){
   assert.notEqual(leg.selection,'12');assert(Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct));
   assert.equal(leg.betSelection.identity.status,'VERIFIED_PROVIDER_IDS');
   if(leg.marketScope==='player')assert(starters.has(leg.playerId),`nonstarter ${leg.playerId}`);
  }
 }
}
const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
const collective=ids.map(id=>{
 const f=preview.fixtures.find(x=>x.fixtureId===id);assert(f);
 return {fixtureId:id,modelInput:'EXISTING_COLLECTIVE_MODEL_LINEUP_INDEPENDENT',teamProjections:f.collective.teamProjections,
  matchProjection:f.collective.matchProjection,expectedGoals:f.collective.expectedGoals,probabilities:f.collective.probabilities};
});
const selected=matches.flatMap(m=>m.selections.filter(l=>l.suggestionAnalysis.suggested));
const output={schemaVersion:1,version:'official-two-v1-2026-10-20',status:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED',matchday:3,
 source:{path:'data/sources/champions-official-formations-md03-2026-27.json',sha256:digest('data/sources/champions-official-formations-md03-2026-27.json')},
 individuals:{path:individualsPath,sha256:digest(individualsPath)},baseCatalog:{path:'data/derived/champions-md03/market-catalog-v2-2026-10-20.json',sha256:digest('data/derived/champions-md03/market-catalog-v2-2026-10-20.json')},
 collective,summary:{fixtures:2,selected:selected.length,selectedPerFixture:matches.map(m=>({matchId:m.matchId,count:m.suggestions.length})),individualSelected:selected.filter(l=>l.marketScope==='player').length},
 integration:{added:integration.summary.added,quoted:integration.summary.quoted,unquoted:integration.summary.unquoted,excluded:integration.summary.excluded},matches};
fs.writeFileSync(path.join(root,outputPath),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));
