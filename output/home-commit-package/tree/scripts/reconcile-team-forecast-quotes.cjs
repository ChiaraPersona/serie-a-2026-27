'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Join cached team forecasts to exact, verified pre-match contracts. Never choose another line.
function reconcile(data,odds){
 const changes=[];
 for(const match of data.marketCatalog?.matches||[]){
  const events=(odds.events||[]).filter(e=>e.canonicalMatchId===match.matchId);if(events.length!==1)continue;const event=events[0];
  const verifiedAt=event.retrievedAt||odds.retrievedAt;
  // Historical repairs must use a snapshot acquired before kickoff.
  if(!verifiedAt||!event.startsAt||!(Date.parse(verifiedAt)<Date.parse(event.startsAt)))continue;
  for(const leg of match.selections||[]){
   if(leg.catalogOrigin!=='prediction-v2-team-forecast'||leg.odds!=null||leg.betSelection?.quote?.decimal!=null)continue;
   const target=leg.forecastIdentity,bet=leg.betSelection,metric=target?.metric;
   if(!target||target.matchId!==match.matchId||target.scope!=='team'||target.period!=='REGULATION'||target.duo!==false||target.direction!=='OVER'||leg.selection!=='OVER'||!['shots','sot'].includes(metric))continue;
   if(target.subjectId!==leg.teamId||target.threshold!==leg.threshold||bet?.market?.subject?.id!==leg.teamId)continue;
   const side=leg.teamId===match.homeTeam?1:leg.teamId===match.awayTeam?2:null;if(!side)continue;
   const name=metric==='shots'?'U/O TIRI TOTALI SQUADRA X':'U/O TIRI IN PORTA SQUADRA X';
   const variant=`SQUADRA ${side}: U/O ${leg.threshold} ${metric==='shots'?'TIRI TOTALI':'TIRI IN PORTA'}`;
   const markets=(event.markets||[]).filter(m=>m.marketName===name&&m.variantName===variant&&Number(m.threshold)===leg.threshold&&m.status==='open'&&m.providerMarketId&&m.identifierProvenance?.kind==='provider-response');
   if(markets.length!==1)continue;const market=markets[0];
   const selections=(market.selections||[]).filter(s=>s.name==='OVER'&&s.status==='open'&&Number.isFinite(s.odds)&&s.odds>1&&s.providerSelectionId&&s.identifierProvenance?.kind==='provider-response');if(selections.length!==1)continue;const selection=selections[0];
   leg.odds=selection.odds;leg.providerMarketId=market.providerMarketId;leg.providerSelectionId=selection.providerSelectionId;
   bet.identity={...bet.identity,status:'VERIFIED_PROVIDER_IDS',provider:'sisal',providerMarketId:market.providerMarketId,providerSelectionId:selection.providerSelectionId};
   bet.quote={decimal:selection.odds,availability:'AVAILABLE_AT_SNAPSHOT',verifiedAt,marketUpdatedAt:market.updatedAt,providerStatus:selection.status,source:{provider:'sisal',url:odds.sourceUrl||'https://www.sisal.it/scommesse-matchpoint/quote/calcio/serie-a?cluster=27&cde=1000001',snapshotPath:'data/normalized/odds/sisal/serie-a.json',rawFile:event.rawFile||odds.rawFile||null}};
   bet.market.bookmakerSemantics={marketName:market.marketName,variantName:market.variantName,selectionName:selection.name,marketCode:market.marketCode,teamId:leg.teamId,period:'REGULATION',duo:false,extraTimeIncluded:false};
   bet.compatibility={...bet.compatibility,status:'COMPATIBLE',bookmakerTarget:bet.evaluation?.provenance?.modelTarget||null};
   leg.suggestionAnalysis={...leg.suggestionAnalysis,quoteAvailability:'AVAILABLE_AT_SNAPSHOT'};
   changes.push({matchId:match.matchId,selectionId:leg.selectionId,teamId:leg.teamId,metric,threshold:leg.threshold,odds:leg.odds,providerSelectionId:selection.providerSelectionId,verifiedAt});
  }
 }
 return changes;
}
module.exports={reconcile};
if(require.main===module){
 const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');const read=f=>storageReadJson(f);const day=process.argv[2];assert(/^\d+$/.test(day),'Specify matchday');const code=String(Number(day)).padStart(2,'0'),file=`data/normalized/schedina-md${code}.json`,sharedFile=`data/normalized/reading-md${code}-market-catalog.json`,data=read(file),shared=read(sharedFile),odds=read('data/normalized/odds/sisal/serie-a.json');
 const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),protectedFiles=['data/normalized/predictions.json','data/normalized/matches.json','data/normalized/odds/sisal/serie-a.json'];const hashes=Object.fromEntries(protectedFiles.map(f=>[f,hash(f)]));
 const before=structuredClone(data),changes=reconcile(data,odds),dir=`output/team-quote-link-md${code}`;fs.mkdirSync(dir,{recursive:true});
 if(changes.length){fs.writeFileSync(dir+'/before.json.gz',require('zlib').gzipSync(JSON.stringify(before)));fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');shared.marketCatalog=data.marketCatalog;fs.writeFileSync(sharedFile,JSON.stringify(shared,null,2)+'\n');}
 for(const [f,h]of Object.entries(hashes))assert.equal(hash(f),h);
 fs.writeFileSync(dir+'/report.json',JSON.stringify({changes,protectedHashes:hashes,missing:data.marketCatalog.matches.flatMap(m=>m.selections.filter(l=>l.catalogOrigin==='prediction-v2-team-forecast'&&l.odds==null).map(l=>l.selectionId))},null,2)+'\n');console.log(`Linked ${changes.length} exact team quotes`);
}
