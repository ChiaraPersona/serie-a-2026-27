"use strict";
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
function build(){
 const root=path.resolve(__dirname,'..');
 const file='data/sources/champions-referee-profiles-md03-2026-27.json';
 const data=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 assert.equal(data.referees.length,18);assert.equal(data.predictionEligible,false);
 for(const p of data.referees){assert.equal(p.predictionEligible,false);assert.equal(p.sample.cutoffCertified,false);assert.equal(p.sample.recentTenVerified,false);assert(Object.values(p.metrics).every(v=>v===null||Number.isFinite(v)&&v>=0));}
 const output=path.join(root,'data/normalized/champions-referee-profiles-md03-2026-27.json');
 const text=JSON.stringify({...data,canonicalSource:file},null,2)+'\n';
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==text)fs.writeFileSync(output,text);
 return data;
}
module.exports={build};if(require.main===module)build();
