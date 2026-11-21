'use strict';
const assert=require('node:assert/strict');
const {buildProviderPlayerMap,integratePlayerForecasts}=require('./md06-player-forecast-integration');
// Retain exact canonical/provider links already verified in the published snapshot.
// Candidate admission and forecast calculation remain in the existing integration.
module.exports=function repair({matches,previousMatches,predictions,odds,probableLineups,officialLineups}){
 const map=buildProviderPlayerMap(predictions,odds);
 for(const match of previousMatches)for(const leg of match.selections){
  const bet=leg.betSelection,sem=bet?.market?.bookmakerSemantics;
  if(bet?.identity?.status!=='VERIFIED_PROVIDER_IDS'||!sem?.duo||!leg.playerId)continue;
  const event=odds.events.find(e=>e.canonicalMatchId===match.matchId);
  const market=event?.markets.find(m=>String(m.providerMarketId)===String(bet.identity.providerMarketId));
  const selection=market?.selections.find(s=>String(s.providerSelectionId)===String(bet.identity.providerSelectionId));
  assert(selection&&selection.odds===bet.quote.decimal,'Verified quote changed: '+leg.selectionId);
  assert.equal(Number(market.threshold),Number(bet.market.threshold));
  assert.equal(market.marketName,sem.marketName);assert.equal(market.variantName,sem.variantName);
  assert(market.providerPlayerIds.map(String).includes(String(sem.providerPlayerId)));
  const key=match.matchId+':'+sem.providerPlayerId,previous=map.get(key);
  assert(!previous||previous.playerId===leg.playerId,'Conflicting provider identity');
  map.set(key,{playerId:leg.playerId,playerName:bet.market.subject.name,teamId:bet.market.subject.teamId});
 }
 const base=matches.map(m=>({...m,selections:m.selections.filter(s=>s.catalogOrigin!=='prediction-v2-player-forecast')}));
 return integratePlayerForecasts({catalogMatches:base,predictions,odds,probableLineups,officialLineups,verifiedProviderPlayerMap:map}).matches;
};
