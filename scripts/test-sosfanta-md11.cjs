const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parse}=require('./import-sosfanta-probable-lineups.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
(async()=>{
 const source=read('data/sources/probable-lineups-md11-2026-27.json');assert.equal(source.provider,'SOS Fanta');
 const parsed=parse(fs.readFileSync(source.rawSnapshot,'utf8'));assert.equal(parsed.length,10);
 const projected=read('data/teams/index.json');
 for(const fixture of parsed)for(const side of fixture.sides){
  const canonical=source.teams.find(t=>t.team===side.team);assert(canonical);assert.equal(canonical.status,'probable');assert.equal(canonical.formation,side.formation);
  assert.deepEqual(canonical.players.filter(p=>p.lineupStatus==='starter').map(p=>[p.sourceName,p.probability]),side.players.filter(p=>p.lineupStatus==='starter').map(p=>[p.sourceName,p.probability]));
  const team=projected.teams.find(t=>t.id===canonical.teamId),lineup=team.projectedLineup||team.probableLineup;assert.equal(lineup.status,'probable');assert.deepEqual(lineup.players,canonical.players.filter(p=>p.lineupStatus==='starter').map(p=>p.sourceName));
 }
 const unknown=source.teams.flatMap(t=>t.players.filter(p=>p.lineupStatus==='starter'&&!p.playerId));assert.equal(unknown.length,1);assert.equal(unknown[0].sourceName,'Vasquez D.');
 const protectedHashes=read('output/sosfanta-md11-2026-11-06/protected.json');for(const [file,hash] of Object.entries(protectedHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
 const before=JSON.parse(zlib.gunzipSync(fs.readFileSync('output/sosfanta-md11-2026-11-06/before.json.gz')));
 const predictions=read('data/normalized/predictions.json');assert.deepEqual(predictions.predictions.filter(p=>!p.matchId.endsWith('-md-11')),JSON.parse(before['data/normalized/predictions.json']).predictions.filter(p=>!p.matchId.endsWith('-md-11')));
 const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
 const {createPersonalBetslipStore}=await import('../js/pages/personal-betslip-store.mjs');
 const old=JSON.parse(before['data/normalized/schedina-md11.json']),current=read('data/normalized/schedina-md11.json');
 const oldPublic=old.marketCatalog.matches.flatMap(m=>sharedForecastsForMatch(old.marketCatalog,m.matchId)),publicRows=current.marketCatalog.matches.flatMap(m=>sharedForecastsForMatch(current.marketCatalog,m.matchId));
 assert(!publicRows.some(l=>l.betSelection?.market?.subject?.id==='john-yeboah'));
 const removed=oldPublic.filter(l=>!publicRows.some(n=>n.selectionId===l.selectionId));
 const context={competition:'serie-a',season:'2026-27',matchday:11},memory=new Map(),store=createPersonalBetslipStore({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});store.setContext(context);
 for(const leg of removed)store.add({...leg,context});store.reconcile(publicRows.map(l=>({...l,context})));
 assert(store.getSnapshot().selections.every(l=>l.dataStatus==='MISSING_FROM_CURRENT_DATA'));
 const report={coverage:source.coverage,publicSelections:publicRows.length,removed:removed.map(l=>({id:l.selectionId,label:l.label})),savedSelectionsMarkedMissing:store.getSnapshot().selections.length,protectedFilesPreserved:true,otherPredictionsPreserved:true};
 fs.writeFileSync('output/sosfanta-md11-2026-11-06/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
