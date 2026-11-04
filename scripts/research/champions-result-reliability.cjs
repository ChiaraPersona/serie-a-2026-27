'use strict';
// Diagnostic comparison only. No production writes, fitting or betting approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readJsonFile:read}=require('../sisal/dataset-store.cjs');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const paths={scenario:'data/generated/champions-shared-scenarios.json',model:'data/normalized/uefa-1x2-model-2026-27.json',backtest:'data/generated/uefa-1x2-backtest.json',map:'data/sources/champions-team-history-map-2026-27.json',odds:'data/normalized/odds/sisal/champions-league.json'};
const data=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,read(p)]));
const round=x=>Number.isFinite(x)?Number(x.toFixed(3)):null;
const asOf=new Date().toISOString(),day=asOf.slice(0,10),model=data.model,p=model.parameters;
const ratings=new Map(model.ratings.map(r=>[String(r.teamId),r.rating]));
const teams=new Map(data.map.teams.map(t=>[t.team,String(t.uefaTeamId)]));
const rows=data.scenario.fixtures.filter(f=>f.matchday===4&&f.date>=day).map(f=>{
 const home=ratings.get(teams.get(f.homeTeam)),away=ratings.get(teams.get(f.awayTeam));
 const available=model.generatedAt<day&&model.historyThrough<f.date&&Number.isFinite(home)&&Number.isFinite(away);
 let elo=null;
 if(available){const gap=home-away+p.homeAdvantage,share=1/(1+10**(-gap/400)),draw=Math.max(.12,Math.min(.34,p.drawBase*Math.exp(-Math.abs(gap)/p.drawScale)));elo={home:round(100*(1-draw)*share),draw:round(100*draw),away:round(100*(1-draw)*(1-share))};}
 const event=data.odds.events.find(e=>e.canonicalMatchId===f.fixtureId),market=event?.markets.find(m=>m.marketName==='1X2 ESITO FINALE'&&m.variantName==='ESITO FINALE 1X2'&&m.status==='open');
 const quotes=['1','X','2'].map(n=>market?.selections.find(s=>s.name===n&&s.status==='open')?.odds);
 const usable=quotes.every(q=>Number.isFinite(q)&&q>1)&&event.retrievedAt<=asOf;
 const inv=usable?quotes.map(q=>1/q):null,sum=inv?.reduce((s,x)=>s+x,0);
 return {fixtureId:f.fixtureId,fixture:f.homeTeam+' - '+f.awayTeam,sharedProbabilityPct:f.probabilities,teamSamples:f.dataQuality.teamSamples,latestMatchDates:f.dataQuality.latestMatchDates,opponentAdjusted:f.provenance.recentOpponentStrengthAdjustment,eloProbabilityPct:elo,eloStatus:available?'FROZEN_HISTORICAL_REFERENCE_NOT_CURRENT_MODEL_VALIDATION':'N/D_EXACT_RATING_OR_TEMPORAL_EVIDENCE_MISSING',marketProbabilityPct:inv?Object.fromEntries(['home','draw','away'].map((k,i)=>[k,round(100*inv[i]/sum)])):null,marketSnapshotAt:event?.retrievedAt||null,marketMarginPct:sum?round(100*(sum-1)):null,approved:false};
});
const report={asOf,status:'RESEARCH_ONLY_NOT_CALIBRATED',inputHashes:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),historicalElo:{generatedAt:model.generatedAt,historyThrough:model.historyThrough,holdoutProtocol:data.backtest.holdoutProtocol,uclBaseline:data.backtest.holdout.baseline.byCompetition.ucl,uclModel:data.backtest.holdout.model.byCompetition.ucl,scope:'Elo 1X2 only; not shared Poisson, goal markets, count markets or DUO'},rows,blockers:['Shared scenario lacks exact-model chronological holdout validation.','Frozen historical Elo is stale; missing exact ratings stay N/D, never neutral guesses.','Comparable prematch historical provider odds and timestamped domestic inputs must be verified before a market-baseline backtest.','Small-sample shrinkage, recency and opponent corrections require training/validation before independent test; no production weights changed.'],nextProtocol:{training:'Fit only on earlier seasons; tune league/opponent correction, shrinkage and recency on a later validation partition.',test:'Freeze model and thresholds before an untouched chronological test; group by fixture and date.',comparators:['Domestic shared model','Frozen common European rating','Training-only result-frequency baseline','Verified prematch provider probabilities normalized by margin'],metrics:['Multiclass Brier','Log loss','Calibration bins and ECE','Fixture-cluster confidence intervals','Coverage and abstention by sample size, age, league pair'],approval:'Reuse exact-event and exact-model event-validation gates; independent validation for result, double chance, goals, counts and extended player contracts.'}};
const out='output/champions-result-validation/research.json';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:out,fixtures:rows.length,aek:rows.find(r=>r.fixtureId==='ucl-2026-27-md04-10'),blockers:report.blockers}));
