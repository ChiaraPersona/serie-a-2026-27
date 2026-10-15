"use strict";
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {overProbability}=require('./md06-statistical-models');
const {compareThresholdBalance,minimumSportsSupportPct}=require('./md06-suggested-forecasts');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const clone=x=>structuredClone(x);
const targets=new Set(['fiorentina-como','milan-atalanta','juventus-lazio','monza-cagliari','parma-torino'].map(p=>`${p}-2026-27-md-07`));
function markCanonical(leg,target){
  leg.forecastIdentity=target;
  leg.betSelection.identity={status:'CANONICAL_MODEL_FORECAST',matchId:leg.matchId,provider:null,providerMarketId:null,providerSelectionId:null,canonicalForecastId:leg.selectionId};
  leg.betSelection.forecastIdentity=target;
  leg.betSelection.operational.playability={status:'PLAYABLE',code:null,reason:null};
  leg.betSelection.compatibility={status:'MODEL_CONTRACT',modelTarget:leg.betSelection.evaluation.provenance.modelTarget,bookmakerTarget:null};
  leg.betSelection.warnings=[];
  leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:true,quoteAvailability:'UNAVAILABLE',criteria:'EXISTING_MODEL_ADMISSION_WITHOUT_QUOTE_REQUIREMENT'};
  return leg;
}
function build(){
  const data=read('data/normalized/schedina-md07.json'),before=clone(data);
  const stats=read('data/analysis/serie-a-md07-statistical-models.json');
  const teams=new Map(read('data/normalized/teams.json').map(t=>[t.id,t.name]));
  const excluded=clone(data.marketCatalog.unquotedPublication?.excluded||[]);
  for(const match of data.marketCatalog.matches){
    if(!targets.has(match.matchId))continue;
    // These rows have already passed evaluateCandidate in the V2 integration.
    // Publish their individual standard target, never the unpriced DUO target.
    for(const leg of match.selections){
      if(leg.catalogOrigin!=='prediction-v2-player-forecast'||leg.suggestionAnalysis.suggested||leg.odds!=null)continue;
      const reference=leg.betSelection.evaluation.individualReference;
      assert(Number.isFinite(reference?.modelProbabilityPct));
      const metric=leg.suggestionAnalysis.family,count=leg.threshold+0.5;
      const family=metric==='shots'?'Tiri individuali':'Tiri in porta individuali';
      leg.market=metric==='shots'?'TIRI TOTALI GIOCATORE':'TIRI IN PORTA GIOCATORE';
      leg.marketFamily=family;leg.label=`${leg.playerName} ${count}+ ${metric==='shots'?'tiri':'tiri in porta'}`;leg.variant=leg.label;
      leg.modelProbabilityPct=reference.modelProbabilityPct;leg.fairOdds=null;leg.expectedValuePct=null;
      leg.evidenceLabel='Prediction Engine V2 4.13.0 · singolo giocatore, tempi regolamentari';
      leg.betSelection.market={...leg.betSelection.market,name:leg.market,family,variant:leg.label,subject:{type:'named-player',id:leg.playerId,name:leg.playerName,teamId:leg.teamId},bookmakerSemantics:null};
      leg.betSelection.evaluation={...leg.betSelection.evaluation,modelProbabilityPct:reference.modelProbabilityPct,status:'MODEL_FORECAST',kind:'INDIVIDUAL_PLAYER_V2',probabilitySemantics:'INDIVIDUAL_PLAYER_V2',individualReference:reference};
      markCanonical(leg,{matchId:match.matchId,scope:'player',subjectId:leg.playerId,metric,threshold:leg.threshold,direction:'OVER',period:'REGULATION',duo:false,postsAndCrossbarIncluded:false});
    }
    for(const metric of ['shots','sot'])for(const side of ['home','away']){
      const teamId=match[side+'Team'],forecast=stats.currentForecasts[match.matchId]?.[metric],gate=stats.validation.subfamilies[`${metric}-team-over`];
      if(match.selections.some(l=>l.forecastIdentity?.scope==='team'&&l.forecastIdentity.subjectId===teamId&&l.forecastIdentity.metric===metric))continue;
      if(!forecast||gate?.gate!=='PASS'){excluded.push({matchId:match.matchId,metric,teamId,reason:'FAMILY_VALIDATION_NOT_PASSED'});continue;}
      const limited=forecast.limitedHistoryTeams.length>0;
      const candidates=[];
      for(const [thresholdText,validation] of Object.entries(gate.thresholds)){
        if(validation.gate!=='PASS'){excluded.push({matchId:match.matchId,metric,teamId,threshold:Number(thresholdText),reason:'EXACT_THRESHOLD_VALIDATION_NOT_PASSED'});continue;}
        const threshold=Number(thresholdText),probability=overProbability(forecast.probabilities[side],threshold);
        // Same uncertainty deduction as buildCurrentEvaluations; no fitting.
        const deduction=Math.min(.06,Math.max(.02,Math.max(limited ? .05 : .02,validation.ece/2)));
        const central=Number((probability*100).toFixed(2)),prudent=Number((Math.max(0,probability-deduction)*100).toFixed(2));
        const selectionId=`forecast:v2:${match.matchId}:team:${teamId}:${metric}:over:${threshold}`;
        const family=metric==='shots'?'Tiri di squadra':'Tiri in porta di squadra',name=teams.get(teamId)||teamId;
        const evaluation={modelProbabilityPct:central,prudentProbabilityPct:prudent,fairOdds:null,expectedValuePct:null,conservativeExpectedValuePct:null,status:'MODEL_FORECAST',kind:'DISCRETE_COUNT_TEMPORAL_HOLDOUT',probabilitySemantics:'ABSOLUTE_EVENT',provenance:{source:'data/analysis/serie-a-md07-statistical-models.json',modelVersion:'4.13.0',modelTarget:`statistical:${metric}-team-over:${teamId}:${threshold}`,exactThresholdValidation:validation}};
        const leg={selectionId,matchId:match.matchId,fixture:`${teams.get(match.homeTeam)} – ${teams.get(match.awayTeam)}`,market:metric==='shots'?'U/O TIRI TOTALI SQUADRA':'U/O TIRI IN PORTA SQUADRA',marketFamily:family,marketScope:'team',teamId,threshold,selection:'OVER',label:`${name} ${threshold+.5}+ ${metric==='shots'?'tiri':'tiri in porta'}`,odds:null,modelProbabilityPct:central,fairOdds:null,expectedValuePct:null,catalogOrigin:'prediction-v2-team-forecast',evidenceLabel:'Distribuzione discreta già generata · validazione temporale e soglia PASS',lineupEligibility:{eligible:true,status:'not-applicable'},suggestionAnalysis:{family:metric,familyLabel:family},betSelection:{schemaVersion:1,selectionId,market:{name:metric==='shots'?'U/O TIRI TOTALI SQUADRA':'U/O TIRI IN PORTA SQUADRA',family,scope:'team',threshold,selection:'OVER',subject:{type:'team',id:teamId,name,teamId},bookmakerSemantics:null},quote:{decimal:null,availability:'UNAVAILABLE',verifiedAt:null,source:null},evaluation,operational:{classification:'INTERESSANTE',reliability:{level:limited?'Bassa':'Media'}},overlap:{overlapKey:`team:${match.matchId}:${teamId}:${metric}`,semanticKeys:[`team:${match.matchId}:${teamId}:${metric}`]}}};
        if(prudent<minimumSportsSupportPct(leg)){excluded.push({matchId:match.matchId,metric,teamId,threshold,reason:'SPORTS_SUPPORT_BELOW_MARKET_STANDARD'});continue;}
        markCanonical(leg,{matchId:match.matchId,scope:'team',subjectId:teamId,metric,threshold,direction:'OVER',period:'REGULATION',duo:false,postsAndCrossbarIncluded:false});
        candidates.push(leg);
      }
      // The existing selector admits one balanced threshold per canonical identity.
      candidates.sort(compareThresholdBalance);
      if(candidates.length){const leg=candidates[0];if(!match.selections.some(p=>p.selectionId===leg.selectionId))match.selections.push(leg);}
    }
    let rank=Math.max(0,...match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.suggestionAnalysis.rank||0));
    for(const leg of match.selections)if(leg.suggestionAnalysis?.suggested&&!leg.suggestionAnalysis.rank)leg.suggestionAnalysis.rank=++rank;
    match.suggestions=match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
    match.total=match.selections.length;
    match.evaluated=match.selections.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;
    match.notModelled=match.total-match.evaluated;
    match.suggestionSummary={total:match.suggestions.length,byFamily:match.selections.filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{})};
  }
  const previous=before.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
  const after=new Map(data.marketCatalog.matches.flatMap(m=>m.selections).map(l=>[l.selectionId,l]));
  for(const leg of previous)assert.deepEqual(after.get(leg.selectionId),leg,'Pronostico pubblicato alterato');
  for(const match of before.marketCatalog.matches)if(!targets.has(match.matchId))assert.deepEqual(data.marketCatalog.matches.find(m=>m.matchId===match.matchId),match);
  data.marketCatalog.totals.suggestions=data.marketCatalog.matches.reduce((n,m)=>n+m.suggestions.length,0);
  data.marketCatalog.totals.finalSelections=after.size;
  data.marketCatalog.totals.evaluated=[...after.values()].filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;
  data.marketCatalog.totals.notModelled=after.size-data.marketCatalog.totals.evaluated;
  data.marketCatalog.totals.suggestionsByFamily=data.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{});
  data.marketCatalog.unquotedPublication={version:1,source:'cached forecasts only',excluded};
  fs.writeFileSync('data/normalized/schedina-md07.json',JSON.stringify(data,null,2)+'\n');
  console.log(`MD7: ${data.marketCatalog.totals.suggestions} pronostici condivisi; nessuna ricerca quote o rigenerazione modello.`);
  return data;
}
module.exports={build};
if(require.main===module)build();
