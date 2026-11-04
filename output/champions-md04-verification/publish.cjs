const fs=require('node:fs'),zlib=require('node:zlib');
const base='output/champions-md04-verification';
const audit=JSON.parse(fs.readFileSync(base+'/verification.json'));
const catalog=JSON.parse(fs.readFileSync('data/normalized/schedina-champions-md04.json'));
const legs=new Map(catalog.marketCatalog.matches.flatMap(m=>m.selections).map(l=>[l.selectionId,l]));
const rawBase='data/raw/champions-results/2026-11-04';fs.mkdirSync(rawBase,{recursive:true});
const fixtures=audit.fixtures.map(f=>{
 const rawPath=rawBase+'/'+f.eventId+'.json.gz';fs.writeFileSync(rawPath,zlib.gzipSync(fs.readFileSync(base+'/'+f.eventId+'.json')));
 return {fixtureId:f.id,status:'finished',score:f.score,sourceUrl:f.sourceUrl,statistics:{sourceUrl:f.sourceUrl,shots:[f.teamStats.home.shots,f.teamStats.away.shots],shotsOnTarget:[f.teamStats.home.shotsOnTarget,f.teamStats.away.shotsOnTarget],corners:[f.teamStats.home.corners,f.teamStats.away.corners]},rawPath,
 verifiedSelections:audit.records.filter(r=>r.matchId===f.id).map(r=>{const l=legs.get(r.selectionId);return {selectionId:r.selectionId,providerSelectionId:r.providerSelectionId,market:l.market,selection:l.selection,label:l.label,playerId:l.playerId??null,threshold:l.betSelection?.market?.threshold??null,settlement:r.settlement,observed:r.observed};})};
});
const data={schemaVersion:1,season:'2026-27',matchday:4,verifiedAt:audit.verifiedAt,source:{provider:'UEFA / ESPN',url:'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-and-results/'},coverageNote:'9/18 gare concluse. Verifica statistica dei contratti pubblicati, non liquidazione certificata. Pali/traverse non documentati restano N/D; gare del 4 novembre invariate.',fixtures};
fs.writeFileSync('data/sources/champions-results-md04-2026-27.json',JSON.stringify(data,null,2)+'\n');
console.log('Saved nine result reports, exact contract observations and compressed raw evidence.');
