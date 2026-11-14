'use strict';
const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto'),{spawnSync}=require('child_process');
const files=['data/normalized/predictions.json','data/normalized/schedina-md06.json','data/normalized/schedina-md07.json','data/normalized/odds/sisal/serie-a.json','data/normalized/schedina-champions-md03.json'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),before=files.map(hash);
for(const [competition,day] of [['serie-a',7],['serie-a',8],['champions',1],['champions',2],['champions',3]]){
 const run=spawnSync(process.execPath,['scripts/update-matchday.cjs','--competition',competition,'--matchday',String(day)],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 const plan=JSON.parse(run.stdout);if(competition==='serie-a'&&day===7)assert(plan.plan.at(-1).includes('--validate-only'));assert.equal(plan.mode,'plan');assert.equal(plan.matchday,day);assert(plan.plan.length>0);assert(!/import-sisal|publish|deploy/.test(run.stdout));
}
for(const args of [[],['--competition','serie-a'],['--competition','champions','--matchday','4'],['--competition','serie-a','--matchday','7','--stage','--output','data']])assert.notEqual(spawnSync(process.execPath,['scripts/update-matchday.cjs',...args],{encoding:'utf8'}).status,0);
assert.notEqual(spawnSync(process.execPath,['scripts/build-betting-matchday.js','--matchday','7'],{encoding:'utf8'}).status,0,'Rebuild di una giornata conclusa vietato prima delle scritture');
assert.deepEqual(files.map(hash),before,'Piani e richieste invalide devono lasciare intatti quote e archivi');
console.log('OK update workflow: explicit scope, MD8 plan, separate competitions, staging path guards, unchanged historical contracts');
