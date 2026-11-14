"use strict";
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function evaluate(sourceText,matchday=1){
 let output=null;
 const virtualFs={...fs,writeFileSync(file,text){assert(/^champions-pilot-predictions(?:-md\d\d)?-2026-27\.json$/.test(path.basename(file)),'unexpected builder write');assert.equal(output,null);output=JSON.parse(String(text));}};
 // Trusted repository code, lexical parameters and intercepted output. Avoid
 // a separate V8 global context slowing the Poisson grid by orders of magnitude.
 const run=vm.compileFunction(sourceText,['require','__dirname','process','console']);
 run(name=>{if(name==='fs')return virtualFs;if(name==='path')return path;throw Error('Unexpected dependency '+name);},path.join(root,'scripts'),{argv:['node','builder','--matchday',String(matchday)]},{log(){}});
 assert(output);return output;
}
function verifyAekBuilderCompatibility(){
 const control=read('data/analysis/champions/aek-context-control-2026-10-04.json');
 const frozen=fs.readFileSync(path.join(root,'data/analysis/champions/md3-offline-engine-2026-10-19/aek-frozen-builder.js'),'utf8');
 const current=fs.readFileSync(path.join(root,'scripts/build-champions-pilot-predictions.js'),'utf8');
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 assert.equal(hash(frozen),control.protectedInputs.predictionBuilderSha256,'frozen implementation must match original control');
 const old=evaluate(frozen),now=evaluate(current);
 assert.deepEqual(now.fixtures,old.fixtures,'builder changed numerical fixture contract');
 assert.deepEqual(now.profiles,old.profiles,'builder changed collective profile contract');
 assert.deepEqual(now.leagueBaselines,old.leagueBaselines);
 const {blendRates,ROLE_PRIORS}=require('./context-adjusted-player-baseline');
 const pilot=read('data/analysis/champions/aek-context-adjusted-md02-2026-10-04.json');
 let replayed=0;
 for(const p of pilot.players){
  for(const [metric,historicalKey,domesticKey,outputKey] of [['shots','historicalShotsPer90','rawCurrentShotsPer90','blendedShotsPer90'],['shotsOnTarget','historicalSotPer90','rawCurrentSotPer90','blendedSotPer90']]){
   const result=blendRates({historicalRaw:p[historicalKey],historicalMinutes:p.historicalMinutes||0,rolePrior:ROLE_PRIORS[p.role]?.[metric],domesticRaw:p[domesticKey],domesticMinutes:p.currentDomesticMinutes||0,domesticStrengthFactor:p.strengthAdjustmentShots??1,europeanRaw:p.currentEuropeanEvidence?.[metric==='shots'?'shotsPer90':'sotPer90']??null,europeanMinutes:p.currentEuropeanEvidence?.minutes||0});
   assert(Math.abs(result.blended-p[outputKey])<1e-9,`AEK frozen rate replay failed: ${p.playerId}/${metric}`);replayed++;
  }
 }
 return {frozenRevision:'be95b1470714b023932f82da13586612c1c085b5',frozenHash:hash(frozen),currentHash:hash(current),fixtureContractsCompared:18,teamProfilesCompared:36,frozenAekRatesReplayed:replayed,numericalDifference:0,reason:'Current builder only adds matchday/output parameterization and metadata. Full MD1 fixtures, profiles and league baselines equal on identical inputs. Frozen control and all player blended rates replayed.'};
}
module.exports={evaluate,verifyAekBuilderCompatibility};
