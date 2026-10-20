'use strict';
// Target-only presentation overlay. Frozen probabilities and provider quotes are read-only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const selector=require('./md06-suggested-forecasts');
const {selectorView,assessPreliminary}=require('./champions/md3-preliminary-pilot.cjs');
const root=path.resolve(__dirname,'..'),target='ucl-2026-27-md03-02';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const originalPath='data/derived/champions-md03/market-catalog-official-two-v1-2026-10-20.json';
const oddsPath='data/normalized/odds/sisal/champions-league.json';
const frozenPath='data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json';
const outputPath='data/derived/champions-md03/market-catalog-sabah-dortmund-v1-2026-10-20.json';
const protectedPaths=[originalPath,oddsPath,frozenPath,'data/normalized/schedina-champions-md03.json','data/sources/champions-official-formations-md03-2026-27.json'];
const before=Object.fromEntries(protectedPaths.map(p=>[p,sha(p)]));
const official=read(originalPath),base=official.matches.find(m=>m.matchId===target);
assert(base&&base.suggestions.length===0&&base.selections.length===12);
const odds=read(oddsPath).events.find(e=>e.canonicalMatchId===target);assert(odds);
const assess=leg=>{
 const assessed=assessPreliminary(leg);
 // This is a fixture-scoped presentation decision for already-modelled 1X2/goals.
 // It removes only the competition-wide reliability gate; sport, contract,
 // scenario, quote and portfolio controls remain active.
 if(['result','double-chance','goals'].includes(leg.suggestionAnalysis.family))
   assessed.reasons=assessed.reasons.filter(r=>r!=='RELIABILITY_NOT_ASSESSED');
 assessed.eligible=assessed.reasons.length===0;
 return assessed;
};
const views=base.selections.map(selectorView);
const result=selector.chooseSuggestions({selections:views},'probability-first',{assessment:assess,probabilityKey:'modelProbabilityPct'});
const ranks=new Map(result.accepted.map((leg,i)=>[leg.selectionId,i+1]));
const selections=base.selections.map(leg=>{
 const rank=ranks.get(leg.selectionId)||null,assessment=result.assessments.get(leg.selectionId);
 const reasons=rank?[]:assessment.eligible?[result.rejected.get(leg.selectionId)||'LOWER_RANKED']:assessment.reasons;
 return {...leg,selectionStatus:rank?'PRELIMINARY':'NOT_SELECTED',qualifiedSelection:false,approvedPreliminary:false,
  publication:{...leg.publication,status:rank?'PRELIMINARY':'NOT_SELECTED',selectionGate:'MD7_TARGET_ONLY_PROVISIONAL_CENTRAL',reasons:[...reasons,'CHAMPIONS_EVENT_MODEL_NOT_VALIDATED']},
  suggestionAnalysis:{...leg.suggestionAnalysis,suggested:Boolean(rank),rank,reasons,preliminaryRetained:false,
   criteria:'MD7_PORTFOLIO_RULES_TARGET_ONLY_PROVISIONAL_CENTRAL',probabilityBasis:'PROVISIONAL_CENTRAL',conservativeExpectedValuePct:null,
   heuristicDisclosure:'Pronostico preliminare: probabilità centrale non validata; probabilità prudenziale ed EV prudenziale N/D.'}};
});
const chosen=selections.filter(l=>l.suggestionAnalysis.suggested).sort((a,b)=>a.suggestionAnalysis.rank-b.suggestionAnalysis.rank);
assert(chosen.length>0&&chosen.every(l=>l.selection!=='12'&&Number.isFinite(l.betSelection.evaluation.modelProbabilityPct)));
for(const leg of chosen){
 const [prefix,eventId,marketId,selectionId]=leg.selectionId.split(':');assert.equal(prefix,'sisal');assert.equal(eventId,odds.providerEventId);
 const market=odds.markets.find(m=>m.providerMarketId===marketId);assert(market);
 const provider=market.selections.find(s=>s.providerSelectionId===selectionId);assert(provider&&provider.status==='open');
 assert.equal(provider.odds,leg.betSelection.quote.decimal);assert.equal(provider.name,leg.selection);
 assert.equal(leg.betSelection.evaluation.prudentProbabilityPct,null);
}
const match={...base,selections,suggestions:chosen.map(l=>l.selectionId),suggestionSummary:{total:chosen.length,byFamily:Object.fromEntries([...new Set(chosen.map(l=>l.suggestionAnalysis.family))].map(f=>[f,chosen.filter(l=>l.suggestionAnalysis.family===f).length]))}};
const output={schemaVersion:1,version:'sabah-dortmund-preliminary-v1-2026-10-20',status:'PRELIMINARY_NOT_STATISTICALLY_VALIDATED',fixtureId:target,matchday:3,
  scope:'PRESENTATION_OVERLAY_ONLY',modelInput:'FROZEN_1X2_AND_GOALS',protectedHashes:before,matches:[match]};
const full=path.join(root,outputPath);
if(fs.existsSync(full))assert.deepEqual(read(outputPath),output,'Existing target version differs');else fs.writeFileSync(full,JSON.stringify(output,null,2)+'\n');
for(const p of protectedPaths)assert.equal(sha(p),before[p],`protected input changed ${p}`);
console.log(JSON.stringify({fixtureId:target,selected:chosen.map(l=>({label:l.label,probabilityPct:l.betSelection.evaluation.modelProbabilityPct,odds:l.odds})),otherFixturesWritten:0}));
