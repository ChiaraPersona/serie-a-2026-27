'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const specs=[
['arsenal','4-2-3-1','kepa-arrizabalaga,ben-white,ezri-konsa,gabriel,piero-hincapie,declan-rice,myles-lewis-skelly,noni-madueke,martin-degaard,christos-tzolis,viktor-gyokeres','riccardo-calafiori,max-dowman,eberechi-eze,bruno-guimaraes,kai-havertz,mikel-merino,illan-meslier,cristhian-mosquera,jack-porter,william-saliba,jurrien-timber'],
['borussia-dortmund','3-4-2-1','gregor-kobel,waldemar-anton,nico-schlotterbeck,kouakou-gadou,julian-ryerson,felix-nmecha,joey-veerman,daniel-svensson,jobe-bellingham,maximilian-beier,fabio-silva','mathis-albert,ramy-bensebaini,carney-chukwuemeka,?dos Santos E.|44,patrick-drewes,serhou-guirassy,konstantinos-karetsas,filippo-mane,alexander-meyer,ethan-nwaneri,luca-reggiani,marcel-sabitzer'],
['como','4-2-3-1','robert-sanchez,yan-couto,jacobo-ramon,trevoh-chalobah,alex-valle,luis-milla,maximo-perrone,lucas-da-cunha,nico-paz,martin-baturina,tasos-douvikas','jean-butez,alberto-dossena,lorenzo-luigi-ginelli,kaiki-bruno,marc-oliver-kempf,mattia-liberali,?Mazzara C.|57,?Papaccioli M.|54,samuele-ricci,ivan-smolcic'],
['aek-athens','4-4-2','thomas-strakosha,lazaros-rota,harold-moukoudi,filipe-relvas,stavros-pilios,lovro-majer,milan-vitalis,razvan-marin,mijat-gacinovic,dereck-kutesa,luka-jovic','marios-balamotis,alberto-brignoli,joao-mario,kaan-kairinen,charalampos-lykogiannis,petros-mantalos,barnabas-varga,domagoj-vida,zini'],
['feyenoord','4-3-3','florian-kastenmeier,givairo-read,thijs-kraaijeveld,mika-medina,javi-lopez,gjivai-zechiel,charles-vanhoutte,oussama-targhalline,anis-hadj-moussa,shaqueel-van-persie,luciano-valente','goncalo-borges,liam-bossin,mats-deijl,gaoussou-diarra,tjark-ernst,nacho-ferri,reiss-nelson,jerayno-schaken,gijs-smal,sem-steijn,tobias-van-den-elshout,tsuyoshi-watanabe'],
['porto','4-3-3','diogo-costa,alberto-costa,jan-bednarek,jakub-kiwior,zaidu-sanusi,gabriel-veiga,pablo-rosario,victor-froholdt,pepe,santiago-gimenez,oskar-pietuszewski','andre-silva,claudio-ramos,martim-fernandes,seko-fofana,inbeom-hwang,francisco-moura,nehuen-perez,borja-sainz,samu,souza,alan-varela,william-gomes']
];
// Kutesa is reconciled separately against exact UEFA identity 250065405.

specs.push(
['manchester-city','4-2-3-1','gianluigi-donnarumma,matheus-nunes,josko-gvardiol,marc-guehi,nico-o-reilly,elliot-anderson,ayyoub-bouaddi,allan-elias,rayan-cherki,enzo-fernandez,erling-haaland','rayan-ait-nouri,ruben-dias,jeremy-doku,phil-foden,abdukodir-khusanov,mateo-kovacic,rico-lewis,ryan-mcaidoo,iliman-ndiaye,geronimo-rulli,floyd-samba,vitor-reis'],
['napoli','3-5-1-1','vanja-milinkovic-savic,sam-beukema,amir-rrahmani,mathias-olivera,matteo-politano,kevin-de-bruyne,billy-gilmour,scott-mctominay,leonardo-spinazzola,noa-lang,rasmus-h-jlund','frank-anguissa,?Chiummiello A.|38,nikita-contini,david-neres,giovane,lorenzo-lucca,?Spinelli D.|41'],
['leipzig','4-3-3','maarten-vandevoordt,ridle-baku,willi-orban,maxime-esteve,david-raum,rocco-reitz,neil-el-aynaoui,christoph-baumgartner,brajan-gruda,tidiam-gomis,antonio-nusa','johan-bakayoko,ezechiel-banzuzi,max-finkgrafe,benjamin-henrichs,lukas-klostermann,?Langsteiner T.|31,andrija-maksimovic,christopher-nkunku,rjan-nyland,romulo-cardoso,nicolas-seiwald'],
['lens','3-4-3','robin-risser,ismaelo-ganiou,samson-baidoo,jean-clair-todibo,saud-abdulhamid,amadou-haidara,yacine-titraoui,matthieu-udol,florian-sotoca,abdallah-sima,florian-thauvin','kyllian-antonio,andrija-bulatovic,mathieu-gorgelin,jonathan-gradit,regis-gurtner,thorgan-hazard,franjo-ivanovic,leopold-joursky,junior-kadile,mezian-mesloub-soares,souleymane-sagnan,micha-skoras'],
['real-madrid','4-3-3','thibaut-courtois,federico-valverde,eder-militao,antonio-rudiger,marc-cucurella,bernardo-silva,aurelien-tchouameni,arda-guler,yan-diomande,kylian-mbappe,vinicius-junior','trent-alexander-arnold,jude-bellingham,eduardo-camavinga,alvaro-carreras,brahim-diaz,denzel-dumfries,carlos-espi,dean-huijsen,ibrahima-konate,andriy-lunin,sergio-mestre,thiago-pitarch'],
['psv-eindhoven','4-2-3-1','matej-kovar,sergino-dest,lutsharel-geertruida,armando-obispo,filip-kostic,paul-wanner,kodai-sano,ivan-perisic,sven-mijnans,ruben-van-bommel,guus-til','esmir-bajraktarevic,noah-fernandez,ryan-flamingo,yarek-gasiorowski,sam-lammers,dennis-man,nick-olij,ricardo-pepi,ayoni-santos,kiliann-sildillia,tijn-smolenaars'],
['slovan-bratislava','4-3-3','dominik-takac,cesar-blackman,kenan-bajric,svetozar-markovic,sandro-cruz,daiki-matsuoka,peter-pokorny,rahim-ibrahim,tigran-barseghyan,andraz-sporar,nino-marcelli','sahmkou-camara,roman-cerepkai,daniel-gramblicka,?Griger A.|30,leo-hofstadter,samuel-kozlovsky,?Marko M.|23,alexej-maros,cristian-martinez,aleksandar-popovic,robert-tomanek,alasana-yirajang'],
['real-betis','4-2-3-1','alvaro-valles,angel-ortiz,diego-llorente,valentin-gomez,fran-garcia,facundo-bernal,nelson-deossa,antony,isco,abde-ezzalzouli,cucho-hernandez','marc-bartra,hector-bellerin,diego-conde,alvaro-fidalgo,junior-firpo,pablo-fornals,manu-gonzalez,natan,troy-parrott,rodrigo-riquelme,marc-roca,aitor-ruibal']
);
function build(){
 const probable=read('data/sources/champions-probable-formations-md05-2026-27.json'),official=read('data/sources/champions-official-formations-md05-2026-27.json'),registered=read('data/normalized/champions-registered-squads-2026-27.json');
 const now=new Date().toISOString(),ids=new Set(),pending=[];
 const arg=process.argv.indexOf('--teams'),scope=arg<0?null:new Set(process.argv[arg+1].split(','));
 const updated=specs.filter(s=>!scope||scope.has(s[0])).map(([teamId,formation,xi,bench])=>{
  const t=structuredClone(probable.teams.find(t=>t.teamId===teamId)),squad=registered.teams.find(t=>t.id===teamId);assert(t&&squad,teamId);ids.add(t.fixtureId);
  const pool=[...t.starters,...t.bench];
  const resolve=id=>{
   if(id.startsWith('?')){const [name,number]=id.slice(1).split('|');pending.push({teamId,sourceName:name,shirtNumber:Number(number)});return {sourceName:name,canonicalName:null,playerId:null,registeredPlayerId:null,providerPlayerId:null,shirtNumber:Number(number),identityStatus:'unresolved-user-bench',reason:'IDENTITY_UNRESOLVED'};}
   const p=pool.find(p=>p.playerId===id),r=squad.players.find(p=>p.id===id);assert(r||p,teamId+':'+id);
   return {...p,sourceName:p?.sourceName||r.name,canonicalName:p?.canonicalName||r.name,playerId:id,registeredPlayerId:r?.id||p.registeredPlayerId,providerPlayerId:r?.providerIds?.espn||p?.providerPlayerId||null,stablePlayerId:teamId+':'+id,shirtNumber:r?.shirtNumber||p?.shirtNumber,identityStatus:'reviewed-exact-canonical-id',reason:null};
  };
  Object.assign(t,{status:'official',formation,starters:xi.split(',').map(resolve),bench:bench.split(',').map(resolve),benchStatus:'official',lineupBasis:'user-declared-official-screenshots',unavailable:[],suspended:[],doubtful:[],lineupEvidence:{provider:'user-supplied-screenshots',consultedAt:now,evidenceDirectory:'data/sources/official-lineup-evidence/champions-md05-evening'},evidenceNote:'Official XI and full bench supplied by user. Unresolved identities retained without inferred IDs.'});
  if(teamId==='napoli')t.starters[0].shirtNumber=2;
  for(const k of ['referenceFixtureId','referenceDate','previewSource'])delete t[k];
  let offset=1;t.rawLine=t.team+': '+[t.starters[0].canonicalName,...formation.split('-').map(Number).map(n=>{const row=t.starters.slice(offset,offset+n);offset+=n;return row.map(p=>p.canonicalName).join(', ');})].join('; ');assert.equal(offset,11);assert.equal(new Set(t.starters.map(p=>p.playerId)).size,11);
  return t;
 });
 for(const d of [probable,official]){
  for(const t of updated){const i=d.teams.findIndex(x=>x.teamId===t.teamId&&x.fixtureId===t.fixtureId);if(i<0)d.teams.push(t);else d.teams[i]=t;}
  if(d===official)for(const fixtureId of ids){const f={fixtureId,status:'official',home:{players:updated.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:updated.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}};const i=d.fixtures.findIndex(x=>x.fixtureId===fixtureId);if(i<0)d.fixtures.push(f);else d.fixtures[i]=f;}
 }
 fs.writeFileSync('data/sources/champions-probable-formations-md05-2026-27.json',JSON.stringify(probable,null,2)+'\n');fs.writeFileSync('data/sources/champions-official-formations-md05-2026-27.json',JSON.stringify(official,null,2)+'\n');console.log(JSON.stringify({fixtures:[...ids],pending}));
}
if(require.main===module)build();module.exports={build,specs};
