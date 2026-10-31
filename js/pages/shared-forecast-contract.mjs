const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
export const MINIMUM_PUBLIC_ODDS=1.08;
export function meetsMinimumPublicOdds(leg){
  const matchId=leg?.betSelection?.identity?.matchId||leg?.matchId||leg?.fixtureId||leg?.forecastIdentity?.matchId;
  const context=leg?.context;
  const applies=matchId?/-2026-27-md-10$/.test(matchId)
    :context?.competition==='serie-a'&&context?.season==='2026-27'&&Number(context?.matchday)===10;
  if(!applies)return true;
  const decimal=leg?.betSelection?.quote?.decimal??leg?.quote?.decimal??leg?.linkedSisalQuote?.decimal??leg?.odds;
  return !finite(decimal)||Number(decimal)>=MINIMUM_PUBLIC_ODDS;
}
export const usesCurrentForecastPolicy=leg=>Number(leg?.context?.matchday)>=6||leg?.context?.forecastPolicy==='SERIE_A_CURRENT';

export function isCanonicalModelForecast(leg){
  const bet=leg?.betSelection,target=bet?.forecastIdentity,id=bet?.identity;
  return Boolean(leg?.selectionId&&bet?.selectionId===leg.selectionId
    &&id?.canonicalForecastId===leg.selectionId&&target?.matchId===id.matchId
    &&/^forecast:v2:/.test(leg.selectionId)
    &&(/-2026-27-md-(?:0[7-9]|[12]\d|3[0-8])$/.test(target.matchId)||(leg.context?.competition==='champions'&&leg.context?.matchday===3&&/^ucl-2026-27-md03-\d{2}$/.test(target.matchId)))
    &&['player','team'].includes(target.scope)&&['shots','sot'].includes(target.metric)
    &&target.subjectId&&Number.isFinite(target.threshold)&&target.direction==='OVER'
    &&target.period==='REGULATION'&&target.duo===false
    &&bet.operational?.playability?.status==='PLAYABLE');
}

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

export function isPublishedForecast(leg,{archived=false}={}){
  return meetsMinimumPublicOdds(leg)&&leg?.lineupEligibility?.eligible!==false
    && (!globalThis.officialStarterPolicy||globalThis.officialStarterPolicy.eligible(leg))
    && leg?.forecastStatus!=="withdrawn"
    && leg?.suggestionAnalysis?.suggested===true
    && (hasVerifiedPlayableQuote(leg)||isUnquotedIndividualForecast(leg)||isCanonicalModelForecast(leg));
}

export function uniqueForecastContracts(rows,getLeg=row=>row){
  const seen=new Set();
  return rows.filter(row=>{
      const leg=getLeg(row);
      const identity=leg.betSelection?.identity,provider=leg.betSelection?.quote?.source?.provider;
      // A quoted model forecast can alias an existing bookmaker selection.
      // Provider IDs identify the contract; labels and internal IDs do not.
      const key=hasVerifiedPlayableQuote(leg)&&provider&&identity.providerMarketId&&identity.providerSelectionId
        ?JSON.stringify([provider,identity.matchId,identity.providerMarketId,identity.providerSelectionId])
        :leg.providerSelectionId&&(leg.matchId||leg.fixtureId)
          ?JSON.stringify(['legacy',leg.matchId||leg.fixtureId,leg.providerSelectionId])
          :leg.selectionId;
      if(!key)return true;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
}

export function publicForecastLabel(leg){
  const label=leg?.label||'',market=leg?.betSelection?.market||{};
  const scope=market.subject?.type||leg?.marketScope||'';
  if(/player/.test(scope)||leg?.marketScope==='player')return label;
  const threshold=market.threshold??leg?.threshold;
  if(threshold===null||threshold===undefined||!Number.isFinite(Number(threshold)))return label;
  // Display the existing threshold; never change the underlying contract.
  const suffix=/ tiri in porta$/.test(label)?'tiri in porta':/ tiri(?: totali)?$/.test(label)?'tiri totali':null;
  if(!suffix)return label;
  const match=label.match(/^(.*?) (?:\d+\+|over \d+(?:[.,]\d+)?) tiri(?: totali| in porta)?$/i);
  return match?`${match[1]} over ${Number(threshold)} ${suffix}`:label;
}

function teamShotEventKey(leg,fixture){
  const bet=leg.betSelection,market=bet?.market||{},target=bet?.forecastIdentity;
  if(isCanonicalModelForecast(leg)&&target.scope==='team'&&target.period==='REGULATION'
    &&target.duo===false&&target.postsAndCrossbarIncluded===false){
    return JSON.stringify([target.matchId,target.subjectId,target.metric,target.threshold,target.direction]);
  }
  const metric=String(bet?.compatibility?.modelTarget||'').match(/^statistical:(shots|sot)-team-over$/)?.[1];
  const semantics=market.bookmakerSemantics;
  if(!hasVerifiedPlayableQuote(leg)||!metric||!semantics||semantics.duo!==false
    ||semantics.substituteIncluded!==false||semantics.postsAndCrossbarIncluded!==false
    ||semantics.extraTimeIncluded!==false||market.selection!=='OVER'||!finite(market.threshold))return null;
  const side=String(semantics.variantName||market.variant||'').match(/^SQUADRA ([12]): U\/O /)?.[1];
  const teamId=side==='1'?fixture?.homeTeam:side==='2'?fixture?.awayTeam:null;
  return teamId?JSON.stringify([bet.identity.matchId,teamId,metric,Number(market.threshold),'OVER']):null;
}

export function sharedForecastsForMatch(marketCatalog,matchId,match=null){
  const fixture=(marketCatalog?.matches||[]).find(match=>match.matchId===matchId);
  const published=uniqueForecastContracts((fixture?.selections||[])
    .filter(leg=>isPublishedForecast(leg,{archived:match?.id===matchId&&match?.status==='finished'}))
    .sort((left,right)=>Number(left.suggestionAnalysis?.rank??Number.MAX_SAFE_INTEGER)-Number(right.suggestionAnalysis?.rank??Number.MAX_SAFE_INTEGER)||String(left.selectionId).localeCompare(String(right.selectionId),"it")));
  const teams={homeTeam:match?.homeTeam||fixture?.homeTeam,awayTeam:match?.awayTeam||fixture?.awayTeam};
  const quotedEvents=new Set(published.filter(hasVerifiedPlayableQuote).map(leg=>teamShotEventKey(leg,teams)).filter(Boolean));
  // Keep the quoted row when an unquoted team model describes the same event.
  // Never transfer its probability/price or collapse individual and DUO contracts.
  return published.filter(leg=>hasVerifiedPlayableQuote(leg)||!quotedEvents.has(teamShotEventKey(leg,teams)))
    .map(leg=>publicForecastLabel(leg)===leg.label?leg:{...leg,label:publicForecastLabel(leg)});
}

export function forecastView(leg,matchday=null){
  const contract=leg?.betSelection||{},market=contract.market||{},quote=contract.quote||{},subject=market.subject||{};
  return {
    id:leg?.selectionId||null,
    matchId:leg?.matchId||contract.identity?.matchId||null,
    matchday,
    market:market.name||leg?.market||null,
    marketFamily:leg?.suggestionAnalysis?.familyLabel||market.family||leg?.marketFamily||null,
    selection:publicForecastLabel(leg)||market.selection||leg?.selection||null,
    player:subject.type?.includes("player")?{id:subject.id??leg?.playerId??null,name:subject.name??leg?.playerName??null,teamId:subject.teamId??leg?.teamId??null}:null,
    threshold:market.threshold??leg?.threshold??null,
    modifier:market.selection||leg?.selection||null,
    odds:finite(quote.decimal)?Number(quote.decimal):null,
    probability:finite(contract.evaluation?.modelProbabilityPct)?Number(contract.evaluation.modelProbabilityPct):null,
    expectedValue:finite(contract.evaluation?.expectedValuePct)?Number(contract.evaluation.expectedValuePct):null,
    canonicalModelForecast:isCanonicalModelForecast(leg),
    technicalMotivation:leg?.evidenceLabel||leg?.suggestionAnalysis?.heuristicDisclosure||contract.operational?.classificationReason||"Motivazione tecnica N/D",
    status:hasVerifiedPlayableQuote(leg)?"selected-playable":"selected-without-quote",
    provenance:{source:leg?.catalogOrigin||contract.evaluation?.provenance?.source||null,updatedAt:quote.marketUpdatedAt||contract.evaluation?.provenance?.predictionGeneratedAt||null},
  };
}
