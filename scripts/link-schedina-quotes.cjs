'use strict';
// Reconcile already admitted forecasts with existing verified provider contracts.
// A DUO is a distinct selection: never overwrite the saved individual contract.
const fs=require('node:fs');
const {integratePlayerForecasts}=require('./md06-player-forecast-integration');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function providerIdentities(catalogs,matchIds){
  const ids=new Map();
  for(const catalog of catalogs)for(const match of catalog.matches||[])for(const leg of match.selections||[]){
    const b=leg.betSelection,p=b?.market?.bookmakerSemantics?.providerPlayerId,id=leg.playerId||b?.market?.subject?.id;
    if(b?.identity?.status!=='VERIFIED_PROVIDER_IDS'||!p||!id)continue;
    const key=String(p);if(!ids.has(key))ids.set(key,new Set());ids.get(key).add(id);
  }
  return new Map(matchIds.flatMap(matchId=>[...ids].filter(([,v])=>v.size===1).map(([id,v])=>[`${matchId}:${id}`,{playerId:[...v][0]}])));
}
function link({data,predictions,odds,fixtures,probableLineups,officialLineups,catalogs=[]}){
  const result=structuredClone(data),archived=[],changes=[];
  const providerMap=providerIdentities([...catalogs,data.marketCatalog],fixtures.map(f=>f.id));
  const fresh=integratePlayerForecasts({catalogMatches:data.marketCatalog.matches.map(m=>({...m,selections:[]})),predictions,odds,probableLineups,officialLineups,verifiedProviderPlayerMap:providerMap});
  for(const match of result.marketCatalog.matches){
    const fixture=fixtures.find(f=>f.id===match.matchId);
    if(fixture?.status!=='scheduled')continue;
    match.selections=match.selections.map(leg=>{
      if(!leg.suggestionAnalysis?.suggested||leg.betSelection?.quote?.decimal!=null)return leg;
      if(leg.marketScope==='team'){
        const target=leg.betSelection.forecastIdentity;
        if(!target||target.period!=='REGULATION'||target.duo!==false||target.postsAndCrossbarIncluded!==false)return leg;
        const code={shots:'23334',sot:'23311'}[target.metric];
        const side=leg.teamId===fixture.homeTeam?1:leg.teamId===fixture.awayTeam?2:null;
        const event=odds.events.find(e=>e.canonicalMatchId===match.matchId);
        const quotes=(event?.markets||[]).filter(m=>code&&side&&String(m.marketCode)===code&&Number(m.threshold)===target.threshold&&m.status==='open'&&new RegExp(`SQUADRA\\s*${side}\\b`).test(m.variantName)).flatMap(m=>m.selections.filter(s=>s.name==='OVER'&&s.status==='open'&&Number(s.odds)>1&&s.providerSelectionId&&m.providerMarketId).map(s=>({market:m,selection:s})));
        if(quotes.length!==1||!event.retrievedAt||!odds.provider)return leg;
        const next=structuredClone(leg),{market,selection}=quotes[0],b=next.betSelection;
        next.odds=Number(selection.odds);next.providerMarketId=String(market.providerMarketId);next.providerSelectionId=String(selection.providerSelectionId);
        b.identity={...b.identity,status:'VERIFIED_PROVIDER_IDS',provider:odds.provider,providerMarketId:next.providerMarketId,providerSelectionId:next.providerSelectionId};
        b.quote={decimal:next.odds,availability:'AVAILABLE_AT_SNAPSHOT',verifiedAt:event.retrievedAt,marketUpdatedAt:market.updatedAt,providerStatus:selection.status,source:{provider:odds.provider,url:odds.sourceUrl,snapshotPath:'data/normalized/odds/sisal/serie-a.json',rawFile:event.rawFile||odds.rawFile}};
        b.market.bookmakerSemantics={marketCode:code,marketName:market.marketName,variantName:market.variantName,selectionName:selection.name,duo:false,postsAndCrossbarIncluded:false,extraTimeIncluded:false};
        const ev=p=>Number.isFinite(p)?Number((p*next.odds-100).toFixed(2)):null;
        b.evaluation.expectedValuePct=ev(b.evaluation.modelProbabilityPct);
        b.evaluation.conservativeExpectedValuePct=ev(b.evaluation.prudentProbabilityPct);
        next.expectedValuePct=b.evaluation.expectedValuePct;
        next.suggestionAnalysis.quoteAvailability='AVAILABLE_AT_SNAPSHOT';
        b.compatibility={...b.compatibility,status:'COMPATIBLE',bookmakerTarget:market.variantName};
        changes.push({matchId:match.matchId,selectionId:next.selectionId,odds:next.odds,providerSelectionId:next.providerSelectionId,type:'exact-team-contract'});
        return next;
      }
      if(leg.marketScope!=='player')return leg;
      const candidates=(fresh.matches.find(m=>m.matchId===match.matchId)?.selections||[]).filter(l=>l.playerId===leg.playerId&&l.teamId===leg.teamId&&l.threshold===leg.threshold&&l.suggestionAnalysis?.family===leg.suggestionAnalysis?.family&&l.betSelection.quote.decimal>1&&l.betSelection.identity.status==='VERIFIED_PROVIDER_IDS');
      if(candidates.length!==1)return leg;
      const next=structuredClone(candidates[0]);
      next.selectionId=`${leg.selectionId}:duo`;
      next.betSelection.selectionId=next.selectionId;
      next.context=structuredClone(leg.context);
      next.suggestionAnalysis={...leg.suggestionAnalysis,quoteAvailability:'AVAILABLE_AT_SNAPSHOT'};
      next.isOutsider=leg.isOutsider===true;
      next.individualForecastReference={selectionId:leg.selectionId,probabilityPct:leg.betSelection.evaluation.modelProbabilityPct};
      archived.push(leg);
      changes.push({matchId:match.matchId,previousId:leg.selectionId,selectionId:next.selectionId,odds:next.odds,providerSelectionId:next.providerSelectionId});
      return next;
    });
    match.suggestions=match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
  }
  const all=result.marketCatalog.matches.flatMap(m=>m.selections);
  if(changes.length){
    result.marketCatalog.totals.evaluated=all.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;
    result.marketCatalog.totals.notModelled=all.length-result.marketCatalog.totals.evaluated;
  }
  return {data:result,archived,changes};
}
function build(matchday=8){
  const code=String(matchday).padStart(2,'0'),file=`data/normalized/schedina-md${code}.json`,catalogFile=`data/normalized/reading-md${code}-market-catalog.json`;
  const data=read(file),catalogs=[];
  for(const n of [6,7,8]){const f=`data/normalized/schedina-md0${n}.json`;if(fs.existsSync(f))catalogs.push(read(f).marketCatalog);}
  const result=link({data,catalogs,predictions:read('data/normalized/predictions.json').predictions,odds:read('data/normalized/odds/sisal/serie-a.json'),fixtures:read('data/normalized/matches.json'),probableLineups:read(`data/sources/probable-lineups-md${matchday}-2026-27.json`),officialLineups:read('data/sources/official-lineups-2026-27.json')});
  if(result.changes.length){
    const archiveFile=`data/technical-archive/md${code}-individual-forecasts-before-duo-link.json`;
    const archive=fs.existsSync(archiveFile)?read(archiveFile):[];
    const unique=new Map([...archive,...result.archived].map(l=>[l.selectionId,l]));
    fs.writeFileSync(archiveFile,JSON.stringify([...unique.values()],null,2)+'\n');
    fs.writeFileSync(file,JSON.stringify(result.data,null,2)+'\n');
    fs.writeFileSync(catalogFile,JSON.stringify({...read(catalogFile),marketCatalog:result.data.marketCatalog},null,2)+'\n');
  }
  fs.mkdirSync('output/quote-link',{recursive:true});
  fs.writeFileSync(`output/quote-link/md${code}.json`,JSON.stringify({changes:result.changes,remaining:result.data.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested&&l.betSelection?.quote?.decimal==null).map(l=>({id:l.selectionId,label:l.label}))},null,2)+'\n');
  console.log(`MD${matchday}: ${result.changes.length} quote collegate; probabilità ed EV DUO N/D.`);
  return result;
}
module.exports={link,providerIdentities,build};
if(require.main===module)build(Number(process.argv[2]||8));
