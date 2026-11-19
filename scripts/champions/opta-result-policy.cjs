'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function probabilities(home,away,p){
 assert([home,away,p.homeIntercept,p.slopePerTenRatingPoints,p.drawIntercept].every(Number.isFinite));
 assert(home>=0&&home<=100&&away>=0&&away<=100&&p.slopePerTenRatingPoints>=0&&p.extraLeagueBonus===false);
 const strength=(p.homeIntercept+p.slopePerTenRatingPoints*(home-away)/10)/2;
 const logits=[strength,p.drawIntercept,-strength],max=Math.max(...logits),values=logits.map(v=>Math.exp(v-max)),sum=values.reduce((n,v)=>n+v,0);
 return Object.fromEntries(['home','draw','away'].map((key,i)=>[key,100*values[i]/sum]));
}
function loadContext({calendar,policy,policyPath,asOf}){
 const snapshot=read(policy.opta.ratingsPath),model=read(policy.opta.modelPath),mapping=read('data/sources/champions-team-history-map-2026-27.json');
 assert.equal(snapshot.provider,'Opta');assert.equal(model.parameters.extraLeagueBonus,false);
 assert.equal(snapshot.clubs.length,36);assert.equal(new Set(snapshot.clubs.map(t=>t.uefaTeamId)).size,36);assert.equal(new Set(snapshot.clubs.map(t=>t.optaContestantId)).size,36);
 const map=new Map(mapping.teams.map(t=>[t.team,String(t.uefaTeamId)])),clubs=new Map(snapshot.clubs.map(t=>[t.uefaTeamId,t]));
 for(const name of calendar.teams){const club=clubs.get(map.get(name));assert(club&&club.team===name,'Exact Opta/UEFA identity missing: '+name);}
 const inputHashes=Object.fromEntries([policyPath,policy.opta.ratingsPath,policy.opta.modelPath,'scripts/champions/opta-result-policy.cjs','data/sources/champions-team-history-map-2026-27.json'].map(p=>[p,hash(p)]));
 const modelId='champions-opta-result:'+digest(inputHashes),readingModelId='champions-opta-reading:'+digest({modelId,code:hash('scripts/champions/european-reading.cjs'),engine:hash('scripts/predictions/engine.js'),policy:policy.readingModel});
 return {opta:true,policy,policyPath,snapshot,model,map,clubs,modelId,readingModelId,inputHashes,asOf};
}
function resultForFixture(f,c){
 const clubs=[f.homeTeam,f.awayTeam].map(name=>c.clubs.get(c.map.get(name)));
 const cutoff=Math.min(Date.parse(c.asOf),Date.parse(f.date+'T00:00:00Z'));
 const usable=clubs.every(t=>t?.identityStatus==='EXACT_ID_AND_PRIMARY_COUNTRY_VERIFIED'&&Number.isFinite(t.rating)&&t.rating>=0&&t.rating<=100)&&[c.snapshot.availableAt,c.model.availableAt].every(d=>Number.isFinite(Date.parse(d))&&Date.parse(d)<=cutoff);
 return {modelId:c.modelId,type:'OPTA_CLUB_RATING_RESULT',status:usable?'PRELIMINARY':'INSUFFICIENT_DATA',
  probabilities:usable?probabilities(clubs[0].rating,clubs[1].rating,c.model.parameters):{home:null,draw:null,away:null},
  samples:[null,null],features:{home:clubs[0]||null,away:clubs[1]||null,gap:usable?clubs[0].rating-clubs[1].rating:null,ratingScale:'Opta 0-100',extraLeagueBonus:false,initialDomesticPriorApplied:false},
  estimatedInitialRating:false,cutoff:new Date(cutoff).toISOString(),asOf:c.asOf,ratingsAvailableAt:c.snapshot.availableAt,providerPublishedAt:c.snapshot.providerPublishedAt,
  statisticallyValidated:false,policyPath:c.policyPath,inputHashes:c.inputHashes,missing:usable?[]:['VERIFIED_PRE_CUTOFF_OPTA_RATING_OR_MODEL_MISSING']};
}
module.exports={probabilities,loadContext,resultForFixture};
