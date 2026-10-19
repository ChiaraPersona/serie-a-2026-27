// Explicitly transcribed public match-table observations, consulted 18 October 2026.
const fs=require('node:fs'),db=JSON.parse(fs.readFileSync('data/normalized/referee-history/md07-2026-27.json')),observations=[];
const extra={
 'marco-guida|2026-05-29':{date:'2026-05-29',season:'2025/26',competition:'Cup Cyprus',home:'Apollon Limassol',away:'Pafos',score:{home:0,away:2}},
 'marco-guida|2026-05-13':{date:'2026-05-13',season:'2025/26',competition:'Coppa Italia',home:'Lazio',away:'Inter',score:{home:0,away:2}},
 'marco-guida|2026-03-10':{date:'2026-03-10',season:'2025/26',competition:'UEFA Champions League',home:'Newcastle',away:'Barcelona',score:{home:1,away:1}},
 'marco-guida|2026-02-26':{date:'2026-02-26',season:'2025/26',competition:'UEFA Europa League',home:'Celta Vigo',away:'PAOK',score:{home:1,away:0}}
};
function add(refereeId,date,fields,url,note,kind='cross-check'){
 const rows=db.referees.find(r=>r.refereeId===refereeId).matches.filter(m=>m.date===date),m=rows.length===1?rows[0]:extra[refereeId+'|'+date];if(!m)throw Error('Unresolved identity '+refereeId+' '+date);
 observations.push({refereeId,kind,match:{date,season:m.season,competition:m.competition,home:m.home,away:m.away,score:m.score,...fields},source:{url,retrievedAt:'2026-10-18',method:'Manual extraction of public statistical table or explicit event review',note}});
}
const ai=id=>'https://aipredict.io/it/calcio/arbitro/'+id+'/';
const tables={
 'marco-di-bello':[['2026-09-19',22,4,0],['2026-09-06',22,4,0],['2026-08-22',18,3,0],['2026-05-10',31,2,0],['2026-04-25',26,3,0],['2026-04-12',12,1,0],['2026-03-16',33,1,0],['2026-03-03',21,0,0],['2026-02-22',23,2,0],['2026-01-31',37,9,0],['2026-01-17',28,1,0],['2026-01-07',31,0,0],['2025-12-29',26,1,0],['2025-12-06',29,3,0],['2025-11-22',23,3,0]],
 'rosario-abisso':[['2026-09-19',25,4,0],['2026-05-09',18,4,0],['2026-05-01',37,8,0],['2026-04-18',29,2,1],['2026-04-05',30,7,1],['2026-03-18',34,6,1],['2026-03-14',18,1,0],['2026-03-01',18,5,0],['2026-02-21',31,2,0],['2026-01-31',41,7,1],['2026-01-10',17,7,0],['2026-01-02',18,3,0],['2025-12-21',30,4,0],['2025-12-04',30,7,0],['2025-11-08',28,5,0]],
 'marco-guida':[['2026-09-19',29,3,0],['2026-09-04',15,3,0],['2026-08-20',27,3,1],['2026-08-11',29,7,0],['2026-05-29',null,7,0],['2026-05-24',17,4,0],['2026-05-13',20,7,0],['2026-05-08',23,3,0],['2026-04-09',15,1,0],['2026-04-04',22,6,0],['2026-03-21',22,1,1],['2026-03-15',26,5,0],['2026-03-10',23,3,1],['2026-02-26',18,1,0],['2026-02-22',23,2,0]]
};
for(const [id,rows] of Object.entries(tables))for(const [date,fouls,total,penaltiesAwarded] of rows)add(id,date,{fouls,providerTotalCards:total,penaltiesAwarded},ai(id),'Aggregate cards retained separately, never reinterpreted as ordinary yellows.');
for(const [date,fouls] of [['2026-09-19',24],['2026-09-07',18],['2026-09-02',26]])add('matteo-marchetti',date,{fouls},'https://scangoal.com/referee/matteo-marchetti','Sum of home/away fouls in match log.');
for(const [date,fouls] of [['2026-09-19',25],['2026-09-12',34],['2026-05-01',41],['2026-04-18',11]])add('rosario-abisso',date,{fouls},'https://scangoal.com/referee/rosario-abisso?sgc=1','Sum of home/away fouls; disagreements retained.');
add('juan-luca-sacchi','2026-10-09',{fouls:23},'https://www.telefootball.net/GB/Avellino-Sampdoria-2026-10-09-674294.html','11 + 12 fouls.');
add('juan-luca-sacchi','2026-10-09',{fouls:23},'https://www.soccerway.com/match/avellino-A332L1f5/sampdoria-nJbCGx2U/summary/stats/','11 + 12 fouls; free kicks are not fouls.');
add('juan-luca-sacchi','2026-08-23',{fouls:26,providerTotalCards:5,penaltiesAwarded:0},ai('juan-luca-sacchi'),'Aggregate card total retained separately.');
add('marco-di-bello','2026-09-19',{directRedCards:1,secondYellowCards:0,dismissals:1},'https://www.skysports.com/football/palermo-vs-padova/4663326514034511232','Direct red Lorenzo Carissoni, 90+1; no second-yellow dismissal.','event-review');
fs.writeFileSync('data/sources/referee-history-cross-checks-md07.json',JSON.stringify({schemaVersion:1,informationalOnly:true,observations},null,2)+'\n');console.log('Cross-checks saved',observations.length);
