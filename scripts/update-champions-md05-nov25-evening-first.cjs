'use strict';
// Exact canonical IDs reviewed against the four user-supplied screenshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(d,null,2)+'\n')};
const evidence='data/sources/official-lineup-evidence/champions-md05-nov25-evening-first';
const specs=[
  [
    "atletico-de-madrid",
    "4-4-2",
    "jan-oblak|13,alejandro-grimaldo|22,david-hancko|17,robin-le-normand|24,marcos-llorente|14,alex-baena|10,johnny-cardoso|5,koke|6,kang-in-lee|7,alexander-s-rloth|9,julian-alvarez|19",
    "pablo-barrios|8,jorge-castillo|46,jonathan-david|15,morten-hjulmand|23,romeo-hueso|26,dani-martinez|30,rodrigo-mendoza|4,juan-musso|1,arnau-ortiz|16,marc-pubill|18,giuliano-simeone|20,obed-vargas|3"
  ],
  [
    "viking",
    "4-3-3",
    "lubomir-belko|30,herman-haugen|2,gianni-stensness|6,henrik-falchener|25,henrik-heggheim|5,kristoffer-askildsen|7,tobias-moi|29,simen-kvia-egeskog|26,henrik-rorvik-bjordal|16,erik-botheim|22,zlatko-tripic|10",
    "vetle-auklend|24,anders-baertelsen|21,joe-bell|8,veton-berisha|14,peter-christiansen|20,amin-cosic|19,jesper-daland|27,niklas-fuglestad|23,jakob-hansen|33,arild-stb|1,romano-postema|11,viljar-vevatne|3"
  ],
  [
    "club-brugge",
    "4-2-3-1",
    "yann-sommer|1,joaquin-seys|65,brandon-mechele|44,jorne-spileers|58,kyriani-sabbe|64,hans-vanaken|20,freddie-potts|8,felix-lemarechal|80,hugo-vetlesen|10,carlos-forbs|9,nicolo-tresoldi|7",
    "lynnt-audoor|62,matteo-dams|32,mamadou-diakhon|67,nordin-jackers|29,han-beom-lee|3,milan-robberechts|39,hugo-siquet|41,cheveyo-tsawa|16,argus-vanden-driessche|81,andrej-vasovic|77,romeo-vermant|17,jan-virgili|11"
  ],
  [
    "liverpool",
    "4-2-3-1",
    "alisson-becker|1,jeremie-frimpong|30,jeremy-jacquet|5,ronald-araujo|33,milos-kerkez|6,trey-nyoni|42,dominik-szoboszlai|8,victor-munoz|23,florian-wirtz|7,bradley-barcola|29,alexander-isak|9",
    "luke-chambers|44,jayden-danns|76,joe-gomez|2,lewis-koumas|67,alexis-mac-allister|10,giorgi-mamardashvili|25,james-mcconnell|53,rio-ngumoha|73,kostas-tsimikas|21,virgil-van-dijk|4,freddie-woodman|28"
  ]
];
function build(){
 const probable=read('data/sources/champions-probable-formations-md05-2026-27.json'),official=read('data/sources/champions-official-formations-md05-2026-27.json'),squads=read('data/normalized/champions-registered-squads-2026-27.json');
 const catalog=read('data/normalized/schedina-champions-md05.json'),now=new Date().toISOString(),pending=[];
 const ids=new Set(specs.map(s=>probable.teams.find(t=>t.teamId===s[0]).fixtureId));
 const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const before={createdAt:now,fixtures:[...ids],catalogMatches:catalog.marketCatalog.matches.filter(m=>ids.has(m.matchId)),unaffectedCatalogHashes:Object.fromEntries(catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)).map(m=>[m.matchId,sha(m)])),unaffectedScenarios:Object.fromEntries(read('data/generated/champions-shared-scenarios.json').fixtures.filter(f=>!ids.has(f.fixtureId)).map(f=>[f.fixtureId,sha(f)]))};
 const baseline='output/champions-md05/nov25-evening-first/before.json';assert(!fs.existsSync(path.join(root,baseline)),'Preserve existing baseline; do not rerun importer');write(baseline,before);
 const updated=specs.map(([teamId,formation,xi,bench])=>{
  const old=probable.teams.find(t=>t.teamId===teamId),t=structuredClone(old),squad=squads.teams.find(t=>t.id===teamId),pool=[...old.starters,...old.bench];
  const resolve=value=>{const [id,no]=value.split('|');if(id.startsWith('?')){const sourceName=id.slice(1);pending.push({teamId,sourceName,shirtNumber:Number(no)});return {sourceName,canonicalName:null,playerId:null,registeredPlayerId:null,providerPlayerId:null,shirtNumber:Number(no),identityStatus:'unresolved-user-bench',reason:'IDENTITY_UNRESOLVED'}}
   const p=pool.find(p=>p.playerId===id),r=squad.players.find(p=>p.id===id);assert(r||p,teamId+':'+id);
   return {...p,sourceName:id==='erivaldo-almeida'?'Junior Almeida':p?.sourceName||r.name,canonicalName:p?.canonicalName||r.name,playerId:id,registeredPlayerId:r?.id||p?.registeredPlayerId,providerPlayerId:r?.providerIds?.espn||p?.providerPlayerId||null,stablePlayerId:teamId+':'+id,shirtNumber:Number(no),identityStatus:'reviewed-exact-canonical-id',reason:null};
  };
  Object.assign(t,{status:'official',formation,starters:xi.split(',').map(resolve),bench:bench.split(',').map(resolve),benchStatus:'official',lineupBasis:'user-declared-official-screenshots',unavailable:[],suspended:[],doubtful:[],lineupEvidence:{provider:'user-supplied-screenshots',consultedAt:now,evidenceDirectory:evidence},evidenceNote:'Official XI and full bench supplied by user. Unresolved bench identities preserved without invented IDs.'});
  for(const k of ['referenceFixtureId','referenceDate','previewSource'])delete t[k];
  let offset=1;t.rawLine=t.team+': '+[t.starters[0].canonicalName,...formation.split('-').map(Number).map(n=>{const row=t.starters.slice(offset,offset+n);offset+=n;return row.map(p=>p.canonicalName).join(', ')})].join('; ');
  assert.equal(offset,11);assert.equal(new Set(t.starters.map(p=>p.playerId)).size,11);assert(t.starters.every(p=>p.playerId));assert(!t.bench.some(p=>p.playerId&&t.starters.some(s=>s.playerId===p.playerId)));return t;
 });
 for(const data of [probable,official])for(const t of updated){const i=data.teams.findIndex(x=>x.teamId===t.teamId&&x.fixtureId===t.fixtureId);if(i<0)data.teams.push(t);else data.teams[i]=t;}
 for(const fixtureId of ids){const entry={fixtureId,status:'official',home:{players:updated.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:updated.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}};const i=official.fixtures.findIndex(f=>f.fixtureId===fixtureId);if(i<0)official.fixtures.push(entry);else official.fixtures[i]=entry;}
 write('data/sources/champions-probable-formations-md05-2026-27.json',probable);write('data/sources/champions-official-formations-md05-2026-27.json',official);
 const nonstarters=before.catalogMatches.flatMap(m=>m.selections.filter(l=>l.marketScope==='player'&&!updated.filter(t=>t.fixtureId===m.matchId).flatMap(t=>t.starters).some(p=>p.playerId===l.playerId)));
 const archive='data/technical-archive/official-nonstarter-markets.json',previous=read(archive);write(archive,[...new Map([...previous,...nonstarters].map(s=>[s.selectionId,s])).values()]);
 write(evidence+'/identity-review.json',{reviewedAt:now,pending,note:'All player IDs reviewed explicitly against existing canonical squads; shirt numbers follow supplied screenshots.'});
 console.log(JSON.stringify({fixtures:[...ids],starters:44,benches:updated.map(t=>({teamId:t.teamId,n:t.bench.length})),pending,archivedNonstarters:nonstarters.length}));
}
if(require.main===module)build();module.exports={specs};
