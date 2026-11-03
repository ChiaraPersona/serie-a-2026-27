'use strict';
// Exact full-match contracts. Point estimates never become threshold probabilities.
const families={'975':'Corner','9904':'Corner','9905':'Corner','15474':'Tiri totali','15475':'Tiri in porta','15481':'Tiri in porta','15859':'Tiri totali','21370':'Corner','23060':'Corner','23311':'Tiri in porta','23334':'Tiri totali','30836':'Tiri in porta'};
async function addTeamVolumeMarkets(catalog,odds){
 const {createChampionsSelection}=await import('../../js/pages/champions-market-ui.mjs');
 for(const match of catalog.marketCatalog.matches){
  match.selections=match.selections.filter(l=>l.catalogOrigin!=='champions-md04-team-volumes');
  if(!match.forecastCoverage?.teamProjections?.length||!Number.isFinite(match.forecastCoverage?.result?.home))continue;
  const event=odds.events.find(e=>e.canonicalMatchId===match.matchId);
  if(!event)continue;
  const existing=new Set(match.selections.map(l=>l.selectionId));
  for(const market of event.markets){
   const family=families[market.marketCode];
   if(!family||market.status!=='open'||market.marketScope!=='match'||market.providerPlayerIds.length||(market.periodScope&&market.periodScope!=='full-match'))continue;
   for(const selection of market.selections){
    if(selection.status!=='open'||!Number.isFinite(selection.odds)||selection.odds<1.08||!selection.providerSelectionId||selection.name==='X')continue;
    const selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
    if(existing.has(selectionId))continue;
    const leg=createChampionsSelection({fixtureId:match.matchId,homeTeam:match.homeTeam,awayTeam:match.awayTeam,matchday:4,oddsEvent:{providerEventId:event.providerEventId,retrievedAt:event.retrievedAt||odds.retrievedAt}},{...market,canonicalPlayerIds:[],forecastCompatibility:'TEAM_VOLUME_PROBABILITY_UNAVAILABLE',modifiers:{...market.modifiers,periodScope:'full-match'}},{...selection,selectionId,quoteAvailability:'AVAILABLE_AT_SNAPSHOT'});
    Object.assign(leg,{odds:selection.odds,selection:selection.name,threshold:market.threshold,marketScope:'match',marketFamily:family,catalogOrigin:'champions-md04-team-volumes',modelProbabilityPct:null,fairOdds:null,expectedValuePct:null,qualifiedSelection:false,selectionStatus:'NOT_SELECTED',evidenceLabel:'Opzione manuale · probabilità ed EV N/D',suggestionAnalysis:{suggested:false,rank:null,reasons:['TEAM_VOLUME_PROBABILITY_UNAVAILABLE']}});
    leg.betSelection.market.selection=selection.name;
    leg.betSelection.evaluation={status:'TEAM_VOLUME_PROBABILITY_UNAVAILABLE',modelProbabilityPct:null,prudentProbabilityPct:null,fairOdds:null,expectedValuePct:null};
    match.selections.push(leg);existing.add(selectionId);
   }
  }
 }
 return catalog;
}
module.exports={addTeamVolumeMarkets};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..'),file=path.join(root,'data/normalized/schedina-champions-md04.json');
 const catalog=JSON.parse(fs.readFileSync(file,'utf8')),odds=require('../sisal/dataset-store.cjs').readJsonFile(path.join(root,'data/normalized/odds/sisal/champions-league.json'));
 addTeamVolumeMarkets(catalog,odds).then(result=>{fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');console.log('Team volume contracts: '+result.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.catalogOrigin==='champions-md04-team-volumes').length);}).catch(e=>{console.error(e);process.exitCode=1;});
}
