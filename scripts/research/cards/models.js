"use strict";
const {CONFIG}=require('./config');
const {finite,priorMatches,kickoff,instant,availability}=require('./data');
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const clip=p=>Math.min(1-1e-12,Math.max(1e-12,p)),logit=p=>Math.log(clip(p)/(1-clip(p))),logistic=z=>1/(1+Math.exp(-Math.max(-700,Math.min(700,z))));
function maturity(minutes,appearances,cards=0,fouls=null){let state='VERY_LOW';for(const s of ['LOW','MEDIUM','HIGH'])if(minutes>=CONFIG.maturity[s].minutes&&appearances>=CONFIG.maturity[s].appearances)state=s;return {state,minutes,appearances,cardEvents:cards,foulEvents:fouls,boundaries:CONFIG.maturity,interpretation:'Exposure maturity is not event-context certification'};}
function c0(f,train){
  // Leave this individual's history out of population prior to avoid reusing evidence in C1.
  const pool=train.filter(r=>r.playerId!==f.playerId),sum=a=>a.reduce((s,r)=>s+r.target,0);
  const {alpha,beta}=CONFIG.leaguePrior,k=CONFIG.shrinkage.roleEquivalentObservations;
  const league=(alpha+sum(pool))/(alpha+beta+pool.length),broad=pool.filter(r=>r.role===f.role&&f.role!=='UNKNOWN');
  const broadP=(k*league+sum(broad))/(k+broad.length),detail=pool.filter(r=>r.roleGroup===f.roleGroup&&f.roleGroup!=='UNKNOWN');
  const supported=detail.length>=CONFIG.shrinkage.detailedRoleMinimum;
  return {p:supported?(k*broadP+sum(detail))/(k+detail.length):broad.length?broadP:league,
    fallback:supported?'DETAILED_ROLE_SHRUNK':broad.length?'BROAD_ROLE_SHRUNK':pool.length?'LEAGUE_SHRUNK':'JEFFREYS_PRIOR_ONLY_NO_ELIGIBLE_TRAINING',
    components:{priorAlpha:alpha,priorBeta:beta,leagueN:pool.length,leagueY:sum(pool),leagueP:league,broadN:broad.length,broadY:sum(broad),broadP,detailedN:detail.length,detailedY:sum(detail),detailSupported:supported,roleEquivalentObservations:k,leaveIndividualOut:true}};
}
function weightedEvidence(records,discount=1){const n=records.length,y=records.reduce((s,r)=>s+r.target,0),minutes=records.reduce((s,r)=>s+(finite(r.actualMinutes)?r.actualMinutes:0),0);const effective=discount*Math.min(n,Math.max(minutes/90,y*0.25));return {appearances:n,minutes,positives:y,effective,successes:n?effective*y/n:0,discount,interpretation:'Exposure-tempered prior observational records; bench-only positives retain quarter-observation evidence'};}
function aggregateHistoricalEvidence(sample){
  const appearances=sample?.fields?.appearances,minutes=sample?.fields?.minutes,yellows=sample?.fields?.yellowCards;
  if(!finite(appearances)||!finite(minutes)||!finite(yellows)||appearances<=0)return {appearances:0,minutes:0,positives:0,effective:0,successes:0,discount:CONFIG.shrinkage.historicalDiscount,status:'UNAVAILABLE'};
  const discount=CONFIG.shrinkage.historicalDiscount,effective=discount*Math.min(appearances,minutes/90),rate=clamp(yellows/appearances,0,1);
  return {appearances,minutes,positives:yellows,effective,successes:effective*rate,discount,rawRate:rate,status:'2025_26_SERIE_A_PROVIDER_ORDINARY_YELLOW_AGGREGATE'};
}
function c1(prior,f,train){
  const current=weightedEvidence(train.filter(r=>r.playerId&&r.playerId===f.playerId&&r.season===f.season)),historical=f.historicalAvailableSample?aggregateHistoricalEvidence(f.historicalAvailableSample):weightedEvidence((f.historicalEligibleRecords||[]).filter(r=>r.playerId===f.playerId&&r.competition==='serie-a'&&r.contextCertified&&r.availableAt<f.cutoff&&r.matchId!==f.matchId),CONFIG.shrinkage.historicalDiscount);
  const k=CONFIG.shrinkage.individualEquivalentObservations,denom=k+current.effective+historical.effective;
  return {p:(k*prior.p+current.successes+historical.successes)/denom,fallback:current.effective?historical.effective?'CURRENT_AND_HISTORICAL_SHRUNK':'CURRENT_INDIVIDUAL_SHRUNK':historical.effective?'HISTORICAL_INDIVIDUAL_SHRUNK':prior.fallback,
    components:{priorProbability:prior.p,priorEquivalent:k,current,historical,priorWeight:k/denom,currentWeight:current.effective/denom,historicalWeight:historical.effective/denom,effectiveSample:denom,maturity:maturity(current.minutes+historical.minutes,current.appearances+historical.appearances,current.positives+historical.positives)}};
}
function fitOffset(rows,key,offset='pYellow_C1',options={}){
  const cfg={...CONFIG.regression,...options},valid=rows.filter(r=>[0,1].includes(r.target)&&finite(r.features?.[key])&&finite(r[offset])),clusters=new Set(valid.map(r=>r.matchId)).size,y=valid.reduce((s,r)=>s+r.target,0);
  if(valid.length<cfg.minimumObservations||clusters<cfg.minimumMatches||y<cfg.minimumPositives||valid.length-y<cfg.minimumNegatives)return {beta:0,se:null,status:'INSUFFICIENT_SAMPLE',n:valid.length,positives:y,matches:clusters};
  let b=0,h=cfg.ridge;
  for(let i=0;i<cfg.iterations;i++){let g=-cfg.ridge*b;h=cfg.ridge;for(const r of valid){const x=r.features[key],p=logistic(logit(r[offset])+b*x);g+=x*(r.target-p);h+=x*x*p*(1-p);}const step=g/h;b+=step;if(Math.abs(step)<1e-9)break;}
  if(!Number.isFinite(b)||!(h>0))throw new Error('Invalid logistic posterior');
  const se=1/Math.sqrt(h);
  return {beta:b,se,interval:[b-CONFIG.signal.z*se,b+CONFIG.signal.z*se],status:'TRAINING_ONLY_MAP_NORMAL_APPROXIMATION',n:valid.length,positives:y,matches:clusters,ridge:cfg.ridge};
}
function activeSignal(train,key,offset='pYellow_C2'){
  const estimate=fitOffset(train,key,offset,{minimumMatches:CONFIG.signal.minimumMatches}),ids=[...new Set(train.map(r=>r.matchId))],left=new Set(ids.slice(0,Math.floor(ids.length/2))),right=new Set(ids.slice(Math.floor(ids.length/2)));
  const split={minimumMatches:CONFIG.signal.minimumSplitMatches,minimumObservations:50,minimumPositives:10,minimumNegatives:10};
  const early=fitOffset(train.filter(r=>left.has(r.matchId)),key,offset,split),late=fitOffset(train.filter(r=>right.has(r.matchId)),key,offset,split);
  const persistent=early.status!=='INSUFFICIENT_SAMPLE'&&late.status!=='INSUFFICIENT_SAMPLE'&&early.beta*late.beta>0;
  const separated=estimate.interval&&(estimate.interval[0]>0||estimate.interval[1]<0);
  const observed=train.filter(r=>finite(r.features?.[key])).length;
  return {...estimate,status:!observed?'UNKNOWN':separated&&persistent?'ACTIVE':estimate.status==='INSUFFICIENT_SAMPLE'?'WATCH':'INACTIVE',persistence:{early,late,sameSign:persistent},maturity:estimate.matches>=CONFIG.signal.minimumMatches?'MATURE':'IMMATURE',quantitativeInfluence:Boolean(separated&&persistent),effectInterpretation:'Log odds per unit; approximate posterior uncertainty, no prospective validation'};
}
function exposureProbability(p,features,referenceMinutes){
  if(!finite(features.expectedMinutes))return {p,reason:'EXPECTED_MINUTES_UNAVAILABLE',method:'NEUTRAL_MISSING_INFORMATION'};
  if(features.exposureSemantics!==CONFIG.exposure.semanticsRequired)return {p,reason:'EXPECTED_MINUTES_ESTIMAND_UNVERIFIED',method:'NEUTRAL_MISSING_INFORMATION'};
  const minutes=features.expectedMinutes;
  if(minutes<0||minutes>130||!(referenceMinutes>0))throw new Error('Invalid pre-match exposure');
  // Constant hazard, point exposure approximation; never linear probability multiplication.
  return {p:minutes===0?0:-Math.expm1(Math.log1p(-clip(p))*minutes/referenceMinutes),reason:null,method:'COMPLEMENTARY_LOG_LOG_POINT_EXPOSURE',referenceMinutes,expectedMinutes:minutes,uncertainty:'Mean-only exposure approximation; no fabricated participation distribution'};
}
function refereeSignal(f,train){
  if(!f.referee.identity)return {status:'UNKNOWN',reason:f.referee.status==='NO_DESIGNATION_AVAILABLE'?'NO_DESIGNATION_AVAILABLE':'DESIGNATION_TIMING_UNVERIFIED',logOddsAdjustment:0};
  const rows=train.filter(r=>r.features.referee.identity===f.referee.identity),n=rows.length,y=rows.reduce((s,r)=>s+r.target,0),matches=new Set(rows.map(r=>r.matchId)).size;
  const league=mean(train.map(r=>r.pYellow_C3))??0.5,expected=mean(rows.map(r=>r.pYellow_C3))??league,k=CONFIG.shrinkage.roleEquivalentObservations,p=(k*expected+y)/(k+n),variance=p*(1-p)/(k+n+1),se=Math.sqrt(variance),interval=[Math.max(0,p-1.96*se),Math.min(1,p+1.96*se)];
  const ids=[...new Set(rows.map(r=>r.matchId))],split=new Set(ids.slice(0,Math.floor(ids.length/2))),a=rows.filter(r=>split.has(r.matchId)),b=rows.filter(r=>!split.has(r.matchId));
  const relative=a.length&&b.length?(mean(a.map(r=>r.target))-(mean(a.map(r=>r.pYellow_C3))??league))*(mean(b.map(r=>r.target))-(mean(b.map(r=>r.pYellow_C3))??league)):0;
  const persistent=a.length>0&&b.length>0&&new Set(a.map(r=>r.matchId)).size>=CONFIG.signal.minimumSplitMatches&&new Set(b.map(r=>r.matchId)).size>=CONFIG.signal.minimumSplitMatches&&relative>0;
  const active=matches>=CONFIG.signal.minimumRefereeMatches&&y>=CONFIG.signal.minimumPositives&&persistent&&(interval[0]>expected||interval[1]<expected);
  const mature=matches>=CONFIG.signal.minimumRefereeMatches&&y>=CONFIG.signal.minimumPositives&&n-y>=CONFIG.signal.minimumPositives;
  return {identity:f.referee.identity,status:active?'ACTIVE':mature?'INACTIVE':n?'WATCH':'UNKNOWN',reason:active?'MATURE_SAME_COMPETITION_TARGET_EVIDENCE':mature?'KNOWN_REFEREE_WITH_NEUTRAL_ESTIMATE':n?'IMMATURE_REFEREE_TARGET_EVIDENCE':'KNOWN_REFEREE_TARGET_EVIDENCE_UNAVAILABLE',matches,n,y,p,leagueP:league,expectedRoleExposureAdjustedP:expected,priorWeight:k/(k+n),interval,persistence:persistent,logOddsAdjustment:active?logit(p)-logit(expected):0,competition:'serie-a',season:f.season,quality:'Only source-certified eligible player target observations; baseline adjusts for referee-group C3 role/exposure mix; team totals not substituted'};
}
function predict(f,train){
  if(train.some(r=>r.matchId===f.matchId||r.cutoff>=f.cutoff||!r.primaryEligible))throw new Error('LEAKAGE_OR_INELIGIBLE_TRAINING');
  const a=c0(f,train),b=c1(a,f,train),reference=CONFIG.exposure.referenceMinutes;
  const expectedMinutes=fitOffset(train,'expectedMinutesCentered'),foul=fitOffset(train,'foulLogRatio');
  const emP=finite(f.expectedMinutesCentered)?logistic(logit(b.p)+expectedMinutes.beta*f.expectedMinutesCentered):b.p;
  const foulP=finite(f.foulLogRatio)?logistic(logit(b.p)+foul.beta*f.foulLogRatio):b.p;
  const jointAdjustment=(finite(f.expectedMinutesCentered)?expectedMinutes.beta*f.expectedMinutesCentered:0)+(finite(f.foulLogRatio)?foul.beta*f.foulLogRatio:0),fullP=logistic(logit(b.p)+jointAdjustment);
  const opponent=activeSignal(train,'opponentLogRatio'),team=activeSignal(train,'teamFoulLogRatio'),home=activeSignal(train,'homeIndicator');
  const c3p=opponent.quantitativeInfluence&&finite(f.opponentLogRatio)?logistic(logit(fullP)+opponent.beta*f.opponentLogRatio):fullP;
  const intermediate={...f,pYellow_C3:c3p},referee=refereeSignal(intermediate,train),c4p=referee.logOddsAdjustment?logistic(logit(c3p)+referee.logOddsAdjustment):c3p;
  const probabilities={pRecordedYellow_C0:a.p,pRecordedYellow_C1:b.p,pRecordedYellow_C2:fullP,pRecordedYellow_C3:c3p,pRecordedYellow_C4:c4p,pYellow_C0:a.p,pYellow_C1:b.p,pYellow_C2:fullP,pYellow_C3:c3p,pYellow_C4:c4p};
  if(Object.values(probabilities).some(p=>!finite(p)||p<0||p>1))throw new Error('Invalid research probability');
  return {...probabilities,ablations:{C1_NO_EXPECTED_MINUTES:b.p,C1_PLUS_EXPECTED_MINUTES:emP,C1_PLUS_FOULS:foulP,FULL_C2:fullP,C2_PLUS_TEAM:team.quantitativeInfluence&&finite(f.teamFoulLogRatio)?logistic(logit(fullP)+team.beta*f.teamFoulLogRatio):fullP,C2_PLUS_HOME:home.quantitativeInfluence?logistic(logit(fullP)+home.beta*f.homeIndicator):fullP},
    fallback:{C0:a.fallback,C1:b.fallback,C2:{expectedMinutes:finite(f.expectedMinutesCentered)?expectedMinutes.status:'EXPECTED_MINUTES_UNAVAILABLE_NEUTRAL',fouls:finite(f.foulLogRatio)?foul.status:'FOULS_UNAVAILABLE_NEUTRAL'},C3:opponent.status,C4:referee.reason},maturity:b.components.maturity,components:{C0:a.components,C1:b.components,C2:{expectedMinutes,fouls:foul,combination:'ADDITIVE_TRAINING_FOLD_LOG_ODDS_OFFSETS_WITH_RIDGE',referenceMinutes:reference},C3:opponent,C4:referee,teamAblation:team,homeAblation:home},calibratedProbability:null,estimand:CONFIG.estimand,bookmakerProbability:null};
}
function historicalSample(player,cutoff){
  const entries=(player?.previousSeason?.entries||[]).filter(e=>{const at=availability(e.lastUpdated);return at&&at<cutoff&&/serie\s*a/i.test(e.competition||'')&&(e.competitionType==='domestic-league'||!e.competitionType);});
  if(!entries.length)return null;
  const fieldsToScore=['appearances','starts','substituteAppearances','minutes','completeMatches','substitutedOff','yellowCards','secondYellowCards','straightRedCards','foulsCommitted','foulsWon'];
  const quality=e=>fieldsToScore.filter(field=>finite(e[field])).length,latest=(a,b)=>quality(b)-quality(a)||String(availability(b.lastUpdated)).localeCompare(String(availability(a.lastUpdated)))||String(a.source??'').localeCompare(String(b.source??''));
  const aggregateEntries=entries.filter(e=>!e.team||/^n\/?d$/i.test(String(e.team).trim())),byQuality=[...entries].sort(latest),teamKey=e=>String(e.team).trim().toLocaleLowerCase('it-IT'),selected=aggregateEntries.length?[...aggregateEntries].sort(latest).slice(0,1):byQuality.filter((e,index)=>byQuality.findIndex(candidate=>teamKey(candidate)===teamKey(e))===index);
  const sum=field=>selected.every(e=>finite(e[field]))?selected.reduce((n,e)=>n+e[field],0):null;
  const fields=Object.fromEntries(['appearances','starts','substituteAppearances','minutes','completeMatches','substitutedOff','yellowCards','secondYellowCards','straightRedCards','foulsCommitted','foulsWon'].map(k=>[k,sum(k)]));
  const source=e=>({provider:e.source??'UNKNOWN',url:e.sourceUrl??null,lastUpdated:e.lastUpdated??null,team:e.team??null,competition:e.competition??null});
  return {season:'2025-26',competition:'Serie A',playerId:player.id,identityResolution:'CANONICAL_ID',availableAt:selected.map(e=>availability(e.lastUpdated)).sort().at(-1),fields,sources:selected.map(source),excludedOverlappingSources:entries.filter(e=>!selected.includes(e)).map(source),deduplicationPolicy:aggregateEntries.length?'LATEST_MOST_COMPLETE_ND_SEASON_AGGREGATE_REPLACES_OVERLAPPING_CLUB_ROWS':'LATEST_MOST_COMPLETE_ENTRY_PER_NAMED_CLUB_THEN_SUM_TRUE_MULTI_CLUB_ROWS',interpretation:'Provider ordinary-yellow aggregate for observational research; overlapping season aggregates are not double-counted; not bookmaker eligibility certified',usedQuantitatively:Boolean(finite(fields.appearances)&&finite(fields.minutes)&&finite(fields.yellowCards))};
}
function expectedMinutesEstimate(feature,personal){
  if(!feature.projectedStarter)return {expectedMinutes:null,expectedMinutesReliability:null,substitutionRisk:null,status:'PROJECTED_RESERVE_NO_UNCONDITIONAL_MINUTES_DISTRIBUTION'};
  const policy=CONFIG.expectedMinutesPolicy,totals=feature.historicalAvailableSample?.fields||{},prior=policy.rolePriors[feature.role]??policy.rolePriors.UNKNOWN,appearances=finite(totals.appearances)?totals.appearances:0,starts=finite(totals.starts)?totals.starts:0,subApps=finite(totals.substituteAppearances)?totals.substituteAppearances:0;
  const historical=starts>0&&finite(totals.minutes)?clamp((totals.minutes-subApps*22)/starts,45,90):prior,historyWeight=clamp(appearances/(appearances+policy.historicalEquivalentAppearances),0,policy.maximumHistoricalWeight);
  let estimate=prior*(1-historyWeight)+historical*historyWeight;
  const currentStarters=personal.filter(p=>p.starter===true&&finite(p.minutes)),currentWeight=clamp(currentStarters.length/(currentStarters.length+policy.currentStarterEquivalentMatches),0,policy.maximumCurrentStarterWeight);
  if(currentStarters.length)estimate=estimate*(1-currentWeight)+mean(currentStarters.map(p=>p.minutes))*currentWeight;
  const recent=[...personal].filter(p=>finite(p.minutes)).slice(-policy.recentWindowMatches),recentWeight=clamp(recent.length/(recent.length+policy.currentStarterEquivalentMatches),0,policy.maximumCurrentStarterWeight);
  if(recent.length)estimate=estimate*(1-recentWeight)+mean(recent.map(p=>p.minutes))*recentWeight;
  estimate=Math.round(clamp(estimate,0,90)*10)/10;
  const substitutedRate=starts&&finite(totals.substitutedOff)?totals.substitutedOff/starts:null,substitutionRisk=estimate>=82&&(substitutedRate===null||substitutedRate<0.42)?'low':estimate<70||(substitutedRate!==null&&substitutedRate>=0.68)?'high':'medium';
  return {expectedMinutes:estimate,expectedMinutesReliability:Math.round((1-(1-historyWeight)*(1-currentWeight)*(1-recentWeight))*1000)/1000,substitutionRisk,status:'RECONSTRUCTED_PREMATCH_WITH_PRODUCTION_EXPECTED_MINUTES_POLICY',components:{prior,historyWeight,currentWeight,recentWeight,appearances,starts,currentStarterAppearances:currentStarters.length,recentAppearances:recent.length}};
}
function features(input,row){
  const match=input.matches.find(m=>m.id===row.matchId),past=priorMatches(input.matches,match),side=m=>m.homeTeam===row.team?'home':m.awayTeam===row.team?'away':null;
  const personal=past.flatMap(m=>['home','away'].flatMap(s=>(m.playerStats?.[s]||[]).filter(p=>row.playerId&&p.playerId===row.playerId).map(p=>({matchId:m.id,team:s==='home'?m.homeTeam:m.awayTeam,...p}))));
  const foulRows=personal.filter(p=>finite(p.minutes)&&finite(p.foulsCommitted)),minutes=foulRows.reduce((s,p)=>s+p.minutes,0),fouls=foulRows.reduce((s,p)=>s+p.foulsCommitted,0);
  const all=past.flatMap(m=>['home','away'].flatMap(s=>m.playerStats?.[s]||[])).filter(p=>finite(p.minutes)&&p.minutes>0&&finite(p.foulsCommitted));
  const leagueMinutes=all.reduce((s,p)=>s+p.minutes,0),leagueFouls=all.reduce((s,p)=>s+p.foulsCommitted,0),priorFoul90=leagueMinutes?leagueFouls*90/leagueMinutes:null;
  const foul90=priorFoul90!==null?(fouls+priorFoul90*450/90)/(minutes/90+450/90):null;
  const drawn=team=>past.filter(m=>[m.homeTeam,m.awayTeam].includes(team)).flatMap(m=>{const s=m.homeTeam===team?'home':'away',p=m.playerStats?.[s];return p?.length&&p.every(r=>finite(r.foulsWon))?[{matchId:m.id,value:p.reduce((n,r)=>n+r.foulsWon,0)}]:[];});
  const opposition=drawn(row.opponent),leagueDrawn=past.flatMap(m=>[m.homeTeam,m.awayTeam].flatMap(t=>{const s=m.homeTeam===t?'home':'away',p=m.playerStats?.[s];return p?.length&&p.every(r=>finite(r.foulsWon))?[p.reduce((n,r)=>n+r.foulsWon,0)]:[];})),leagueDraw=mean(leagueDrawn);
  const teamFouls=past.filter(m=>side(m)).map(m=>m.teamStats?.[side(m)]?.fouls).filter(finite),allTeamFouls=past.flatMap(m=>[m.teamStats?.home?.fouls,m.teamStats?.away?.fouls]).filter(finite),teamMean=mean(teamFouls),leagueTeamMean=mean(allTeamFouls);
  const exposureAvailable=instant(row.provenance?.exposure?.availableAt)&&row.provenance.exposure.availableAt<row.cutoff&&Boolean(row.provenance.exposure.source);
  const squad=input.squads.get(row.team),player=squad?.players.find(p=>p.id===row.playerId),historicalAvailableSample=historicalSample(player,row.cutoff);
  const exposure=expectedMinutesEstimate({projectedStarter:row.projectedStarter,role:row.role,historicalAvailableSample},personal);
  const frozenExposure=row.provenance?.exposure?.status==='FROZEN_PLAYER_MARKET_V2_INPUT_REFERENCE';
  const expectedMinutesValue=frozenExposure&&finite(row.expectedMinutes)?row.expectedMinutes:exposure.expectedMinutes,expectedMinutesReliability=frozenExposure&&finite(row.expectedMinutesReliability)?row.expectedMinutesReliability:exposure.expectedMinutesReliability,substitutionRisk=frozenExposure?(row.substitutionRisk??exposure.substitutionRisk):exposure.substitutionRisk;
  const historicalFouls=historicalAvailableSample?.fields?.foulsCommitted,historicalFoulMinutes=historicalAvailableSample?.fields?.minutes,historicalDiscount=CONFIG.shrinkage.historicalDiscount;
  const combinedFouls=fouls+(finite(historicalFouls)?historicalDiscount*historicalFouls:0),combinedFoulMinutes=minutes+(finite(historicalFoulMinutes)?historicalDiscount*historicalFoulMinutes:0);
  const combinedFoul90=priorFoul90!==null?(combinedFouls+priorFoul90*450/90)/(combinedFoulMinutes/90+450/90):null;
  const recorded=past.flatMap(m=>(m.bookings||[]).filter(e=>row.playerId&&e.playerId===row.playerId));
  return {playerId:row.playerId,matchId:row.matchId,team:row.team,role:row.role,roleGroup:row.roleGroup,season:match.season,cutoff:row.cutoff,referee:row.referee,
    expectedMinutes:exposureAvailable?expectedMinutesValue:null,expectedMinutesReliability:exposureAvailable?expectedMinutesReliability:null,substitutionRisk:exposureAvailable?substitutionRisk:null,exposureSemantics:exposureAvailable?CONFIG.exposure.semanticsRequired:null,expectedMinutesCentered:exposureAvailable&&finite(expectedMinutesValue)?(expectedMinutesValue-CONFIG.exposure.centerMinutes)/CONFIG.exposure.scaleMinutes:null,projectedStarter:row.projectedStarter,probableXIState:row.projectedStarter?'STARTER':'RESERVE',
    historicalEligibleRecords:[],historicalAvailableSample,historicalAvailability:{status:historicalAvailableSample?'PREMATCH_2025_26_SERIE_A_AGGREGATE_AVAILABLE':'NO_PREMATCH_SERIE_A_HISTORY',reason:historicalAvailableSample?'Ordinary-yellow aggregate supports observational shrinkage only; market eligibility remains uncertified':'No timestamped prior-season Serie A aggregate; other competitions not pooled'},
    foulLogRatio:combinedFoul90!==null&&priorFoul90>0?Math.log((combinedFoul90+0.1)/(priorFoul90+0.1)):null,
    opponentLogRatio:opposition.length&&leagueDraw>0?Math.log(((opposition.reduce((n,r)=>n+r.value,0)+12*leagueDraw)/(opposition.length+12)+0.1)/(leagueDraw+0.1)):null,
    teamFoulLogRatio:teamMean!==null&&leagueTeamMean>0?Math.log((teamMean+0.1)/(leagueTeamMean+0.1)):null,homeIndicator:row.homeAway==='home'?1:0,
    dataOnly:{individualPriorAppearances:personal.length,individualPriorMinutes:personal.reduce((n,p)=>n+(finite(p.minutes)?p.minutes:0),0),recordedPriorCards:{ordinaryYellow:recorded.filter(e=>e.eventType==='yellow').length,secondYellowDismissal:recorded.filter(e=>e.eventType==='yellowRedCard').length,straightRed:recorded.filter(e=>e.eventType==='redCard').length,scope:'Observed source events only, target eligibility unknown',sampleMatches:past.length},foulsCommitted:minutes?fouls:null,foulsMinutes:minutes,foulsPer90:minutes?fouls*90/minutes:null,historicalFoulsCommitted:historicalAvailableSample?.fields?.foulsCommitted??null,historicalFoulsMinutes:historicalAvailableSample?.fields?.minutes??null,opponentFoulDrawingSample:opposition.length,opponentFoulDrawingRate:mean(opposition.map(r=>r.value)),teamFoulSample:teamFouls.length,expectedMinutes:exposure},
    provenance:{sourceMatchIds:past.map(m=>m.id),individualMatchIds:personal.map(p=>p.matchId),cutoff:row.cutoff,targetExcluded:!past.some(m=>m.id===row.matchId),sameDayPolicy:'Excluded unless explicit completedAt before kickoff',sourceCapture:'Retrospective event-time reconstruction; not a historically frozen input state',fields:['prior playerStats.minutes/foulsCommitted/foulsWon','prior teamStats.fouls','timestamped 2025-26 Serie A player aggregates','pre-match projected XI state'],foulPriorMinutes:450,opponentPriorEquivalentMatches:12,expectedMinutesPolicy:CONFIG.expectedMinutesPolicy,transferHandling:'Same canonical player ID across prior Serie A teams; target team comes only from target pre-match lineup'}};
}
module.exports={mean,clip,logit,logistic,maturity,c0,c1,weightedEvidence,aggregateHistoricalEvidence,fitOffset,activeSignal,exposureProbability,refereeSignal,predict,historicalSample,expectedMinutesEstimate,features};
