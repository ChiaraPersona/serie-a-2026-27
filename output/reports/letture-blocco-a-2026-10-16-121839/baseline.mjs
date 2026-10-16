// Audit-only harness. All writes are confined to this new report directory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const out=path.dirname(fileURLToPath(import.meta.url));
const root=process.cwd();
const relative=p=>path.relative(root,p).replaceAll('\\','/');
const own=relative(out)+'/';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const write=(name,value)=>{
  assert(!name.includes('/')&&!name.includes('\\'));
  fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024});
const list=()=>git('ls-files','-z','--cached','--others','--exclude-standard').split('\0').filter(Boolean);
function walk(dir){
  if(!fs.existsSync(path.join(root,dir)))return [];
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[dir+'/'+e.name]:[]);
}
function protectedPaths(){
  return [...new Set([...list().filter(p=>!p.startsWith('output/')),...walk('data'),...walk('output/reports').filter(p=>!p.startsWith(own))])].sort();
}
const category=p=>p.startsWith('output/reports/')?'preexisting-report':p.startsWith('data/normalized/odds/')?'odds':/snapshot/i.test(p)?'snapshot':p.startsWith('data/normalized/')?'normalized-data':p.startsWith('data/')?'source-or-generated-data':/predictions\/|build-champions|betting-selection|forecast-sync|official-starter/.test(p)?'engine-contract-policy':p.includes('personal-betslip')?'personal-betslip':p.startsWith('docs/')?'documentation':p.startsWith('js/')?'application-js':/\.css$/.test(p)?'css':/\.html$/.test(p)?'html':'other-protected';
const files=protectedPaths().map(p=>({path:p,bytes:fs.statSync(path.join(root,p)).size,sha256:hash(p),category:category(p)}));
write('protected-manifest.json',{algorithm:'SHA-256',createdAt:new Date().toISOString(),scope:'All tracked/nonignored files outside output; all data recursively including ignored; all preexisting output/reports. New report directory excluded. Other output artifacts and ignored runtime dependencies excluded.',count:files.length,files});
console.log('Manifest captured:',files.length);

const tests=[
 'scripts/test-forecast-sync.js','scripts/test-personal-betslip.mjs',
 'scripts/test-reading-prediction-v2.mjs','scripts/test-champions-reading-page.mjs',
 'scripts/test-official-starter-policy.cjs','scripts/test-champions-md02-market-ui.mjs'
];
function dependencies(start,seen=new Set()){
  if(seen.has(start))return seen; seen.add(start);
  const source=fs.readFileSync(path.join(root,start),'utf8');
  const re=/(?:from\s*|import\s*\(?|require\s*\()\s*['"]([^'"]+)['"]/g;
  for(const m of source.matchAll(re)){
    if(!m[1].startsWith('.'))continue;
    const base=path.resolve(root,path.dirname(start),m[1]);
    const resolved=[base,base+'.js',base+'.mjs',base+'.cjs',base+'.json'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
    if(resolved&&/\.(?:[cm]?js)$/.test(resolved))dependencies(relative(resolved),seen);
  }
  return seen;
}
const dependencyFiles=[...new Set(tests.flatMap(p=>[...dependencies(p)]))].sort();
const audit=dependencyFiles.map(p=>({path:p,sha256:hash(p),mutationOrProcessLines:fs.readFileSync(path.join(root,p),'utf8').split(/\r?\n/).flatMap((line,i)=>/writeFile|appendFile|mkdir|unlink|rmSync|rename|execFile|spawn|fetch\(|setItem|localStorage/.test(line)?[{line:i+1,text:line}]:[])}));
write('test-safety-audit.json',{method:'Static dependency closure plus manual inspection before execution. Mock storage/DOM only; git show is read-only. No npm aliases, builders, browser, network, real localStorage or baseline updates.',tests,dependencyFiles:audit,excluded:[{path:'scripts/test-schedina-md07.mjs',reason:'fs.writeFileSync to fixed preexisting output/reports/serie-a-md07-final-audit.json; not executed, equivalent relevant checks below use memory only.'},{path:'scripts/test-betting-selection-contract.js',reason:'Imports scripts/betting-selection-contract.js which calls buildRegistry() at module initialization; buildRegistry writes normalized official-starter-registry.json. Not executed.'}],limitations:'Static scan is evidence, not a sandbox proof; before/after byte hashes and path inventories independently detect persistent changes.'});
const results=[];
for(const test of tests){
 const start=Date.now();
 const result=spawnSync(process.execPath,['--no-warnings',test],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:60000});
 results.push({test,exitCode:result.status,signal:result.signal,error:result.error?.message??null,durationMs:Date.now()-start,stdout:result.stdout,stderr:result.stderr});
 console.log(test, result.status);
}
write('test-results.json',results);

const policy=await import(pathToFileURL(path.join(root,'js/official-starter-policy.js')));
const registry=read('data/normalized/official-starter-registry.json');
globalThis.officialStarterPolicy.configure(registry);
const shared=await import(pathToFileURL(path.join(root,'js/pages/shared-forecast-contract.mjs')));
const storeModule=await import(pathToFileURL(path.join(root,'js/pages/personal-betslip-store.mjs')));
const matches=read('data/normalized/matches.json');
const catalogs=fs.readdirSync(path.join(root,'data/normalized')).filter(f=>/^schedina(?:-md\d+)?\.json$/.test(f));
const markets=[];
for(const file of catalogs){
 const source='data/normalized/'+file,data=read(source);
 for(const f of data.marketCatalog?.matches||[]){
  const published=shared.sharedForecastsForMatch(data.marketCatalog,f.matchId);
  markets.push({source,competition:'serie-a',matchId:f.matchId,publicationRule:'sharedForecastsForMatch after officialStarterPolicy.configure(registry)',catalogCount:f.selections.length,publishedCount:published.length,selections:published});
 }
}
for(const file of ['schedina-champions-md01.json','schedina-champions-md02.json']){
 const source='data/normalized/'+file,raw=read(source),filtered=globalThis.officialStarterPolicy.filter(raw);
 for(const f of filtered.fixtures||[])markets.push({source,competition:'champions',matchId:f.fixtureId,publicationRule:file.includes('md02')?'fixture.selections after same data-service policy; current MD2 reading directly renders these records':'Schedina MD1 fixture selections; reading MD1 has separate player-market panels (not assumed identical)',catalogCount:(raw.fixtures||[]).find(x=>x.fixtureId===f.fixtureId)?.selections?.length??null,publishedCount:f.selections?.length??0,selections:f.selections||[]});
 // Preserve structures without assuming MD1 has the MD2 shape.
 if(!filtered.fixtures)markets.push({source,competition:'champions',publicationRule:'MD1 full filtered structure; no synthetic fixture flattening',rawFilteredDataset:filtered});
}
write('published-markets.json',{capturedAt:new Date().toISOString(),note:'Whole original selected records copied losslessly: present nulls and absent fields remain distinct; no guessed probability/EV/odds/modifiers. Production data-service starter filter applied for publication. MD1 reading panels additionally archived in reading-inputs.json.',fixtures:markets});
const sampleIds=['atalanta-venezia-2026-27-md-06','ucl-2026-27-md02-05','milan-atalanta-2026-27-md-07'];
const inputs={samples:sampleIds.map(id=>({id,marketEntries:markets.filter(m=>m.matchId===id)})),championsMd1PlayerMarkets:read('data/normalized/champions-player-markets-md01-2026-27.json'),contextKeyExamples:['serie-a','champions','champions-league'].map(competition=>({competition,key:storeModule.contextKey({competition,season:'2026-27',matchday:competition==='serie-a'?7:2})})),storageKey:storeModule.PERSONAL_BETSLIP_STORAGE_KEY};
const sampleChecks=[];
for(const id of sampleIds){
 const f=matches.find(m=>m.id===id),entry=markets.find(m=>m.matchId===id);
 const reg=registry[id]??null;
 sampleChecks.push({matchId:id,registry:reg,matchStatus:f?.status??read('data/normalized/champions-league-2026-27.json').fixtures.find(m=>m.id===id)?.status??null,published:entry?.publishedCount??null,quoteUnavailable:entry?.selections.filter(s=>s.betSelection?.quote?.availability==='UNAVAILABLE').length??null,eligibilityViolations:entry?.selections.filter(s=>!globalThis.officialStarterPolicy.eligible(s,id)).map(s=>s.selectionId)??[],nullContractProbability:entry?.selections.filter(s=>s.betSelection?.evaluation?.modelProbabilityPct===null).length??null,missingContractEvaluation:entry?.selections.filter(s=>!Object.hasOwn(s.betSelection||{},'evaluation')).length??null});
}
write('reading-inputs.json',inputs);

const checkResults=[];
function check(name,fn){try{const details=fn();checkResults.push({name,status:'PASS',details:details??null});}catch(e){checkResults.push({name,status:'FAIL',error:e.stack});}}
check('All captured published selections eligible under current official-starter registry',()=>{for(const f of markets)for(const s of f.selections||[])assert(globalThis.officialStarterPolicy.eligible(s,f.matchId),s.selectionId);});
const md7=read('data/normalized/schedina-md07.json');
const memoryStorage=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}};
check('MD7 published IDs, provider quotes, canonical unquoted contracts and in-memory store admission',()=>{
 const odds=read('data/normalized/odds/sisal/serie-a.json'),ids=new Set();
 let quoted=0,unquoted=0;
 for(const fixture of md7.marketCatalog.matches){
  const published=shared.sharedForecastsForMatch(md7.marketCatalog,fixture.matchId);
  const event=odds.events.find(e=>e.canonicalMatchId===fixture.matchId);
  const store=storeModule.createPersonalBetslipStore({storage:memoryStorage()});
  const context={competition:'serie-a',season:'2026-27',matchday:7};store.setContext(context);
  for(const leg of published){
   assert(!ids.has(leg.selectionId));ids.add(leg.selectionId);
   if(shared.hasVerifiedPlayableQuote(leg)){
    quoted++;const provider=event?.markets.flatMap(m=>m.selections).find(s=>String(s.providerSelectionId)===String(leg.betSelection.identity.providerSelectionId));assert(provider);assert.equal(provider.odds,leg.betSelection.quote.decimal);
   }else{
    unquoted++;assert(shared.isCanonicalModelForecast(leg));assert.equal(leg.betSelection.quote.decimal,null);assert.equal(leg.betSelection.evaluation.expectedValuePct,null);
   }
   if(leg.betSelection.market.bookmakerSemantics?.duo){assert.equal(leg.betSelection.evaluation.modelProbabilityPct,null);assert.equal(leg.betSelection.evaluation.expectedValuePct,null);}
   assert.equal(store.add({...leg,context}).status,'ADDED',leg.selectionId);store.remove(leg.selectionId);
  }
 }
 return {published:ids.size,quoted,unquoted};
});
check('Milan–Atalanta unquoted selection persists and suppresses partial multiple total',()=>{
 const selections=shared.sharedForecastsForMatch(md7.marketCatalog,sampleIds[2]);
 const unquoted=selections.find(s=>s.betSelection.quote.availability==='UNAVAILABLE'),quoted=md7.marketCatalog.matches.flatMap(f=>shared.sharedForecastsForMatch(md7.marketCatalog,f.matchId)).find(shared.hasVerifiedPlayableQuote);
 assert(unquoted&&quoted);const storage=memoryStorage(),context={competition:'serie-a',season:'2026-27',matchday:7};
 const store=storeModule.createPersonalBetslipStore({storage});store.setContext(context);
 assert.equal(store.add({...unquoted,context}).status,'ADDED');assert.equal(store.add({...quoted,context}).status,'ADDED');
 assert.equal(store.getSnapshot().assessment.theoreticalCombinedOdds,null);assert.equal(store.getSnapshot().assessment.usableCombinedOdds,null);
 const restored=storeModule.createPersonalBetslipStore({storage});assert.equal(restored.getSnapshot().selections.length,2);
 return {unquotedSelectionId:unquoted.selectionId,otherQuotedSelectionId:quoted.selectionId,storage:'memory only',theoreticalCombinedOdds:null};
});
write('sample-checks.json',{samples:sampleChecks,checks:checkResults});

// Execute actual renderer entry points with inert DOM/storage in memory; no browser and no network.
const readings=await import(pathToFileURL(path.join(root,'js/pages/readings.js')));
const champions=await import(pathToFileURL(path.join(root,'js/pages/champions.js')));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderResults=[];
for(const id of [...sampleIds,'ucl-2026-27-md01-06']){
 const app={innerHTML:''},patches=[],listeners=[];
 globalThis.location={search:'?match='+id,pathname:id.startsWith('ucl')?'/champions-league.html':'/lettura.html'};
 globalThis.CSS={escape:v=>String(v)};globalThis.localStorage=memoryStorage();
 const stub=selector=>({innerHTML:'',dataset:{},setAttribute(){},querySelector(){return null},querySelectorAll(){return []},addEventListener(event){listeners.push({selector,event})},insertAdjacentHTML(position,html){patches.push({selector,position,html})}});
 globalThis.document={querySelector(selector){if(selector==='#app')return app;if(selector==='.round16-formations'){
  return {set innerHTML(html){patches.push({selector,html})}};
 }if(selector==='.reading-h2h-section')return stub(selector);return null;},querySelectorAll(){return []}};
 const load=async name=>globalThis.officialStarterPolicy.filter(read('data/normalized/'+name));
 try{
  if(id.startsWith('ucl'))await champions.createPage({esc,load}).render();
  else await readings.createPage({esc,load,loadGenerated:async name=>read('data/generated/'+name),loadTeamDirectory:async()=>read('data/teams/index.json'),loadObjectiveProfiles:async()=>read('data/team-objectives.json'),contrastInk:()=> '#000',dateOnly:v=>String(v??'').slice(0,10),scheduleLabel:m=>`${m.date} ${m.kickoff}`,scheduleChronology:()=>'',teamLogo:t=>`<span>${esc(t?.name)}</span>`,empty:message=>`<p>${esc(message)}</p>`,hero:(eyebrow,title,text)=>`<h1>${esc(title)}</h1><p>${esc(text)}</p>`,competitionLabel:v=>v}).render();
  const combined=app.innerHTML+patches.map(p=>p.html).join('');
  renderResults.push({fixtureId:id,status:'PASS',method:'Real renderer, inert DOM. Captures initial markup and subsequent insert/replace payloads; does not claim computed layout or interaction coverage.',headings:[...combined.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(m=>({level:Number(m[1]),text:m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()})),sections:[...combined.matchAll(/<(section|article|details)\b([^>]*)>/g)].map(m=>({tag:m[1],attributes:m[2]})),publishedIds:[...combined.matchAll(/data-(?:shared-forecast-id|published-selection-id)="([^"]+)"/g)].map(m=>m[1]),markup:app.innerHTML,patches});
 }catch(e){renderResults.push({fixtureId:id,status:'FAIL',error:e.stack});}
}
write('rendered-inventory.json',renderResults);

const afterPaths=protectedPaths();
const changed=files.filter(f=>!fs.existsSync(path.join(root,f.path))||hash(f.path)!==f.sha256).map(f=>f.path);
const beforeSet=new Set(files.map(f=>f.path)),afterSet=new Set(afterPaths);
const added=afterPaths.filter(p=>!beforeSet.has(p)),deleted=files.filter(f=>!afterSet.has(f.path)).map(f=>f.path);
write('integrity-final.json',{checkedAt:new Date().toISOString(),beforeCount:files.length,afterCount:afterPaths.length,changed,added,deleted,unchanged:changed.length===0&&added.length===0&&deleted.length===0,manifestSha256:hash(own+'protected-manifest.json')});
write('git-after-checks.json',{head:git('rev-parse','HEAD').trim(),branch:git('branch','--show-current').trim(),porcelain:git('status','--porcelain=v1','--untracked-files=all').split(/\r?\n/).filter(Boolean),diff:git('diff','--stat'),stagedDiff:git('diff','--cached','--stat')});
console.log(JSON.stringify({tests:results.map(r=>({test:r.test,exit:r.exitCode})),checks:checkResults.map(c=>({name:c.name,status:c.status,details:c.details})),renders:renderResults.map(r=>({fixture:r.fixtureId,status:r.status,error:r.error})),samples:sampleChecks.map(s=>({matchId:s.matchId,published:s.published,unquoted:s.quoteUnavailable})),protected:files.length,changed,added,deleted},null,2));
