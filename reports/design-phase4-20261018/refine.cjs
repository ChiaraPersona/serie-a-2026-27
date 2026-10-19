const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=__dirname,baseline=JSON.parse(fs.readFileSync(out+'/baseline-hashes.json')),journalFile=out+'/edits.json',journal=fs.existsSync(journalFile)?JSON.parse(fs.readFileSync(journalFile)):{};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function edit(file,change){const old=fs.readFileSync(file);assert.equal(hash(old),journal[file]?.after||baseline[file],file+': concurrent change; stop');const next=change(old.toString());assert.notEqual(next,old.toString(),file+': no change');fs.writeFileSync(file+'.phase4.tmp',next);fs.renameSync(file+'.phase4.tmp',file);journal[file]={before:baseline[file],after:hash(next)};fs.writeFileSync(journalFile,JSON.stringify(journal,null,2));console.log('Updated',file)}
function replace(s,from,to){assert(s.includes(from),'Missing CSS anchor: '+from);return s.replace(from,to)}
switch(process.argv[2]){
case 'squadre':
 edit('css/team.css',s=>s+'\n/* Phase 4: directory only; shared flip faces and Schedina stay independent. */\nbody[data-page="team-stats"] #app>.team-directory-grid{gap:var(--ds-space-4);margin-bottom:var(--ds-space-5)}\n@media(min-width:761px){body[data-page="team-stats"] #app>.team-directory-grid .team-flip-card{height:280px}}\n');break;
case 'schede':
 edit('css/team.css',s=>replace(s,'#team-squad-app.team-editorial .team-editorial-heading{margin:0 0 24px;','#team-squad-app.team-editorial .team-editorial-heading{margin:0 0 var(--ds-space-4);'));break;
case 'giocatori':
 edit('css/player-statistics.css',s=>{
 s=replace(s,'body[data-page="player-stats"] .player-comparator-controls{grid-template-columns:1fr 1fr}','');
 s=replace(s,'grid-template-columns:1fr 2fr 2fr 1fr;gap:12px;margin:16px 0','grid-template-columns:minmax(0,1fr);gap:var(--ds-space-3);margin:0');
 s=replace(s,'.comparison-mode{max-width:210px;margin:12px 0 0 auto}','body[data-page="player-stats"] .comparison-mode{max-width:none;margin:0}');
 s=replace(s,'body[data-page="player-stats"] .player-comparator-controls{grid-template-columns:1fr 1fr}','body[data-page="player-stats"] .player-comparator-controls{grid-template-columns:minmax(0,1fr)}');
 return s+'\n/* Two adjacent controls, in DOM/tab order; results and header keep full width. */\nbody[data-page="player-stats"] #app>.player-comparator{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ds-space-4) var(--ds-space-5);margin-top:var(--ds-space-6)}\nbody[data-page="player-stats"] #app>.player-comparator>header,body[data-page="player-stats"] #app>.player-comparator>.player-comparator-result{grid-column:1/-1}\nbody[data-page="player-stats"] #app>.player-comparator>header{margin-bottom:0}\n';});break;
case 'indice':
 edit('css/readings-index.css',s=>{
 s=replace(s,'padding:20px;margin-bottom:25px;','padding:var(--ds-space-4) 20px 0;margin-bottom:var(--ds-space-5);');
 s=replace(s,'.readings-index .ri-current{margin-bottom:25px}','.readings-index .ri-current{margin-bottom:var(--ds-space-5)}');
 return replace(s,'padding:14px;border-radius:18px;margin-bottom:20px','padding:var(--ds-space-4) 14px 0;border-radius:18px;margin-bottom:var(--ds-space-5)');});break;
case 'giocatori-mobile':
 edit('css/player-statistics.css',s=>s+'\n@media(max-width:600px){body[data-page="player-stats"] #app>.player-comparator{grid-template-columns:minmax(0,1fr)}}\n');break;
case 'indice-cascade':{
 const file='css/readings-index.css';assert.equal(hash(fs.readFileSync(file)),journal[file].after,'Concurrent index CSS change');
 const original=fs.readFileSync(out+'/baseline/'+file);assert.equal(hash(original),baseline[file]);fs.writeFileSync(file+'.phase4.tmp',original);fs.renameSync(file+'.phase4.tmp',file);delete journal[file];fs.writeFileSync(journalFile,JSON.stringify(journal,null,2));
 edit('css/component-system.css',s=>replace(s,'  padding-inline:0;','  padding:var(--ds-space-4) 0 0;\n  margin-bottom:var(--ds-space-5);'));break;}
case 'letture':
 edit('css/reading-detail.css',s=>{
 s=replace(s,'.rd-section{margin:0 0 52px;','.rd-section{margin:0 0 var(--ds-space-6);');
 s=replace(s,'padding:0 0 14px;margin-bottom:24px;border-bottom:1px solid var(--rd-line)','padding:0 0 var(--ds-space-3);margin-bottom:var(--ds-space-4);border-bottom:1px solid var(--rd-line)');
 return replace(s,'.rd-section{margin-bottom:36px}.rd-section-heading{gap:9px;margin-bottom:18px;padding-bottom:12px}', '.rd-section{margin-bottom:var(--ds-space-5)}.rd-section-heading{gap:9px;margin-bottom:var(--ds-space-4);padding-bottom:var(--ds-space-3)}');});break;
case 'coppa':
 edit('css/matches.css',s=>replace(s,'body[data-page="cup"] .cup-stage{overflow:hidden}', 'body[data-page="cup"] #app>.cup-stage{overflow:hidden;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}'));break;
case 'champions':
 edit('css/champions.css',s=>s+'\n/* Phase 4: the calendar groups autonomous match cards, without an outer card. */\nbody[data-page="champions"] .champions-overview>.champions-calendar{margin-top:var(--ds-space-6);padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none}\n');break;
case 'schedine':
 edit('css/betting.css',s=>replace(s,'.betting-archive-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.7fr);gap:30px;align-items:end;padding:0 8px}', '.betting-archive-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.7fr);gap:var(--ds-space-5);align-items:end;padding:0}'));break;
default:throw Error('Unknown page');
}
