'use strict';
// Exact canonical IDs reviewed against the four user-supplied screenshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(d,null,2)+'\n')};
const evidence='data/sources/official-lineup-evidence/champions-md05-nov25-evening-rest';
const specs=[
  [
    "inter",
    "3-5-2",
    "josep-martinez|1,alessandro-bastoni|95,manuel-akanji|25,yann-bisseck|31,carlos-augusto|30,henrikh-mkhitaryan|22,petar-sucic|8,nicolo-barella|23,djed-spence|99,marcus-thuram|9,pio-esposito|94",
    "?Bovo L.|44,raffaele-di-gennaro|12,federico-dimarco|32,andy-diouf|17,curtis-jones|21,?Lavelli M.|53,luis-henrique|11,lautaro-martinez|10,benjamin-pavard|28,ivan-provedel|49,aleksandar-stankovic|5,john-stones|6"
  ],
  [
    "stuttgart",
    "3-4-3",
    "dennis-seimen|41,finn-jeltsch|29,jeff-chabot|24,ramon-hendriks|3,josha-vagnoman|4,nikolas-nartey|28,yanik-spalt|47,maximilian-mittelstadt|7,bilal-el-khannouss|11,ermedin-demirovic|9,chris-fuhrich|10",
    "ameen-al-dakhil|2,lorenz-assignon|22,fabian-bredlow|1,luca-jaquez|14,atakan-karazor|16,jamie-leweling|18,dzenan-pejcinovic|17,grischa-promel|21,leo-sauer|44,angelo-stiller|6,tiago-tomas|8,deniz-undav|26"
  ],
  [
    "shakhtar-donetsk",
    "4-1-4-1",
    "dmytro-riznyk|31,pedro-henrique|13,mykola-matviyenko|22,valeriy-bondar|5,vinicius-tobias|17,yehor-nazaryna|29,newertton|11,marlon-gomes|6,oleh-ocheretko|27,alisson-santana|30,lassina-traore|2",
    "irakli-azarov|16,bruninho|99,kiril-fesiun|23,gabriel-carvalho|25,alaa-ghram|18,isaque|14,oleksandr-karavaiev|20,dmytro-kryskiv|8,luca-meirelles|49,marlon-santos|4,?Obah P.|68,viktor-tsukanov|24"
  ],
  [
    "fenerbahce",
    "4-2-3-1",
    "ederson|31,nelson-semedo|27,milan-skriniar|37,kojo-peprah-oppong|21,archie-brown|3,ismail-yuksek|5,n-golo-kante|91,oguz-ayd-n|70,mason-greenwood|11,kerem-akturkoglu|7,vedat-muriqi|19",
    "tar-k-cetin|13,yigit-efe-demir|14,bartug-elmaz|28,matteo-guendouzi|6,mert-gunok|34,irfan-can-kahveci|17,romelu-lukaku|9,levent-mercan|22,ognjen-mimovic|77,mert-muldur|18,dorgeles-nene|45"
  ],
  [
    "lille",
    "4-3-3",
    "berke-ozer|1,calvin-verdonk|24,alexsandro|4,nathan-ngoy|3,maxima-goffi|38,benjamin-andre|21,nabil-bentaleb|6,ngal-ayel-mukau|17,hakon-haraldsson|10,ayase-ueda|18,ethan-mbappe|8",
    "dilane-bakwa|7,isaac-cossier|26,soriba-diaoune|35,orlando-gill|12,olivier-giroud|9,maurits-kj-rgaard|14,basar-onal|19,romain-perraud|15,gaetan-perrin|28,osame-sahraoui|11,thomas-sajous|50,loun-srdanovic|2"
  ],
  [
    "bayern-munchen",
    "4-2-3-1",
    "jonas-urbig|40,josip-stanisic|44,dayot-upamecano|2,minjae-kim|3,hiroki-ito|21,joshua-kimmich|6,aleksandar-pavlovic|45,konrad-laimer|27,tom-bischof|8,nathaniel-brown|11,lennart-karl|42",
    "tim-binder|46,sacha-boey|23,?Codjo-Evora N.|36,luis-diaz|14,jamal-musiala|10,david-poder-stiube|38,bara-sapoko-ndiaye|39,jonathan-tah|4,sven-ulreich|26"
  ],
  [
    "paris-saint-germain",
    "4-3-3",
    "matvei-safonov|39,nuno-mendes|25,willian-pacho|51,illia-zabarnyi|6,achraf-hakimi|2,fabian-ruiz|8,vitinha|17,joao-neves|87,senny-mayulu|24,ferran-torres|9,maghnes-akliouche|11",
    "?Bar A.|90,lucas-beraldo|4,david-boly|42,lucas-chevalier|30,ousmane-dembele|10,lucas-digne|12,dro-fernandez|27,mika-godts|22,lucas-hernandez|21,marquinhos|5,quentin-ndjantou|47,warren-zaire-emery|33"
  ],
  [
    "roma",
    "3-4-2-1",
    "mile-svilar|99,gianluca-mancini|23,evan-n-dicka|5,mario-hermoso|22,wesley-franca|43,marten-de-roon|15,manu-kone|17,nahuel-molina|20,niccolo-pisilli|61,matias-soule|18,santiago-castro|9",
    "leonardo-balerdi|26,bryan-cristante|4,giorgio-de-marzi|70,paulo-dybala|21,daniele-ghilardi|87,pierluigi-gollini|95,konstantinos-koulierakis|3,emanuele-lulli|77,donyell-malen|14,rodrigo-mora|86"
  ],
  [
    "sporting-cp",
    "4-3-3",
    "kaique-pereira|30,maximiliano-araujo|20,goncalo-inacio|25,eduardo-quaresma|72,ivan-fresneda|22,issa-doumbia|77,sergi-altimira|5,silas-andersen|4,luis-guilherme|31,luis-suarez|97,geny-catamo|10",
    "ibrahima-ba|55,jesse-derry|28,diego-callai|41,eduardo-felicissimo|73,flavio-goncalves|58,fotis-ioannidis|7,nestory-irankunda|19,pedro-lima|21,rui-silva|1,joao-simoes|8,giorgos-vagiannidis|13,rodrigo-zalazar|17"
  ],
  [
    "manchester-united",
    "3-4-2-1",
    "senne-lammens|1,leny-yoro|15,harry-maguire|5,lisandro-martinez|6,amad-diallo|16,kobbie-mainoo|37,youri-tielemans|18,noussair-mazraoui|3,bryan-mbeumo|19,bruno-fernandes|8,joshua-zirkzee|11",
    "harry-amass|41,andrey-santos|17,diogo-dalot|2,karl-darlow|12,matthijs-de-ligt|4,patrick-dorgu|13,tom-heaton|22,ayden-heaven|26,shea-lacey|31,mason-mount|7,luke-shaw|23"
  ]
];
function build(){
 const probable=read('data/sources/champions-probable-formations-md05-2026-27.json'),official=read('data/sources/champions-official-formations-md05-2026-27.json'),squads=read('data/normalized/champions-registered-squads-2026-27.json');
 const current=read('data/normalized/champions-player-stats-2026-27.json');
 const roma=squads.teams.find(t=>t.id==='roma'),svilar=current.teams.find(t=>t.id==='roma').players.find(p=>p.id==='mile-svilar');
 assert(svilar&&svilar.providerPlayerId==='238798');
 if(!roma.players.some(p=>p.id==='mile-svilar')){roma.players.push({id:svilar.id,name:svilar.name,position:'goalkeeper',uefaPlayerId:null,registered:null,providerIds:{espn:svilar.providerPlayerId},shirtNumber:99,identitySource:'data/normalized/champions-player-stats-2026-27.json#roma:mile-svilar',officialLineup:{status:'official',fixtureId:'ucl-2026-27-md05-17',updatedAt:new Date().toISOString(),source:'user-supplied-screenshots'},historicalDataQuality:'unavailable'});write('data/normalized/champions-registered-squads-2026-27.json',squads);}
 const catalog=read('data/normalized/schedina-champions-md05.json'),now=new Date().toISOString(),pending=[];
 const ids=new Set(specs.map(s=>probable.teams.find(t=>t.teamId===s[0]).fixtureId));
 const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const before={createdAt:now,fixtures:[...ids],catalogMatches:catalog.marketCatalog.matches.filter(m=>ids.has(m.matchId)),unaffectedCatalogHashes:Object.fromEntries(catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)).map(m=>[m.matchId,sha(m)])),unaffectedScenarios:Object.fromEntries(read('data/generated/champions-shared-scenarios.json').fixtures.filter(f=>!ids.has(f.fixtureId)).map(f=>[f.fixtureId,sha(f)]))};
 const baseline='output/champions-md05/nov25-evening-rest/before.json';assert(!fs.existsSync(path.join(root,baseline)),'Preserve existing baseline; do not rerun importer');write(baseline,before);
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
 console.log(JSON.stringify({fixtures:[...ids],starters:updated.length*11,benches:updated.map(t=>({teamId:t.teamId,n:t.bench.length})),pending,archivedNonstarters:nonstarters.length}));
}
if(require.main===module)build();module.exports={specs};
