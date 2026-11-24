import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cache=new Map();
const cacheName='champions-reading-build-manifest.json';
const cacheFile=path.join(root,'data/generated/champions-readings',cacheName);
const digest=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
if(!process.argv.includes('--force')&&fs.existsSync(cacheFile)){
 const previous=JSON.parse(fs.readFileSync(cacheFile,'utf8'));
 if(previous.schemaVersion===1&&[...previous.inputs,...previous.outputs].every(r=>fs.existsSync(path.join(root,r.path))&&digest(r.path)===r.sha256)){
  console.log(JSON.stringify({fixtures:previous.fixtures,reused:true}));process.exit(0);
 }
}
const write=(file,text)=>{
 if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===text)return;
 fs.writeFileSync(file+'.tmp',text);
 for(let attempt=0;;attempt++)try{fs.renameSync(file+'.tmp',file);break;}catch(error){
  if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=9)throw error;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);
 }
};
const read=file=>{if(!cache.has(file))cache.set(file,JSON.parse(fs.readFileSync(path.join(root,file),'utf8')));return cache.get(file);};
const load=async name=>{
 const file=path.posix.normalize('data/normalized/'+name),data=read(file);
 if(name==='champions-league-2026-27.json')return data;
 return policy.filter(data);
};
policy.configure(read('data/normalized/official-starter-registry.json'));
const calendar=read('data/normalized/champions-league-2026-27.json');
const renderer=fs.readFileSync(path.join(root,'js/pages/champions.js'),'utf8');
const paths=new Set([...renderer.matchAll(/\bload\(['"]([^'"]+\.json)['"]\)/g)].map(m=>path.posix.normalize('data/normalized/'+m[1])));
for(const m of renderer.matchAll(/\bloadDerived\(['"]([^'"]+\.json)['"]\)/g))paths.add('data/derived/'+m[1]);
for(const file of ['champions-player-match-history.json','champions-shared-scenarios.json','reading-referee-history.json','champions-team-history.json'])paths.add('data/generated/'+file);
paths.delete('data/normalized/champions-md03-player-database-2026-27.json');
paths.delete('data/normalized/champions-player-history-context-2025-26.json');
for(const md of ['04','05'])paths.add(`data/normalized/champions-md${md}-probable-individuals-2026-27.json`);
const workspaces=new Map();
const output=path.join(root,'data/generated/champions-readings');fs.mkdirSync(output,{recursive:true});
let bytes=0,count=0;
for(const fixture of calendar.fixtures.filter(f=>f.status==='finished'&&f.matchday===require('./retire-finished-readings.cjs').currentMatchday(calendar.fixtures)&&[2,3,4,5].includes(f.matchday))){
 const names=new Set([fixture.homeTeam,fixture.awayTeam]);
 const squads=read('data/normalized/champions-registered-squads-2026-27.json').teams.filter(t=>names.has(t.team));
 const ids=new Set([...squads.flatMap(t=>[t.id,t.teamId].filter(Boolean)),...calendar.teamBranding.filter(t=>names.has(t.team)).flatMap(t=>[t.id,t.slug].filter(Boolean))]);
 const clubs=new Set(squads.map(t=>String(t.uefaClubId)));
 const project=(file,data)=>{
  const result={...data};
  if(file.endsWith('/champions-team-history.json'))result.teams=Object.fromEntries(Object.entries(data.teams).filter(([id])=>ids.has(id)).map(([id,rows])=>[id,rows.filter(r=>r.date.slice(0,10)<fixture.date.slice(0,10)).slice(0,10)]));
  for(const key of ['fixtures','matches'])if(Array.isArray(data[key]))result[key]=data[key].filter(row=>{
   const id=row.fixtureId||row.matchId||row.id;
   if(id===fixture.id)return true;
   return file.endsWith('/champions-league-2026-27.json')&&row.status==='finished'&&row.date<fixture.date&&(names.has(row.homeTeam)||names.has(row.awayTeam));
  });
  for(const key of ['teams','profiles'])if(Array.isArray(data[key]))result[key]=data[key].filter(t=>names.has(t.team)||names.has(t.name)||ids.has(t.id)||ids.has(t.teamId));
  if(Array.isArray(data.referees))result.referees=data.referees.filter(r=>r.refereeId===fixture.refereeAssignment?.refereeId);
  if(data.marketCatalog?.matches)result.marketCatalog={...data.marketCatalog,matches:data.marketCatalog.matches.filter(m=>m.matchId===fixture.id)};
  if(file.endsWith('/champions-player-match-history.json'))result.players=Object.fromEntries(Object.entries(data.players).filter(([key])=>ids.has(key.split(':')[0])));
  if(file.endsWith('/champions-registered-squads-2026-27.json'))result.shirtNumbers={...data.shirtNumbers,records:data.shirtNumbers.records.filter(r=>ids.has(r.teamId)||clubs.has(String(r.uefaClubId)))};
  if(file.endsWith('/champions-md03-preliminary-2026-27.json'))result.fixtures=result.fixtures.map(f=>({fixtureId:f.fixtureId,forecast:f.forecast}));
  if(file.endsWith('/probable-individuals-v2-2026-10-20.json')){
   const official=['official-individuals-two-v1-2026-10-20.json','official-individuals-seven-v2-2026-10-20.json','official-individuals-2026-10-21.json'].some(name=>read('data/derived/champions-md03/'+name).fixtures.some(f=>f.fixtureId===fixture.id));
   if(official)result.fixtures=[];
  }
  return result;
 };
 const datasets={};
 for(const file of paths)if(fs.existsSync(path.join(root,file))){
  const md=file.match(/md0([2345])/);
  if(md&&Number(md[1])!==fixture.matchday)continue;
  datasets[file]=project(file,read(file));
 }
 if(!workspaces.has(fixture.matchday)){
  const original=await loadChampionsWorkspaceMd3Derived(load,fixture.matchday);workspaces.set(fixture.matchday,original);
  const registry={schemaVersion:1,matchday:fixture.matchday,all:original.all.filter(l=>fixture.matchday!==3||l.suggestionAnalysis?.suggested)};
  const file=path.join(output,`registry-md${fixture.matchday}.json`),text=JSON.stringify(registry)+'\n';
  write(file,text);
 }
 const original=workspaces.get(fixture.matchday),match=original.marketCatalog.matches.find(m=>m.matchId===fixture.id);
 const {source,teamForecasts,all,...rest}=original;
 // Keep every suggested contract across the day for saved-selection reconciliation.
 const projectedMatch=match?(()=>{
  const {selections,...metadata}=match;
  return {...metadata,selectionIds:selections.filter(l=>fixture.matchday!==3||l.suggestionAnalysis?.suggested).map(l=>l.selectionId)};
 })():null;
 const workspace={...rest,fixtures:original.fixtures.filter(f=>f.id===fixture.id),marketCatalog:{...original.marketCatalog,matches:projectedMatch?[projectedMatch]:[]}};
 const payload={schemaVersion:1,fixtureId:fixture.id,matchday:fixture.matchday,datasets,workspace};
 const file=path.join(output,fixture.id+'.json'),text=JSON.stringify(payload)+'\n';
 write(file,text);
 bytes+=Buffer.byteLength(text);count++;
}
const codeFiles=['scripts/build-champions-reading-data.mjs','js/official-starter-policy.js',...fs.readdirSync(path.join(root,'js/pages'),{recursive:true}).filter(f=>/\.(mjs|js)$/.test(f)).map(f=>'js/pages/'+f.replaceAll('\\','/'))];
const inputs=[...new Set([...cache.keys(),...codeFiles])].map(file=>({path:file,sha256:digest(file)}));
const outputs=fs.readdirSync(output).filter(f=>f.endsWith('.json')&&f!==cacheName).map(file=>({path:'data/generated/champions-readings/'+file,sha256:digest('data/generated/champions-readings/'+file)}));
write(cacheFile,JSON.stringify({schemaVersion:1,fixtures:count,inputs,outputs},null,2)+'\n');
console.log(JSON.stringify({fixtures:count,bytes,reused:false}));
