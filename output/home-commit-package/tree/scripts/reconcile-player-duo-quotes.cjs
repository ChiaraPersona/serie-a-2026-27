'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('fs');
const {buildProviderPlayerMap,compatibleQuote,playerForecastLeg}=require('./md06-player-forecast-integration');
function reconcile(data,predictions,odds){
 const map=buildProviderPlayerMap(predictions,odds),changes=[];
 for(const match of data.marketCatalog?.matches||[]){const prediction=predictions.find(p=>p.matchId===match.matchId);if(!prediction)continue;
 match.selections=match.selections.map(old=>{const metric=old.suggestionAnalysis?.family;if(old.catalogOrigin!=='prediction-v2-player-forecast'||!['shots','sot'].includes(metric))return old;
 const player=prediction.shooters?.allPlayers?.find(p=>p.playerId===old.playerId);if(!player)return old;
 const count=Number(old.threshold)+.5,prob=old.betSelection?.evaluation?.individualReference?.modelProbabilityPct??old.individualModelProbabilityPct??old.modelProbabilityPct;if(!Number.isFinite(prob))return old;
 const threshold={count,probability:prob/100,probabilityKey:count===1?'over05':count===2?'over15':'over25'};
 const quoteRow=compatibleQuote({odds,prediction,player,metric,threshold,providerPlayerMap:map});
 if(old.betSelection?.market?.bookmakerSemantics?.duo===true&&old.odds!=null)return old;
 const fresh=playerForecastLeg({prediction,player,metric,threshold,lineup:old.lineupEligibility,quoteRow,odds,sources:old.forecastEvidence?.sources||[],fixture:old.fixture});
 const next={...old,...fresh,selectionId:old.selectionId,suggestionAnalysis:{...old.suggestionAnalysis,quoteAvailability:quoteRow?'AVAILABLE_AT_SNAPSHOT':'UNAVAILABLE',reasons:quoteRow?(old.suggestionAnalysis.reasons||[]).filter(r=>r!=='QUOTE_UNAVAILABLE'):old.suggestionAnalysis.reasons}};
 next.betSelection.selectionId=old.selectionId;
 next.forecastIdentity={...(old.forecastIdentity||{}),matchId:match.matchId,scope:'player',subjectId:old.playerId,metric,threshold:old.threshold,direction:'OVER',period:'REGULATION',duo:true,postsAndCrossbarIncluded:next.betSelection.market.bookmakerSemantics?.postsAndCrossbarIncluded||false};next.betSelection.forecastIdentity=next.forecastIdentity;
 if(JSON.stringify(old)!==JSON.stringify(next))changes.push({matchId:match.matchId,playerId:old.playerId,metric,oldOdds:old.odds,odds:next.odds});return next;});
 match.evaluated=match.selections.filter(s=>Number.isFinite(s.betSelection?.evaluation?.modelProbabilityPct)).length;match.notModelled=match.selections.length-match.evaluated;
 }
 if(data.marketCatalog?.totals){data.marketCatalog.totals.evaluated=data.marketCatalog.matches.reduce((n,m)=>n+m.evaluated,0);data.marketCatalog.totals.notModelled=data.marketCatalog.matches.reduce((n,m)=>n+m.notModelled,0);}return changes;
}
module.exports={reconcile};
if(require.main===module){const read=f=>storageReadJson(f),predictions=read('data/normalized/predictions.json').predictions,odds=read('data/normalized/odds/sisal/serie-a.json'),changes=[];for(const f of fs.readdirSync('data/normalized').filter(f=>/^schedina-md\d+\.json$/.test(f))){const path='data/normalized/'+f,data=read(path),rows=reconcile(data,predictions,odds);if(!rows.length)continue;fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');const shared='data/normalized/reading-'+f.replace('schedina-','').replace('.json','-market-catalog.json');if(fs.existsSync(shared)){const s=read(shared);s.marketCatalog=data.marketCatalog;fs.writeFileSync(shared,JSON.stringify(s,null,2)+'\n');}changes.push({file:f,changes:rows});}fs.mkdirSync('output/duo-quote-repair',{recursive:true});fs.writeFileSync('output/duo-quote-repair/report.json',JSON.stringify(changes,null,2));console.log(JSON.stringify(changes.map(c=>({file:c.file,updated:c.changes.length,quoted:c.changes.filter(x=>x.odds!=null).length}))));}
