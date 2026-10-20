"use strict";
// Serialization and exact provider joins only. No prediction/Poisson builder imports.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const previewPath='data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json';
const preview=read(previewPath),odds=read('data/normalized/odds/sisal/champions-league.json');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const specs={
 '3':{name:'1X2 ESITO FINALE',variant:/^ESITO FINALE 1X2$/,family:'result'},
 '28319':{name:'DOPPIA CHANCE',variant:/^DOPPIA CHANCE MULTIESITI$/,family:'double-chance'},
 '7989':{name:'UNDER/OVER',variant:/^U\/O (\d+(?:\.\d+)?)$/,family:'goals'},
 '975':{name:'U/O CORNER',variant:/^U\/O (\d+(?:\.\d+)?) CORNER$/,family:'corners'},
 '15859':{name:'U/O TIRI TOTALI',variant:/^U\/O (\d+(?:\.\d+)?) TIRI TOTALI$/,family:'shots'},
 '23334':{name:'U/O TIRI TOTALI SQUADRA X',variant:/^SQUADRA ([12]): U\/O (\d+(?:\.\d+)?) TIRI TOTALI$/,family:'team-shots',metric:'shotsTotal'},
 '23311':{name:'U/O TIRI IN PORTA SQUADRA X',variant:/^SQUADRA ([12]): U\/O (\d+(?:\.\d+)?) TIRI IN PORTA$/,family:'team-sot',metric:'shotsOnTarget'},
 '23060':{name:'U/O CORNER SQUADRA X',variant:/^U\/O (\d+(?:\.\d+)?) CORNER SQUADRA ([12])$/,family:'team-corners',metric:'corners'}
};
const outputIndex=process.argv.indexOf('--output-dir');
const outputDir=outputIndex<0?path.join(root,'data/normalized'):path.resolve(root,process.argv[outputIndex+1]||'');
if(outputIndex>=0&&!outputDir.startsWith(path.join(root,'output')+path.sep))throw Error('Staging richiesto dentro output/');
fs.mkdirSync(outputDir,{recursive:true});
const exclusions=[];
const fixtures=preview.fixtures.map(entry=>{
 const f=entry.collective,event=odds.events.find(e=>e.canonicalMatchId===entry.fixtureId);assert(event);assert.equal(event.canonicalDate,entry.date);
 const markets=[];
 for(const raw of event.markets){
  const spec=specs[raw.marketCode];if(!spec)continue;
  const variant=String(raw.variantName||'').match(spec.variant);
  if(raw.periodScope&&raw.periodScope!=='full-match')continue;
  if(['result','double-chance'].includes(spec.family)&&raw.threshold!==null)continue;
  if(raw.marketScope!=='match'||raw.providerPlayerIds?.length||raw.marketName!==spec.name||!variant||raw.status!=='open'){exclusions.push({fixtureId:entry.fixtureId,marketId:raw.providerMarketId,reason:'CONTRACT_OR_STATUS_NOT_VERIFIED'});continue;}
  if((['shots','corners'].includes(spec.family)||spec.metric)&&!f.dataQuality.detailedVolumesAvailable)continue;
  const side=spec.metric?Number(variant[spec.family==='team-corners'?2:1])-1:null;
  const thresholdToken=variant[spec.metric&&spec.family!=='team-corners'?2:1];
  if(thresholdToken!==undefined&&Number(thresholdToken)!==Number(raw.threshold))continue;
  const team=spec.metric?f.teamProjections[side]:null;
  const line=team?.lines?.[spec.metric]?.find(l=>l.threshold===Number(raw.threshold));
  const selections=[];
  for(const s of raw.selections){
   if(s.status!=='open'||!Number.isFinite(s.odds)||s.odds<=1||!s.providerSelectionId)continue;
   if(spec.family==='result'&&!['1','X','2'].includes(s.name))continue;
   if(spec.family==='double-chance'&&!['1X','12','X2'].includes(s.name))continue;
   if(!['result','double-chance'].includes(spec.family)&&!['OVER','UNDER'].includes(s.name))continue;
   let probabilityPct=null;
   if(spec.family==='result')probabilityPct=f.probabilities[{1:'home',X:'draw',2:'away'}[s.name]];
   if(spec.family==='goals')probabilityPct=f.goals.find(g=>g.threshold===Number(raw.threshold))?.[s.name==='OVER'?'overPct':'underPct']??null;
   if(spec.family==='double-chance'){
    const keys={'1X':['home','draw'],'X2':['draw','away'],'12':['home','away']}[s.name];
    if(keys&&keys.every(k=>Number.isFinite(f.probabilities[k])))probabilityPct=f.verdict.outcome===s.name?f.verdict.probabilityPct:Number(keys.reduce((n,k)=>n+f.probabilities[k],0).toFixed(1));
   }
   if(line)probabilityPct=line[s.name==='OVER'?'overPct':'underPct'];
   if(probabilityPct!==null&&(!Number.isFinite(probabilityPct)||probabilityPct<0||probabilityPct>100))continue;
   const recommendation=['result','double-chance'].includes(spec.family)&&f.verdict.outcome===s.name;
   selections.push({...s,selectionId:`sisal:${event.providerEventId}:${raw.providerMarketId}:${s.providerSelectionId}`,interfaceSelectable:true,quoteAvailability:'AVAILABLE_AT_SNAPSHOT',modelProbability:probabilityPct===null?null:probabilityPct/100,modelProbabilityPct:probabilityPct,expectedValue:probabilityPct===null?null:probabilityPct/100*s.odds-1,preliminaryProposal:recommendation,justification:recommendation?'Esito esplicitamente presente nel verdetto congelato della preview; contratto 90 minuti e selezione esatti. Nessuna raccomandazione dedotta dalla media.':null});
  }
  if(!selections.length)continue;
  markets.push({...raw,selections,family:spec.family,...(team?{subject:{type:'team',id:team.teamId,name:team.team}}:{}),periodScope:'full-match',canonicalPlayerIds:[],providerPlayerIds:[],replacementIncluded:false,woodworkIncluded:false,forecastCompatibility:selections.some(s=>s.modelProbability!==null)?'EXACT_FROZEN_FORECAST_CONTRACT':'REFERENCE_ONLY_PROBABILITY_UNAVAILABLE',modifiers:{threshold:raw.threshold,variantName:raw.variantName,periodScope:'full-match',replacementIncluded:false,woodworkIncluded:false}});
 }
 return {fixtureId:entry.fixtureId,matchday:3,date:f.date,kickoff:f.kickoff,homeTeam:f.homeTeam,awayTeam:f.awayTeam,forecast:f,individualForecasts:null,availability:null,lineups:null,publishedSelections:[],readingUrl:`champions-league.html?match=${entry.fixtureId}`,oddsEvent:{providerEventId:event.providerEventId,retrievedAt:event.retrievedAt,canonicalMatchId:event.canonicalMatchId,playerMarkets:markets}};
});
assert.equal(fixtures.length,18);
const all=fixtures.flatMap(f=>f.oddsEvent.playerMarkets.flatMap(m=>m.selections));
assert.equal(new Set(all.map(s=>s.selectionId)).size,all.length);
const output={schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:'PRELIMINARY_NOT_FINAL',forecastInput:{path:previewPath,sha256:hash(previewPath)},oddsInput:{path:'data/normalized/odds/sisal/champions-league.json',sha256:hash('data/normalized/odds/sisal/champions-league.json')},summary:{fixtures:18,markets:fixtures.reduce((n,f)=>n+f.oddsEvent.playerMarkets.length,0),selections:all.length,preliminaryProposals:all.filter(s=>s.preliminaryProposal).length},fixtures,excludedContracts:exclusions};
fs.writeFileSync(path.join(outputDir,'champions-md03-preliminary-2026-27.json'),JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(outputDir,'schedina-champions-md03-draft.json'),JSON.stringify({schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:'DRAFT_NOT_PUBLISHED',catalog:'champions-md03-preliminary-2026-27.json',summary:output.summary,slips:[],publishedSelections:[]},null,2)+'\n');
console.log(JSON.stringify(output.summary));
