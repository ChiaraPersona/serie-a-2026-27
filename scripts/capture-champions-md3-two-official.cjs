'use strict';
// Transcription of the two user-specified Diretta match pages. Shirt number,
// team and canonical player ID must agree with the existing MD3 database.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),database=require('../data/normalized/champions-md03-player-database-2026-27.json');
const output=path.join(root,'data/sources/champions-official-formations-md03-2026-27.json');
if(fs.existsSync(output)){
 const previous=JSON.parse(fs.readFileSync(output,'utf8'));
 assert.deepEqual(previous.fixtures.map(f=>f.fixtureId),['ucl-2026-27-md03-01','ucl-2026-27-md03-02']);
}
function team(teamId,formation,starters,bench,unavailable=[]){
 const db=database.teams.find(t=>t.teamId===teamId);assert(db,teamId);
 const map=entries=>entries.map(([shirtNumber,playerId,sourceName])=>{
  const hits=db.players.filter(p=>p.shirtNumber===shirtNumber&&p.playerId===playerId);
  assert.equal(hits.length,1,`${teamId}/${shirtNumber}/${playerId}`);
  const p=hits[0];assert(p.registeredPlayerId,`${teamId}/${playerId} canonical identity incomplete`);
  return {playerId:p.playerId,registeredPlayerId:p.registeredPlayerId,providerPlayerId:p.providerPlayerId,canonicalName:p.canonicalName,sourceName,shirtNumber:p.shirtNumber};
 });
 const players=map(starters),reserves=map(bench);
 assert.equal(players.length,11);assert.equal(new Set([...players,...reserves].map(p=>p.playerId)).size,players.length+reserves.length);
 return {teamId,team:db.team,formation,players,bench:reserves,unavailable:unavailable.map(row=>({playerId:row[0],sourceName:row[1],reason:row[2]}))};
}
const fixtures=[
 {fixtureId:'ucl-2026-27-md03-01',status:'official',source:{provider:'Diretta.it',url:'https://www.diretta.it/partita/calcio/fenerbahce-MsbmracL/slavia-praga-viXGgnyB/riassunto/formazioni/?mid=2yMLTDQr',corroboration:'https://www.corrieredellosport.it/live/partita/fenerbahce-s-praga-2685407',capturedAt:new Date().toISOString(),scope:'starting-XI-bench-unavailable'},
  home:team('fenerbahce','4-2-3-1',[[31,'ederson','Ederson'],[27,'nelson-semedo','Semedo'],[37,'milan-skriniar','Skriniar'],[15,'nathan-ake','Ake'],[3,'archie-brown','Brown'],[91,'n-golo-kante','Kante'],[6,'matteo-guendouzi','Guendouzi'],[70,'oguz-aydin','Aydin'],[11,'mason-greenwood','Greenwood'],[7,'kerem-akturkoglu','Akturkoglu'],[19,'vedat-muriqi','Muriqi']],[[13,'tarik-cetin','Cetin'],[14,'yigit-efe-demir','Demir'],[28,'bartug-elmaz','Elmaz'],[34,'mert-gunok','Gunok'],[17,'irfan-can-kahveci','Kahveci'],[9,'romelu-lukaku','Lukaku'],[22,'levent-mercan','Mercan'],[77,'ognjen-mimovic','Mimovic'],[45,'dorgeles-nene','Nene'],[21,'kojo-peprah-oppong','Peprah'],[5,'ismail-yuksek','Yuksek']],[['marco-asensio','Asensio','Infortunio al ginocchio'],['mert-muldur','Muldur','Infortunio al ginocchio'],['jayden-oosterwolde','Oosterwolde','Infortunio al tendine d’Achille']]),
  away:team('slavia-praha','3-4-2-1',[[35,'jakub-markovic','Markovic'],[27,'tomas-vlcek','Vlcek'],[4,'david-zima','Zima'],[6,'ange-n-guessan',"N'Guessan"],[15,'mubarak-suleiman','Suleiman'],[16,'david-moses','Moses'],[30,'wiktor-nowak','Nowak'],[8,'oskar-kubiak','Kubiak'],[20,'emmanuel-ayaosi','Ayaosi'],[17,'lukas-provod','Provod'],[10,'danijel-sturm','Sturm']],[[47,'david-barcot','Barcot'],[13,'mojmir-chytil','Chytil'],[22,'toumani-diakite','Diakite'],[29,'nazar-domchak','Domchak'],[3,'tomas-holes','Holes'],[14,'samuel-isife','Isife'],[32,'pavel-kacor','Kacor'],[42,'mikulas-konecny','Konecny'],[53,'matej-kotrba','Kotrba'],[60,'petr-potmesil','Potmesil'],[40,'adam-rezek','Rezek'],[23,'michal-sadilek','Sadilek']],[['stepan-chaloupek','Chaloupek','Infortunio muscolare'],['tomas-chory','Chory','Scelta tecnica'],['david-jurasek','Jurasek','Infortunio alla coscia'],['adonija-ouanda','Ouanda','Infortunato'],['elias-pitak','Pitak','Problemi di salute'],['ivan-schranz','Schranz','Problemi di salute']])},
 {fixtureId:'ucl-2026-27-md03-02',status:'official',source:{provider:'Diretta.it',url:'https://www.diretta.it/partita/calcio/dortmund-nP1i5US1/sabah-baku-fNGcxbyr/riassunto/formazioni/?mid=b9lv0Tme',corroboration:'https://www.footmercato.net/a6433175066810643851-sabah-fk-borussia-dortmund-les-compositions-officielles',capturedAt:new Date().toISOString(),scope:'starting-XI-bench-unavailable'},
  home:team('sabah','4-2-3-1',[[92,'stas-pokatilov','Pokatilov'],[80,'akim-zedadka','Zedadka'],[3,'steve-solvet','Solvet'],[4,'aden-mccarthy','McCarthy'],[27,'tymoteusz-puchacz','Puchacz'],[7,'umarali-rakhmonaliev','Rakhmonaliyev'],[13,'ivan-lepinjica','Lepinjica'],[11,'kaheem-parris','Parris'],[37,'du-queiroz','Du Queiroz'],[21,'veljko-simic','Simic'],[20,'joy-lance-mickels','Mickels']],[[9,'khayal-aliyev','Aliyev'],[5,'rahman-dashdamirov','Dashdamirov'],[88,'rodrigo-fernandes','Fernandes'],[10,'aleksey-isaev','Isayev'],[33,'erivaldo-almeida','Junior Almeida'],[6,'abdulakh-khaibulaev','Khaybulaev'],[99,'orphe-mbina','Mbina'],[94,'ravan-mirzammadov','Mirzammadov'],[17,'tellur-mutallimov','Mutallimov'],[8,'christian-nwachukwu','Nwachukwu'],[1,'amin-ramazanov','Ramazanov'],[34,'xander-severina','Severina']]),
  away:team('borussia-dortmund','3-4-2-1',[[1,'gregor-kobel','Kobel'],[4,'nico-schlotterbeck','Schlotterbeck'],[3,'waldemar-anton','Anton'],[5,'ramy-bensebaini','Bensebaini'],[26,'julian-ryerson','Ryerson'],[25,'joey-veerman','Veerman'],[17,'carney-chukwuemeka','Chukwuemeka'],[24,'daniel-svensson','Svensson'],[21,'fabio-silva','Silva'],[8,'felix-nmecha','Nmecha'],[9,'serhou-guirassy','Guirassy']],[[41,'mathis-albert','Albert'],[14,'maximilian-beier','Beier'],[7,'jobe-bellingham','Bellingham'],[30,'patrick-drewes','Drewes'],[44,'enzo-duarte','Duarte'],[22,'kouakou-gadou','Gadou'],[40,'samuele-inacio','Inacio'],[39,'filippo-mane','Mane'],[33,'alexander-meyer','Meyer'],[18,'ethan-nwaneri','Nwaneri'],[49,'luca-reggiani','Reggiani'],[20,'marcel-sabitzer','Sabitzer']],[['konstantinos-karetsas','Karetsas','Infortunio alla caviglia']])}
];
// The provider displays these additional absences, but the current MD3
// database has no exact player identity for them. Preserve names with null IDs.
fixtures[0].home.unavailable.push(...[['Diouf A.','Fuori rosa'],['Fall A.','Fuori rosa'],['Yandas M.','Fuori rosa']].map(([sourceName,reason])=>({playerId:null,sourceName,reason})));
fixtures[0].away.unavailable.push(...[['Kante H.','Fuori rosa'],['Kolar O.','Fuori rosa'],['Ogbu I.','Infortunio al tendine d’Achille']].map(([sourceName,reason])=>({playerId:null,sourceName,reason})));
fixtures[1].away.unavailable.push(...[['Can E.','Infortunio al ginocchio'],['Konstantelias G.','Infortunio al ginocchio'],['Lerma J.','Infortunio muscolare']].map(([sourceName,reason])=>({playerId:null,sourceName,reason})));
fs.writeFileSync(output,JSON.stringify({schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:'official',fixtures},null,2)+'\n');
console.log('Captured official XI/bench for exactly '+fixtures.length+' fixtures');
