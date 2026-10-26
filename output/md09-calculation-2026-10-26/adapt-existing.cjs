const fs=require('fs');
for(const name of ['reading','schedina']){
let text=fs.readFileSync(`scripts/build-${name}-md08.cjs`,'utf8').replace(/md08/g,'md09').replace(/md8/g,'md9').replace(/MD8/g,'MD9').replace(/\b8\b/g,'9').replace(/settima/g,'ottava');
if(name==='reading')text=text.replace("fs.writeFileSync(path.join(root,f),JSON.stringify(d,null,2)+'\\n')","fs.writeFileSync(path.join(root,f)+'.md09.tmp',JSON.stringify(d,null,2)+'\\n');fs.renameSync(path.join(root,f)+'.md09.tmp',path.join(root,f))");
fs.writeFileSync(`scripts/build-${name}-md09.cjs`,text);
}
const before=JSON.parse(fs.readFileSync('output/md09-calculation-2026-10-26/predictions.json','utf8'));
fs.writeFileSync('data/normalized/predictions.restore.tmp',JSON.stringify(before,null,2)+'\n');
fs.renameSync('data/normalized/predictions.restore.tmp','data/normalized/predictions.json');
