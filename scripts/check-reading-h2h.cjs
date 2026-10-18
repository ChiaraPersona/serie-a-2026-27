const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const files=['data/generated/head-to-head/first-leg-2026-27.json','data/normalized/champions-head-to-head-2026-27.json','data/sources/champions-head-to-head-details-2026-27.json','data/normalized/uefa-europe-history-2023-26.json','data/sources/uefa-head-to-head-history-2020-23.json','data/normalized/predictions.json','data/normalized/schedina-md07.json','data/normalized/schedina-champions-md02.json'];
const hashes=()=>files.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')),before=hashes();
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600'});res.end(e?'Missing':b)})});
(async()=>{
 const {selectHistoryRows,disciplineEvents}=await import('../js/pages/reading-detail/head-to-head.mjs');
 const domestic=read(files[0]).fixtures,clHistory=read(files[1]).fixtures;
 const archives={details:read(files[2]),current:read(files[3]),older:read(files[4]),teams:read('data/sources/champions-team-history-map-2026-27.json')};
 const clPred=[...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures];
 const clIds=new Set(clPred.map(f=>f.fixtureId));
 const calendar=read('data/normalized/matches.json');
 const domesticModels=domestic.map(h=>({competition:'serie-a',fixture:{id:h.fixtureId,date:calendar.find(m=>m.id===h.fixtureId)?.date},home:{name:h.homeTeam.name},away:{name:h.awayTeam.name},history:h}));
 const clModels=read('data/normalized/champions-league-2026-27.json').fixtures.filter(f=>clIds.has(f.id)).map(f=>({competition:'champions',fixture:{id:f.id,date:f.date},home:{name:f.homeTeam},away:{name:f.awayTeam},history:clHistory.find(h=>h.fixtureId===f.id)}));
 const samples=['milan-atalanta-2026-27-md-07','atalanta-sassuolo-2026-27-md-01','ucl-2026-27-md01-06','ucl-2026-27-md02-04','ucl-2026-27-md01-01'];
 const cases=[...domesticModels,...clModels].filter(f=>!process.argv.includes('--samples-only')||samples.includes(f.fixture.id));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true}),target=path.join(root,'reports/reading-h2h');fs.mkdirSync(target,{recursive:true});
 const results=[],errors=[];let next=0;
 const mins=v=>v===null||v===undefined||v===''?'minuto N/D':`${String(v).replace(/['′’]+$/,'')}′`;
 const eventRows=items=>items.map(e=>({player:e.player||'Giocatore N/D',minute:mins(e.minute)}));
 try{
 const worker=async()=>{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(;;){const f=cases[next++];if(!f)break;const expected=selectHistoryRows(f,f.history,f.competition==='champions'?archives:null);
   for(const width of (process.argv.includes('--samples-only')?[1440,768,390,320]:[1440,390])){
    await page.setViewportSize({width,height:1000});
    if(width===1440){await page.goto(`${base}/${f.competition==='serie-a'?'lettura':'champions-league'}.html?match=${f.fixture.id}`);await page.waitForSelector('.rd-shell');}
    const section=page.locator('#lettura-storico');
    assert.equal(await section.locator('[role=tab],.reading-h2h-model').count(),0);
    assert(!(await section.textContent()).includes('Uso nel modello'));
    const actual=await section.locator('.rd-h2h-meeting').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.h2hId,date:n.dataset.h2hDate,open:n.open,home:n.querySelector('.rd-h2h-home').textContent,away:n.querySelector('.rd-h2h-away').textContent,score:n.querySelector('.rd-h2h-scoreline>b').textContent,competition:n.querySelector('.rd-h2h-meta>span').textContent})));
    assert.deepEqual(actual,expected.map(r=>({id:r.id,date:r.date,open:false,home:r.home,away:r.away,score:`${r.score?.home??'—'}–${r.score?.away??'—'}`,competition:r.competition})),f.fixture.id+' summaries');
    const events=await section.locator('.rd-h2h-meeting').evaluateAll(nodes=>nodes.map((node,index)=>{
     node.querySelector('summary').click();if(!node.open)throw Error('Disclosure did not open');if(nodes.some((n,i)=>i!==index&&n.open))throw Error('Wrong meeting opened');
     const groups=Object.fromEntries([...node.querySelectorAll('[data-h2h-event-group]')].map(g=>[g.dataset.h2hEventGroup,[...g.querySelectorAll('li')].map(li=>({player:li.querySelector('strong').textContent,minute:li.querySelector('time').textContent}))]));
     const overflow=document.documentElement.scrollWidth>innerWidth+1;node.querySelector('summary').click();if(node.open)throw Error('Disclosure did not close');return {groups,overflow};
    }));
    for(let i=0;i<expected.length;i++){
     const raw=expected[i].raw,cards=disciplineEvents(raw);
     assert.deepEqual(events[i].groups,{goals:eventRows(raw.goals||[]),yellow:eventRows(cards.yellow.map(r=>r.event)),red:eventRows(cards.red.map(r=>r.event))},f.fixture.id+' events '+expected[i].id);
     assert(!events[i].overflow,f.fixture.id+' expanded overflow');
    }
    const layout=await section.locator('.rd-h2h-scoreline').evaluateAll(nodes=>nodes.map(n=>[...n.children].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,width:r.width}})));
    layout.forEach(([home,score,away])=>{assert(home.x<score.x&&score.x<away.x);assert(Math.abs(home.width-away.width)<1)});
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),f.fixture.id+' overflow');
    if(expected.length>1){const independent=await section.locator('.rd-h2h-meeting').evaluateAll(nodes=>{nodes[0].querySelector('summary').click();nodes[1].querySelector('summary').click();const open=nodes.filter(n=>n.open).length;nodes.filter(n=>n.open).forEach(n=>n.querySelector('summary').click());return open});assert.equal(independent,2);}
    if(process.argv.includes('--samples-only')){
     await section.screenshot({path:path.join(target,`${f.fixture.id}-${width}-closed.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
     if(expected.length){await section.locator('.rd-h2h-meeting').first().evaluate(n=>n.querySelector('summary').click());await section.screenshot({path:path.join(target,`${f.fixture.id}-${width}-expanded.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});await section.locator('.rd-h2h-meeting').first().evaluate(n=>n.querySelector('summary').click());}
    }
    results.push({fixtureId:f.fixture.id,competition:f.competition,width,meetings:actual.length,summaries:'PASS',events:'PASS',independentDisclosure:'PASS',overflow:'PASS'});
    if(results.length%40===0)console.log('Checked',results.length,'/',cases.length*2);
   }
  }await page.close();
 };
 await Promise.all(Array.from({length:4},worker));assert.deepEqual(errors,[]);const after=hashes(),changed=files.filter((_,i)=>before[i]!==after[i]);
 fs.writeFileSync(path.join(target,process.argv.includes('--samples-only')?'samples-audit.json':'browser-audit.json'),JSON.stringify({results,errors,changedInputs:changed},null,2)+'\n');assert.deepEqual(after,before,'Protected inputs changed');
 console.log(JSON.stringify({checks:results.length,meetingsChecked:results.reduce((n,r)=>n+r.meetings,0),errors,protectedInputs:'UNCHANGED'}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
