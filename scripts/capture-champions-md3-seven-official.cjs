'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const read=p=>storageReadJson(p);
const raw=read('data/sources/champions-official-seven-transcription-2026-10-20.json');
const db=read('data/normalized/champions-md03-player-database-2026-27.json');
require('./champions/md3-identity-corrections.cjs').applyIdentityCorrections(process.cwd(),db);
const file='data/sources/champions-official-formations-md03-2026-27.json';
const previous=read(file),calendar=read('data/normalized/champions-league-2026-27.json');
const folder='data/analysis/champions/official-seven-2026-10-20';
fs.mkdirSync(folder,{recursive:true});
const snapshot=folder+'/before.json';
if(!fs.existsSync(snapshot)){
 const paths=[file,'data/normalized/champions-league-2026-27.json','data/normalized/official-starter-registry.json','data/normalized/odds/sisal/champions-league.json','data/normalized/schedina-champions-md03.json','data/derived/champions-md03/upcoming-forecasts.json'];
 fs.writeFileSync(snapshot,JSON.stringify(Object.fromEntries(paths.map(p=>[p,{sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),data:read(p)}])),null,2)+'\n');
}
const absences={
 porto:['Gabriel Mec|Fuori rosa','Prpic D.|Fuori rosa','Sousa V.|Infortunio alla gamba','William Gomes|Infortunio alla caviglia'],
 'psv-eindhoven':['Lammers S.|Fuori condizione','Nagalo A.|Infortunato','Ouaissa S.|Infortunio muscolare','Pepi R.|Infortunato','Plea A.|Intervento Chirurgico','Schouten J.|Infortunio al ginocchio','Sildillia K.|Intervento Chirurgico','van Bommel R.|Inattivo','Wanner P.|Infortunio al piede'],
 liverpool:['Bradley C.|Infortunio al ginocchio','Chiesa F.|Fuori rosa','Ekitike H.|Infortunio al tendine d’Achille','Endo W.|Fuori rosa','Frimpong J.|Infortunio muscolare','Leoni G.|Infortunio al ginocchio','Szoboszlai D.|Infortunio muscolare'],villarreal:['Pepe N.|Infortunio all’occhio'],
 'manchester-city':['Nunes M.|Trauma','Semenyo A.|Infortunio al ginocchio'],'aek-athens':['Alexiou C.|Fuori rosa','Georgiev M.|Fuori rosa','Kutesa D.|Fuori rosa','Pierrot F.|Fuori rosa','Sahabo H.|Fuori rosa','Strakosha T.|Infortunio al polso'],
 napoli:['Alisson Santos|Infortunio muscolare','Buongiorno A.|Infortunio al ginocchio','David Neres|Infortunio alla coscia','Favasuli C.|Infortunio alla coscia','Marianucci L.|Fuori rosa','Vergara A.|Infortunio al polpaccio'],'bodo-glimt':['Evjen H.|Infortunio al ginocchio','Mikkelsen A.|Infortunio all’inguine','Riisnaes M.|Infortunio al ginocchio','Sjong I.|Infortunato'],
 'paris-saint-germain':['Longoni A.|Infortunato','Mendes N.|Infortunio muscolare'],barcelona:['Bardghji R.|Infortunio al ginocchio','Christensen A.|Infortunio muscolare','Garcia E.|Infortunio muscolare','Kounde J.|Infortunio alla caviglia'],
 roma:['Bah M.|Infortunio al ginocchio','Dybala P.|Infortunio al polpaccio','Kone M.|Infortunio muscolare','Svilar M.|Infortunio a un dito del piede'],'slovan-bratislava':['Cerepkai R.|Infortunio alla schiena','Griger A.|Fuori rosa','Kianga M.|Fuori rosa','Kukharevych M.|Infortunato','Sporar A.|Malattia'],
 stuttgart:['Diehl J.|Infortunio muscolare','Drljaca S.|Fuori rosa','Stergiou L.|Fuori rosa','Tomas T.|Infortunio muscolare','Zagadou D.|Infortunio muscolare'],'atletico-de-madrid':['Koke|Infortunio muscolare','Romero C.|Infortunio muscolare']
};
// Reviewed team/number/name pairs from the rendered pages. Two bench names have
// no confirmed canonical identity: preserve them without assigning another ID.
const unresolved={'roma:63':{url:'https://www.diretta.it/giocatore/di-nunzio-alessandro/vVmBHCM1',reason:'CANONICAL_ID_UNAVAILABLE'},'atletico-de-madrid:27':{url:'https://www.diretta.it/giocatore/dominguez-jorge/EatNZTxP',reason:'SHIRT_NUMBER_MATCH_HAS_DIFFERENT_CANONICAL_NAME'}};
const reviewed=[];
const fixtures=raw.fixtures.map(f=>{
 const id='ucl-2026-27-md03-'+f.suffix,c=calendar.fixtures.find(x=>x.id===id);assert(c&&c.status==='scheduled');
 assert(Date.parse(`${c.date}T${c.kickoff}:00+02:00`)>Date.now(),'Do not add retrospective selections');
 const teams=f.teams.map((t,index)=>{
  const team=db.teams.find(x=>x.teamId===t.teamId);assert.equal(team.team,c[index?'awayTeam':'homeTeam']);
  const map=(text,role)=>text.split('|').map(row=>{
   const [number,sourceName]=row.split(':'),shirtNumber=Number(number),unknown=unresolved[t.teamId+':'+number];
   if(unknown){assert.equal(role,'bench');return {playerId:null,registeredPlayerId:null,providerPlayerId:null,canonicalName:null,sourceName,shirtNumber,identityEvidence:unknown};}
   const hits=team.players.filter(p=>p.shirtNumber===shirtNumber);assert.equal(hits.length,1,t.teamId+'/'+row);
   const p=hits[0];assert(p.registeredPlayerId);
   reviewed.push({teamId:t.teamId,shirtNumber,sourceName,playerId:p.playerId,canonicalName:p.canonicalName,method:'REVIEWED_TEAM_SHIRT_AND_DISPLAYED_IDENTITY'});
   return {playerId:p.playerId,registeredPlayerId:p.registeredPlayerId,providerPlayerId:p.providerPlayerId,canonicalName:p.canonicalName,sourceName,shirtNumber};
  });
  const players=map(t.starters,'starter'),bench=map(t.bench,'bench');assert.equal(players.length,11);assert.equal(new Set(players.map(p=>p.playerId)).size,11);
  assert(!bench.some(p=>p.playerId&&players.some(s=>s.playerId===p.playerId)));
  return {teamId:t.teamId,team:team.team,formation:t.formation,players,bench,unavailable:absences[t.teamId].map(line=>{const [sourceName,reason]=line.split('|');return {playerId:null,sourceName,reason};})};
 });
 return {fixtureId:id,status:'official',source:{provider:'Diretta.it',url:f.url,capturedAt:new Date().toISOString(),scope:'starting-XI-bench-unavailable',transcription:'data/sources/champions-official-seven-transcription-2026-10-20.json'},home:teams[0],away:teams[1]};
});
const ids=new Set(fixtures.map(f=>f.fixtureId));
const output={...previous,fixtures:[...previous.fixtures.filter(f=>!ids.has(f.fixtureId)),...fixtures].sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId))};
for(const f of previous.fixtures.filter(f=>!ids.has(f.fixtureId)))assert.deepEqual(output.fixtures.find(x=>x.fixtureId===f.fixtureId),f);
fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(folder+'/identity-review.json',JSON.stringify({reviewed,unresolved},null,2)+'\n');
console.log(JSON.stringify({fixtures:fixtures.length,starters:fixtures.length*22,unresolvedStarters:0,unresolvedBench:2}));
