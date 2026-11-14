"use strict";
const { scoreMatrix }=require('../predictions/engine.js');
const distribution=goals=>{
 const rows=scoreMatrix(goals.home,goals.away,7);
 return [rows.filter(r=>r.home>r.away),rows.filter(r=>r.home===r.away),rows.filter(r=>r.home<r.away)].map(rr=>rr.reduce((n,r)=>n+r.probability,0));
};
function withEuropeanXgot(result,expected){
 const xgot=expected?.components?.xgot;
 if(result.status!=='PRELIMINARY'||!xgot?.applied)return result;
 const old=distribution(xgot.unadjusted),adjusted=distribution(expected),keys=['home','draw','away'];
 const values=keys.map((key,i)=>result.probabilities[key]*adjusted[i]/old[i]),sum=values.reduce((n,v)=>n+v,0);
 if(!(sum>0)||values.some(v=>!Number.isFinite(v)||v<0))return result;
 return {...result,probabilitiesBeforeXgot:{...result.probabilities},probabilities:Object.fromEntries(keys.map((key,i)=>[key,values[i]*100/sum])),
  xgot:{applied:true,weight:.1,status:'experimental-user-authorized',statisticallyValidated:false},statisticallyValidated:false};
}
module.exports={withEuropeanXgot};
