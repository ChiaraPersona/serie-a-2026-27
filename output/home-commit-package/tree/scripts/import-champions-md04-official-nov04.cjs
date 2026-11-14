'use strict';
// Explicit canonical identities and tactical order reviewed against user screenshots.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const specs=[
 ['aek-athens','4-4-2','alberto-brignoli:91,stavros-pilios:3,filipe-relvas:44,harold-moukoudi:2,lazaros-rota:12,aboubakary-koita:11,kaan-kairinen:6,kervin-arriaga:16,lovro-majer:14,luka-jovic:9,mijat-gacinovic:8','marios-balamotis:41,charalampos-lykogiannis:22,petros-mantalos:20,razvan-marin:18,thomas-strakosha:1,barnabas-varga:19,domagoj-vida:21,milan-vitalis:27,zini:90,oleksandr-zubkov:10'],
 ['real-madrid','4-2-3-1','thibaut-courtois:1,denzel-dumfries:24,eder-militao:3,antonio-rudiger:22,marc-cucurella:17,bernardo-silva:20,eduardo-camavinga:6,yan-diomande:25,jude-bellingham:5,vinicius-junior:7,kylian-mbappe:10','trent-alexander-arnold:12,alvaro-carreras:18,brahim-diaz:21,endrick:9,carlos-espi:19,dean-huijsen:4,ibrahima-konate:16,andriy-lunin:13,joan-martinez:38,sergio-mestre:26,thiago-pitarch:27,federico-valverde:8'],
 ['fenerbahce','4-3-3','ederson:31,archie-brown:3,kojo-peprah-oppong:21,milan-skriniar:37,nelson-semedo:27,ismail-yuksek:5,n-golo-kante:91,matteo-guendouzi:6,irfan-can-kahveci:17,romelu-lukaku:9,mason-greenwood:11','kerem-akturkoglu:7,oguz-ayd-n:70,tar-k-cetin:13,yigit-efe-demir:14,bartug-elmaz:28,mert-gunok:34,levent-mercan:22,ognjen-mimovic:77,mert-muldur:18,vedat-muriqi:19,dorgeles-nene:45'],
 ['liverpool','4-2-3-1','alisson-becker:1,joe-gomez:2,jeremy-jacquet:5,virgil-van-dijk:4,kostas-tsimikas:21,alexis-mac-allister:10,trey-nyoni:42,victor-munoz:23,dominik-szoboszlai:8,rio-ngumoha:73,bradley-barcola:29','ronald-araujo:33,luke-chambers:44,jayden-danns:76,cody-gakpo:18,alexander-isak:9,milos-kerkez:6,lewis-koumas:67,giorgi-mamardashvili:25,james-mcconnell:53,florian-wirtz:7,freddie-woodman:28']
];
const evidence='data/sources/official-lineup-evidence/champions-md04-nov04-first-two';
function build(){
 const probable=read('data/sources/champions-probable-formations-md04-2026-27.json'),file='data/sources/champions-official-formations-md04-2026-27.json',official=read(file);
 const teams=specs.map(([id,formation,xi,bench])=>{
  const t=probable.teams.find(t=>t.teamId===id);assert(t,id);
  const pool=['starters','bench','unavailable','suspended','doubtful'].flatMap(k=>t[k]||[]);
  const resolve=entry=>{const [playerId,number]=entry.split(':');const p=pool.find(p=>p.playerId===playerId);assert(p,playerId);return {...p,shirtNumber:Number(number),reason:null};};
  const starters=xi.split(',').map(resolve),reserves=bench.split(',').map(resolve);
  assert.equal(starters.length,11);assert.equal(new Set([...starters,...reserves].map(p=>p.playerId)).size,starters.length+reserves.length);
  let offset=1;const rows=[starters[0].canonicalName,...formation.split('-').map(n=>{const row=starters.slice(offset,offset+Number(n));offset+=Number(n);return row.map(p=>p.canonicalName).join(', ');})];
  const mentioned=new Set([...starters,...reserves].map(p=>p.playerId));
  return {...t,status:'official',formation,rawLine:t.team+': '+rows.join('; '),starters,bench:reserves,benchStatus:'official',unavailable:(t.unavailable||[]).filter(p=>!mentioned.has(p.playerId)),suspended:(t.suspended||[]).filter(p=>!mentioned.has(p.playerId)),doubtful:[],evidenceDirectory:evidence};
 });
 const ids=new Set(teams.map(t=>t.fixtureId));assert.equal(ids.size,2);
 const output='output/official-md04-nov04-first-two';fs.mkdirSync(output,{recursive:true});
 if(!fs.existsSync(output+'/before.json'))write(output+'/before.json',{official,catalog:read('data/normalized/schedina-champions-md04.json'),individuals:read('data/normalized/champions-md04-probable-individuals-2026-27.json'),shared:read('data/generated/champions-shared-scenarios.json')});
 if(process.argv.includes('--write'))write(file,{...official,source:{...official.source,consultedAt:new Date().toISOString(),evidenceDirectories:[...new Set([...(official.source.evidenceDirectories||[]),evidence])]},teams:[...official.teams.filter(t=>!ids.has(t.fixtureId)),...teams],fixtures:[...official.fixtures.filter(f=>!ids.has(f.fixtureId)),...[...ids].map(fixtureId=>({fixtureId,status:'official',home:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}}))]});
 console.log(JSON.stringify({fixtures:[...ids],starters:44,bench:teams.reduce((n,t)=>n+t.bench.length,0)}));
}
if(require.main===module)build();
module.exports={specs};
