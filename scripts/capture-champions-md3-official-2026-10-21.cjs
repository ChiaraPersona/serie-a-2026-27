'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const folder='data/analysis/champions/official-2026-10-21';fs.mkdirSync(folder,{recursive:true});
const file='data/sources/champions-official-formations-md03-2026-27.json',previous=read(file);
assert(!fs.existsSync(folder+'/before.json'),'Snapshot already exists');
const paths=[file,'data/normalized/official-starter-registry.json','data/normalized/champions-league-2026-27.json','data/normalized/odds/sisal/champions-league.json','data/normalized/schedina-champions-md03.json','data/derived/champions-md03/upcoming-forecasts.json'];
fs.writeFileSync(folder+'/before.json',JSON.stringify(Object.fromEntries(paths.map(p=>[p,{data:read(p),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')} ])),null,2)+'\n');
const db=read('data/normalized/champions-md03-player-database-2026-27.json');
// Explicitly reviewed canonical IDs. A question mark preserves the supplied
// identity without assigning a different player's profile or statistics.
const rows=[
['14','bayern-munchen','4-2-3-1','manuel-neuer konrad-laimer dayot-upamecano minjae-kim josip-stanisic aleksandar-pavlovic ismael-saibari tom-bischof serge-gnabry alphonso-davies harry-kane','sven-ulreich ?Bounou sacha-boey ?Guerreiro ?Goretzka lennart-karl luis-diaz'],
['14','arsenal','4-3-3','david-raya jurrien-timber ezri-konsa gabriel riccardo-calafiori bruno-guimaraes declan-rice martin-odegaard noni-madueke bukayo-saka kai-havertz','kepa-arrizabalaga max-dowman eberechi-eze viktor-gyokeres myles-lewis-skelly mikel-merino ?Martinelli cristhian-mosquera ben-white martin-zubimendi'],
['16','real-madrid','4-2-3-1','thibaut-courtois federico-valverde antonio-rudiger dean-huijsen alvaro-carreras eduardo-camavinga bernardo-silva arda-guler jude-bellingham vinicius-junior kylian-mbappe','trent-alexander-arnold marc-cucurella endrick eder-militao ?Fran_García ibrahima-konate andriy-lunin aurelien-tchouameni'],
['16','leipzig','4-2-3-1','maarten-vandevoordt ridle-baku willi-orban castello-lukeba david-raum ezechiel-banzuzi neil-el-aynaoui brajan-gruda christopher-nkunku antonio-nusa romulo-cardoso','johan-bakayoko christoph-baumgartner ?Eteve max-finkgrafe ?Gulácsi benjamin-henrichs lukas-klostermann ?Kosta andrija-maksimovic orjan-nyland rocco-reitz'],
['18','sporting-cp','4-2-3-1','kaique-pereira ivan-fresneda eduardo-quaresma goncalo-inacio maximiliano-araujo issa-doumbia sergi-altimira geny-catamo ?Guilherme ?Sarr nestory-irankunda','?St._Juste ?Diomande zeno-debast ?Dário_Essugo ?Fatawu ?Geovany_Quenda fotis-ioannidis luis-guilherme ?Nel pedro-lima ?Gonçalo_Vagiannidis'],
['18','lask','3-5-2','lukas-jungwirth xavier-mbuyamba joao-victor-tornich andres-andrade kasper-jorgensen krystof-danek melayro-bogarde alessandro-schopf yvan-dibango sasa-kalajdzic christoph-lang','samuel-adeniran ?Bogarde_M. ?Entrup florian-flecker ?Fridrikas ?Kammeyer ?Schaub ?Schurz moses-usor ?Verhatschnig'],
['17','real-betis','4-2-3-1','alvaro-valles hector-bellerin marc-bartra natan fran-garcia pablo-fornals marc-roca antony isco abde-ezzalzouli troy-parrott','facundo-bernal cucho-hernandez ?Adrián nelson-deossa rodrigo-riquelme giovani-lo-celso diego-llorente jose-antonio-morante angel-ortiz ?Ricardo_Rodríguez aitor-ruibal'],
['17','feyenoord','4-3-3','tjark-ernst givairo-read jerry-st-juste mika-medina javi-lopez charles-vanhoutte gjivai-zechiel oussama-targhalline anis-hadj-moussa nacho-ferri luciano-valente','goncalo-borges ?Beelen ?Bijl gaoussou-diarra thijs-kraaijeveld bart-nieuwkoop ?Sliti sem-steijn tobias-van-den-elshout tsuyoshi-watanabe ?Wellenreuther'],
['15','inter','3-5-2','josep-martinez manuel-akanji alessandro-bastoni carlos-augusto andy-diouf nicolo-barella hakan-calhanoglu petar-sucic federico-dimarco ange-yoan-bonny marcus-thuram','?Sommer yann-bisseck ?De_Cuyper pio-esposito luis-henrique henrikh-mkhitaryan ?Mosconi benjamin-pavard ?Sernicola aleksandar-stankovic ?Taremi'],
['15','shakhtar-donetsk','4-1-4-1','dmytro-riznyk vinicius-tobias valeriy-bondar mykola-matviyenko pedro-henrique oleh-ocheretko alisson-santana pedrinho marlon-gomes newertton kaua-elias','?Bondarenko ?Eguinaldo gabriel-carvalho isaque dmytro-kryskiv luca-meirelles lucas-ferreira yehor-nazaryna'],
['13','club-brugge','4-2-3-1','yann-sommer kyriani-sabbe jorne-spileers brandon-mechele joaquin-seys ?Stanković hans-vanaken carlos-forbs ?Lemmert jan-virgili nicolo-tresoldi','?Diarra ?Eteki nordin-jackers tian-koren han-beom-lee ?Onyedika ?Tzolis romeo-vermant'],
['13','lens','3-4-2-1','robin-risser ruben-aguilar samson-baidoo ?Sarr matthieu-udol saud-abdulhamid ?Thomasson amadou-haidara ?Saïd florian-thauvin ?Fofana','kyllian-antonio andrija-bulatovic nidal-celik odsonne-edouard mathieu-gorgelin regis-gurtner ?Koyalipou ?Oumar florian-sotoca'],
['12','aston-villa','4-2-3-1','zion-suzuki ibrahim-mbaye victor-lindelof pau-torres tyrone-mings john-mcginn ross-barkley alysson emiliano-buendia nicolas-jackson joao-gomes','tammy-abraham marco-bizot lamare-bogarde matty-cash alejandro-garnacho leon-goretzka ?Harwood-Bellis george-hemmings boubacar-kamara ian-maatsen james-wright'],
['12','viking','4-3-3','arild-ostbo herman-haugen jesper-daland gianni-stensness henrik-heggheim kristoffer-askildsen joe-bell tobias-moi peter-christiansen erik-botheim zlatko-tripic','vetle-auklend essien-bassey lubomir-belko henrik-rorvik-bjordal amin-cosic henrik-falchener niklas-fuglestad jakob-hansen kristoffer-haugen simen-kvia-egeskog romano-postema viljar-vevatne']
];
const fixtures=[];
for(const [suffix,teamId,formation,starters,bench] of rows){
 const team=db.teams.find(t=>t.teamId===teamId);assert(team);
 const map=text=>text.split(' ').map(id=>{if(id.startsWith('?'))return {playerId:null,registeredPlayerId:null,providerPlayerId:null,canonicalName:null,sourceName:id.slice(1).replaceAll('_',' '),shirtNumber:null,identityStatus:'UNVERIFIED_IDENTITY'};
 const p=team.players.find(p=>p.playerId===id);assert(p,teamId+'/'+id);return {playerId:p.playerId,registeredPlayerId:p.registeredPlayerId,providerPlayerId:p.providerPlayerId,canonicalName:p.canonicalName,sourceName:p.canonicalName,shirtNumber:p.shirtNumber};});
 let f=fixtures.find(f=>f.fixtureId.endsWith(suffix));if(!f){f={fixtureId:'ucl-2026-27-md03-'+suffix,status:'official',source:{provider:'user-supplied-official-lineup',capturedAt:new Date().toISOString(),scope:'starting-XI-bench',transcription:'scripts/capture-champions-md3-official-2026-10-21.cjs'}};fixtures.push(f);}
 const t={teamId,team:team.team,formation,players:map(starters),bench:map(bench),unavailable:[]};assert.equal(t.players.length,11);f[f.home?'away':'home']=t;
}
const ids=new Set(fixtures.map(f=>f.fixtureId));
fs.writeFileSync(file,JSON.stringify({...previous,fixtures:[...previous.fixtures.filter(f=>!ids.has(f.fixtureId)),...fixtures].sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId))},null,2)+'\n');
console.log(JSON.stringify({fixtures:fixtures.length,starters:154,unresolvedStarters:fixtures.flatMap(f=>[...f.home.players,...f.away.players]).filter(p=>!p.playerId).length}));
