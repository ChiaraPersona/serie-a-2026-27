'use strict';
// Explicitly reviewed IDs and tactical order from the user's official screenshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');};
const specs=[
['manchester-united','4-2-3-1','senne-lammens,diogo-dalot,harry-maguire,ayden-heaven,leny-yoro,carlos-baleba,kobbie-mainoo,amad-diallo,bruno-fernandes,matheus-cunha,bryan-mbeumo','harry-amass,andrey-santos,karl-darlow,matthijs-de-ligt,tyler-fletcher,tom-heaton,shea-lacey,lisandro-martinez,noussair-mazraoui,mason-mount,youri-tielemans,joshua-zirkzee'],
['roma','3-4-2-1','devis-vasquez,gianluca-mancini,mario-hermoso,leonardo-balerdi,devyne-rensch,bryan-cristante,marten-de-roon,wesley-franca,matias-soule,rodrigo-mora,donyell-malen','santiago-castro,giorgio-de-marzi,alessandro-di-nunzio,daniele-ghilardi,konstantinos-koulierakis,emanuele-lulli,nahuel-molina,evan-n-dicka,niccolo-pisilli'],
['feyenoord','4-3-3','tjark-ernst,givairo-read,thijs-kraaijeveld,mika-medina,javi-lopez,gjivai-zechiel,charles-vanhoutte,oussama-targhalline,anis-hadj-moussa,nacho-ferri,luciano-valente','goncalo-borges,liam-bossin,mats-deijl,gaoussou-diarra,florian-kastenmeier,reiss-nelson,jerayno-schaken,dani-slory,sem-steijn,tobias-van-den-elshout,shaqueel-van-persie,tsuyoshi-watanabe'],
['inter','3-5-2','josep-martinez,yann-bisseck,manuel-akanji,carlos-augusto,djed-spence,nicolo-barella,hakan-calhanoglu,piotr-zielinski,federico-dimarco,pio-esposito,marcus-thuram','ange-yoan-bonny,leonardo-bovio,raffaele-di-gennaro,andy-diouf,?Lavelli M.|53,henrikh-mkhitaryan,mattia-mosconi,benjamin-pavard,ivan-provedel,aleksandar-stankovic,francesco-stante,petar-sucic'],
['atletico-de-madrid','4-4-2','jan-oblak,marc-pubill,robin-le-normand,david-hancko,alejandro-grimaldo,giuliano-simeone,marcos-llorente,pablo-barrios,alex-baena,julian-alvarez,alexander-s-rloth','jorge-castillo,jonathan-david,?Dominguez J.|27,romeo-hueso,koke,kang-in-lee,ademola-lookman,dani-martinez,rodrigo-mendoza,juan-musso,arnau-ortiz,obed-vargas'],
['bayern-munchen','4-2-3-1','manuel-neuer,konrad-laimer,dayot-upamecano,jonathan-tah,josip-stanisic,joshua-kimmich,tom-bischof,lennart-karl,michael-olise,alphonso-davies,harry-kane','tim-binder,sacha-boey,nathaniel-brown,david-daiber,hiroki-ito,minjae-kim,aleksandar-pavlovic,sven-ulreich,jonas-urbig'],
['barcelona','4-2-3-1','joan-garcia,brian-farinas,pau-cubarsi,gerard-martin,joao-cancelo,rodri,pedri,lamine-yamal,fermin-lopez,anthony-gordon,raphinha','hamza-abdelkarim,karim-adeyemi,alejandro-balde,marc-bernal,alex-campos,frenkie-de-jong,gabriel-jesus,gavi,orian-goren,dominik-livakovic,wojciech-szczesny,guillem-victor'],
['aston-villa','4-2-3-1','zion-suzuki,matty-cash,victor-lindelof,pau-torres,ian-maatsen,boubacar-kamara,joao-gomes,john-mcginn,johan-manzambi,emiliano-buendia,nicolas-jackson','tammy-abraham,alysson,ross-barkley,marco-bizot,alejandro-garnacho,leon-goretzka,taylor-harwood-bellis,george-hemmings,ibrahim-mbaye,tyrone-mings,james-wright'],
['lask','3-5-2','lukas-jungwirth,xavier-mbuyamba,joao-victor-tornich,andres-andrade,kasper-j-rgensen,sascha-horvath,melayro-bogarde,robert-ljubicic,yvan-dibango,moses-usor,samuel-adeniran','krystof-danek,daniel-elfadli,florian-flecker,miguel-freckleton,sasa-kalajdzic,nael-kane,christoph-lang,fabian-schillinger,alessandro-schopf,tobias-schutzenauer,manoel-verhaeghe'],
['slovan-bratislava','4-3-3','aleksandar-popovic,sahmkou-camara,svetozar-markovic,kevin-wimmer,samuel-kozlovsky,cesar-blackman,cristian-martinez,alen-mustafic,alexej-maros,andraz-sporar,suleiman-camara','kenan-bajric,tigran-barseghyan,sandro-cruz,artur-gajdos,leo-hofstadter,rahim-ibrahim,matus-macik,nino-marcelli,daiki-matsuoka,peter-pokorny,dominik-takac,robert-tomanek'],
['villarreal','4-4-2','peter-gulacsi,alex-freeman,santiago-mourino,renato-veiga,carlos-romero,santi-comesana,carlos-macia,pape-gueye,tajon-buchanan,nicolas-pepe,ayoze-perez','sergi-cardona,logan-costa,nizar-el-jmili,joselillo-gaitan,ruben-gomez,luiz-junior,georges-mikautadze,alberto-moleiro,pau-navarro,tani-oluwaseyi'],
['paris-saint-germain','4-3-3','matvei-safonov,achraf-hakimi,illia-zabarnyi,willian-pacho,lucas-hernandez,joao-neves,vitinha,fabian-ruiz,maghnes-akliouche,senny-mayulu,desire-doue','?Bar A.|90,lucas-beraldo,david-boly,lucas-chevalier,lucas-digne,dro-fernandez,mika-godts,quentin-ndjantou,ferran-torres,warren-zaire-emery']
 ,['bodo-glimt','4-3-3','nikita-haikin,fredrik-sj-vold,odin-bj-rtuft,haitam-aleesami,fredrik-bj-rkan,sondre-auklend,patrick-berg,sondre-brunstad-fet,ole-didrik-blomberg,andreas-helmersen,jens-petter-hauge','ola-brynhildsen,jostein-gundersen,joshua-kitolano,julian-faye-lund,isak-maatta,joel-mvuka,villads-nielsen,magnus-riisn-s,ulrik-saltnes']
 ,['lille','4-2-3-1','berke-ozer,nathan-ngoy,tanguy-nianzou,isaac-cossier,calvin-verdonk,benjamin-andre,maurits-kj-rgaard,dilane-bakwa,ngal-ayel-mukau,soriba-diaoune,hakon-haraldsson','alexsandro,orlando-gill,olivier-giroud,maxima-goffi,zadig-lanssade,gaetan-perrin,osame-sahraoui,loun-srdanovic,?Traore Y.|43']
];
const evidence='data/sources/official-lineup-evidence/champions-md04-six-evening';
function build(){
 const probable=read('data/sources/champions-probable-formations-md04-2026-27.json'),file='data/sources/champions-official-formations-md04-2026-27.json',official=read(file);
 const teams=specs.map(([id,formation,xi,bench])=>{
  const t=probable.teams.find(t=>t.teamId===id);assert(t,id);
  const pool=['starters','bench','unavailable','suspended','doubtful'].flatMap(k=>t[k]||[]);
  const resolve=id=>{if(id.startsWith('?')){const [name,number]=id.slice(1).split('|');return {sourceName:name,canonicalName:name,shirtNumber:Number(number),playerId:null,registeredPlayerId:null,providerPlayerId:null,identityStatus:'unresolved-user-name-number'};}
   const p=pool.find(p=>p.playerId===id);assert(p,id);return {...p,reason:null};};
  const starters=xi.split(',').map(resolve),reserves=bench.split(',').map(resolve);assert.equal(starters.length,11);assert.equal(new Set(starters.map(p=>p.playerId)).size,11);
  assert(!reserves.some(p=>p.playerId&&starters.some(s=>s.playerId===p.playerId)));
  if(id==='lask'){const p=starters.find(p=>p.playerId==='kasper-j-rgensen');p.sourceName='Molgaard';p.shirtNumber=20;p.identityEvidence={url:'https://www.lask.at/de/m/teams/pros',note:'Kasper Jörgensen #20; full name Kasper Poul Molgaard Jorgensen',fullNameUrl:'https://www.soccerway.com/player/jorgensen-kasper/dfifJRsr/'};}
  let offset=1;const rows=[starters[0].canonicalName,...formation.split('-').map(n=>{const row=starters.slice(offset,offset+Number(n));offset+=Number(n);return row.map(p=>p.canonicalName).join(', ');})];
  const mentioned=new Set([...starters,...reserves].map(p=>p.playerId).filter(Boolean));
  return {...t,status:'official',formation,rawLine:t.team+': '+rows.join('; '),starters,bench:reserves,unavailable:t.unavailable.filter(p=>!mentioned.has(p.playerId)),suspended:t.suspended.filter(p=>!mentioned.has(p.playerId)),doubtful:[],benchStatus:'official',evidenceDirectory:evidence};
 });
 const ids=new Set(teams.map(t=>t.fixtureId));assert.equal(ids.size,7);
 const outDir='output/official-md04-six-evening';
 if(!fs.existsSync(path.join(root,outDir,'before.json')))write(outDir+'/before.json',{catalog:read('data/normalized/schedina-champions-md04.json'),individuals:read('data/normalized/champions-md04-probable-individuals-2026-27.json'),shared:read('data/generated/champions-shared-scenarios.json'),official});
 const all=[...official.teams.filter(t=>!ids.has(t.fixtureId)),...teams];
 const fixtures=[...official.fixtures.filter(f=>!ids.has(f.fixtureId)),...[...ids].map(fixtureId=>({fixtureId,status:'official',home:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}}))];
 if(process.argv.includes('--write'))write(file,{...official,source:{...official.source,consultedAt:new Date().toISOString(),evidenceDirectories:[...new Set([...(official.source.evidenceDirectories||[official.source.evidenceDirectory]),evidence])]},teams:all,fixtures});
 console.log(JSON.stringify({fixtures:[...ids],teams:teams.length,starters:teams.length*11,unresolvedBench:teams.flatMap(t=>t.bench.filter(p=>!p.playerId).map(p=>({team:t.team,...p})))},null,2));
}
if(require.main===module)build();
module.exports={specs,build};
