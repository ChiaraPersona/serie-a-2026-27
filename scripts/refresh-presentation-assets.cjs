// Rewrites presentation shells only. Never invokes data or forecasting builders.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{applyStyleLinks}=require('./site-styles');
const files=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...fs.readdirSync(path.join(root,'statistiche-squadra')).filter(f=>f.endsWith('.html')).map(f=>'statistiche-squadra/'+f)];
for(const name of files){const file=path.join(root,name),before=fs.readFileSync(file,'utf8'),after=applyStyleLinks(before);if(before!==after){fs.writeFileSync(file+'.assets.tmp',after);fs.renameSync(file+'.assets.tmp',file);}}
console.log(`Presentation CSS refreshed: ${files.length} shells; no data builders.`);
