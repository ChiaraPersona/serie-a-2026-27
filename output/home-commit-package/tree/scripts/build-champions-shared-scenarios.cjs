'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildSharedScenarios,eligible}=require('./champions/shared-scenario.cjs');
const root=path.resolve(__dirname,'..');
const paths={calendar:'data/normalized/champions-league-2026-27.json',source:'data/sources/champions-pilot-match-stats-2025-27.json',styles:'data/normalized/team-style-profiles.json',odds:'data/normalized/odds/sisal/champions-league.json'};
async function build({asOf=new Date().toISOString(),matchday=null}={}){
 const inputs=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,storageReadJson(path.join(root,p))]));
 const next=Math.min(...inputs.calendar.fixtures.filter(f=>eligible(f,asOf)).map(f=>f.matchday));
 const day=matchday??(Number.isFinite(next)?next:null);
 if(day!==null&&(!Number.isInteger(day)||day<1||day>8))throw Error('Giornata Champions non valida');
 const output=buildSharedScenarios({...inputs,asOf,matchday:day});
 await require('./champions/european-result-policy.cjs').applyEuropeanResults({scenarios:output,calendar:inputs.calendar,asOf});
 const file=path.join(root,'data/generated/champions-shared-scenarios.json');
 const previous=fs.existsSync(file)?storageReadJson(file):null;
 // Update future forecasts; retain completed rows unchanged for historical readings.
 const updated=new Set(output.fixtures.map(f=>f.fixtureId));
 output.fixtures=[...(previous?.fixtures||[]).filter(p=>!updated.has(p.fixtureId)&&inputs.calendar.fixtures.some(f=>f.id===p.fixtureId)),...output.fixtures];
 output.inputs=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}]));
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
 console.log(`Scenario Champions condiviso: MD${day??'N/D'}, ${output.fixtures.filter(f=>inputs.calendar.fixtures.some(c=>c.id===f.fixtureId&&eligible(c,asOf))).length} gare future; righe concluse conservate per le letture storiche`);
 return output;
}
if(require.main===module){const i=process.argv.indexOf('--matchday');build({matchday:i<0?null:Number(process.argv[i+1])}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={build};
