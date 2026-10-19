import {createChampionsSelection} from './champions-market-ui.mjs';
import {championsAuditDisplay} from './champions-audit-display.mjs';
import {hasVerifiedPlayableQuote} from './shared-forecast-contract.mjs';

const familyLabels={result:'Risultato', 'double-chance':'Doppia chance',goals:'Gol',corners:'Corner',shots:'Tiri'};
const finite=value=>value!=null&&Number.isFinite(value);

// Presentation adapter only: the archived contracts and frozen probabilities are never rebuilt.
export async function loadChampionsWorkspace(load,matchday){
  const calendar=await load('champions-league-2026-27.json');
  const fixtures=calendar.fixtures.filter(f=>f.matchday===matchday).map(f=>({...f,readingUrl:`champions-league.html?match=${f.id}`}));
  let source,all=[];
  if(matchday===3){
    const [catalog,approved,individuals]=await Promise.all([load('champions-md03-preliminary-2026-27.json'),load('schedina-champions-md03.json'),load('champions-md03-probable-individuals-2026-27.json')]);
    source=approved;
    const approvedById=new Map(approved.slips.flatMap(s=>s.legs).map(leg=>[leg.selectionId,leg]));
    for(const fixture of catalog.fixtures)for(const market of fixture.oddsEvent.playerMarkets)for(const selection of market.selections){
      if(!selection.interfaceSelectable||selection.status!=='open'||market.status!=='open')continue;
      const leg=createChampionsSelection(fixture,market,selection),p=selection.modelProbabilityPct,ev=selection.expectedValue;
      leg.odds=selection.odds;
      leg.marketScope=market.marketScope;
      leg.marketFamily=familyLabels[market.family]||market.family;
      leg.approvedPreliminary=approvedById.has(leg.selectionId);
      leg.catalogOrigin='champions-frozen-md03';
      leg.suggestionAnalysis={suggested:finite(p),rank:leg.approvedPreliminary?0:1,family:market.family};
      leg.betSelection.market.family=leg.marketFamily;
      leg.betSelection.evaluation={status:finite(p)?'FROZEN_FORECAST':'NOT_MODELLED',modelProbabilityPct:p??null,fairOdds:finite(selection.modelProbability)&&selection.modelProbability>0?1/selection.modelProbability:null,expectedValuePct:finite(ev)?ev*100:null};
      leg.betSelection.operational.classification=leg.approvedPreliminary?'PRINCIPALE':'WATCH';
      leg.settlement=approvedById.get(leg.selectionId)?.settlement;
      if(hasVerifiedPlayableQuote(leg))all.push(leg);
    }
    for(const [id,approvedLeg] of approvedById){
      const leg=all.find(item=>item.selectionId===id);
      if(!leg||leg.odds!==approvedLeg.odds||leg.matchId!==approvedLeg.matchId)throw new Error(`Contratto CL3 approvato non corrispondente: ${id}`);
    }
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
  return {championsWorkspace:true,matchday,season:source.season,source,fixtures,all,slips:[],oddsRetrievedAt:source.oddsRetrievedAt||all[0]?.betSelection?.quote?.verifiedAt,marketCatalog:{matches}};
}
