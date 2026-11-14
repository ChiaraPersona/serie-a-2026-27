const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const protectedFiles=['data/normalized/predictions.json','data/normalized/champions-pilot-predictions-2026-27.json','data/normalized/champions-pilot-predictions-md02-2026-27.json','data/normalized/schedina-md07.json','data/normalized/schedina-champions-md02.json','scripts/predictions/engine.js','scripts/build-champions-pilot-predictions.js'];
const hashes=()=>protectedFiles.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')),before=hashes();
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600'});res.end(e?'Missing':b)})});
(async()=>{
 const predictions=read('data/normalized/predictions.json').predictions;
 const domestic=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday<=19).map(m=>({id:m.id,competition:'serie-a',prediction:predictions.find(p=>p.matchId===m.id)}));
 const champions=[...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures].map(p=>({id:p.fixtureId,competition:'champions',prediction:p}));
 const samples=['juventus-lazio-2026-27-md-07','milan-atalanta-2026-27-md-07','ucl-2026-27-md02-05',champions.find(c=>c.prediction.teamProjections.some(t=>t.cards===null))?.id,domestic.find(c=>!c.prediction)?.id];
 const cases=[...domestic,...champions].filter(c=>!process.argv.includes('--samples-only')||samples.includes(c.id));
 const finite=v=>typeof v==='number'&&Number.isFinite(v),number=v=>finite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:2}):'—';
 const expected=c=>['expectedGoals','shotsTotal','shotsOnTarget','corners','cards','fouls'].map((key,index)=>{
  const values=[0,1].map(i=>{const p=c.prediction?.teamProjections?.[i],v=key==='expectedGoals'?p?.expectedGoals:p?.[key]?.central;return ['cards','fouls'].includes(key)&&(!finite(v)||v<0)?null:v;});
  const max=Math.max(0,...values.filter(finite));
  return {label:['Gol attesi · modello','Tiri','SOT','Corner','Cartellini previsti','Falli previsti'][index],values:values.map(v=>['cards','fouls'].includes(key)?(finite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'—'):number(v)),widths:values.map(v=>finite(v)&&max>0?Math.max(0,v)/max*100:0),available:values.map(finite)};
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true}),results=[],errors=[];let next=0;
 const target=path.join(root,'reports/reading-cards', 'fouls');fs.mkdirSync(target,{recursive:true});
 try{
 const worker=async()=>{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(;;){const c=cases[next++];if(!c)break;const wanted=expected(c);
   for(const width of (process.argv.includes('--samples-only')?[1440,768,390,320]:[1440,390])){
    await page.setViewportSize({width,height:1000});if(width===1440){await page.goto(`${base}/${c.competition==='serie-a'?'lettura':'champions-league'}.html?match=${c.id}`);await page.waitForSelector('.rd-shell');}
    const chart=page.locator('.rd-scenario .rd-diverging');
    const actual=await chart.locator('.rd-diverging-row').evaluateAll(nodes=>nodes.map(n=>({label:n.querySelector('.rd-diverging-top strong').textContent,values:[...n.querySelectorAll('.rd-diverging-top b')].map(n=>n.textContent),widths:[...n.querySelectorAll('em')].map(n=>parseFloat(n.style.width)),available:[...n.querySelectorAll('.rd-diverging-half')].map(n=>n.dataset.available==='true'),colors:[...n.querySelectorAll('em')].map(n=>getComputedStyle(n).backgroundColor),height:n.getBoundingClientRect().height,trackHeight:n.querySelector('.rd-diverging-track').getBoundingClientRect().height})));
    assert.equal(actual.length,6);for(let i=0;i<6;i++){
     assert.equal(actual[i].label,wanted[i].label);assert.deepEqual(actual[i].values,wanted[i].values,c.id+' '+wanted[i].label);
     assert.deepEqual(actual[i].available,wanted[i].available);actual[i].widths.forEach((w,j)=>assert(Math.abs(w-wanted[i].widths[j])<0.001));
    }
    if(await page.locator('.prediction-v2-discipline-teams').count()){assert.deepEqual(await page.locator('.prediction-v2-discipline-teams article dl').evaluateAll(nodes=>nodes.map(n=>n.children.length)),[1,1]);}
    assert.equal(await page.locator('.prediction-v2-discipline-teams dt').filter({hasText:'Falli previsti'}).count(),0);
    assert.equal(actual[5].colors[1],actual[4].colors[1]);assert.equal(actual[5].colors[0],c.competition==='champions'?'rgb(120, 214, 172)':'rgb(18, 100, 81)');assert.equal(actual[5].height,actual[4].height);
    assert.deepEqual(actual[4].colors,actual[3].colors);assert.equal(actual[4].height,actual[3].height);assert.equal(actual[4].trackHeight,actual[3].trackHeight);
    assert((await chart.locator('.rd-diverging-row').nth(4).getAttribute('aria-label')).includes('ammonizioni'));
    const overlap=await chart.locator('.rd-diverging-row').nth(4).evaluate(n=>{const [title,home,away]=n.querySelector('.rd-diverging-top').children;const a=title.getBoundingClientRect(),b=home.getBoundingClientRect(),d=away.getBoundingClientRect();return a.left<b.left+b.width/3||a.right>d.right-d.width/3;});assert(!overlap,c.id+' label overlaps values');
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),c.id+' overflow');
    if(process.argv.includes('--samples-only')&&await page.locator('.prediction-v2-discipline-teams').count())await page.locator('.prediction-v2-discipline-teams').screenshot({path:path.join(target,`${c.id}-${width}-discipline.png`)});
    if(process.argv.includes('--samples-only'))await chart.screenshot({path:path.join(target,`${c.id}-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
    results.push({fixtureId:c.id,competition:c.competition,width,values:actual[4].values,layout:'PASS',colors:'PASS',scale:'PASS',originalMetrics:'PASS'});if(results.length%40===0)console.log('Checked',results.length,'/',cases.length*2);
   }
  }await page.close();
 };
 await Promise.all(Array.from({length:4},worker));assert.deepEqual(errors,[]);const after=hashes(),changed=protectedFiles.filter((_,i)=>before[i]!==after[i]);
 fs.writeFileSync(path.join(target,process.argv.includes('--samples-only')?'samples-audit.json':'browser-audit.json'),JSON.stringify({results,errors,changedInputs:changed},null,2)+'\n');assert.deepEqual(after,before,'Protected inputs changed');console.log(JSON.stringify({checks:results.length,errors,protectedInputs:'UNCHANGED'}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
