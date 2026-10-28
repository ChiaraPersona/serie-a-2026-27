"use strict";
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Fixture-only orchestration. All model and admission rules belong to existing builders.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const id='udinese-lecce-2026-27-md-07',dir='output/reports/udinese-lecce-md07-official';
const read=p=>storageReadJson(p),write=(p,d)=>{
 const temp=p+'.official.tmp';fs.writeFileSync(temp,JSON.stringify(d,null,2)+'\n');
 for(let n=0;;n++){try{fs.renameSync(temp,p);return;}catch(e){if(n===5)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}}
};
const run=(p,args=[],env={})=>execFileSync(process.execPath,['--experimental-require-module',p,...args],{cwd:root,env:{...process.env,...env},stdio:'inherit'});
fs.mkdirSync(dir,{recursive:true});
const beforeFile=dir+'/before.json';
if(fs.existsSync(beforeFile)&&!process.argv.includes('--resume'))throw new Error('Snapshot già presente: non sovrascrivere il confronto pre-aggiornamento.');
const baseline=fs.existsSync(beforeFile)?read(beforeFile):null;
const predictions=baseline?.predictions||read('data/normalized/predictions.json'),schedina=structuredClone(baseline?.schedina||read('data/normalized/schedina-md07.json'));
const mycombo=baseline?.mycombo||read('data/sources/mycombo-serie-a-2026-27-md-07.json');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const hashes=baseline?.hashes||Object.fromEntries(walk('data').map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
if(!baseline)write(beforeFile,{predictions,schedina,mycombo,hashes});
const identities=require('./player-identity').loadPlayerIdentities(root).payload.players;
const definitions=[
 {teamId:'udinese',team:'Udinese',formation:'3-4-2-1',coach:'Kosta Runjaic',starters:['maduka-okoye','oumar-solet','david-alaba','enzo-ebosse','mergim-vojvoda','jesper-karlstrom','oier-zarraga','hassane-kamara','jurgen-ekkelenkamp','giorgi-chakvetadze','keinan-davis'],bench:['bartosz-mrozek','daniele-padelli','sandi-lovric','nicolo-bertola','james-abankwah','matteo-palma','juan-david-arizala','jakub-piotrowski','christian-kabasele','lennon-miller','giulio-vinciati','unai-gomez','alessandro-zanoli','jovanovic']},
 {teamId:'lecce',team:'Lecce',formation:'4-3-3',coach:'Eusebio Di Francesco',starters:['wladimiro-falcone','danilo-veiga','kialonda-gaspar','tiago-gabriel','antonino-gallo','lassana-coulibaly','oumar-ngom','youssef-maleh','konan-n-dri','willem-geubbels','amar-fatah'],bench:['marco-bleve','@Borbei','ali-dembele','corrie-ndaba','jamil-siebert','sadik-fofana','nikola-stulic','omri-gandelman','gaby-jean','paco-esteban','olaf-gorter','@Scott','santiago-pierotti','mohamed-kaba','joel-monteiro']}
];
const positions={udinese:['Portiere','Difensore centrale destro','Difensore centrale','Difensore centrale sinistro','Esterno destro','Mediano destro','Mediano sinistro','Esterno sinistro','Trequartista destro','Trequartista sinistro','Centravanti'],lecce:['Portiere','Terzino destro','Difensore centrale destro','Difensore centrale sinistro','Terzino sinistro','Mezzala destra','Mediano centrale','Mezzala sinistra','Ala destra','Centravanti','Ala sinistra']};
const now=new Date().toISOString();
const fixture={matchId:id,label:'Udinese - Lecce',status:'official',matchday:7,date:'2026-10-18',kickoff:'12:30',provider:'user-provided',sourceUrl:null,retrievedAt:now,teams:definitions.map(t=>{
 const roster=read('data/teams/'+t.teamId+'.json').squad;
 const entry=(playerId,index,starter)=>{if(playerId.startsWith('@'))return {playerId:null,currentName:playerId.slice(1),lineupStatus:'reserve',identityStatus:'unresolved-exact-source-name'};const p=roster.find(p=>p.id===playerId)||identities.find(p=>p.teamId===t.teamId&&p.playerId===playerId);assert(p,playerId);return {playerId,currentName:p.name||p.canonicalName,lineupStatus:starter?'starter':'reserve',...(starter?{positionIndex:index,role:index===0?'Portiere':index<=(t.teamId==='udinese'?3:4)?'Difensore':index<=7?'Centrocampista':'Attaccante',detailedRole:positions[t.teamId][index]}:{})};};
 assert.equal(t.starters.length,11);
 return {teamId:t.teamId,team:t.team,formation:t.formation,coach:t.coach,players:t.starters.map((p,i)=>entry(p,i,true)),substitutes:t.bench.map((p,i)=>entry(p,i,false))};
})};
const official=read('data/sources/official-lineups-2026-27.json');official.fixtures=official.fixtures.filter(f=>f.matchId!==id);official.fixtures.push(fixture);write('data/sources/official-lineups-2026-27.json',official);
// Same canonical projection consumed by fixtureLineupForMatch, scoped to two keys.
const directory=read('data/teams/index.json');
if(!fs.existsSync(dir+'/directory-before.json'))write(dir+'/directory-before.json',directory);
for(const team of fixture.teams)directory.officialLineups[`${id}:${team.teamId}`]={formation:team.formation,players:team.players.map(p=>p.currentName),substitutes:team.substitutes.map(p=>p.currentName),coach:team.coach,status:'official',matchId:id,matchday:7,updatedAt:now,source:{provider:fixture.provider,url:fixture.sourceUrl,retrievedAt:now}};
write('data/teams/index.json',directory);
const env={SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'7',SERIE_A_PREDICTION_MATCH_ID:id,SERIE_A_PREDICTION_OUTPUT:dir+'/prediction.json'};
function refresh(){run('scripts/build-predictions.js',[],env);const p=read(dir+'/prediction.json');assert.equal(p.predictions.length,1);const updated=structuredClone(predictions);updated.predictions=updated.predictions.map(old=>old.matchId===id?p.predictions[0]:old);write('data/normalized/predictions.json',updated);return updated;}
// Keep original portfolios; never add candidates automatically during official refresh.
const updated=refresh();
const odds=read('data/normalized/odds/sisal/serie-a.json'),matches=read('data/normalized/matches.json');
const oldMatch=schedina.marketCatalog.matches.find(m=>m.matchId===id);
const {buildMd06MarketCatalog,resolveLineupEligibility}=require('./md06-market-catalog');
const catalog=buildMd06MarketCatalog({predictionsData:{...updated,predictions:updated.predictions.filter(p=>p.matchId===id)},odds:{...odds,events:odds.events.filter(e=>e.canonicalMatchId===id)},matches:matches.filter(m=>m.id===id),schedinaSlips:[],probableLineups:read('data/sources/probable-lineups-md7-2026-27.json'),officialLineups:official,statisticalModels:read('data/analysis/serie-a-md07-statistical-models.json'),matchday:7});
const fresh=catalog.matches.find(m=>m.matchId===id),byId=new Map(fresh.selections.map(l=>[l.selectionId,l]));
const policy=require('../js/official-starter-policy');policy.configure({[id]:{ids:fixture.teams.flatMap(t=>t.players.map(p=>p.playerId)),names:fixture.teams.flatMap(t=>t.players.map(p=>policy.token(p.currentName)))}});
const archive=read('data/technical-archive/official-nonstarter-markets.json');
const comparisons=[];
// Preserve every original contract and suggestion even when its convenience deteriorates.
fresh.selections=oldMatch.selections.map(old=>{
 let next=byId.get(old.selectionId);
 if(!next){
  next=structuredClone(old);
  const row=updated.predictions.find(p=>p.matchId===id).marketComparison.find(r=>String(r.providerSelectionId)===String(old.providerSelectionId));
  if(row) throw new Error('Contratto non ricostruito dal catalogo: '+old.selectionId);
 }
 next=structuredClone(next);
 if(next.marketScope==='player'){
  const known=fixture.teams.flatMap(t=>[...t.players,...t.substitutes]).find(p=>p.playerId===next.playerId);
  next.lineupEligibility=known?{eligible:known.lineupStatus==='starter',status:known.lineupStatus==='starter'?'official-starter':'official-nonstarter',playerId:known.playerId,playerName:known.currentName,source:fixture.provider,sourceUpdatedAt:now}:resolveLineupEligibility({leg:next,matchId:id,matchById:new Map(matches.map(m=>[m.id,m])),probableLineups:read('data/sources/probable-lineups-md7-2026-27.json'),officialLineups:official});
  const playerId=next.lineupEligibility.playerId;
  if(playerId){next.playerId=playerId;next.playerName=next.lineupEligibility.playerName;next.betSelection.market.subject={...next.betSelection.market.subject,id:playerId};}
 }
 // Provider snapshot and contract are immutable across this refresh.
 if(old.betSelection?.quote)next.betSelection.quote=structuredClone(old.betSelection.quote);
 if(Object.hasOwn(old,'odds'))next.odds=old.odds;

 if(next.catalogOrigin==='prediction-v2-player-forecast'){
  const player=updated.predictions.find(p=>p.matchId===id).shooters.allPlayers.find(p=>p.playerId===next.playerId);
  if(player){
   const metric=next.suggestionAnalysis.family,count=next.threshold+.5,key='over'+String(count-1)+'5';
   const probability=(metric==='shots'?player.shotProbabilities:player.shotOnTargetProbabilities)?.[key];
   assert(Number.isFinite(probability),'Probabilità soglia originaria mancante: '+next.selectionId);
   const pct=Number((probability*100).toFixed(2)),stability=metric==='shots'?player.playerBaselineStability:player.playerSotBaselineStability;
   next.individualModelProbabilityPct=pct;
   next.betSelection.operational.reliability={level:stability?.level==='high'?'Alta':stability?.level==='medium'?'Media':'Bassa',reason:stability?.evidence?.join('; ')||'N/D'};
   next.betSelection.evaluation.individualReference={...next.betSelection.evaluation.individualReference,modelProbabilityPct:pct,appliedToDuo:false};
   next.betSelection.evaluation.provenance={...next.betSelection.evaluation.provenance,predictionGeneratedAt:updated.predictions.find(p=>p.matchId===id).generatedAt};
   next.forecastEvidence={...next.forecastEvidence,expectedMinutes:player.expectedMinutes,projectedShots:player.projectedShots,projectedShotsOnTarget:player.projectedShotsOnTarget,individualModelProbabilityPct:pct,matchupEvidence:player.matchupEvidence,stability:stability?.level};
  }
 }
 next.isOutsider=old.isOutsider;
 if(old.suggestionAnalysis?.suggested&&policy.eligible(next,id)){next.suggestionAnalysis={...next.suggestionAnalysis,suggested:true,rank:old.suggestionAnalysis.rank};}
 if(!policy.eligible(next,id)){
  archive.push({...structuredClone(old),archivedAt:now,archiveReason:'OFFICIAL_NONSTARTER'});
  next.forecastStatus='inactive-lineup';next.lineupEligibility={...next.lineupEligibility,eligible:false,status:'official-nonstarter'};
  next.suggestionAnalysis={...next.suggestionAnalysis,suggested:false,rank:null,exclusionReason:'OFFICIAL_NONSTARTER'};
 }
 const probability=l=>l.betSelection?.evaluation?.modelProbabilityPct??l.modelProbabilityPct??null;
 comparisons.push({selectionId:old.selectionId,label:old.label||old.variant,market:old.market,before:probability(old),after:probability(next),individualBefore:old.betSelection?.evaluation?.individualReference?.modelProbabilityPct??null,individualAfter:next.betSelection?.evaluation?.individualReference?.modelProbabilityPct??null,evBefore:old.betSelection?.evaluation?.expectedValuePct??null,evAfter:next.betSelection?.evaluation?.expectedValuePct??null,active:policy.eligible(next,id),previouslySuggested:!!old.suggestionAnalysis?.suggested,currentlySuggested:!!next.suggestionAnalysis?.suggested});
 return next;
});
const newCandidates=fresh.suggestions.filter(s=>!oldMatch.selections.some(l=>l.selectionId===s)).map(s=>byId.get(s));
for(const candidate of newCandidates){if(candidate&&policy.eligible(candidate,id)&&candidate.suggestionAnalysis?.suggested&&candidate.betSelection?.quote?.availability==='AVAILABLE_AT_SNAPSHOT')fresh.selections.push(structuredClone(candidate));}
fresh.selections.filter(l=>l.suggestionAnalysis?.suggested&&policy.eligible(l,id)).sort((a,b)=>(a.suggestionAnalysis.rank||999)-(b.suggestionAnalysis.rank||999)).forEach((l,i)=>l.suggestionAnalysis.rank=i+1);
fresh.total=fresh.selections.length;fresh.suggestions=fresh.selections.filter(l=>l.suggestionAnalysis?.suggested&&policy.eligible(l,id)).map(l=>l.selectionId);
fresh.evaluated=fresh.selections.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;fresh.notModelled=fresh.total-fresh.evaluated;
fresh.suggestionSummary={total:fresh.suggestions.length,byFamily:fresh.selections.filter(l=>fresh.suggestions.includes(l.selectionId)).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{})};
schedina.marketCatalog.matches=schedina.marketCatalog.matches.map(m=>m.matchId===id?fresh:m);
for(const key of ['finalSelections','evaluated','suggestions'])schedina.marketCatalog.totals[key]=schedina.marketCatalog.matches.reduce((n,m)=>n+(key==='finalSelections'?m.total:key==='suggestions'?m.suggestions.length:m.evaluated),0);
schedina.marketCatalog.totals.notModelled=schedina.marketCatalog.matches.reduce((n,m)=>n+m.notModelled,0);
schedina.marketCatalog.totals.suggestionsByFamily=schedina.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{});
write('data/normalized/schedina-md07.json',schedina);
const combo=structuredClone(mycombo),targetLegs=new Map(fresh.selections.map(l=>[l.selectionId,l]));
combo.matches[id]=combo.matches[id].map(portfolio=>({...portfolio,legs:portfolio.legs.map(leg=>{
 const current=targetLegs.get(leg.selectionId);
 if(current)return {...leg,playerId:current.playerId,playerName:current.playerName,betSelection:current.betSelection,lineupEligibility:current.lineupEligibility};
 const copy=structuredClone(leg);
 if(copy.marketScope==='player'){
  const state=resolveLineupEligibility({leg:copy,matchId:id,matchById:new Map(matches.map(m=>[m.id,m])),probableLineups:read('data/sources/probable-lineups-md7-2026-27.json'),officialLineups:official});
  copy.playerId=state.playerId;copy.playerName=state.playerName;copy.lineupEligibility=state;
 }
 return copy;
}).filter(leg=>policy.eligible(leg,id))}));
write('data/sources/mycombo-serie-a-2026-27-md-07.json',combo);
refresh();
// A prior interrupted attempt must not leave an eligible starter in the exclusion archive.
const cleanedArchive=archive.filter(l=>l.matchId!==id||!policy.eligible({...l,playerId:l.lineupEligibility?.playerId||l.playerId},id));
write('data/technical-archive/official-nonstarter-markets.json',[...new Map(cleanedArchive.map(l=>[l.selectionId,l])).values()]);
run('scripts/apply-official-starter-policy.js');
run('scripts/build-site.js');
const afterPred=read('data/normalized/predictions.json'),afterSched=read('data/normalized/schedina-md07.json'),afterCombo=read('data/sources/mycombo-serie-a-2026-27-md-07.json');
assert.deepEqual(afterPred.predictions.filter(p=>p.matchId!==id),predictions.predictions.filter(p=>p.matchId!==id));
assert.deepEqual(afterSched.marketCatalog.matches.filter(m=>m.matchId!==id),read(beforeFile).schedina.marketCatalog.matches.filter(m=>m.matchId!==id));
for(const [key,value]of Object.entries(mycombo.matches))if(key!==id)assert.deepEqual(afterCombo.matches[key],value);
const changedData=Object.entries(hashes).filter(([p,h])=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h).map(([p])=>p);
const allowed=new Set(['data/sources/official-lineups-2026-27.json','data/normalized/predictions.json','data/sources/mycombo-serie-a-2026-27-md-07.json','data/normalized/schedina-md07.json','data/technical-archive/official-nonstarter-markets.json','data/normalized/official-starter-registry.json','data/teams/index.json']);
const directoryBefore=read(dir+'/directory-before.json'),directoryAfter=read('data/teams/index.json');
for(const t of fixture.teams)delete directoryAfter.officialLineups[`${id}:${t.teamId}`];
assert.deepEqual(directoryAfter,directoryBefore,'Directory squadre estranee alterata');
assert.deepEqual(changedData.filter(p=>!allowed.has(p)),[],'Dati estranei modificati');
write(dir+'/report.json',{matchId:id,official:fixture,analysed:comparisons.length,comparisons,newCandidates,changedData,otherFixturesUnchanged:true,engineVersion:updated.engine.version});
console.log(JSON.stringify({analysed:comparisons.length,changed:comparisons.filter(c=>c.before!==c.after||c.individualBefore!==c.individualAfter).length,newCandidates:newCandidates.length,changedData,otherFixturesUnchanged:true},null,2));
