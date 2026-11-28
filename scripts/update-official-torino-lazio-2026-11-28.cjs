'use strict';
// Fixture-scoped acquisition and orchestration; forecasting gates remain in existing builders.
const fs=require('./output-snapshot-fs.cjs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,d)=>{const tmp=p+'.official.tmp';fs.writeFileSync(tmp,JSON.stringify(d,null,2)+'\n');for(let n=0;;n++)try{fs.renameSync(tmp,p);break}catch(e){if(n===9)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300)}};
const targets=['torino-lazio-2026-27-md-13'],now=new Date().toISOString();
const out='output/official-torino-lazio-2026-11-28';fs.mkdirSync(out,{recursive:true});
const probable=read('data/sources/probable-lineups-md13-2026-27.json');
const specs=[["torino","4-2-3-1","Ignazio Abate",["lucas-perri","alessio-cacciamani","pietro-comuzzo","saul-coco","patterson","mandragora","cesare-casadei","che-adams","nikola-vlasic","gvidas-gineitis","giovanni-simeone"]],["lazio","4-3-3","Gennaro Gattuso",["christos-mandas","romano-floriani","danilho-doekhi","oliver-provstgaard","alfonso-pedraza","fisayo-dele-bashiru","reda-belahyane","davide-frattesi","gustav-isaksen","tijjani-noslin","mattia-zaccagni"]]];
const benches={"torino":[["zakaria-aboukhlal",7],["cristiano-biraghi",3],["braganca",21],["manuel-carrascosa",63],["eray-comert",5],["kian-fitz-jim",28],["nicolo-fortini",29],["emirhan-ilkhan",6],["sandro-kulenovic",17],["diego-mascardi",26],["gaetano-oristanio",11],[null,9,"Pellegri P."],["lapo-siviero",76],["duvan-zapata",91]],"lazio":[[null,76,"Bordon F."],["ricardo-bordon",33],["matteo-cancellieri",22],["danilo-cataldi",32],["valerio-farcomeni",71],["gudmundsson-a",80],["manuel-lazzari",29],["diogo-leite",2],["edoardo-motta",40],["luca-pellegrini",3],["andrea-pinamonti",9],["adrian-przyborek",28],["davide-renzetti",47],["nicolo-rovella",6],["federico-serra",63]]};
const official=read('data/sources/official-lineups-2026-27.json'),fixtures=read('data/normalized/matches.json');
const previousPredictions=read('data/normalized/predictions.json'),previousCatalog=read('data/normalized/reading-md13-market-catalog.json'),previousSchedina=read('data/normalized/schedina-md13.json');
write(out+'/before.json',{predictions:previousPredictions,reading:previousCatalog,schedina:previousSchedina});
for(let n=0;n<targets.length;n++){
 const match=fixtures.find(m=>m.id===targets[n]);assert.equal(match.status,'scheduled');
 const teams=specs.slice(n*2,n*2+2).map(([teamId,formation,coach,ids])=>{
  const team=read('data/teams/'+teamId+'.json'),known=new Map(team.squad.map(p=>[p.id,p]));
  for(const p of probable.teams.find(t=>t.teamId===teamId).players)if(p.playerId&&!known.has(p.playerId))known.set(p.playerId,{id:p.playerId,name:p.currentName,role:p.role,shirtNumber:p.shirtNumber});
  for(const p of read('data/sources/player-identity-aliases-2026-27.json').players.filter(p=>p.teamId===teamId))if(!known.has(p.playerId))known.set(p.playerId,{id:p.playerId,name:p.canonicalName});
  const players=ids.map((id,i)=>{const p=id?known.get(id):{name:null};assert(p,'Identità assente: '+id);return {playerId:id,currentName:p.name,sourceName:p.name,shirtNumber:({torino:[20,77,15,23,2,8,22,19,10,66,18],lazio:[35,15,5,25,23,7,21,16,11,14,10]})[teamId][i],lineupStatus:'starter',identityStatus:id?'resolved-canonical':'unresolved-exact-source-name',positionIndex:i,role:p.role||(i===0?'Portiere':i<=4?'Difensore':i<=8?'Centrocampista':'Attaccante')};});
  return {teamId,team:team.name,coach,formation,benchCoverage:'user-provided-image-complete',players,substitutes:benches[teamId].map(([id,number,label])=>{const p=known.get(id);return {playerId:id,currentName:p?.name||label,sourceName:label||p?.name,shirtNumber:number,lineupStatus:'reserve',identityStatus:id?'resolved-canonical':'unresolved-exact-source-name'};})};
 });
 const entry={matchId:match.id,label:teams.map(t=>t.team).join(' - '),status:'official',matchday:13,date:match.date,kickoff:match.kickoff,provider:'user-provided',sourceUrl:null,retrievedAt:now,rawSnapshots:['data/raw/lineups/user/2026-11-28-torino-lazio/starters.png','data/raw/lineups/user/2026-11-28-torino-lazio/bench.png'],identityNotes:teams.flatMap(t=>[...t.players,...t.substitutes].filter(p=>!p.playerId).map(p=>`${t.team}: ${p.sourceName} unresolved canonical identity; no invented statistics`)),teams};
 official.fixtures=official.fixtures.filter(f=>f.matchId!==match.id);official.fixtures.push(entry);
}
write('data/sources/official-lineups-2026-27.json',official);
const directory=read('data/teams/index.json');directory.officialLineups||={};
for(const fixture of official.fixtures.filter(f=>targets.includes(f.matchId)))for(const t of fixture.teams)directory.officialLineups[fixture.matchId+':'+t.teamId]={formation:t.formation,players:t.players.map(p=>p.currentName),substitutes:t.substitutes.map(p=>p.currentName),coach:t.coach,status:'official',matchId:fixture.matchId,matchday:13,updatedAt:fixture.retrievedAt,source:{provider:fixture.provider,url:null,retrievedAt:fixture.retrievedAt}};
write('data/teams/index.json',directory);

const candidates=[];
for(const matchId of targets){
 const output=out+'/'+matchId+'.json';
 cp.execFileSync(process.execPath,['--experimental-require-module','scripts/build-predictions.js'],{stdio:'inherit',env:{...process.env,SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'13',SERIE_A_PREDICTION_MATCH_ID:matchId,SERIE_A_PREDICTION_OUTPUT:output}});
 const data=read(output);assert.equal(data.predictions.length,1);candidates.push(data.predictions[0]);
}
const predictions={...previousPredictions,generatedAt:now,predictions:previousPredictions.predictions.map(p=>candidates.find(c=>c.matchId===p.matchId)||p)};
assert.deepEqual(predictions.predictions.filter(p=>!targets.includes(p.matchId)),previousPredictions.predictions.filter(p=>!targets.includes(p.matchId)));
write('data/normalized/predictions.json',predictions);
const odds=require('./sisal/dataset-store.cjs').readJsonFile('data/normalized/odds/sisal/serie-a.json');
const {buildMd06MarketCatalog}=require('./md06-market-catalog');
const generated=buildMd06MarketCatalog({predictionsData:{...predictions,predictions:candidates},odds:{...odds,events:odds.events.filter(e=>targets.includes(e.canonicalMatchId))},matches:fixtures.filter(m=>targets.includes(m.id)),schedinaSlips:[],probableLineups:probable,officialLineups:official,statisticalModels:read('data/analysis/serie-a-md13-statistical-models.json'),matchday:13});
generated.matches=require('./preserve-official-duo-contracts.cjs')({matches:generated.matches,previousMatches:previousCatalog.marketCatalog.matches.filter(m=>targets.includes(m.matchId)),predictions:candidates,odds,probableLineups:probable,officialLineups:official});
const policy=require('../js/official-starter-policy');require('./apply-official-starter-policy').buildRegistry();
const removed=[];
for(const m of previousCatalog.marketCatalog.matches.filter(m=>targets.includes(m.matchId)))removed.push(...m.selections.filter(s=>!policy.eligible(s,m.matchId)));
for(const m of generated.matches){
 const before=previousCatalog.marketCatalog.matches.find(x=>x.matchId===m.matchId),priorIds=new Set(before.selections.map(s=>s.selectionId));
 m.selections=m.selections.filter(s=>{if(!policy.eligible(s,m.matchId)){removed.push(s);return false;}const individual=s.marketScope==='player'||s.betSelection?.market?.scope==='player';if(individual&&!priorIds.has(s.selectionId)&&s.betSelection?.quote?.availability!=='AVAILABLE_AT_SNAPSHOT')return false;return true;});
 for(const s of m.selections){delete s.isPreferred;s.isOutsider=s.betSelection?.operational?.classification==='OUTSIDER';const e=s.betSelection?.evaluation;if(e?.modelProbabilityPct>0){e.fairOdds=Number((100/e.modelProbabilityPct).toFixed(4));s.fairOdds=e.fairOdds;}}
}
const catalog={...previousCatalog,generatedAt:now,marketCatalog:{...previousCatalog.marketCatalog,matches:previousCatalog.marketCatalog.matches.map(m=>generated.matches.find(g=>g.matchId===m.matchId)||m)}};
write('data/normalized/reading-md13-market-catalog.json',catalog);
write('data/normalized/schedina-md13.json',{...previousSchedina,generatedAt:now,marketCatalog:catalog.marketCatalog});
const published=require('./publish-md07-unquoted').build({matchday:13,targetMatchIds:targets});
for(const m of published.marketCatalog.matches){m.suggestions=m.selections.filter(s=>s.suggestionAnalysis?.suggested).map(s=>s.selectionId);m.total=m.selections.length;}
for(const m of previousCatalog.marketCatalog.matches.filter(m=>!targets.includes(m.matchId)))assert.deepEqual(published.marketCatalog.matches.find(x=>x.matchId===m.matchId),m);
write('data/normalized/schedina-md13.json',published);write('data/normalized/reading-md13-market-catalog.json',{...catalog,marketCatalog:published.marketCatalog});
const archive='data/technical-archive/official-nonstarter-markets.json';write(archive,[...new Map([...read(archive),...removed].map(s=>[s.selectionId,s])).values()]);
for(const id of targets){const file='data/sources/readings/'+id+'.json',r=read(file),f=official.fixtures.find(f=>f.matchId===id);r.updatedAt=now;r.summary=r.summary.replace('Formazioni probabili, da riconfermare','Formazioni ufficiali');r.sections.availability={content:'Formazioni ufficiali. Panchine confermate; giocatori non convocati distinti dai sostituti.',signals:f.teams.map(t=>`${t.team}: ${t.players.map(p=>p.currentName).join(', ')}.`),sources:[]};r.sections.tactics.signals=f.teams.map(t=>`${t.team}: ${t.formation}, formazione ufficiale.`);write(file,r);}
write(out+'/audit.json',{targets,unresolved:official.fixtures.filter(f=>targets.includes(f.matchId)).flatMap(f=>f.identityNotes),removed:removed.map(s=>({selectionId:s.selectionId,label:s.label,matchId:s.matchId})),unrelatedPredictionsAndCatalogsUnchanged:true});
cp.execFileSync(process.execPath,['scripts/build-readings.js','--matchday','13'],{stdio:'inherit'});
console.log('Official fixtures updated; excluded nonstarters:',removed.length);
