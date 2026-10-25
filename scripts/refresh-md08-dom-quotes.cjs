'use strict';
// Exact existing provider contracts only. No forecasts or admission rules are regenerated.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');
const sourceFile='data/sources/odds/sisal-md08-dom-2026-10-25.json',source=read(sourceFile);
const dir='output/md08-odds-refresh-2026-10-25';
const paths={odds:'data/normalized/odds/sisal/serie-a.json',predictions:'data/normalized/predictions.json',schedina:'data/normalized/schedina-md08.json',catalog:'data/normalized/reading-md08-market-catalog.json'};
const before=Object.fromEntries(Object.keys(paths).map(k=>[k,read(`${dir}/${k}-before.json`)]));
for(const [key,path] of Object.entries(paths))assert.deepEqual(read(path),before[key],'Inputs changed: '+path);
const odds=structuredClone(before.odds),quotes=new Map(source.rows.map(r=>[r.domId,r]));
assert.equal(quotes.size,32);
const matches=read('data/normalized/matches.json'),updated=new Map(),targets=new Set(),changes=[];
for(const event of odds.events){
  const fixture=matches.find(m=>m.id===event.canonicalMatchId);
  for(const market of event.markets){
    const ids=market.originalIdentifiers;
    if(!ids)continue;
    for(const selection of market.selections){
      const domId=`esito_${ids.codicePalinsesto}_${ids.codiceAvvenimento}_${ids.codiceScommessa}_${ids.idInfoAggiuntiva}_${selection.code}`;
      const row=quotes.get(domId);if(!row)continue;
      assert(fixture?.status==='scheduled');
      assert(new Date(`${fixture.date}T${fixture.kickoff}:00+01:00`)>new Date(source.retrievedAt));
      assert.equal(market.marketScope,'match');assert(['3','28319','7989'].includes(String(market.marketCode)));
      changes.push({matchId:fixture.id,providerSelectionId:selection.providerSelectionId,domId,previous:selection.odds,current:row.odds});
      selection.odds=row.odds;selection.oddsRaw=Math.round(row.odds*100);selection.status=row.status;
      selection.retrievedAt=source.retrievedAt;selection.sourceFile=sourceFile;selection.domId=domId;
      // Keep the original API identifiers and their original provenance intact.
      selection.domRefresh={sourceFile,retrievedAt:source.retrievedAt,sourceUrl:source.sourceUrl};
      updated.set(String(selection.providerSelectionId),{event,market,selection});targets.add(fixture.id);
    }
  }
}
assert.equal(updated.size,32);assert.equal(targets.size,4);
const round=v=>Number(v.toFixed(2));
function reprice(e,decimal){
  const p=e.modelProbabilityPct;
  if(Number.isFinite(p))e.expectedValuePct=round((p/100*decimal-1)*100);
  const c=e.conservativeProbabilityPct??e.prudentProbabilityPct;
  if(Number.isFinite(c))e.conservativeExpectedValuePct=round((c/100*decimal-1)*100);
}
const predictions=structuredClone(before.predictions),schedina=structuredClone(before.schedina);
let comparisons=0,linked=0;
for(const prediction of predictions.predictions){
  if(!targets.has(prediction.matchId))continue;
  for(const row of prediction.marketComparison||[]){
    const q=updated.get(String(row.providerSelectionId));if(!q)continue;
    assert.equal(q.event.canonicalMatchId,prediction.matchId);
    row.odds=q.selection.odds;reprice(row,row.odds);row.quoteVerifiedAt=source.retrievedAt;row.quoteSourceFile=sourceFile;
    comparisons++;
  }
  // Embedded MyCombo contracts receive the same exact-ID refresh.
  const walk=value=>{if(!value||typeof value!=='object')return;if(value.betSelection)refreshLeg(value,prediction.matchId);for(const [k,v]of Object.entries(value))if(k!=='betSelection')Array.isArray(v)?v.forEach(walk):walk(v);};
  walk(prediction);
}
function refreshLeg(leg,matchId){
  const b=leg.betSelection,id=String(b?.identity?.providerSelectionId??leg.providerSelectionId??''),q=updated.get(id);
  if(!q)return;
  assert.equal(q.event.canonicalMatchId,matchId);assert.equal(b.selectionId,leg.selectionId);
  assert.equal(String(b.identity.providerMarketId),String(q.market.providerMarketId));
  leg.odds=q.selection.odds;
  b.quote={...b.quote,decimal:leg.odds,verifiedAt:source.retrievedAt,marketUpdatedAt:null,availability:'AVAILABLE_AT_SNAPSHOT',source:{...b.quote.source,provider:'sisal',url:source.sourceUrl,snapshotPath:sourceFile,acquisition:'public-page-dom'}};
  reprice(b.evaluation,leg.odds);
  leg.expectedValuePct=b.evaluation.expectedValuePct;
  if(Object.hasOwn(leg,'conservativeExpectedValuePct'))leg.conservativeExpectedValuePct=b.evaluation.conservativeExpectedValuePct;
  linked++;
}
for(const match of schedina.marketCatalog.matches){
  if(!targets.has(match.matchId))continue;
  for(const leg of match.selections)refreshLeg(leg,match.matchId);
}
const catalog=structuredClone(before.catalog);catalog.marketCatalog=schedina.marketCatalog;
for(const [key,data] of Object.entries({odds,predictions,schedina,catalog}))write(paths[key],data);
for(const key of ['predictions','schedina','catalog']){
  const current=read(paths[key]),list=key==='predictions'?current.predictions:current.marketCatalog.matches,prior=key==='predictions'?before[key].predictions:before[key].marketCatalog.matches;
  assert.deepEqual(list.filter(m=>!targets.has(m.matchId)),prior.filter(m=>!targets.has(m.matchId)));
}
for(const event of odds.events)if(!targets.has(event.canonicalMatchId))assert.deepEqual(event,before.odds.events.find(e=>e.canonicalMatchId===event.canonicalMatchId));
for(const p of predictions.predictions){const old=before.predictions.predictions.find(x=>x.matchId===p.matchId);assert.deepEqual(p.shooters,old.shooters);assert.deepEqual(p.likelyBooked,old.likelyBooked);}
write(`${dir}/attempt-report.json`,{status:'PARTIAL_REFRESH',retrievedAt:source.retrievedAt,scope:source.scope,quotes:updated.size,changed:changes.filter(c=>c.previous!==c.current).length,comparisons,linkedContracts:linked,targets:[...targets],otherFixturesUnchanged:true,individualProbabilitiesUnchanged:true,completeApiCapture:'blocked: Chrome/Edge navigation and evaluation timeout',changes});
console.log({quotes:updated.size,changed:changes.filter(c=>c.previous!==c.current).length,comparisons,linkedContracts:linked});
