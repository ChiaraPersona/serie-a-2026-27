'use strict';
const fs=require('node:fs'),path=require('node:path');
const {earlier,featureFactors}=require('../research/xgot/model-v2.cjs');
let cached;
function load(){
 if(!cached){
  const read=p=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8'));
  cached={history:read('data/normalized/xgot-team-research-v2.json').matches,identities:read('data/predictions/xgot-prospective/identity-registry.json').mappings};
 }
 return cached;
}
// Experimental descriptive forecast, isolated from goal probabilities and markets.
// Reuse the frozen quality feature's window, sample minimum and shrinkage.
function forecastXgot({teamIds,date,asOf,projections,history,identities}){
 const data=history&&identities?{history,identities}:load();
 const result={status:'insufficient-data',statisticallyValidated:false,method:'projected-sot-times-opponent-adjusted-quality-v1',home:null,away:null,total:null,sample:[0,0],historyMatchIds:[]};
 if(!teamIds.every(id=>data.identities[id]))return result;
 const target={date,competition:'champions-league',teams:teamIds.map(id=>({providerTeamId:data.identities[id]}))};
 const before=earlier(data.history,target,asOf);
 const feature=featureFactors(target,before,'quality');
 Object.assign(result,{sample:feature.sample,historyMatchIds:feature.historyMatchIds||[]});
 const peers=before.filter(m=>m.competition===target.competition).flatMap(m=>m.teams).filter(t=>Number.isFinite(t.xgot)&&t.xgot>=0&&Number.isFinite(t.shotsOnTarget)&&t.shotsOnTarget>=0&&t.xgot<=t.shotsOnTarget);
 const exposure=peers.reduce((n,t)=>n+t.shotsOnTarget,0);
 const baseline=exposure>0?peers.reduce((n,t)=>n+t.xgot,0)/exposure:null;
 const sot=projections.map(p=>p.shotsOnTarget?.central);
 if(!feature.factors||baseline===null||sot.length!==2||sot.some(v=>!Number.isFinite(v)||v<0))return result;
 const quality=feature.factors.map(f=>Math.max(0,Math.min(1,baseline*f)));
 const values=sot.map((v,i)=>v*quality[i]);
 return {...result,status:'experimental',home:values[0],away:values[1],total:values[0]+values[1],qualityPerSot:quality};
}
module.exports={forecastXgot};
