'use strict';
// Exact canonical IDs reviewed against the four user-supplied screenshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(d,null,2)+'\n')};
const evidence='data/sources/official-lineup-evidence/champions-md05-nov25-early';
const specs=[
 ['sabah','4-2-3-1','stas-pokatilov|92,tymoteusz-puchacz|27,erivaldo-almeida|33,steve-solvet|3,akim-zedadka|80,ivan-lepinjica|13,umarali-rakhmonaliev|7,christian-nwachukwu|8,du-queiroz|37,xander-severina|34,khayal-aliyev|9','rahman-dashdamirov|5,rodrigo-fernandes|88,aleksey-isaev|10,abdulakh-khaibulaev|6,orphe-mbina|99,joy-lance-mickels|20,ravan-mirzammadov|94,tellur-mutallimov|17,kaheem-parris|11,amin-ramazanov|1,rauf-rustamli|16,veljko-simic|21'],
 ['barcelona','4-3-3','joan-garcia|1,jules-kounde|23,frenkie-de-jong|21,gerard-martin|18,alejandro-balde|3,fermin-lopez|7,gavi|6,pedri|8,karim-adeyemi|14,gabriel-jesus|9,anthony-gordon|17','marc-bernal|22,jesse-bisiwu|27,alex-campos|41,joao-cancelo|2,pau-cubarsi|5,brian-farinas|4,eric-garcia|24,?Gistau O.|42,dominik-livakovic|25,dani-olmo|20,raphinha|11,wojciech-szczesny|13'],
 ['slavia-praha','4-4-2','jakub-markovic|35,ange-n-guessan|6,david-zima|4,tomas-holes|3,tomas-vlcek|27,david-jurasek|39,michal-sadilek|23,wiktor-nowak|30,mubarak-suleiman|15,emmanuel-ayaosi|20,mojmir-chytil|13','david-barcot|47,nazar-domchak|29,samuel-isife|14,pavel-kacor|32,jakub-kolisek|45,mikulas-konecny|42,matej-kotrba|53,oskar-kubiak|8,elias-pitak|43,adam-rezek|40,ivan-schranz|26'],
 ['villarreal','4-4-2','luiz-junior|1,santiago-mourino|15,logan-costa|2,renato-veiga|12,sergi-cardona|23,tajon-buchanan|17,carlos-macia|16,pape-gueye|18,alberto-moleiro|10,ayoze-perez|22,tani-oluwaseyi|21','cesar-bonafe|32,santi-comesana|14,nizar-el-jmili|27,alex-freeman|3,joselillo-gaitan|28,ruben-gomez|13,peter-gulacsi|25,georges-mikautadze|9,pau-navarro|6,nicolas-pepe|19,carlos-romero|20,?Tidiane Thiam C.|30']
];
function build(){
 const probable=read('data/sources/champions-probable-formations-md05-2026-27.json'),official=read('data/sources/champions-official-formations-md05-2026-27.json'),squads=read('data/normalized/champions-registered-squads-2026-27.json');
 const catalog=read('data/normalized/schedina-champions-md05.json'),now=new Date().toISOString(),pending=[];
 const ids=new Set(specs.map(s=>probable.teams.find(t=>t.teamId===s[0]).fixtureId));
 const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const before={createdAt:now,fixtures:[...ids],catalogMatches:catalog.marketCatalog.matches.filter(m=>ids.has(m.matchId)),unaffectedCatalogHashes:Object.fromEntries(catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)).map(m=>[m.matchId,sha(m)])),unaffectedScenarios:Object.fromEntries(read('data/generated/champions-shared-scenarios.json').fixtures.filter(f=>!ids.has(f.fixtureId)).map(f=>[f.fixtureId,sha(f)]))};
 const baseline='output/champions-md05/nov25-early/before.json';assert(!fs.existsSync(path.join(root,baseline)),'Preserve existing baseline; do not rerun importer');write(baseline,before);
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
 write(evidence+'/identity-review.json',{reviewedAt:now,pending,starterAlias:{sourceName:'Junior Almeida',playerId:'erivaldo-almeida',uefaPlayerId:'250221486',shirtNumber:33,internalEvidence:'data/sources/champions-official-formations-md03-2026-27.json',verificationUrls:['https://sabahfc.az/teams','https://www.uefa.com/nationalassociations/teams/2609356--sabah-fc/squad/']}});
 console.log(JSON.stringify({fixtures:[...ids],starters:44,benches:updated.map(t=>({teamId:t.teamId,n:t.bench.length})),pending,archivedNonstarters:nonstarters.length}));
}
if(require.main===module)build();module.exports={specs};
