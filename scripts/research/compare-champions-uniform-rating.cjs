'use strict';
const fs=require('node:fs'),path=require('node:path');
const {sequence}=require('./european-rating-model.cjs');
const {domesticFeatures,countryFeature,ratingProbabilities}=require('../champions/elo-initial-prior.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function evaluate(rows,config,p){
 const scores=rows.map(r=>{const rating=s=>{if(!s.domestic||!s.country)return s.raw;const c=s.country,d=s.domestic,share=(c.rankedAssociations-c.strengthRank)/(c.rankedAssociations-1),signal=50*d.ppgZ+100*d.gdZ,prior=1500+c.delta+(signal>0?signal*share**config.exponent:signal);return s.raw*(1-config.weight)+prior*config.weight;};const prob=ratingProbabilities(...r.sides.map(rating),p),vector=[prob.home,prob.draw,prob.away],y=r.match.score90.home>r.match.score90.away?0:r.match.score90.home===r.match.score90.away?1:2;return {logLoss:-Math.log(Math.max(vector[y],1e-12)),brier:vector.reduce((n,v,i)=>n+(v-Number(i===y))**2,0)};});return {fixtures:rows.length,logLoss:scores.reduce((n,s)=>n+s.logLoss,0)/rows.length,brier:scores.reduce((n,s)=>n+s.brier,0)/rows.length};
}
function run(){
 const h=read('data/normalized/uefa-europe-history-2023-26.json').matches,p=read('data/sources/champions-european-result-policy.json').parameters,d=read('data/normalized/champions-elo-prior-domestic.json');
 const base=sequence(h,p).predictions.filter(r=>['2024-25','2025-26'].includes(r.match.season)),states=new Map(),rows=[];
 const dir=path.join(root,'data/analysis/champions/elo-all-teams-2026-11-14');
 const configurations=[];for(const weight of [0,.1,.2,.3,.5])for(const exponent of [1,2,3])configurations.push({weight,exponent});
 fs.writeFileSync(path.join(dir,'uniform-protocol.json'),JSON.stringify({generatedAt:new Date().toISOString(),configurations,selection:'All covered 2024/25 European fixtures; minimum log loss, then Brier; 2025/26 is already-seen diagnostic, not independent validation.',cohort:'Same exact-ID cohort for each candidate and baseline. Both sides require domestic and country features. All clubs treated alike regardless of European appearance count.',statisticallyValidated:false},null,2)+'\n');
 for(const r of base){const date=r.match.date;if(!states.has(date))states.set(date,sequence(h.filter(m=>m.date<date),p).state);const state=states.get(date),sides=['home','away'].map(side=>({raw:r.features[side].raw,domestic:domesticFeatures(d,r.match[side+'Team'].id,date,date+'T00:00:00Z',{retrospective:true}),country:countryFeature(state,r.match[side+'Team'],date)}));if(sides.every(s=>s.domestic&&s.country))rows.push({match:r.match,sides});}
 const train=rows.filter(r=>r.match.season==='2024-25'),diagnostic=rows.filter(r=>r.match.season==='2025-26');
 const candidates=configurations.map((config,index)=>({config,index,training:evaluate(train,config,p)})).sort((a,b)=>a.training.logLoss-b.training.logLoss||a.training.brier-b.training.brier||a.index-b.index);
 const selected=candidates[0],report={generatedAt:new Date().toISOString(),selected,baselineTraining:evaluate(train,{weight:0,exponent:1},p),diagnostic:{baseline:evaluate(diagnostic,{weight:0,exponent:1},p),selected:evaluate(diagnostic,selected.config,p)},candidates:candidates.map(c=>({...c,diagnostic:evaluate(diagnostic,c.config,p)})),statisticallyValidated:false,operationallyApplied:false};
 fs.writeFileSync(path.join(dir,'uniform-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
if(require.main===module)run();module.exports={run,evaluate};
