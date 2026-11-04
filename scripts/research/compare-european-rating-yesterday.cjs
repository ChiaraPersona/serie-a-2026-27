'use strict';
// Retrospective comparison; rating parameters were selected after these games.
// No operational archive, settlement or original prediction is rewritten.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {sequence,predict}=require('./european-rating-model.cjs');
const {metrics}=require('./run-european-rating.cjs');
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots');
const {captureInputs,assertInputsUnchanged}=require('../test-champions-validation-inputs.cjs');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),date='2026-11-03';
const frozenPath='output/champions-european-rating-research/2026-11-04T16-19-15-286Z/frozen-research-model.json';
const frozen=read(frozenPath),params=frozen.parameters,protectedBefore=captureInputs();
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('scripts/research/european-rating-model.cjs')).digest('hex'),frozen.modelCodeHash,'Use the frozen research implementation');
const history=read('data/normalized/uefa-europe-history-2023-26.json').matches;
const calendar=read('data/normalized/champions-league-2026-27.json'),teamMap=new Map(read('data/sources/champions-team-history-map-2026-27.json').teams.map(t=>[t.team,String(t.uefaTeamId)]));
const directory=new Map(history.flatMap(m=>[m.homeTeam,m.awayTeam]).map(t=>[String(t.id),t]));
for(const t of read('data/normalized/champions-team-strength-2026-27.json').teams){const id=teamMap.get(t.team);if(id&&!directory.has(id))directory.set(id,{id,name:t.team,countryCode:t.association});}
const current=calendar.fixtures.filter(f=>f.status==='finished'&&f.date<date).map(f=>{
 const homeTeam=directory.get(teamMap.get(f.homeTeam)),awayTeam=directory.get(teamMap.get(f.awayTeam)),score90=f.score||f.matchReport?.score;
 assert(homeTeam&&awayTeam&&[score90?.home,score90?.away].every(Number.isInteger),'Incomplete earlier canonical result '+f.id);
 return {id:f.id,date:f.date,competitionCode:'ucl',homeTeam,awayTeam,score90};
});
const training=[...history,...current].filter(m=>m.date<date);assert(training.every(m=>m.date<date));
const state=sequence(training,params).state;
const scenarioPath='data/generated/champions-shared-scenarios.json';
const commits=execFileSync('git',['log','--before=2026-11-04T00:00:00+01:00','--format=%H|%cI','-12','--',scenarioPath],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).map(line=>{const [commit,at]=line.split('|');return {commit,at};});
const versions=commits.map(c=>({...c,data:JSON.parse(execFileSync('git',['show',c.commit+':'+scenarioPath],{encoding:'utf8',maxBuffer:20*1024*1024}))})).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
const outcome=p=>{const a=[p.home,p.draw,p.away];return ['1','X','2'][a.indexOf(Math.max(...a))];};
const rows=calendar.fixtures.filter(f=>f.date===date&&f.matchday===4).map(f=>{
 const kickoffAt=zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome');
 const archived=versions.filter(v=>Date.parse(v.at)<Date.parse(kickoffAt)).map(v=>({version:v,row:v.data.fixtures.find(s=>s.fixtureId===f.id)})).find(v=>v.row&&Date.parse(v.row.inputSnapshot?.asOf||v.version.data.generatedAt)<Date.parse(kickoffAt));
 assert(archived,'No committed prematch scenario '+f.id);
 const h=directory.get(teamMap.get(f.homeTeam)),a=directory.get(teamMap.get(f.awayTeam)),score90=f.score||f.matchReport?.score;
 assert(h&&a&&f.status==='finished'&&[score90?.home,score90?.away].every(Number.isInteger));
 const forecast=predict(state,{date,homeTeam:h,awayTeam:a},params);
 const published=Object.fromEntries(Object.entries(archived.row.probabilities).map(([k,p])=>[k,p/100]));
 assert(['home','draw','away'].every(k=>Number.isFinite(published[k]))&&Math.abs(Object.values(published).reduce((a,b)=>a+b,0)-1)<1e-8,'Invalid archived probability distribution');
 const actual=score90.home>score90.away?'1':score90.home<score90.away?'2':'X';
 const oldOutcome=outcome(published),newOutcome=forecast.eligible?outcome(forecast.probability):null,key={'1':'home','X':'draw','2':'away'}[actual];
 return {fixtureId:f.id,fixture:f.homeTeam+' - '+f.awayTeam,date,score:score90.home+'-'+score90.away,actual,publishedProbability:published,publishedLeader:oldOutcome,publishedCorrect:oldOutcome===actual,prematchProof:{commit:archived.version.commit,committedAt:archived.version.at,scenarioAt:archived.row.inputSnapshot?.asOf||archived.version.data.generatedAt,kickoffAt},europeanProbability:forecast.eligible?forecast.probability:null,europeanLeader:newOutcome,europeanCorrect:newOutcome===actual,eligible:forecast.eligible,samples:[forecast.features.home.appearances,forecast.features.away.appearances],actualEventProbabilityDifferencePp:forecast.eligible?(forecast.probability[key]-published[key])*100:null,comparison:!forecast.eligible?'ABSTENTION':oldOutcome!==actual&&newOutcome===actual?'CORRECTED_LEADER':oldOutcome===actual&&newOutcome!==actual?'NEW_WRONG_LEADER':oldOutcome!==actual&&newOutcome!==actual?'BOTH_WRONG_LEADER':'BOTH_CORRECT_LEADER'};
});
const common=rows.filter(r=>r.eligible);
const scoreRows=(r,p)=>({match:{id:r.fixtureId,score90:{home:Number(r.score.split('-')[0]),away:Number(r.score.split('-')[1])}},probability:p});
const report={asOf:new Date().toISOString(),date,status:'RETROSPECTIVE_NOT_ORIGINAL_NEW_MODEL_FORECASTS',frozenResearchModel:frozenPath,parametersSelectedAt:frozen.asOf,training:{historicalMatches:history.filter(m=>m.date<date).length,currentMatches:current.length,latestDate:training.map(m=>m.date).sort().at(-1),sameDayMatchesUsed:0},summary:{fixtures:rows.length,commonFixtures:common.length,publishedCorrect:common.filter(r=>r.publishedCorrect).length,europeanCorrect:common.filter(r=>r.europeanCorrect).length,corrected:common.filter(r=>r.comparison==='CORRECTED_LEADER').length,newErrors:common.filter(r=>r.comparison==='NEW_WRONG_LEADER').length,publishedMetrics:metrics(common.map(r=>scoreRows(r,r.publishedProbability))),europeanMetrics:metrics(common.map(r=>scoreRows(r,r.europeanProbability)))},rows,limitations:['New-model probabilities are computed after the results, with parameters selected today; this is diagnostic, not a prospective success claim.','No match from 3 November enters the European rating state, including earlier kickoffs that day.','Compares most probable 1X2 outcome, not exact score, personal slips, settlement, ROI or player markets.','Nine fixtures are insufficient to validate the model.'],productionChanged:false};
const out='output/champions-european-rating-research/yesterday-2026-11-03.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
assertInputsUnchanged(protectedBefore);
console.log(JSON.stringify({output:out,training:report.training,summary:report.summary,rows:rows.map(r=>({...r,prematchProof:undefined}))}));
