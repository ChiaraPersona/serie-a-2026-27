'use strict';
const {VALIDATION_CRITERIA}=require('../md06-statistical-models');
const day=date=>Date.parse(String(date).slice(0,10)+'T12:00:00Z');
const metrics=['shots','shotsOnTarget','corners','fouls','possessionPct','expectedGoals'];
function summary(rows){
 const average=key=>{const values=rows.map(r=>key==='goalsFor'||key==='goalsAgainst'?r[key]:r.stats?.[key]).filter(Number.isFinite);return {mean:values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(3)):null,n:values.length};};
 return {matches:rows.length,wins:rows.filter(r=>r.result==='V').length,draws:rows.filter(r=>r.result==='P').length,losses:rows.filter(r=>r.result==='S').length,metrics:Object.fromEntries(['goalsFor','goalsAgainst',...metrics].map(key=>[key,average(key)]))};
}
function contextForTeam(dataset,teamId,target){
 if(!target.date)return {teamId,status:'TARGET_DATE_UNAVAILABLE',lastMatch:null,daysSinceLastMatch:null,matchesLast7Days:null,matchesLast14Days:null,samples:[],matchIds:[]};
 const rows=(dataset.teams[teamId]||[]).filter(r=>r.id!==target.id&&r.date.slice(0,10)<target.date.slice(0,10)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.kickoff).localeCompare(String(a.kickoff)));
 const recent=rows.slice(0,8),last=rows[0]||null,days=r=>(day(target.date)-day(r.date))/86400000;
 return {teamId,status:rows.length?'AVAILABLE':'INSUFFICIENT_DATA',cutoffExclusive:target.date.slice(0,10),window:8,lastMatch:last?{id:last.id,date:last.date,competition:last.competition,opponent:last.opponent,venue:last.venue}:null,daysSinceLastMatch:last?days(last):null,restSemantics:'CALENDAR_DAYS_BETWEEN_MATCH_DATES_NOT_HOURS',matchesLast7Days:rows.filter(r=>days(r)<=7).length,matchesLast14Days:rows.filter(r=>days(r)<=14).length,championsMatchesLast14Days:rows.filter(r=>r.competition==='champions-league'&&days(r)<=14).length,samples:['serie-a','champions-league'].map(competition=>({competition,...summary(recent.filter(r=>r.competition===competition))})),matchIds:recent.map(r=>r.id),opponents:recent.map(r=>({matchId:r.id,competition:r.competition,opponent:r.opponent,date:r.date}))};
}
function buildCompetitionContext(dataset,target){
 const teams=[target.homeTeam,target.awayTeam].map(id=>contextForTeam(dataset,id,target));
 return {version:1,role:'ANALYTICAL_CONTEXT',teams,probabilityAdjustment:{status:'NOT_VALIDATED',applied:false,reason:'Cross-competition form, opponent-strength normalization and schedule effects require temporal validation before altering probabilities.',criteria:VALIDATION_CRITERIA},rotationStatus:'NOT_INFERRED_FROM_SCHEDULE_ALONE'};
}
function validationCoverage(dataset,fixtures){
 const targets=fixtures.filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.score&&m.date).filter(m=>[m.homeTeam,m.awayTeam].some(id=>(dataset.teams[id]||[]).some(r=>r.competition==='champions-league'&&r.date.slice(0,10)<m.date.slice(0,10))));
 return {status:targets.length<VALIDATION_CRITERIA.clusters?'INSUFFICIENT_TEMPORAL_SAMPLE':'REQUIRES_TEMPORAL_BACKTEST',eligibleClusters:targets.length,requiredClusters:VALIDATION_CRITERIA.clusters,targetMatchIds:targets.map(m=>m.id),probabilityAdjustmentApplied:false};
}
module.exports={contextForTeam,buildCompetitionContext,validationCoverage};
