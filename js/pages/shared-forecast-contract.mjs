const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));

export function hasVerifiedPlayableQuote(leg){
  const contract=leg?.betSelection,quote=contract?.quote||{},compatibility=String(contract?.compatibility?.status||"");
  return leg?.lineupEligibility?.eligible!==false
    && contract?.operational?.playability?.status!=="NOT_PLAYABLE"
    && contract?.operational?.classification!=="ESCLUSO"
    && contract?.selectionId===leg?.selectionId
    && contract?.identity?.status==="VERIFIED_PROVIDER_IDS"
    && Boolean(contract.identity.providerSelectionId)
    && finite(quote.decimal)&&Number(quote.decimal)>0
    && Boolean(quote.verifiedAt)&&Boolean(quote.source?.provider)
    && quote.availability==="AVAILABLE_AT_SNAPSHOT"
    && !/^INCOMPATIBILE/.test(compatibility)&&compatibility!=="INCOMPATIBLE";
}

export function isUnquotedIndividualForecast(leg){
  return leg?.catalogOrigin==="prediction-v2-player-forecast"
    && ["shots","sot"].includes(leg?.suggestionAnalysis?.family)
    && leg?.betSelection?.quote?.availability==="UNAVAILABLE"
    && leg?.betSelection?.evaluation?.kind==="SISAL_DUO_PLAYER_THRESHOLD"
    && finite(leg?.betSelection?.evaluation?.individualReference?.modelProbabilityPct);
}

export function isPublishedForecast(leg){
  return leg?.lineupEligibility?.eligible!==false
    && (!globalThis.officialStarterPolicy||globalThis.officialStarterPolicy.eligible(leg))
    && leg?.forecastStatus!=="withdrawn"
    && leg?.suggestionAnalysis?.suggested===true
    && (hasVerifiedPlayableQuote(leg)||isUnquotedIndividualForecast(leg));
}

export function sharedForecastsForMatch(marketCatalog,matchId){
  const fixture=(marketCatalog?.matches||[]).find(match=>match.matchId===matchId);
  return (fixture?.selections||[])
    .filter(isPublishedForecast)
    .sort((left,right)=>Number(left.suggestionAnalysis?.rank??Number.MAX_SAFE_INTEGER)-Number(right.suggestionAnalysis?.rank??Number.MAX_SAFE_INTEGER)||String(left.selectionId).localeCompare(String(right.selectionId),"it"));
}

export function forecastView(leg,matchday=null){
  const contract=leg?.betSelection||{},market=contract.market||{},quote=contract.quote||{},subject=market.subject||{};
  return {
    id:leg?.selectionId||null,
    matchId:leg?.matchId||contract.identity?.matchId||null,
    matchday,
    market:market.name||leg?.market||null,
    marketFamily:leg?.suggestionAnalysis?.familyLabel||market.family||leg?.marketFamily||null,
    selection:leg?.label||market.selection||leg?.selection||null,
    player:subject.type?.includes("player")?{id:subject.id??leg?.playerId??null,name:subject.name??leg?.playerName??null,teamId:subject.teamId??leg?.teamId??null}:null,
    threshold:market.threshold??leg?.threshold??null,
    modifier:market.selection||leg?.selection||null,
    odds:finite(quote.decimal)?Number(quote.decimal):null,
    technicalMotivation:leg?.evidenceLabel||leg?.suggestionAnalysis?.heuristicDisclosure||contract.operational?.classificationReason||"Motivazione tecnica N/D",
    status:hasVerifiedPlayableQuote(leg)?"selected-playable":"selected-without-quote",
    provenance:{source:leg?.catalogOrigin||contract.evaluation?.provenance?.source||null,updatedAt:quote.marketUpdatedAt||contract.evaluation?.provenance?.predictionGeneratedAt||null},
  };
}
