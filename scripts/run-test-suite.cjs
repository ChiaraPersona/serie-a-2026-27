'use strict';
// Run every suite entry, including entries after a failure. No generators or imports.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
const commands=pkg.scripts['test:contracts'].split(' && '),results=[];
for(const command of commands){
 const args=command.split(/\s+/).slice(1),run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16e6});
 const result={command,status:run.status,output:(run.stdout||'')+(run.stderr||'')};results.push(result);
 console.log(`${run.status===0?'PASS':'FAIL'} ${command}`);
}
const report={passed:results.filter(r=>r.status===0).length,failed:results.filter(r=>r.status!==0).length,results};
const out=path.join(root,'output/test-suite');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'latest.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed} superati; ${report.failed} falliti`);if(report.failed)process.exitCode=1;
