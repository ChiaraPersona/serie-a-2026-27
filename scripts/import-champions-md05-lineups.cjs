'use strict';
// Reviewed canonical IDs from the user's 24 November screenshots. No name lookup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');};
const specs=[
['bodo-glimt','4-3-3','nikita-haikin|12,fredrik-sj-vold|20,odin-bj-rtuft|4,jostein-gundersen|6,fredrik-bj-rkan|15,sondre-auklend|8,patrick-berg|7,sondre-brunstad-fet|19,ole-didrik-blomberg|11,ola-brynhildsen|17,jens-petter-hauge|10','haitam-aleesami|5,andreas-helmersen|9,joshua-kitolano|16,julian-faye-lund|1,isak-maatta|25,joel-mvuka|22,villads-nielsen|2,magnus-riisn-s|23,ulrik-saltnes|14,isak-sjong|45'],
['lask','5-3-2','lukas-jungwirth|1,kasper-j-rgensen|20,xavier-mbuyamba|4,joao-victor-tornich|43,miguel-freckleton|3,yvan-dibango|25,krystof-danek|9,robert-ljubicic|10,alessandro-schopf|18,samuel-adeniran|7,christoph-lang|27','melayro-bogarde|6,daniel-elfadli|23,sascha-horvath|30,sasa-kalajdzic|11,nael-kane|45,fabian-schillinger|50,tobias-schutzenauer|33,moses-usor|8,manoel-verhaeghe|21'],
['galatasaray','4-2-3-1','ugurcan-cak-r|1,wilfried-singo|90,davinson-sanchez|6,abdulkerim-bardakc|42,eren-elmal|17,lucas-torreira|34,mario-lemina|99,yunus-akgun|11,aleksei-batrakov|83,bar-s-alper-y-lmaz|53,deniz-gul|21',null],
['aston-villa','4-2-3-1','zion-suzuki|1,aaron-wan-bissaka|29,taylor-harwood-bellis|4,pau-torres|14,ian-maatsen|22,boubacar-kamara|8,leon-goretzka|27,alysson|47,john-mcginn|7,johan-manzambi|44,nicolas-jackson|11',null]
];
function build(){
const calendar=read('data/normalized/champions-league-2026-27.json'),old=read('data/sources/champions-official-formations-md04-2026-27.json'),probable=read('data/sources/champions-probable-formations-md04-2026-27.json');
const teams=calendar.fixtures.filter(f=>f.matchday===5).flatMap(f=>['home','away'].map(venue=>{
 const name=f[venue+'Team'],previous=old.teams.find(t=>t.team===name)||probable.teams.find(t=>t.team===name);assert(previous,name);
 const pool=[...new Map([previous,probable.teams.find(t=>t.teamId===previous.teamId)].filter(Boolean).flatMap(t=>['starters','bench','unavailable','suspended','doubtful'].flatMap(k=>t[k]||[])).map(p=>[p.playerId,p])).values()];
 const spec=specs.find(s=>s[0]===previous.teamId);let t={...structuredClone(previous),fixtureId:f.id,venue,status:'probable',referenceFixtureId:previous.fixtureId,referenceDate:calendar.fixtures.find(x=>x.id===previous.fixtureId).date,lineupBasis:'last-available-XI-user-authorized-provisional',benchStatus:'full-squad-pending-callups',unavailable:[],suspended:[],doubtful:[]};
 if(spec){const resolve=value=>{const [id,number]=value.split('|');const p=pool.find(p=>p.playerId===id);assert(p,id);return {...p,shirtNumber:Number(number),reason:null};};
 t.status='official';t.lineupBasis='user-declared-official-screenshots';t.formation=spec[1];t.starters=spec[2].split(',').map(resolve);t.bench=spec[3]?spec[3].split(',').map(resolve):pool.filter(p=>p.playerId&&!t.starters.some(s=>s.playerId===p.playerId));t.benchStatus=spec[3]?'official':'full-squad-pending-callups';
 t.evidenceNote=spec[0]==='galatasaray'||spec[0]==='aston-villa'?'User explicitly identifies these XIs as official; screenshot heading says probable. Bench not supplied.':'Official XI and bench supplied by user.';
 }else{t.bench=pool.filter(p=>p.playerId&&!t.starters.some(s=>s.playerId===p.playerId));}
 t.formation=t.formation||t.rawLine.slice(t.rawLine.indexOf(':')+1).split(';').slice(1).map(row=>row.split(',').length).join('-');
 let offset=1;const rows=[t.starters[0].canonicalName,...t.formation.split('-').map(n=>{const row=t.starters.slice(offset,offset+Number(n));offset+=Number(n);return row.map(p=>p.canonicalName).join(', ');})];t.rawLine=t.team+': '+rows.join('; ');t.bench=t.bench.filter(p=>p.registeredPlayerId||t.benchStatus==='official');assert.equal(offset,11);assert.equal(new Set(t.starters.map(p=>p.playerId)).size,11);return t;
}));
const source={provider:'user-supplied-screenshots-and-existing-canonical-lineups',consultedAt:new Date().toISOString(),evidenceDirectory:'data/sources/official-lineup-evidence/champions-md05-first-two',note:'Two official fixtures declared by user. Other XIs explicitly provisional references to previous matches, not confirmed MD5 probable lineups. No old availability carried forward.'};
const base={schemaVersion:1,competition:'champions',season:'2026-27',matchday:5,source};
write('data/sources/champions-probable-formations-md05-2026-27.json',{...base,status:'probable',teams});
const officialTeams=teams.filter(t=>t.status==='official');const ids=[...new Set(officialTeams.map(t=>t.fixtureId))];
write('data/sources/champions-official-formations-md05-2026-27.json',{...base,status:'official',teams:officialTeams,fixtures:ids.map(fixtureId=>({fixtureId,status:'official',home:{players:officialTeams.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:officialTeams.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}}))});
console.log(JSON.stringify({teams:teams.length,officialFixtures:ids,starters:teams.length*11}));
}
if(require.main===module)build();module.exports={build,specs};
