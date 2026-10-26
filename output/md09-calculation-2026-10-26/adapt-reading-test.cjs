const fs=require('fs');
let s=fs.readFileSync('scripts/test-reading-md08.cjs','utf8').replace(/md08/g,'md09').replace(/md8/g,'md9').replace(/MD8/g,'MD9').replace(/\b8\b/g,'9').replace(/lastAppearanceMatchday<=7/g,'lastAppearanceMatchday<=8');
s=s.replace('output/md09-reading-refresh/${file}-before.json','output/md09-calculation-2026-10-26/${file}.json');
const start=s.indexOf('if(assignments){'),end=s.indexOf('for(const match of round){',start);
s=s.slice(0,start)+s.slice(end);
fs.writeFileSync('scripts/test-reading-md09.cjs',s);
