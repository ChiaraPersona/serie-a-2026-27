'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {readJsonFile}=require('./sisal/dataset-store.cjs');
const {selectMatchSuggestions,assessSuggestion}=require('./md06-suggested-forecasts');
const {pairRelation}=require('./md06-scenario-coherence');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const day=Number(process.argv[process.argv.indexOf('--matchday')+1]);
assert(Number.isInteger(day)&&day>=10&&day<=38,'Specify --matchday >= 10');
const code=String(day).padStart(2,'0'),schedinaPath=`data/normalized/schedina-md${code}.json`,readingPath=`data/normalized/reading-md${code}-market-catalog.json`;
const data=read(schedinaPath),reading=read(readingPath),fixtures=read('data/normalized/matches.json');
assert.deepEqual(data.marketCatalog,reading.marketCatalog,'Shared catalogs must be aligned before refresh');
const events=new Map(readJsonFile('data/normalized/odds/sisal/serie-a.json').events.map(e=>[e.canonicalMatchId,e]));
const result=leg=>/^(1x2|double-chance):/.test(leg.betSelection?.compatibility?.modelTarget||'');
const report=[];
const reportPath=`reports/result-alternatives/md${code}.json`;
const originalReport=fs.existsSync(reportPath)?read(reportPath):null;
const originalRows=Array.isArray(originalReport)?originalReport:originalReport?.rows||[];
for(const match of data.marketCatalog.matches){
  const fixture=fixtures.find(f=>f.id===match.matchId);
  if(fixture?.status!=='scheduled')continue;
  const selected=selectMatchSuggestions(match,{resultChoice:'verified-price-prudent-probability'});
  const next=selected.selections.filter(l=>result(l)&&l.suggestionAnalysis.suggested);
  const previous=match.selections.filter(l=>result(l)&&l.suggestionAnalysis.suggested);
  const others=match.selections.filter(l=>!result(l)&&l.suggestionAnalysis?.suggested);
  for(const leg of next){
    assert(assessSuggestion(leg).eligible);
    const id=leg.betSelection.identity,market=events.get(match.matchId)?.markets.find(m=>String(m.providerMarketId)===String(id.providerMarketId));
    const quote=market?.selections.find(s=>String(s.providerSelectionId)===String(id.providerSelectionId));
    assert(quote,`${leg.selectionId}: verified contract missing`);
    assert.equal(quote.odds,leg.betSelection.quote.decimal);
    assert.equal(market.marketName,leg.betSelection.market.bookmakerSemantics?.marketName||leg.betSelection.market.name);
    for(const other of others)assert(!['MUTUALLY_EXCLUSIVE','EQUIVALENT_OVERLAP','LOGICAL_IMPLICATION'].includes(pairRelation(leg,other).type),`${leg.selectionId}: conflict with ${other.selectionId}`);
  }
  const nextById=new Map(selected.selections.filter(result).map(l=>[l.selectionId,l]));
  const firstRank=Math.min(...previous.map(l=>l.suggestionAnalysis.rank),...next.map(l=>l.suggestionAnalysis.rank));
  let index=0;
  for(const leg of match.selections){
    if(!result(leg))continue;
    const annotation=nextById.get(leg.selectionId).suggestionAnalysis;
    leg.suggestionAnalysis={...leg.suggestionAnalysis,
      suggested:annotation.suggested,rank:annotation.suggested?firstRank+index++:null,
      reasons:annotation.reasons,criteria:annotation.criteria,resultChoice:annotation.resultChoice,
      conservativeExpectedValuePct:annotation.conservativeExpectedValuePct,rankingTuple:annotation.rankingTuple};
  }
  const suggestions=match.selections.filter(l=>l.suggestionAnalysis?.suggested);
  match.suggestions=suggestions.slice().sort((a,b)=>a.suggestionAnalysis.rank-b.suggestionAnalysis.rank).map(l=>l.selectionId);
  match.suggestionSummary={...match.suggestionSummary,total:suggestions.length,byFamily:suggestions.reduce((counts,l)=>(counts[l.suggestionAnalysis.family]=(counts[l.suggestionAnalysis.family]||0)+1,counts),Object.fromEntries(Object.keys(match.suggestionSummary?.byFamily||{}).map(k=>[k,0])))};
  const view=l=>({id:l.selectionId,label:l.label,odds:l.betSelection.quote.decimal,probability:l.betSelection.evaluation.modelProbabilityPct,prudentProbability:l.betSelection.evaluation.prudentProbabilityPct,prudentValue:l.suggestionAnalysis.conservativeExpectedValuePct});
  report.push({matchId:match.matchId,before:originalRows.find(r=>r.matchId===match.matchId)?.before||previous.map(view),after:next.map(view)});
}
const suggestions=data.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
data.marketCatalog.totals.suggestions=suggestions.length;
data.marketCatalog.totals.suggestionsByFamily=suggestions.reduce((counts,l)=>(counts[l.suggestionAnalysis.family]=(counts[l.suggestionAnalysis.family]||0)+1,counts),{});
data.marketCatalog.resultAlternativePolicy={version:1,fromMatchday:10,comparison:'Existing conservative EV, then prudent probability; same sporting thesis; unchanged admission gates'};
reading.marketCatalog=structuredClone(data.marketCatalog);
if(process.argv.includes('--write')){
  for(const [file,value] of [[schedinaPath,data],[readingPath,reading]]){fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file)}
  fs.mkdirSync('reports/result-alternatives',{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({policy:'Same admitted result thesis; existing conservative expected value, then prudent probability. Original model and quotes unchanged.',rows:report},null,2)+'\n');
}
for(const row of report)console.log(`${row.matchId}: ${row.before.map(l=>l.label).join('; ')} -> ${row.after.map(l=>l.label).join('; ')}`);
