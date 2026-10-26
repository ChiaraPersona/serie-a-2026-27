const fs=require('fs');
let s=fs.readFileSync('scripts/test-schedina-md08.mjs','utf8').replace(/md08/g,'md09').replace(/MD8/g,'MD9').replace(/matchday:8/g,'matchday:9');s=s.replace(/^for\(const \[f,hash\].*$/m,'');fs.writeFileSync('scripts/test-schedina-md09.mjs',s);
s=fs.readFileSync('scripts/check-schedina-md08.cjs','utf8').replace(/md08/g,'md09').replace(/MD8/g,'MD9').replace(/giornata=8/g,'giornata=9');fs.writeFileSync('scripts/check-schedina-md09.cjs',s);
fs.mkdirSync('reports/md09-schedina',{recursive:true});
