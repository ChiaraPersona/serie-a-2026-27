'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
const deviation=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)));};
function domesticFeatures(dataset,uefaId,date,asOf,{retrospective=false}={}){
 const providerId=dataset.identities[String(uefaId)];if(!providerId)return null;
 const candidates=dataset.calendars.filter(c=>c.teamIds.includes(providerId)&&(retrospective||Date.parse(c.retrievedAt)<=Date.parse(asOf)))
  .map(c=>({...c,prior:c.matches.filter(m=>m.date<date&&Date.parse(m.kickoffUtc)<Date.parse(asOf))}))
  .filter(c=>c.prior.some(m=>m.homeId===providerId||m.awayId===providerId)).sort((a,b)=>b.prior.at(-1).date.localeCompare(a.prior.at(-1).date)||b.retrievedAt.localeCompare(a.retrievedAt));
 for(const calendar of candidates){
  const table=new Map();
  for(const m of calendar.prior)for(const [id,gf,ga] of [[m.homeId,m.homeGoals,m.awayGoals],[m.awayId,m.awayGoals,m.homeGoals]]){
   const r=table.get(id)||{id,played:0,points:0,goalsFor:0,goalsAgainst:0};r.played++;r.points+=gf>ga?3:gf===ga?1:0;r.goalsFor+=gf;r.goalsAgainst+=ga;table.set(id,r);
  }
  const own=table.get(providerId),peers=[...table.values()].filter(t=>t.played>=4);if(!own||own.played<4||peers.length<4)continue;
  const ppg=peers.map(t=>t.points/t.played),gd=peers.map(t=>(t.goalsFor-t.goalsAgainst)/t.played);
  const feature=(v,values)=>{const sd=deviation(values);return sd>0?clamp((v-mean(values))/sd,-2,2):0;};
  const ordered=[...table.values()].sort((a,b)=>b.points/b.played-a.points/a.played||(b.goalsFor-b.goalsAgainst)/b.played-(a.goalsFor-a.goalsAgainst)/a.played);
  return {leagueId:calendar.leagueId,season:calendar.season,played:own.played,points:own.points,pointsPerGame:own.points/own.played,goalDifferencePerGame:(own.goalsFor-own.goalsAgainst)/own.played,performanceRank:ordered.findIndex(t=>t.id===providerId)+1,rankSemantics:'reconstructed-points-per-game-not-official-tiebreak-table',leagueTeams:table.size,
   ppgZ:feature(own.points/own.played,ppg),gdZ:feature((own.goalsFor-own.goalsAgainst)/own.played,gd),latestMatchDate:calendar.prior.at(-1).date,calendarPath:calendar.rawPath,calendarSha256:calendar.sha256,availableAt:calendar.retrievedAt};
 }
 return null;
}
function countryFeature(state,team,date){
 const peers=[...state.entries()].filter(([id,r])=>id!==String(team.id)&&r.country===team.countryCode&&r.appearances>=6);
 if(!peers.length)return null;
 const rating=mean(peers.map(([,r])=>r.rating));
 const countries=[...new Set([...state.values()].map(r=>r.country))];
 const ranking=countries.map(country=>({country,rating:mean([...state.entries()].filter(([id,r])=>id!==String(team.id)&&r.country===country&&r.appearances>=6).map(([,r])=>r.rating))})).filter(r=>r.rating!==null).sort((a,b)=>b.rating-a.rating);
 return {rating,delta:rating-1500,peerClubs:peers.length,strengthRank:ranking.findIndex(r=>r.country===team.countryCode)+1,rankedAssociations:ranking.length,scope:'European representatives; proxy for domestic league strength',peerIds:peers.map(([id])=>id)};
}
function estimateInitialPrior({raw,appearances,domestic,country,parameters,minimumAppearances=6}){
 if(appearances>=minimumAppearances)return {rating:raw,applied:false,status:'established-european-rating'};
 if(!domestic||!country)return {rating:raw,applied:false,status:'missing-domestic-or-league-evidence'};
 const domesticSignal=parameters.ppgScale*domestic.ppgZ+parameters.goalDifferenceScale*domestic.gdZ;
 let transferFactor=1;
 if(parameters.domesticTransferExponent>0){
  if(!Number.isInteger(country.strengthRank)||!Number.isInteger(country.rankedAssociations)||country.strengthRank<1||country.strengthRank>country.rankedAssociations||country.rankedAssociations<2)return {rating:raw,applied:false,status:'missing-comparable-league-strength'};
  transferFactor=((country.rankedAssociations-country.strengthRank)/(country.rankedAssociations-1))**parameters.domesticTransferExponent;
 }
 // Attenuate positive domestic dominance. Weak-league underperformance does
 // not become a reward through a smaller negative penalty.
 const transferredSignal=domesticSignal>0?domesticSignal*transferFactor:domesticSignal;
 const initial=1500+parameters.countryScale*country.delta+transferredSignal;
 const priorWeight=(minimumAppearances-appearances)/minimumAppearances;
 return {rating:raw+(initial-1500)*priorWeight,initialRating:initial,priorWeight,raw,applied:true,status:'experimental-estimated-initial-rating',uncertainty:'high',europeanAppearances:appearances,domestic,country,domesticTransfer:{factor:transferFactor,unadjustedSignal:domesticSignal,transferredSignal,exponent:parameters.domesticTransferExponent||0,method:parameters.domesticTransferExponent>0?'association-strength-percentile-positive-bonus':'unscaled-legacy'},statisticallyValidated:false};
}
function ratingProbabilities(home,away,p){const gap=home-away+p.homeAdvantage,share=1/(1+10**(-gap/400)),draw=Math.max(.12,Math.min(.34,p.drawBase*Math.exp(-Math.abs(gap)/p.drawScale)));return {home:(1-draw)*share,draw,away:(1-draw)*(1-share)};}
function forecastWithInitialPriors({state,match,forecast,dataset,model,parameters,asOf,minimumAppearances=6}){
 const features=Object.fromEntries(['home','away'].map(side=>{
  const team=match[side+'Team'],base=forecast.features[side];
  const prior=estimateInitialPrior({raw:base.raw,appearances:base.appearances,domestic:base.appearances<minimumAppearances?domesticFeatures(dataset,team.id,match.date<asOf.slice(0,10)?match.date:asOf.slice(0,10),asOf):null,country:base.appearances<minimumAppearances?countryFeature(state,team,match.date):null,parameters:model.parameters,minimumAppearances});
  return [side,{...base,rating:prior.rating,initialPrior:prior}];
 }));
 return {...forecast,features:{...features,gap:features.home.rating-features.away.rating+parameters.homeAdvantage},probability:ratingProbabilities(features.home.rating,features.away.rating,parameters),eligible:[features.home,features.away].every(f=>f.appearances>=minimumAppearances||f.initialPrior.applied),initialPriorModelId:model.modelId};
}
module.exports={domesticFeatures,countryFeature,estimateInitialPrior,ratingProbabilities,forecastWithInitialPriors};
