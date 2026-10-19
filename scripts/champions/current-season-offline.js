"use strict";
const {historicalBaseline,blendRates,ROLE_PRIORS}=require('./context-adjusted-player-baseline');
const {scaleShotProjections}=require('./player-volume-utils');
const TEAM_ALIASES=Object.freeze({'bod-glimt':'bodo-glimt'});
const TEAM_ONLY=new Set(['sabah','slavia-praha','slovan-bratislava','shakhtar-donetsk']);
const canonicalTeam=id=>TEAM_ALIASES[id]||id;
function exactPlayer(players,p){
 const provider=p.providerPlayerId;
 const exact=provider?players.filter(x=>String(x.providerPlayerId)===String(provider)):[];
 if(exact.length===1)return {player:exact[0],method:'exact-provider-id'};
 if(exact.length>1)return {player:null,method:'ambiguous-provider-id'};
 const ids=players.filter(x=>x.id===p.id);
 if(ids.length===1&&provider&&ids[0].providerPlayerId&&String(provider)!==String(ids[0].providerPlayerId))return {player:null,method:'provider-id-conflict'};
 return ids.length===1?{player:ids[0],method:'exact-canonical-id'}:{player:null,method:'unresolved'};
}
function channel(league){return league==='uefa.champions'?'champions':league.startsWith('uefa.')?'other-european':'domestic';}
function aggregate(rows,includeEstimated=false){
 const groups=new Map(),selected=[];let duplicates=0,conflicts=0;
 for(const r of rows){const key=[r.league,r.matchId,r.providerPlayerId].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 for(const key of [...groups.keys()].sort()){
  const group=groups.get(key);duplicates+=group.length-1;
  if(new Set(group.map(r=>JSON.stringify([r.shots,r.sot]))).size>1){conflicts++;continue;}
  const observed=group.filter(r=>r.minutesQuality==='observed');
  const candidates=observed.length?observed:group;
  if(new Set(candidates.map(r=>r.minutes)).size>1){conflicts++;continue;}
  const r=candidates[0];
  if(!includeEstimated&&r.minutesQuality!=='observed')continue;
  if(!(r.minutes>0)||!Number.isFinite(r.shots)||!Number.isFinite(r.sot)||r.sot>r.shots)continue;
  selected.push(r);
 }
 const minutes=selected.reduce((s,r)=>s+r.minutes,0);
 return {n:selected.length,minutes,shots:minutes?selected.reduce((s,r)=>s+r.shots,0)*90/minutes:null,sot:minutes?selected.reduce((s,r)=>s+r.sot,0)*90/minutes:null,duplicatesRemoved:duplicates,conflictingEventsExcluded:conflicts,matchIds:selected.map(r=>r.matchId),estimatedMinutes:selected.filter(r=>r.minutesQuality!=='observed').reduce((s,r)=>s+r.minutes,0)};
}
function rateCandidate({historical,role,rows,contextFactor=1,includeEstimated=false,disableCurrent=false}){
 const totals=historical?.previousSeason?.totals||{};
 const prior=ROLE_PRIORS[role];
 if(!prior||!(totals.minutes>0)||!Number.isFinite(totals.per90?.shots)||!Number.isFinite(totals.per90?.shotsOnTarget))return {status:'blocked-insufficient-history',old:null,candidate:null,channels:null};
 const old={shots:Number(historicalBaseline(totals.per90.shots,totals.minutes,prior.shots).toFixed(3)),sot:Number(historicalBaseline(totals.per90.shotsOnTarget,totals.minutes,prior.shotsOnTarget).toFixed(3))};
 const split={};for(const c of ['domestic','champions','other-european'])split[c]=aggregate(disableCurrent?[]:rows.filter(r=>channel(r.league)===c),includeEstimated);
 const d=split.domestic,e=split.champions;
 const one=(metric,key)=>{
  if(!d.minutes&&!e.minutes)return {blended:old[key],domesticWeight:0,europeanWeight:0,historicalWeight:1};
  // Existing AEK blending constants, independent current UEFA/domestic channels.
  return blendRates({historicalRaw:totals.per90[metric],historicalMinutes:totals.minutes,rolePrior:prior[metric],domesticRaw:d[key],domesticMinutes:d.minutes,domesticStrengthFactor:contextFactor,europeanRaw:e[key],europeanMinutes:e.minutes});
 };
 const shots=one('shots','shots'),sot=one('shotsOnTarget','sot');
 const candidate={shots:Number(shots.blended.toFixed(3)),sot:Number(sot.blended.toFixed(3))};
 return {status:candidate.sot>candidate.shots?'blocked-sot-exceeds-shots':'diagnostic-rate-only',old,candidate,channels:split,weights:{historical:shots.historicalWeight,domestic:shots.domesticWeight,champions:shots.europeanWeight},contextFactor,estimatedIncluded:includeEstimated};
}
function projectDocumentedTeam({teamId,players,lineupVerified,benchVerified,targetShots,targetSOT}){
 if(TEAM_ONLY.has(canonicalTeam(teamId)))return {status:'blocked-collective-only',players:[]};
 if(!lineupVerified||!benchVerified||!players.length||players.some(p=>!(p.expectedMinutes>0)||!Number.isFinite(p.per90?.shots)||!Number.isFinite(p.per90?.shotsOnTarget)))return {status:'blocked-documentation-or-minutes',players:[]};
 if(players.reduce((s,p)=>s+p.expectedMinutes,0)>990)return {status:'blocked-existing-990-minute-budget',players:[]};
 if(!Number.isFinite(targetShots)||!Number.isFinite(targetSOT))return {status:'blocked-team-volumes',players:[]};
 const shots=scaleShotProjections(players,'shots',targetShots),sot=scaleShotProjections(players,'shotsOnTarget',targetSOT);
 const result=shots.map(s=>({playerId:s.player.playerId,shots:s.projection,sot:sot.find(t=>t.player.playerId===s.player.playerId)?.projection}));
 const ds=Number((result.reduce((s,p)=>s+p.shots,0)-targetShots).toFixed(2));
 const dt=Number((result.reduce((s,p)=>s+p.sot,0)-targetSOT).toFixed(2));
 // Do not introduce a new conservation formula to conceal an existing helper limit.
 if(Math.abs(ds)>0.02||Math.abs(dt)>0.02||result.some(p=>p.sot>p.shots))return {status:'blocked-existing-reconciliation-limit',players:[],diagnostic:{shotsDifference:ds,sotDifference:dt,unapprovedRaw:result}};
 return {status:'offline-conditional-only',players:result,shotsDifference:ds,sotDifference:dt};
}
module.exports={canonicalTeam,TEAM_ONLY,exactPlayer,aggregate,channel,rateCandidate,projectDocumentedTeam};
