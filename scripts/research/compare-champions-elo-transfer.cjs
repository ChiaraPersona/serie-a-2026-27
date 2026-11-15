'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {metrics}=require('./fit-champions-elo-prior.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function run(){
 const dir='data/analysis/champions/elo-domestic-transfer-v2-2026-11-14',prior='data/analysis/champions/elo-initial-prior-2026-11-14';
 const save=(name,d)=>fs.writeFileSync(path.join(root,dir,name),JSON.stringify(d,null,2)+'\n');
 const previous=read(dir+'/previous-model.json'),p=read('data/sources/champions-european-result-policy.json').parameters;
 const train=read(prior+'/cohort.json').filter(r=>r.supported&&r.match.season==='2024-25'),diagnostic=read(prior+'/simulated-diagnostic-cohort.json');
 const configurations=[];
 for(const domesticTransferExponent of [1,2,3])for(const countryScale of [0,.5,1])for(const ppgScale of [0,50,100])for(const goalDifferenceScale of [0,50,100])configurations.push({domesticTransferExponent,countryScale,ppgScale,goalDifferenceScale});
 const protocol={generatedAt:new Date().toISOString(),method:'For every league, scale positive domestic performance by ((numberOfRankedAssociations-strengthRank)/(numberOfRankedAssociations-1))^exponent; negative performance is not discounted.',strengthRanking:'Existing pre-cutoff Elo means of other established European representatives; ordinal proxy, not official UEFA coefficients.',selection:'Minimum 2024/25 training log loss, then Brier and grid order. 2025/26 diagnostics have already been seen and do not select weights.',trainingFixtureIds:train.map(r=>r.match.id),configurations,statisticallyValidated:false};
 save('protocol.json',protocol);
 const candidates=configurations.map((parameters,index)=>({parameters,index,training:metrics(train,parameters,p)})).sort((a,b)=>a.training.logLoss-b.training.logLoss||a.training.brier-b.training.brier||a.index-b.index);
 const selected=candidates[0];save('selected-before-diagnostic.json',selected);
 const report={generatedAt:new Date().toISOString(),parameters:selected.parameters,training:{unscaled:metrics(train,previous.parameters,p),scaled:selected.training},simulatedDiagnostic:{unscaled:metrics(diagnostic,previous.parameters,p),scaled:metrics(diagnostic,selected.parameters,p),uniqueFixtures:new Set(diagnostic.map(r=>r.match.id)).size},statisticallyValidated:false,limits:['47 training fixtures, same observed cohort as v1','207 dependent simulated scenarios across 132 unique fixtures, not true new entrants','2025/26 already inspected: diagnostic, not independent validation','Country ranking is an ordinal European-representative proxy; sparse country coverage remains','No club-specific override, rank target or retrospective forecast replacement']};
 const modelId='champions-elo-initial-prior-v2:'+crypto.createHash('sha256').update(JSON.stringify({protocol,parameters:selected.parameters,code:fs.readFileSync(path.join(root,'scripts/champions/elo-initial-prior.cjs'),'utf8')})).digest('hex');
 save('report.json',report);
 const model={schemaVersion:2,modelId,trainedAt:report.generatedAt,parameters:selected.parameters,minimumDomesticGames:4,minimumEuropeanAppearances:6,statisticallyValidated:false,report:dir+'/report.json'};
 save('model.json',model);save('activation.json',{operationallyApplied:false,reason:'Candidate worsens both training and already-seen simulated diagnostic against the unscaled reference; retain previous operational model. No automatic promotion from this research runner.'});
 console.log(JSON.stringify(report));return report;
}
if(require.main===module)run();module.exports={run};
