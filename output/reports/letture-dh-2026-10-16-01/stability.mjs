import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='output/reports/letture-dh-2026-10-16-01';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const walk=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]):[];
function capture(){
 const paths=[...new Set(['AGENTS.md','package.json','js/app.js','lettura.html','champions-league.html','schedina.html','coppa-italia.html','docs/specifica-ux-letture-unificate-fase-2.md',...walk('js'),...walk('css'),...walk('scripts/predictions'),...walk('data/normalized'),...walk('data/teams'),...walk('data/predictions'),...walk('data/sources/readings'),...fs.readdirSync('scripts').filter(p=>/\.(?:js|mjs|cjs)$/.test(p)).map(p=>'scripts/'+p),...fs.readdirSync('data/sources').filter(p=>/\.json$/.test(p)).map(p=>'data/sources/'+p)])].sort();
 return {capturedAt:new Date().toISOString(),head:git('rev-parse','HEAD'),status:git('status','--porcelain=v1','--untracked-files=all'),files:paths.map(path=>({path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')}))};
}
const first=capture();fs.writeFileSync(out+'/first.json',JSON.stringify(first,null,2),{flag:'wx'});
await new Promise(r=>setTimeout(r,5000));
const second=capture(),byPath=new Map(first.files.map(f=>[f.path,f.sha256]));
const changed=second.files.filter(f=>byPath.get(f.path)!==f.sha256).map(f=>f.path),secondPaths=new Set(second.files.map(f=>f.path));
const removed=first.files.filter(f=>!secondPaths.has(f.path)).map(f=>f.path);
const stable=first.head===second.head&&!changed.length&&!removed.length;
fs.writeFileSync(out+'/baseline.json',JSON.stringify({stable,changed,removed,headChanged:first.head!==second.head,firstCapturedAt:first.capturedAt,...second},null,2),{flag:'wx'});
console.log(JSON.stringify({stable,changed,removed,head:second.head,files:second.files.length}));
