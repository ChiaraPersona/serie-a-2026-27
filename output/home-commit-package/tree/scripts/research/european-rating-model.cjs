'use strict';
// Research-only result model. No goal/count conversion and no market admission.
const DAY=86400000,finite=Number.isFinite;
function decayed(record,date,params){
 if(!record)return 1500;
 const days=Math.max(0,(Date.parse(date)-Date.parse(record.lastDate))/DAY);
 return 1500+(record.rating-1500)*(params.halfLifeDays?2**(-days/params.halfLifeDays):1);
}
function effective(state,team,date,params){
 const id=String(team.id),record=state.get(id),peers=[...state.entries()].filter(([key,r])=>key!==id&&r.country===team.countryCode);
 // A country with fewer than three other observed clubs has no fitted prior.
 const countryMean=team.countryCode&&peers.length>=3?peers.reduce((n,[,r])=>n+decayed(r,date,params),0)/peers.length:1500;
 const prior=1500+params.countryWeight*(countryMean-1500),n=record?.appearances||0;
 const weight=params.shrinkMatches?n/(n+params.shrinkMatches):1;
 return {rating:prior+weight*(decayed(record,date,params)-prior),raw:decayed(record,date,params),prior,appearances:n,peerClubs:peers.length,lastDate:record?.lastDate||null};
}
function predict(state,match,params){
 const home=effective(state,match.homeTeam,match.date,params),away=effective(state,match.awayTeam,match.date,params);
 const gap=home.rating-away.rating+params.homeAdvantage,share=1/(1+10**(-gap/400));
 const draw=Math.max(.12,Math.min(.34,params.drawBase*Math.exp(-Math.abs(gap)/params.drawScale)));
 return {probability:{home:(1-draw)*share,draw,away:(1-draw)*(1-share)},features:{home,away,gap},eligible:home.appearances>=6&&away.appearances>=6};
}
function sequence(matches,params,initial=new Map()){
 const state=new Map([...initial].map(([k,v])=>[k,{...v}])),predictions=[];
 const sorted=[...matches].sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
 let i=0;
 while(i<sorted.length){
  const date=sorted[i].date,batch=[];while(i<sorted.length&&sorted[i].date===date)batch.push(sorted[i++]);
  const pending=batch.map(match=>({match,...predict(state,match,params)}));
  predictions.push(...pending);
  // Predict the whole date before observing any result from that date.
  for(const row of pending){
   const m=row.match;if(![m.score90?.home,m.score90?.away].every(x=>finite(x)&&x>=0))throw Error('Missing regulation score');
   const actual=m.score90.home>m.score90.away?1:m.score90.home<m.score90.away?0:.5;
   const expected=row.probability.home+.5*row.probability.draw,delta=params.kFactor*(params.competitionUpdateWeights[m.competitionCode]??1)*(actual-expected);
   for(const [team,side,sign]of [[m.homeTeam,'home',1],[m.awayTeam,'away',-1]]){
    const key=String(team.id),old=state.get(key);
    if(old&&old.country&&team.countryCode&&old.country!==team.countryCode)throw Error('Conflicting country identity: '+key);
    state.set(key,{rating:row.features[side].raw+sign*delta,appearances:(old?.appearances||0)+1,country:team.countryCode||old?.country||null,lastDate:date});
   }
  }
 }
 return {state,predictions};
}
function forecastBefore(matches,target,params){
 // Caller cannot accidentally train on the target or a later match.
 const prior=matches.filter(m=>m.date<target.date);
 return predict(sequence(prior,params).state,target,params);
}
module.exports={decayed,effective,predict,sequence,forecastBefore};
