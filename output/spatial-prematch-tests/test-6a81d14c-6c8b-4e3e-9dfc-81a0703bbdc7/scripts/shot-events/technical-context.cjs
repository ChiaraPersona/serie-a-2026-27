'use strict';
const CONTINUITY_POLICY=Object.freeze({version:'technical-continuity-v1',recentMatches:5,halfLifeMatches:3,transitionCoachMatches:3,
 lowStarterOverlap:6/11,minimumLowOverlapPairs:2,maximumContextAgeDays:30});
function observationsFor(teamId,cutoff,dataset,matchdayExclusive=null){
 return (dataset?.observations||[]).filter(r=>r.teamId===teamId&&r.date<cutoff&&(matchdayExclusive===null||r.matchday<matchdayExclusive))
  .sort((a,b)=>a.date.localeCompare(b.date)||a.fixtureId.localeCompare(b.fixtureId));
}
function technicalContext(teamId,cutoff,dataset,{matchdayExclusive=null,policy=CONTINUITY_POLICY}={}){
 const observations=observationsFor(teamId,cutoff,dataset,matchdayExclusive);
 let coachId=null,coachName=null,cycleStart=null,changeObserved=false,lastCoachDate=null;
 for(const row of observations){
  if(!row.headCoachId)continue;
  if(coachId!==row.headCoachId){changeObserved=coachId!==null;cycleStart=row.date;coachId=row.headCoachId;}
  coachName=row.headCoachName||coachName;lastCoachDate=row.date;
 }
 const announcements=(dataset?.coachEvents||[]).filter(e=>e.teamId===teamId&&e.publishedDate<cutoff&&e.effectiveDate<=cutoff)
  .sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
 // A dated club announcement can identify a new cycle before its first match.
 const latestAnnouncement=announcements.at(-1);
 if(latestAnnouncement&&(!lastCoachDate||latestAnnouncement.effectiveDate>=lastCoachDate)){
  if(latestAnnouncement.type==='departure'){coachId=null;coachName=null;cycleStart=null;changeObserved=true;}
  else{changeObserved=observations.some(r=>r.headCoachId&&r.headCoachId!==latestAnnouncement.headCoachId);
   coachId=latestAnnouncement.headCoachId;coachName=latestAnnouncement.name;cycleStart=latestAnnouncement.effectiveDate;}
 }else if(latestAnnouncement?.type==='appointment'&&latestAnnouncement.headCoachId===coachId&&cycleStart&&latestAnnouncement.effectiveDate<=cycleStart){
  // Do not bridge an observed intervening different coach with the same returning ID.
  const intervening=observations.some(r=>r.date>=latestAnnouncement.effectiveDate&&r.headCoachId&&r.headCoachId!==coachId);
  if(!intervening)cycleStart=latestAnnouncement.effectiveDate;
 }
 const cycle=coachId?observations.filter(r=>r.headCoachId===coachId&&r.date>=cycleStart):[];
 const recent=observations.slice(-4),pairs=[];
 for(let i=1;i<recent.length;i++){
  const a=recent[i-1],b=recent[i],sameKnownCoach=!!a.headCoachId&&a.headCoachId===b.headCoachId;
  const starterOverlap=a.lineupComplete&&b.lineupComplete?b.starterIds.filter(id=>a.starterIds.includes(id)).length/11:null;
  const minuteRetention=a.minutesComplete&&b.minutesComplete?b.minutes.filter(p=>a.minutes.some(q=>q.playerId===p.playerId)).reduce((n,p)=>n+p.minutes,0)/b.minutes.reduce((n,p)=>n+p.minutes,0):null;
  pairs.push({fromFixtureId:a.fixtureId,toFixtureId:b.fixtureId,sameKnownCoach,starterOverlap,
   minuteRetention:Number.isFinite(minuteRetention)?minuteRetention:null,formationChanged:a.formation&&b.formation?a.formation!==b.formation:null});
 }
 const lowPairs=pairs.filter(p=>p.sameKnownCoach&&p.starterOverlap!==null&&p.starterOverlap<=policy.lowStarterOverlap);
 const coachTransition=!!coachId&&changeObserved&&cycle.length<policy.transitionCoachMatches;
 const personnelTransition=lowPairs.length>=policy.minimumLowOverlapPairs;
 const latestFact=[observations.at(-1)?.date,latestAnnouncement?.effectiveDate].filter(Boolean).sort().at(-1);
 const ageDays=latestFact?(Date.parse(cutoff)-Date.parse(latestFact))/86400000:null;
 const stale=ageDays!==null&&ageDays>policy.maximumContextAgeDays;
 const unknown=!coachId||observations.length<2||stale;
 return {teamId,cutoffExclusive:cutoff,status:stale?'unknown':coachTransition||personnelTransition?'transition':unknown?'unknown':'observed',
  coachId,coachName,cycleStart,cycleMatches:coachId?cycle.length:null,changeObserved,coachTransition,personnelTransition,
  cycleFixtureIds:cycle.map(r=>r.fixtureId),latestObservationDate:observations.at(-1)?.date||null,
  observations:observations.length,ageDays,stale,lineupPairs:pairs,latestFormation:observations.at(-1)?.formation||null,
  recentFormations:[...new Set(recent.map(r=>r.formation).filter(Boolean))],
  formationOnlyChange:pairs.some(p=>p.formationChanged)&&!coachTransition&&!personnelTransition,
  starterOverlap:pairs.at(-1)?.starterOverlap??null,minuteRetention:pairs.at(-1)?.minuteRetention??null,
  evidenceScope:'prior-observed-matches-and-dated-appointments',policyVersion:policy.version};
}
function publicContinuity(context){
 if(!context)return null;
 const {coachId,cycleFixtureIds,lineupPairs,evidenceScope,...safe}=context;
 return safe;
}
function selectHistoryPolicy(teamId,reports,cutoff,dataset,variant,{matchdayExclusive=null,policy=CONTINUITY_POLICY}={}){
 const context=technicalContext(teamId,cutoff,dataset,{matchdayExclusive,policy});
 const sorted=reports.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.fixtureId.localeCompare(a.fixtureId));
 const cycleIds=new Set(context.cycleFixtureIds);
 const selected=variant==='recent'?sorted.slice(0,policy.recentMatches):variant==='coach-cycle'?sorted.filter(r=>cycleIds.has(r.fixtureId)):sorted;
 const weighted=selected.map((r,i)=>({fixtureId:r.fixtureId,weight:variant==='decay'?2**(-i/policy.halfLifeMatches):1}));
 const totalWeight=weighted.reduce((n,r)=>n+r.weight,0),square=weighted.reduce((n,r)=>n+r.weight*r.weight,0);
 return {variant,context,selected,weights:weighted,effectiveMatches:square?totalWeight*totalWeight/square:0,
  available:variant!=='coach-cycle'||context.coachId!==null&&!context.stale};
}
module.exports={CONTINUITY_POLICY,observationsFor,technicalContext,publicContinuity,selectHistoryPolicy};
