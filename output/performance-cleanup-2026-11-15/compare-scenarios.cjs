'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..');
const originalPath=path.join(root,'scripts/champions/shared-scenario.cjs');
const before=new Module(originalPath,module);before.filename=originalPath;before.paths=Module._nodeModulePaths(path.dirname(originalPath));
before._compile(fs.readFileSync(path.join(__dirname,'shared-scenario-before.cjs'),'utf8'),originalPath);
const current=require(originalPath);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inputs={calendar:read('data/normalized/champions-league-2026-27.json'),source:read('data/sources/champions-pilot-match-stats-2025-27.json'),styles:read('data/normalized/team-style-profiles.json'),odds:require(path.join(root,'scripts/sisal/dataset-store.cjs')).readJsonFile(path.join(root,'data/normalized/odds/sisal/champions-league.json')),asOf:'2026-11-15T00:00:00Z'};
const cases=[{name:'future-72',...inputs},{name:'historical-md4',...inputs,calendar:structuredClone(inputs.calendar),asOf:'2026-10-24T00:00:00Z',matchday:4}];
for(const f of cases[1].calendar.fixtures)if(f.matchday===4)f.status='scheduled';
const results=[];
for(const input of cases){
 const run=builder=>{const start=performance.now();const result=builder(input);return {ms:performance.now()-start,result};};
 const baseline=run(before.exports.buildSharedScenarios),after=run(current.buildSharedScenarios);
 assert.deepEqual(after.result,baseline.result,input.name+': forecast or metadata changed');
 const rounds=[];
 for(let i=0;i<3;i++){const a=run(current.buildSharedScenarios),b=run(before.exports.buildSharedScenarios);assert.deepEqual(a.result,b.result);rounds.push({beforeMs:b.ms,afterMs:a.ms});}
 results.push({name:input.name,fixtures:after.result.fixtures.length,identical:true,first:{beforeMs:baseline.ms,afterMs:after.ms},rounds});
 console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(path.join(__dirname,'scenario-comparison.json'),JSON.stringify(results,null,2)+'\n');
