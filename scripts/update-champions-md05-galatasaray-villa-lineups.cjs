'use strict';
// Exact canonical identities reviewed against the user's replacement screenshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixtureId='ucl-2026-27-md05-02';
const evidenceDirectory='data/sources/official-lineup-evidence/champions-md05-galatasaray-villa-revision';
const specs=[
 ['galatasaray','4-3-3','ugurcan-cak-r|1,wilfried-singo|90,davinson-sanchez|6,abdulkerim-bardakc|42,ismail-jakobs|4,lucas-torreira|34,mario-lemina|99,eren-elmal|17,yunus-akgun|11,aleksei-batrakov|83,bar-s-alper-y-lmaz|53'],
 ['aston-villa','4-2-3-1','zion-suzuki|1,taylor-harwood-bellis|4,victor-lindelof|3,tyrone-mings|5,ian-maatsen|22,boubacar-kamara|8,joao-gomes|35,alysson|47,johan-manzambi|44,john-mcginn|7,nicolas-jackson|11']
];
function build(){
 const now=new Date().toISOString();
 const calendar=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/champions-league-2026-27.json'),'utf8'));
 assert(require('./champions/shared-scenario.cjs').eligible(calendar.fixtures.find(f=>f.id===fixtureId),now),'Refuse started/finished fixture update');
 for(const kind of ['official','probable']){
  const file=path.join(root,`data/sources/champions-${kind}-formations-md05-2026-27.json`),data=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const [teamId,formation,rows] of specs){
   const t=data.teams.find(t=>t.fixtureId===fixtureId&&t.teamId===teamId);assert(t,teamId);
   const pool=[...t.starters,...t.bench],seen=new Set();
   const starters=rows.split(',').map(row=>{
    const [id,shirt]=row.split('|'),matches=pool.filter(p=>p.playerId===id);assert.equal(matches.length,1,id);
    assert(matches[0].registeredPlayerId,id);assert(!seen.has(id));seen.add(id);
    return {...matches[0],shirtNumber:Number(shirt),reason:null};
   });
   assert.equal(starters.length,11);
   Object.assign(t,{status:'official',formation,starters,bench:pool.filter(p=>!seen.has(p.playerId)),benchStatus:'full-squad-pending-callups',lineupBasis:'user-declared-official-screenshots',evidenceNote:'Replacement starting XIs supplied by user; no confirmed bench supplied.',lineupEvidence:{provider:'user-supplied-screenshots',consultedAt:now,evidenceDirectory,files:['pitch.png','starting-lineups.png']}});
   let offset=1;const units=formation.split('-').map(Number);
   t.rawLine=t.team+': '+[starters[0].canonicalName,...units.map(n=>{const row=starters.slice(offset,offset+n);offset+=n;return row.map(p=>p.canonicalName).join(', ');})].join('; ');assert.equal(offset,11);
  }
  if(kind==='official'){
   const f=data.fixtures.find(f=>f.fixtureId===fixtureId);assert(f);
   for(const venue of ['home','away'])f[venue].players=data.teams.find(t=>t.fixtureId===fixtureId&&t.venue===venue).starters;
  }
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 }
 console.log('Updated both canonical MD5 XIs for '+fixtureId+'; benches remain unconfirmed');
}
if(require.main===module)build();module.exports={build,specs};
