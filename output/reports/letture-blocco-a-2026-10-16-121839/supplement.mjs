// Documentation/evidence capture only; no production imports that build data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write=(p,value)=>fs.writeFileSync(path.join(out,p),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const rows=[];
for(const name of fs.readdirSync('data/normalized').filter(f=>/^schedina.*\.json$/.test(f))){
 const p='data/normalized/'+name,d=read(p);
 if(!d.marketCatalog||name.includes('champions-md01'))rows.push({source:p,meaning:'Original complete normalized structure for archival/MD1 paths; not treated as an identical reading publication contract.',dataset:d});
}
const samples=['atalanta-venezia-2026-27-md-06','ucl-2026-27-md02-05','milan-atalanta-2026-27-md-07'];
const predictions=read('data/normalized/predictions.json');
const calendar=read('data/normalized/matches.json');
const cl=read('data/normalized/champions-league-2026-27.json');
const integration=read('data/normalized/champions-md02-integration-2026-27.json');
const manifest=read('data/predictions/snapshots/manifest.json');
write('legacy-and-sample-records.json',{legacySchedina:rows,samples:samples.map(id=>({id,calendar:calendar.find(m=>m.id===id)??cl.fixtures.find(f=>f.id===id)??null,prediction:predictions.predictions.find(m=>m.matchId===id)??null,integrationMetadata:integration.fixtures.filter(f=>f.fixtureId===id).map(f=>({lineupStatus:f.lineupStatus,lineups:f.lineups,generationSync:f.generationSync,teamPredictionDataQuality:f.teamPrediction?.dataQuality})),snapshotManifestEntries:manifest.snapshots.filter(s=>s.matchId===id)})),note:'Existing full values, including nulls. Snapshot manifest metadata copied but chronology/hash semantics not independently certified here.'});
const evidence=[];
const patterns={
 'js/pages/readings.js':/export function|function reading|function headToHead|function render|requestedMatchday|forecastFile|selectedMatch=|readingPrototypeDetail\(|duplicatePanels|const dataPanel|const readingModules|const readingField/,
 'js/pages/champions.js':/function (refereeReadingPanel|matchReport|roundTable|strengthDirectory|modelAudit|historyDirectory|registeredSquadsDirectory|probableFormationCard|tacticalAnalysisPanel|motivationOnlyDetail|motivationOverview|pilotReadingDetail)|const (shootersPanel|bookedPanel|myCombo|marketPanel|selectedBlocks|selectedForecasts)|requestedCalendarFixture|requestedPilotFixture|md2MarketEntry\?|mountChampionsMarketUi|registeredSquadsDirectory\(|strengthDirectory\(|modelAudit\(|historyDirectory\(/,
 'js/pages/champions-market-ui.mjs':/context:|setContext|root=|publishedRoot=|if\(!root|reconcile|createChampionsSelection/,
 'js/pages/personal-betslip-store.mjs':/STORAGE_KEY|function contextKey|function playability|OFFICIAL_NON_STARTER|matchday\)>=6|const reconcile|const add=|MISSING_FROM_CURRENT_DATA|quoteChanged/,
 'js/pages/shared-forecast-contract.mjs':/export function|md-07|REGULATION|duo===false|UNAVAILABLE|eligible/,
 'scripts/betting-selection-contract.js':/buildRegistry/,
 'scripts/apply-official-starter-policy.js':/function buildRegistry|write\('data\/normalized\/official-starter|function build\(/,
 'js/services/data-service.js':/registry|filter\(|loadGenerated|loadTeamDirectory/,
};
for(const [file,re] of Object.entries(patterns))evidence.push({file,lines:fs.readFileSync(file,'utf8').split(/\r?\n/).flatMap((text,i)=>re.test(text)?[{line:i+1,text}]:[])});
write('source-evidence.json',evidence);
const manifestProtected=read(path.join(out,'protected-manifest.json'));
console.log(JSON.stringify({legacyFiles:rows.length,categories:manifestProtected.files.reduce((a,f)=>(a[f.category]=(a[f.category]||0)+1,a),{}),keyHashes:manifestProtected.files.filter(f=>['scripts/predictions/engine.js','scripts/predictions/decision-layer.js','scripts/build-champions-pilot-predictions.js','scripts/build-champions-1x2.js','scripts/betting-selection-contract.js','js/pages/personal-betslip-store.mjs','js/pages/shared-forecast-contract.mjs','data/normalized/official-starter-registry.json','data/normalized/predictions.json','data/normalized/schedina-md07.json','data/normalized/schedina-champions-md02.json','docs/specifica-ux-letture-unificate-fase-2.md'].includes(f.path))},null,2));
