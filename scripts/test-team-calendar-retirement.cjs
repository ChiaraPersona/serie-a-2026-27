const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const removed=['squadra.html','js/pages/matches.js','css/pages/team.css'];
for(const file of removed)assert(!fs.existsSync(path.join(root,file)),`retired file remains: ${file}`);
const obsolete=/\.team-(?:calendar[\w-]*|nav(?:-link)?|hero-logo|schedule(?:-head)?|matchday|match-list|personal-calendar)(?=[^\w-]|$)/;
for(const name of fs.readdirSync(path.join(root,'css'),{recursive:true}).filter(f=>f.endsWith('.css')))assert(!obsolete.test(fs.readFileSync(path.join(root,'css',name),'utf8')),`retired CSS: ${name}`);
for(const directory of ['', 'statistiche-squadra'])for(const name of fs.readdirSync(path.join(root,directory)).filter(f=>f.endsWith('.html'))){const file=path.join(root,directory,name),html=fs.readFileSync(file,'utf8');assert(!/href=["'][^"']*\bsquadra\.html(?:[?"'])/.test(html),`broken calendar link: ${file}`);}
const builder=fs.readFileSync(path.join(root,'scripts/build-site.js'),'utf8'),prefix=builder.slice(0,builder.indexOf('const teams ='));
assert(!builder.includes('["squadra.html","team"'));assert(!fs.readFileSync(path.join(root,'scripts/page-styles.cjs'),'utf8').includes("team:'js/pages/matches.js'"));
// Test cleanup in all build modes without creating obsolete files or touching data.
for(const flags of [[],['--presentation-only'],['--team-pages-only'],['--readings-index-only'],['--betting-page-only'],['--champions-page-only'],['--md3-pages-only']]){
 const unlinked=[];vm.runInNewContext(prefix,{__dirname:path.join(root,'scripts'),process:{argv:['node','build-site.js',...flags],execPath:process.execPath},require:name=>name==='fs'?{existsSync:()=>true,unlinkSync:file=>unlinked.push(path.relative(root,file))}:name==='path'?path:name==='./site-styles'?{applyStyleLinks:s=>s}:name==='node:child_process'?{execFileSync:()=>{}}:{build:()=>{}}});
 for(const file of ['squadra.html','css/pages/team.css'])assert(unlinked.includes(path.normalize(file)),`cleanup missing in ${flags.join(' ')}: ${file}`);
}
const protectedPath=path.join(root,'reports/team-calendar-retirement/protected-before.json');
let checked=0;if(process.argv.includes('--check-preserved')&&fs.existsSync(protectedPath))for(const [file,hash] of Object.entries(JSON.parse(fs.readFileSync(protectedPath)))){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,`shared data/model modified: ${file}`);checked++;}
for(const file of ['data/normalized/matches.json','data/normalized/european-fixtures-2026-27.json','data/normalized/champions-league-2026-27.json','data/normalized/coppa-italia-2026-27.json','scripts/import-official-calendar.js','scripts/build-european-fixtures.js','js/components/match-card.js','js/team-squads.js'])assert(fs.existsSync(path.join(root,file)),`shared dependency removed: ${file}`);
(async()=>{const {loadPage}=await import('../js/core/router.js');await assert.rejects(loadPage('team','retirement-test'),/Pagina non supportata/);for(const route of ['home','team-stats','player-stats','readings','betting','cup','champions'])assert.equal(typeof (await loadPage(route,'retirement-test')).createPage,'function');console.log(`PASS retired team calendar: files, CSS, links, routes, 7 build modes; shared dependencies retained${checked?`; ${checked} data/model hashes unchanged`:''}`);})().catch(e=>{console.error(e);process.exitCode=1});
