const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const protectedFiles=['predictions.json','team-style-profiles.json','champions-attack-channels-2025-26.json','schedina-md07.json','schedina-champions-md02.json'];
const hashes=()=>protectedFiles.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/normalized',f))).digest('hex'));
const before=hashes();
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const styles=read('data/normalized/team-style-profiles.json').profiles,teams=read('data/normalized/teams.json');
 const predictions=read('data/normalized/predictions.json').predictions;
 const champions=[...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures];
 const channels=read('data/normalized/champions-attack-channels-2025-26.json').profiles;
 const serie=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday<=19).map(m=>({...m,competition:'serie-a',prediction:predictions.find(p=>p.matchId===m.id)}));
 const european=champions.map(p=>({id:p.fixtureId,competition:'champions',homeTeam:p.homeTeam,awayTeam:p.awayTeam,prediction:p}));
 const cases=[...serie,...european].filter(f=>!process.argv.includes('--samples-only')||['milan-atalanta-2026-27-md-07','ucl-2026-27-md02-05','ucl-2026-27-md01-01'].includes(f.id));
 const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:1}):'—';
 const expected=f=>[f.homeTeam,f.awayTeam].map((id,i)=>{
  const team=f.competition==='serie-a'?teams.find(t=>t.id===id):null,name=team?.name||id;
  const profile=styles.find(p=>p.teamId===(team?.id||f.prediction?.teamProjections?.[i]?.teamId));
  const attack=(f.competition==='champions'?channels.find(p=>p.team===name)?.attackChannels:null)||f.prediction?.teamProjections?.[i]?.attackChannels||profile?.attackChannels;
  return {name,metrics:[fmt(profile?.summary?.possessionPct)+(typeof profile?.summary?.possessionPct==='number'?'%':''),fmt(profile?.summary?.shotsPerGame),fmt(profile?.derived?.goalsPerGame)],attack:attack?['left','central','right'].map(key=>({text:fmt(attack[key])+(typeof attack[key]==='number'?'%':''),width:`${typeof attack[key]==='number'?Math.max(0,Math.min(100,attack[key])):0}%` })):[]};
 });
 const results=[],errors=[];let next=0;const target=path.join(root,'reports/reading-tactics');fs.mkdirSync(target,{recursive:true});
 try{
 const worker=async()=>{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(;;){const f=cases[next++];if(!f)break;const wanted=expected(f);
   for(const width of (process.argv.includes('--samples-only')?[1440,768,390,320]:[1440,390])){
    await page.setViewportSize({width,height:1000});await page.goto(`${base}/${f.competition==='serie-a'?'lettura':'champions-league'}.html?match=${f.id}`);await page.waitForSelector('.rd-shell');
    const section=page.locator('#lettura-tattica'),columns=section.locator('[data-tactical-side]');
    assert.equal(await columns.count(),2);assert.equal(await section.getByText('Le chiavi del confronto',{exact:true}).count(),0);
    assert.equal(await section.locator('[role=tab],[role=tabpanel],.rd-tactical-summary').count(),0);
    for(let i=0;i<2;i++){
     const col=columns.nth(i);assert(await col.isVisible());assert.equal(await col.getAttribute('data-tactical-side'),i?'away':'home');
     assert.equal(await col.locator('h3').textContent(),wanted[i].name);
     assert.deepEqual(await col.locator('.rd-tactical-metrics dd').allTextContents(),wanted[i].metrics,f.id+' metrics');
     assert.deepEqual(await col.locator('.rd-channels>div').evaluateAll(rows=>rows.map(r=>({text:r.querySelector('strong').textContent,width:r.querySelector('i b').style.width}))),wanted[i].attack,f.id+' directions');
     assert.equal(await col.locator('.rd-tactical-metrics>div').evaluateAll(rows=>rows.filter(r=>r.scrollWidth>r.clientWidth+1).length),0,f.id+' metric overflow');
     assert.equal(await col.locator('.rd-tactical-metrics').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),1,f.id+' compact metrics');
    }
    const geometry=await columns.evaluateAll(nodes=>nodes.map(n=>{const rect=n.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,rows:[...n.children].map(c=>c.getBoundingClientRect().y)}}));
    assert(geometry[0].x<geometry[1].x);assert(Math.abs(geometry[0].width-geometry[1].width)<1);assert(Math.abs(geometry[0].y-geometry[1].y)<1);
    geometry[0].rows.forEach((y,i)=>assert(Math.abs(y-geometry[1].rows[i])<1,f.id+' aligned row '+i));
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),f.id+' page overflow');
    assert.equal(await section.locator('.rd-recent-form').count(),1);
    if(process.argv.includes('--samples-only')){
     await section.screenshot({path:path.join(target,`${f.id}-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
     await columns.locator('.rd-disclosure').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
     assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),f.id+' expanded detail overflow');
    }
    results.push({fixtureId:f.id,competition:f.competition,width,metrics:'PASS',channels:'PASS',alignment:'PASS',overflow:'PASS'});
    if(results.length%40===0)console.log('Checked',results.length,'/',cases.length*2);
   }
  }await page.close();
 };
 await Promise.all(Array.from({length:4},worker));assert.deepEqual(errors,[]);assert.deepEqual(hashes(),before,'Protected inputs changed');
 fs.writeFileSync(path.join(target,process.argv.includes('--samples-only')?'samples-audit.json':'browser-audit.json'),JSON.stringify({results,errors,protectedInputs:'UNCHANGED'},null,2)+'\n');
 console.log(JSON.stringify({checks:results.length,errors,protectedInputs:'UNCHANGED'}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
