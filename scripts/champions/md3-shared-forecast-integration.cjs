'use strict';
const assert=require('node:assert/strict');
const {integratePlayerForecasts}=require('../md06-player-forecast-integration');
const {rankShooterCandidates}=require('../predictions/rank-shooter-candidates');
const {playerBaselineStability}=require('../predictions/engine');

// Provider IDs already resolved in the canonical Champions archive. A change of
// fixture never authorizes a name-based or ambiguous player reassignment.
function exactProviderMap(individuals,odds,identityArchive){
  const registry=new Map(),conflicts=new Set();
  for(const fixture of identityArchive.fixtures)for(const market of fixture.oddsEvent.playerMarkets){
    (market.providerPlayerIds||[]).forEach((id,index)=>{
      const canonical=market.canonicalPlayerIds?.[index];if(!canonical)return;
      const key=String(id),previous=registry.get(key);
      if(previous&&previous!==canonical){registry.delete(key);conflicts.add(key);}
      if(!conflicts.has(key))registry.set(key,canonical);
    });
  }
  const map=new Map();
  for(const fixture of individuals.fixtures){
    const event=odds.events.find(e=>e.canonicalMatchId===fixture.fixtureId);assert(event);
    for(const id of new Set(event.markets.flatMap(m=>m.providerPlayerIds||[]))){
      const playerId=registry.get(String(id));if(!playerId)continue;
      const hits=fixture.teams.flatMap(t=>t.players.filter(p=>p.playerId===playerId).map(p=>({p,t})));
      if(hits.length===1){const {p,t}=hits[0];map.set(`${fixture.fixtureId}:${id}`,{playerId:p.playerId,playerName:p.canonicalName||p.sourceName,teamId:t.teamId});}
    }
  }
  return {map,conflicts:[...conflicts]};
}

function predictionRows(fixture,database){
  const rows=fixture.teams.flatMap(team=>team.players.filter(p=>p.projectedRole==='starter'&&['probable-starter','official-starter'].includes(p.availability)&&p.playerId&&!p.blockers.length&&Number.isFinite(p.projectedShots)&&Number.isFinite(p.projectedSOT)).map(p=>{
    const member=database.teams.find(t=>t.teamId===team.teamId).players.find(x=>x.playerId===p.playerId);
    const historical=member.previousSeason?.totals;
    // The existing Champions model admits only observed current-season rows.
    const channels=Object.values(p.baseline?.channels||{}),minutes=channels.reduce((n,c)=>n+c.minutes,0);
    const current=minutes?{minutes,shots:channels.reduce((n,c)=>n+(c.shots===null?0:c.shots*c.minutes/90),0),shotsOnTarget:channels.reduce((n,c)=>n+(c.sot===null?0:c.sot*c.minutes/90),0),shotsCoverage:channels.reduce((n,c)=>n+c.n,0),shotsOnTargetCoverage:channels.reduce((n,c)=>n+c.n,0)}:null;
    const stability=metric=>historical&&Number.isFinite(historical.per90?.[metric])?playerBaselineStability({historicalBaseline:p.baseline.old[metric==='shots'?'shots':'sot'],historicalObserved:historical.per90[metric],historicalMinutes:historical.minutes,current,key:metric}):null;
    const probabilities=p.eventProbabilities;
    return {playerId:p.playerId,name:p.canonicalName||p.sourceName,teamId:team.teamId,role:p.role,
      expectedMinutes:p.expectedMinutes,projectedShots:p.projectedShots,projectedShotsOnTarget:p.projectedSOT,
      shotProbabilities:{over05:probabilities.shotsOver05,over15:probabilities.shotsOver15,over25:probabilities.shotsOver25},
      shotOnTargetProbabilities:{over05:probabilities.sotOver05,over15:probabilities.sotOver15},
      playerBaselineStability:stability('shots'),playerSotBaselineStability:stability('shotsOnTarget'),
      matchupEvidence:[],qualifiedOutsider:false,qualifiedSotOutsider:false};
  }));
  return {matchId:fixture.fixtureId,engineName:'Modello Champions MD3',engineVersion:'existing-probable-lineup',
    generatedAt:null,shooters:{allPlayers:rows,totalShots:rankShooterCandidates(rows,'projectedShots','shotsOver05'),
      shotsOnTarget:rankShooterCandidates(rows,'projectedShotsOnTarget','shotsOnTargetOver05'),outsiders:[],sotOutsiders:[]}};
}

function unquotedIndividual(leg){
  const reference=leg.betSelection.evaluation.individualReference,metric=leg.suggestionAnalysis.family;
  const target={matchId:leg.matchId,scope:'player',subjectId:leg.playerId,metric,threshold:leg.threshold,direction:'OVER',period:'REGULATION',duo:false,postsAndCrossbarIncluded:false};
  const count=leg.threshold+0.5,family=metric==='shots'?'Tiri individuali':'Tiri in porta individuali';
  leg.market=metric==='shots'?'TIRI TOTALI GIOCATORE':'TIRI IN PORTA GIOCATORE';leg.marketFamily=family;
  leg.label=`${leg.playerName} ${count}+ ${metric==='shots'?'tiri':'tiri in porta'}`;leg.variant=leg.label;
  leg.forecastIdentity=target;leg.modelProbabilityPct=reference.modelProbabilityPct;
  leg.betSelection.identity={status:'CANONICAL_MODEL_FORECAST',matchId:leg.matchId,provider:null,providerMarketId:null,providerSelectionId:null,canonicalForecastId:leg.selectionId};
  leg.betSelection.forecastIdentity=target;
  leg.betSelection.market={...leg.betSelection.market,name:leg.market,family,variant:leg.label,subject:{type:'named-player',id:leg.playerId,name:leg.playerName,teamId:leg.teamId},bookmakerSemantics:null};
  leg.betSelection.evaluation={...leg.betSelection.evaluation,status:'MODEL_FORECAST',kind:'INDIVIDUAL_PLAYER_MODEL',modelProbabilityPct:reference.modelProbabilityPct,probabilitySemantics:'CONDITIONAL_ON_PROBABLE_START',fairOdds:null,expectedValuePct:null};
  leg.betSelection.operational.playability={status:'PLAYABLE',code:null,reason:null};
  leg.betSelection.operational.classificationReason='Soglia ammessa dagli stessi criteri individuali della Serie A; quota del contratto esatto non disponibile.';
  leg.betSelection.compatibility={status:'MODEL_CONTRACT',modelTarget:reference.modelTarget,bookmakerTarget:null};
  leg.betSelection.warnings=['QUOTE_UNAVAILABLE'];
  leg.evidenceLabel='Modello Champions MD3 · singolo giocatore, condizionato alla partenza da titolare';
  leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:true,criteria:'EXISTING_MODEL_ADMISSION_WITHOUT_QUOTE_REQUIREMENT',heuristicDisclosure:'Previsione individuale condizionata alla partenza da titolare; quota del contratto esatto non disponibile.'};
  return leg;
}

function buildSharedIndividualCatalog({baseMatches,individuals,database,odds,identityArchive}){
  const official=individuals.status==='official';
  const identities=exactProviderMap(individuals,odds,identityArchive);
  const predictions=individuals.fixtures.map(f=>predictionRows(f,database));
  const probableLineups={provider:'internal-probable-lineup',importedAt:individuals.source.consultedAt,
    teams:individuals.fixtures.flatMap(f=>f.teams.map(t=>({teamId:t.teamId,players:t.players.map(p=>({playerId:p.playerId,teamId:t.teamId,lineupStatus:p.projectedRole==='starter'&&p.availability==='probable-starter'?'starter':'reserve'}))})))};
  const officialLineups=official?{provider:'Diretta.it',retrievedAt:individuals.source.consultedAt,fixtures:individuals.fixtures.map(f=>({matchId:f.fixtureId,teams:f.teams.map(t=>({players:t.players.filter(p=>p.projectedRole==='starter').map(p=>({playerId:p.playerId}))}))}))}:{fixtures:[]};
  const result=integratePlayerForecasts({catalogMatches:baseMatches,predictions,odds:{...odds,normalizedPath:'data/normalized/odds/sisal/champions-league.json'},probableLineups,officialLineups,verifiedProviderPlayerMap:identities.map});
  for(const match of result.matches){
    match.selections=match.selections.map(leg=>{
      if(leg.catalogOrigin!=='prediction-v2-player-forecast')return leg;
      leg.context={competition:'champions',season:'2026-27',matchday:3};
      leg.betSelection.evaluation.individualReference.probabilitySemantics=official?'OFFICIAL_STARTER_PRELIMINARY':'CONDITIONAL_ON_PROBABLE_START';
      leg.forecastEvidence.model=official?'existing-champions-official-lineup':'existing-champions-probable-lineup';
      leg.forecastEvidence.lineupInput=official?'data/sources/champions-official-formations-md03-2026-27.json':'data/sources/champions-probable-formations-md03-2026-27.json';
      if(leg.odds===null)unquotedIndividual(leg);
      else{
        const market=odds.events.find(e=>e.canonicalMatchId===leg.matchId).markets.find(m=>m.providerMarketId===leg.providerMarketId);
        leg.betSelection.market.bookmakerSemantics.extraTimeIncluded=/INC\.?\s*T\.?S\.?|INCL\.?\s*T\.?S\.?/i.test(market.marketName+' '+market.variantName);
        leg.betSelection.identity.canonicalPlayerIds=[leg.playerId];
      }
      if(official){leg.betSelection.evaluation.probabilitySemantics='OFFICIAL_STARTER_PRELIMINARY';leg.evidenceLabel='Modello Champions MD3 · titolare ufficiale · probabilità preliminare';}
      return leg;
    });
    const selected=match.selections.filter(l=>l.suggestionAnalysis?.suggested);
    selected.forEach((l,i)=>l.suggestionAnalysis.rank=i+1);
    match.suggestions=selected.map(l=>l.selectionId);match.total=match.selections.length;
  }
  return {...result,identityConflicts:identities.conflicts,predictions};
}
module.exports={buildSharedIndividualCatalog,exactProviderMap,predictionRows};
