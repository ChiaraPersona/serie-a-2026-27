'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const sourcePath='data/sources/champions-md04-user-publication-exceptions.json';
function applyUserPublicationExceptions(catalog,odds,registry){
 if(!fs.existsSync(path.join(root,sourcePath)))return catalog;
 const source=JSON.parse(fs.readFileSync(path.join(root,sourcePath),'utf8'));
 assert.equal(source.authorization.waivedGate,'TEAM_RECONCILIATION_NOT_PASSED');
 assert.equal(source.authorization.statisticalApproval,false);
 assert.equal(source.selections.length,3);
 const match=catalog.marketCatalog.matches.find(m=>m.matchId===source.fixtureId);
 if(!match)return catalog;
 const event=odds.events.find(e=>e.canonicalMatchId===source.fixtureId);assert(event);
 for(const saved of source.selections){
  assert.equal(saved.matchId,source.fixtureId);
  assert(registry[source.fixtureId]?.ids.includes(saved.playerId),'Official starter required');
  const leg=structuredClone(saved),bet=leg.betSelection;
  const market=event.markets.find(m=>m.providerMarketId===bet.identity.providerMarketId);
  const selection=market?.selections.find(s=>s.providerSelectionId===bet.identity.providerSelectionId);
  assert(selection&&selection.odds===bet.quote.decimal&&selection.odds===leg.odds,'Verified contract price changed');
  assert.equal(Number(market.threshold),Number(bet.market.threshold));
  assert(bet.market.bookmakerSemantics.duo&&bet.market.bookmakerSemantics.substituteIncluded);
  assert(leg.odds>=1.08);
  leg.context={...leg.context,competition:'champions',season:'2026-27',matchday:4,forecastPolicy:'SERIE_A_CURRENT'};
  leg.qualifiedSelection=false;leg.approvedPreliminary=false;leg.selectionStatus='PRELIMINARY';
  leg.publication={...leg.publication,status:'PRELIMINARY',userAuthorizedException:{sourcePath,waivedGate:source.authorization.waivedGate},reasons:[...new Set([...(leg.publication?.reasons||[]),'USER_AUTHORIZED_RECONCILIATION_EXCEPTION'])]};
  leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:true,reasons:[...new Set([...(leg.suggestionAnalysis?.reasons||[]),'USER_AUTHORIZED_RECONCILIATION_EXCEPTION'])]};
  leg.forecastEvidence={...leg.forecastEvidence,lineupInput:'data/sources/champions-official-formations-md04-2026-27.json',userPublicationException:sourcePath};
  for(const key of ['modelProbabilityPct','prudentProbabilityPct','fairOdds','expectedValuePct','conservativeExpectedValuePct']){bet.evaluation[key]=null;if(key in leg)leg[key]=null;}
  bet.evaluation.status='DUO_PROBABILITY_UNAVAILABLE';bet.evaluation.probabilitySemantics='DUO_CONTRACT_UNAVAILABLE';
  if(bet.evaluation.individualReference)bet.evaluation.individualReference.appliedToDuo=false;
  bet.operational={...bet.operational,classification:'WATCH'};
  match.selections=match.selections.filter(l=>l.selectionId!==leg.selectionId);match.selections.push(leg);
 }
 match.suggestions=match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
 match.total=match.selections.length;
 const selected=catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
 Object.assign(catalog.summary,{selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length});
 return catalog;
}
module.exports={applyUserPublicationExceptions};
