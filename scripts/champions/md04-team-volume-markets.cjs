'use strict';
// User-authorized preliminary count probabilities. Approval gates stay unchanged.
const fs=require('node:fs'),path=require('node:path');
const {MARKET_MODELS,METRICS,dispersionSize,probabilities,overProbability}=require('../md06-statistical-models');
const {compareThresholdBalance,minimumSportsSupportPct}=require('../md06-suggested-forecasts');
const {eligible}=require('./shared-scenario.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const origin='champions-md04-team-volumes',projectionKeys={shots:'shotsTotal',sot:'shotsOnTarget',corners:'corners'};
const labels={shots:'Tiri totali',sot:'Tiri in porta',corners:'Corner'};
function exactSide(market,definition){
 const threshold=Number(market.threshold),unit={shots:'TIRI TOTALI',sot:'TIRI IN PORTA',corners:'CORNER'}[definition.family];
 if(market.threshold==null||!Number.isFinite(threshold)||threshold%1!==0.5)return null;
 if(definition.kind==='match-over')return market.marketName===`U/O ${unit}`&&market.variantName===`U/O ${market.threshold} ${unit}`?'total':null;
 if(definition.kind!=='team-over'||market.marketName!==`U/O ${unit} SQUADRA X`)return null;
 for(const side of [1,2])if([`SQUADRA ${side}: U/O ${market.threshold} ${unit}`,`U/O ${market.threshold} ${unit} SQUADRA ${side}`].includes(market.variantName))return side===1?'home':'away';
 return null;
}
function historyFor(source,fixture,asOf){
 return source.matches.filter(m=>m.league==='uefa.champions'&&m.date<fixture.date&&m.source?.retrievedAt&&m.source.retrievedAt<=asOf)
 .map(m=>({metrics:Object.fromEntries(Object.entries(METRICS).map(([family,metric])=>[family,{home:m.home.statistics?.[metric.profile],away:m.away.statistics?.[metric.profile]}]))}));
}
async function addTeamVolumeMarkets(catalog,odds,{calendar=read('data/normalized/champions-league-2026-27.json'),source=read('data/sources/champions-pilot-match-stats-2025-27.json'),asOf=new Date().toISOString(),fixtureIds=null}={}){
 const {createChampionsSelection}=await import('../../js/pages/champions-market-ui.mjs');
 for(const match of catalog.marketCatalog.matches){
  if(fixtureIds&&!fixtureIds.has(match.matchId))continue;
  const fixture=calendar.fixtures.find(f=>f.id===match.matchId),c=match.forecastCoverage;
  // Retire manual rows; preserve published snapshots once a fixture starts.
  match.selections=match.selections.filter(l=>l.catalogOrigin!==origin||l.suggestionAnalysis?.suggested);
  if(!fixture||!eligible(fixture,asOf)||!c?.teamProjections?.length||!Number.isFinite(c.result?.home))continue;
  match.selections=match.selections.filter(l=>l.catalogOrigin!==origin);
  const event=odds.events.find(e=>e.canonicalMatchId===match.matchId);
  if(!event||!event.retrievedAt||event.retrievedAt>asOf)continue;
  const history=historyFor(source,fixture,asOf),models={};
  for(const [family,key] of Object.entries(projectionKeys)){
   const observed=history.filter(m=>Number.isFinite(m.metrics[family].home)&&Number.isFinite(m.metrics[family].away));
   const mu={home:c.teamProjections[0][key]?.central,away:c.teamProjections[1][key]?.central};
   if(observed.length<6||!Object.values(mu).every(v=>Number.isFinite(v)&&v>=0))continue;
   const size=dispersionSize(observed,family);
   models[family]={distribution:probabilities(mu,size,family),mean:mu,size:Number.isFinite(size)?size:null,historyMatches:observed.length};
  }
  const groups=new Map();
  for(const market of event.markets){
   const definition=MARKET_MODELS[market.marketCode],model=models[definition?.family];
   if(!definition||!model||market.status!=='open'||market.marketScope!=='match'||market.providerPlayerIds.length||!market.providerMarketId||market.identifierProvenance?.kind!=='provider-response'||(market.periodScope&&market.periodScope!=='full-match'))continue;
   const side=exactSide(market,definition);if(!side)continue;
   const candidates=market.selections.filter(s=>s.name==='OVER'&&s.status==='open'&&Number.isFinite(s.odds)&&s.odds>=1.08&&s.providerSelectionId&&s.identifierProvenance?.kind==='provider-response');
   if(candidates.length!==1)continue;
   const selection=candidates[0],selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
   const family=definition.family,threshold=Number(market.threshold),p=overProbability(model.distribution[side],threshold)*100;
   const teamId=side==='total'?null:fixture[side+'Team'],name=side==='total'?'Partita':match[side+'Team'];
   const leg=createChampionsSelection({fixtureId:match.matchId,homeTeam:match.homeTeam,awayTeam:match.awayTeam,matchday:4,oddsEvent:{providerEventId:event.providerEventId,retrievedAt:event.retrievedAt}},{...market,canonicalPlayerIds:[],forecastCompatibility:'EXACT_SHARED_COUNT_PRELIMINARY',modifiers:{...market.modifiers,periodScope:'full-match'}},{...selection,selectionId,quoteAvailability:'AVAILABLE_AT_SNAPSHOT'});
   Object.assign(leg,{odds:selection.odds,selection:'OVER',threshold,marketScope:side==='total'?'match':'team',teamId,marketFamily:labels[family],label:`${name} over ${String(threshold).replace('.',',')} ${labels[family].toLowerCase()}`,catalogOrigin:origin,modelProbabilityPct:p,modelProbability:p/100,fairOdds:100/p,expectedValuePct:null,qualifiedSelection:false,approvedPreliminary:false,selectionStatus:'PRELIMINARY',lineupEligibility:{eligible:true,status:'not-applicable'},evidenceLabel:'Probabilità preliminare · modello discreto condiviso · validazione Champions da completare',suggestionAnalysis:{suggested:true,family,rank:null,reasons:['USER_AUTHORIZED_PRELIMINARY_COUNT_PROBABILITY']}});
   leg.betSelection.market={...leg.betSelection.market,selection:'OVER',scope:leg.marketScope,subject:teamId?{type:'team',id:teamId,name,teamId}:{type:'match',id:match.matchId},bookmakerSemantics:{duo:false,substituteIncluded:false,postsAndCrossbarIncluded:false,extraTimeIncluded:false,period:'REGULATION',variantName:market.variantName}};
   leg.betSelection.compatibility.modelTarget=`statistical:${definition.subfamily}${teamId?':'+teamId:''}:${threshold}`;
   leg.betSelection.evaluation={status:'PRELIMINARY',kind:'SHARED_DISCRETE_COUNT_PRELIMINARY',modelProbabilityPct:p,prudentProbabilityPct:null,fairOdds:100/p,expectedValuePct:null,conservativeExpectedValuePct:null,probabilitySemantics:'ABSOLUTE_EVENT',validation:{approvable:false,status:'CHAMPIONS_PROSPECTIVE_VALIDATION_PENDING'},provenance:{source:'data/sources/champions-pilot-match-stats-2025-27.json',model:'scripts/md06-statistical-models.js',modelTarget:leg.betSelection.compatibility.modelTarget,projectionSource:'forecastCoverage.teamProjections',asOf,historyMatches:model.historyMatches,mean:model.mean,dispersionSize:model.size}};
   leg.betSelection.operational={...leg.betSelection.operational,classification:'WATCH',reliability:{level:'Bassa'}};
   leg.publication={status:'PRELIMINARY',approvalGate:'UNCHANGED_NOT_PASSED',reasons:['CHAMPIONS_PROSPECTIVE_VALIDATION_PENDING']};
   if(p<minimumSportsSupportPct(leg))continue;
   const group=`${family}:${side}`,rows=groups.get(group)||[];rows.push(leg);groups.set(group,rows);
  }
  const selected=[...groups.values()].map(rows=>rows.sort((a,b)=>compareThresholdBalance(a,b,'modelProbabilityPct'))[0]);
  let rank=Math.max(0,...match.selections.map(l=>l.suggestionAnalysis?.rank||0));
  for(const leg of selected){leg.suggestionAnalysis.rank=++rank;match.selections.push(leg);}
  match.suggestions=match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);match.total=match.selections.length;
  c.marginalVolumeProbabilitiesAvailable=selected.length>0;c.marginalVolumeProbabilityStatus='PRELIMINARY_NOT_CALIBRATED';
  c.missing=['Probabilità preliminari dei volumi; validazione prospettica Champions e probabilità congiunte da completare.'];
 }
 const selected=catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
 catalog.summary={...catalog.summary,selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length};
 return catalog;
}
module.exports={addTeamVolumeMarkets,exactSide,historyFor};
if(require.main===module){
 const file=path.join(root,'data/normalized/schedina-champions-md04.json'),catalog=read('data/normalized/schedina-champions-md04.json');
 const odds=require('../sisal/dataset-store.cjs').readJsonFile(path.join(root,'data/normalized/odds/sisal/champions-league.json'));
 const dir=path.join(root,'output/champions-md04/count-markets');fs.mkdirSync(dir,{recursive:true});
 const before=path.join(dir,'before.json');if(!fs.existsSync(before))fs.writeFileSync(before,JSON.stringify(catalog));
 addTeamVolumeMarkets(catalog,odds).then(result=>{
  const archive='data/technical-archive/champions-md04/manual-team-volume-markets.json';
  if(!fs.existsSync(path.join(root,archive)))fs.writeFileSync(path.join(root,archive),JSON.stringify(JSON.parse(fs.readFileSync(before)).marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.catalogOrigin===origin),null,2)+'\n');
  fs.writeFileSync(file+'.count.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(file+'.count.tmp',file);
  console.log(JSON.stringify({summary:result.summary,preliminaryVolumeMarkets:result.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.catalogOrigin===origin&&l.suggestionAnalysis.suggested).length}));
 }).catch(e=>{console.error(e);process.exitCode=1;});
}
