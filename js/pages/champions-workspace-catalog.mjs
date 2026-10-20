import {createChampionsSelection} from './champions-market-ui.mjs';
import {md3IndividualMarkets,md3IndividualCandidates} from './champions-md3-individual-markets.mjs';
import {championsAuditDisplay} from './champions-audit-display.mjs';
import {hasVerifiedPlayableQuote} from './shared-forecast-contract.mjs';

const familyLabels={result:'Risultato', 'double-chance':'Doppia chance',goals:'Gol',corners:'Corner',shots:'Tiri','team-shots':'Tiri squadra','team-sot':'SOT squadra','team-corners':'Corner squadra'};
const finite=value=>value!=null&&Number.isFinite(value);
function applySelectionRequirements(leg,requirements){
  if(!requirements)return leg;
  // Central probabilities and historical quote contracts remain authoritative.
  if(requirements.evaluation.modelProbabilityPct!==leg.betSelection.evaluation.modelProbabilityPct)throw Error('CL3 selection requirements: frozen probability mismatch');
  const evidence=requirements.quoteEvidence,quote=leg.betSelection.quote;
  if(!evidence||evidence.decimal!==quote.decimal||evidence.verifiedAt!==quote.verifiedAt||evidence.providerSelectionId!==(leg.betSelection.identity.providerSelectionId||null))throw Error('CL3 selection requirements: quote contract mismatch');
  leg.betSelection.evaluation={...leg.betSelection.evaluation,...requirements.evaluation};
  leg.betSelection.operational.reliability=requirements.reliability;
  leg.scenarioAnalysis=requirements.scenarioAnalysis;
  leg.selectionStatus=requirements.selectionStatus;
  leg.qualifiedSelection=requirements.qualifiedSelection;
  if(!leg.approvedPreliminary)leg.suggestionAnalysis=requirements.suggestionAnalysis;
  return leg;
}

// Presentation adapter only: the archived contracts and frozen probabilities are never rebuilt.
export async function loadChampionsWorkspace(load,matchday){
  const calendar=await load('champions-league-2026-27.json');
  const fixtures=calendar.fixtures.filter(f=>f.matchday===matchday).map(f=>({...f,readingUrl:`champions-league.html?match=${f.id}`}));
  let source,all=[],teamForecasts=null;
  if(matchday===3){
    const [catalog,approved,individuals]=await Promise.all([load('champions-md03-preliminary-2026-27.json'),load('schedina-champions-md03.json'),load('champions-md03-probable-individuals-2026-27.json')]);
    source=approved;
    teamForecasts=new Map(catalog.fixtures.map(f=>[f.fixtureId,f.forecast]));
    if(approved.marketCatalog?.policy==='SHARED_SERIE_A_LINEUP_FORECASTS'){
      if(approved.lineupInput.sha256!==individuals.source.sha256)throw new Error('Rigenerare i pronostici Champions dopo la modifica delle probabili formazioni');
      all=approved.marketCatalog.matches.flatMap(m=>m.selections);
      if(all.some(leg=>!fixtures.some(f=>f.id===leg.matchId)))throw new Error('Fixture Champions estranea alla giornata');
      return {championsWorkspace:true,lineupManaged:true,matchday,teamForecasts,season:approved.season,source:approved,fixtures,all,slips:[],oddsRetrievedAt:approved.oddsRetrievedAt,marketCatalog:approved.marketCatalog};
    }
    const approvedById=new Map(approved.slips.flatMap(s=>s.legs).map(leg=>[leg.selectionId,leg]));
    for(const fixture of catalog.fixtures)for(const market of fixture.oddsEvent.playerMarkets)for(const selection of market.selections){
      if(!selection.interfaceSelectable||selection.status!=='open'||market.status!=='open')continue;
      const leg=createChampionsSelection(fixture,market,selection),p=selection.modelProbabilityPct,ev=selection.expectedValue;
      leg.odds=selection.odds;
      leg.marketScope=market.marketScope;
      leg.marketFamily=familyLabels[market.family]||market.family;
      leg.approvedPreliminary=approvedById.has(leg.selectionId);
      leg.catalogOrigin='champions-frozen-md03';
      leg.suggestionAnalysis={suggested:leg.approvedPreliminary,rank:leg.approvedPreliminary?0:1,family:market.family};
      leg.betSelection.market.family=leg.marketFamily;
      if(market.subject)leg.betSelection.market.subject=market.subject;
      leg.betSelection.evaluation={status:finite(p)?'FROZEN_FORECAST':'NOT_MODELLED',modelProbabilityPct:p??null,fairOdds:finite(selection.modelProbability)&&selection.modelProbability>0?1/selection.modelProbability:null,expectedValuePct:finite(ev)?ev*100:null};
      leg.betSelection.operational.classification=leg.approvedPreliminary?'PRINCIPALE':'WATCH';
      leg.settlement=approvedById.get(leg.selectionId)?.settlement;
      applySelectionRequirements(leg,selection.selectionRequirements);
      if(hasVerifiedPlayableQuote(leg))all.push(leg);
    }
    for(const [id,approvedLeg] of approvedById){
      const leg=all.find(item=>item.selectionId===id);
      if(!leg||leg.odds!==approvedLeg.odds||leg.matchId!==approvedLeg.matchId)throw new Error(`Contratto CL3 approvato non corrispondente: ${id}`);
    }
    // Match a forecast to a Sisal contract only with exact verified player ID,
    // compatible market semantics and a unique provider selection.
    const shortlisted=new Map(md3IndividualMarkets(individuals).map(leg=>[leg.selectionId,leg]));
    const individualForecasts=md3IndividualCandidates(individuals).map(candidate=>shortlisted.get(candidate.selectionId)||candidate).map(forecast=>{
      const matches=all.filter(leg=>{
        const bet=leg.betSelection,market=bet?.market||{},identity=bet?.identity||{};
        const playerIds=identity.canonicalPlayerIds||[];
        const modifiers=market.modifiers||{};
        const family=String(leg.suggestionAnalysis?.family||"").toLowerCase();
        const expectedFamily=forecast.marketFamily==="SOT"?"sot":"shots";
        const threshold=Number(market.threshold);
        const compatibleThreshold=Number.isFinite(threshold)&&(Math.abs(threshold-(forecast.threshold-0.5))<0.001||Math.abs(threshold-forecast.threshold)<0.001);
        const name=String(market.name||"").toLowerCase();
        const isSot=/porta|sot|on.target/.test(name);
        const isShots=/tiri|shots/.test(name);
        const noExtraConditions=!modifiers.replacementIncluded&&!modifiers.woodworkIncluded&&!modifiers.firstHalf&&!modifiers.bothHalves&&!modifiers.periodScope&&!modifiers.duo;
        return leg.matchId===forecast.matchId&&playerIds.length===1&&playerIds[0]===forecast.playerId
          &&family===expectedFamily&&compatibleThreshold&&noExtraConditions
          &&(expectedFamily==="sot"?isSot:isShots&&!isSot)&&hasVerifiedPlayableQuote(leg);
      });
      if(matches.length!==1)return forecast;
      const quote=matches[0].betSelection.quote;
      const decimal=Number(quote.decimal),probability=forecast.modelProbability;
      return {...forecast,linkedSisalQuote:{decimal,verifiedAt:quote.verifiedAt,providerSelectionId:matches[0].betSelection.identity.providerSelectionId,
        impliedProbabilityPct:100/decimal,expectedValuePct:(probability*decimal-1)*100}};
    });
    const individualRequirements=new Map(catalog.fixtures.flatMap(f=>(f.individualForecasts||[]).map(row=>[row.selectionId,row.selectionRequirements])));
    all=all.concat(individualForecasts.map(leg=>applySelectionRequirements(leg,individualRequirements.get(leg.selectionId))));
  }else if(matchday===2){
    source=championsAuditDisplay(await load('schedina-champions-md02.json'),await load('champions-md02-audit-display.json'));
    all=source.fixtures.flatMap(f=>f.selections).map(leg=>({...leg,suggestionAnalysis:{suggested:true,rank:0}}));
  }else if(matchday===1){
    source=await load('schedina-champions-md01.json');
    // These keys identify archived display rows, not newly verified Sisal identities.
    const unique=new Map();
    for(const original of source.slips.flatMap(s=>s.legs)){
      const selectionId=original.selectionId||`archive:champions:md01:${original.matchId}:${original.providerMarketId}:${original.providerSelectionId}`;
      if(unique.has(selectionId))continue;
      unique.set(selectionId,{...original,selectionId,context:{competition:'champions',season:source.season,matchday},auditDisplayOnly:true,suggestionAnalysis:{suggested:true,rank:0},betSelection:{
        selectionId,identity:{status:'ARCHIVED_DISPLAY_ONLY',matchId:original.matchId,providerMarketId:original.providerMarketId,providerSelectionId:original.providerSelectionId},
        market:{name:original.market,family:original.marketFamily,selection:original.selection,variant:original.variantName},
        quote:{decimal:original.odds},evaluation:{modelProbabilityPct:original.modelProbabilityPct??null,fairOdds:original.fairOdds??null,expectedValuePct:original.expectedValuePct??null}
      }});
    }
    all=[...unique.values()];
  }else throw new Error('Giornata Champions non supportata');
  const matches=fixtures.map(f=>({matchId:f.id,selections:all.filter(leg=>leg.matchId===f.id)}));
  if(all.some(leg=>!fixtures.some(f=>f.id===leg.matchId)))throw new Error('Fixture Champions estranea alla giornata');
  return {championsWorkspace:true,matchday,teamForecasts,season:source.season,source,fixtures,all,slips:[],oddsRetrievedAt:source.oddsRetrievedAt||all[0]?.betSelection?.quote?.verifiedAt,marketCatalog:{matches}};
}
