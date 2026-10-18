// Curated research record, 18 October 2026. Presentation only; no forecast rebuild.
const fs=require('node:fs');
const file='data/sources/reading-referee-match-history.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const refs={
 chiffi:['daniele-chiffi','milan-atalanta',1184],massa:['davide-massa','juventus-lazio',616],calzavara:['andrea-calzavara','monza-cagliari',null],ayroldi:['giovanni-ayroldi','parma-torino',1186]
};
const url=(slug,kind)=>kind==='odd'?`https://www.oddalerts.com/referee/${slug}/${Object.values(refs).find(r=>r[0]===slug)[2]}`:kind==='of'?`https://ofstats.com/referee/${slug==='davide-massa'?'davide-massa-2':slug}`:`https://aipredict.io/it/calcio/arbitro/${slug}/`;
const source=(url,note)=>({url,retrievedAt:'2026-10-18',note});
function extra(date,competition,home,away,h,a,y,r,f,evidence){return {date,season:date>='2026-07-01'?'2026/27':'2025/26',competition,home,away,score:{home:h,away:a},yellowCards:y,dismissals:r,secondYellowCards:r===0?0:null,directRedCards:r===0?0:null,fouls:f,penaltiesAwarded:null,source:source(evidence,'Public match log, main referee; not VAR or fourth official')};}
const analyses=[];
for(const [key,[slug,fixture]] of Object.entries(refs)){
 const p=data.profiles.find(p=>p.refereeSlug===slug);
 const existing=date=>({...p.matches.find(m=>m.date===date),fouls:null,source:p.source});
 let matches=[],discrepancies=[];
 if(key==='chiffi'){
  matches=[extra('2026-09-25','UEFA Nations League','Montenegro','Cyprus',2,1,4,0,14,url(slug,'odd')),existing('2026-09-20'),existing('2026-09-13'),existing('2026-08-31'),extra('2026-08-13','UEFA Conference League','Tobyl','Partizan',1,2,5,0,22,url(slug,'odd')),extra('2026-07-23','UEFA Europa League','Qarabağ','CSKA Sofia',0,0,3,0,25,url(slug,'of'))];
  matches[1].disputedMetrics=['fouls']; matches[2].fouls=22;matches[3].fouls=17;
  matches[0].verification=[source('https://golmetric.com/en/hakemler/132','4 yellow / 0 red'),source('https://footyprediction.com/uefa-nations-league/montenegro-cyprus-25-09-2026','Fouls 7 + 7')];
  discrepancies.push('Frosinone–Como: OFStats 29 falli, AIPredict 19: falli null, esclusi. Montenegro–Cipro: AIPredict riepilogo 5 cartellini, OddAlerts/Golmetric/tabellino 4 gialli e 0 rossi: adottati 4.');
 }
 if(key==='massa'){
  matches=[extra('2026-09-26','UEFA Nations League','England','Spain',2,3,3,0,27,url(slug,'odd')),existing('2026-09-19'),extra('2026-09-09','UEFA Champions League','Liverpool','Atlético de Madrid',2,1,2,0,21,url(slug,'odd')),existing('2026-09-05'),extra('2026-08-19','UEFA Champions League','Hapoel Beer Sheva','Sabah',2,1,3,0,18,url(slug,'odd')),extra('2026-08-11','UEFA Champions League','Kauno Žalgiris','Dinamo Zagreb',1,2,3,1,22,url(slug,'odd'))];
  matches[1].disputedMetrics=['fouls'];matches[3].disputedMetrics=['fouls'];
  matches[0].verification=[source('https://footyprediction.com/uefa-nations-league/england-spain-26-09-2026','Fouls 11 + 16; yellow 3 + 0; red 0 + 0')];
  discrepancies.push('Roma–Inter: OFStats 20 falli, AIPredict 19; Fiorentina–Torino: OFStats 19, AIPredict 22. Entrambi null ed esclusi.');
 }
 if(key==='calzavara'){
  matches=[existing('2026-09-20'),existing('2026-09-06'),extra('2026-09-02','Coppa Italia','Sassuolo','Frosinone',1,1,null,null,31,'https://aipredict.io/football/referee/andrea-calzavara/'),existing('2026-08-22'),extra('2026-08-14','Coppa Italia','Cagliari','Arezzo',1,0,4,0,null,'https://elcomercio.pe/resultados/partido/cagliari-vs-arezzo-88592/resumen/')];
  matches[0].fouls=22;matches[1].fouls=33;matches[3].fouls=36;
  matches[2].disputedMetrics=['yellowCards','dismissals'];matches[4].disputedMetrics=['fouls'];
  discrepancies.push('Sassuolo–Frosinone: AIPredict riporta 4 cartellini aggregati; Last5Games espone valori per squadra e riepiloghi non conciliati: gialli/rossi non ricostruiti dal totale. Risultato 1–1 prima dei rigori. Cagliari–Arezzo: falli 25 AIPredict / 26 OFStats, esclusi; rosso a Pisacane (allenatore) escluso dal conteggio giocatori. Last5Games riepilogo Serie B 11 gialli contro 10 della somma gare verificate; non utilizzato.');
 }
 if(key==='ayroldi'){
  matches=[existing('2026-09-19'),existing('2026-09-05'),existing('2026-08-23'),extra('2026-05-16','Serie B · playoff','Juve Stabia','Monza',2,2,5,0,32,url(slug,'odd')),existing('2026-05-10')];
  matches[0].fouls=26;matches[1].disputedMetrics=['yellowCards','fouls'];matches[1].secondYellowCards=1;matches[1].directRedCards=0;matches[2].fouls=33;matches[4].fouls=22;matches[4].disputedMetrics=['yellowCards','dismissals'];
  matches[1].verification=[source('https://ofstats.com/matches/view/ascoli-benevento-2026-09-05','42 minute second yellow Antonio Prisco; retained original one dismissal, no duplicated red')];
  discrepancies.push('Ascoli–Benevento: gialli 6 Calciotel / 7 OFStats / 8 OddAlerts; falli 18 OFStats/Statz contro 19 AIPredict/ScanGoal. Esclusi gialli e falli. Espulsione per seconda ammonizione Prisco verificata, conteggiata una volta; OFStats/OddAlerts aggregano anche il secondo giallo nel rosso. Cremonese–Pisa: gialli 3 Calciotel / 4 OFStats / 5 OddAlerts; espulsioni 2 Calciotel / 3 altri: valori originari conservati ma esclusi dalle medie, classificazione non risolta. Sampdoria–Catanzaro: 7 gialli e una espulsione confermati OddAlerts; tipologia espulsione non verificata.');
 }
 if(key==='calzavara'){
  const cup=matches.find(m=>m.date==='2026-09-02');
  Object.assign(cup,{yellowCards:4,dismissals:0,secondYellowCards:0,directRedCards:0,fouls:null,disputedMetrics:['fouls'],verification:[source('https://ofstats.com/matches/view/sassuolo-frosinone-2026-09-02','Yellow 2+2, red 0+0; fouls 11+19'),source('https://nostrabet.com/en/tips/frosinone-sassuolo/','Yellow 2+2, red 0+0; fouls 12+19')]});
  discrepancies[0]='Sassuolo–Frosinone: 4 gialli e 0 espulsioni verificati sui tabellini; falli 30 OFStats / 31 AIPredict e Nostrabet, esclusi. Risultato 1–1 prima dei rigori (4–3). Cagliari–Arezzo: falli 25 AIPredict / 26 OFStats, esclusi; rosso a Pisacane allenatore escluso dai cartellini giocatori. Last5Games riepilogo Serie B 11 gialli contro 10 nelle gare verificate: non usato.';
 }
 if(key==='ayroldi'){
  const crem=matches.find(m=>m.date==='2026-05-10');
  const ascoli=matches.find(m=>m.date==='2026-09-05');
  ascoli.disputedMetrics=['fouls'];
  ascoli.verification.push(source('https://www.skysports.com/football/ascoli-vs-benevento/6116012825407218232','Six ordinary yellows: Prisco, Rizzo, Curado, Beruatto, Maita, Kouan; Prisco second yellow separate'));
  Object.assign(crem,{directRedCards:1,secondYellowCards:1,disputedMetrics:[],verification:[source('https://www.skysports.com/football/cremonese-vs-pisa/530405','Event log: yellow Bozhinov 16, second yellow 23, yellow Calabresi 49, direct red Loyola 57, yellow Hojholt 89'),source('https://unionstat.com/events/kremoneze-piza-10-05-2026/','Same event sequence: 3 yellows excluding second yellow; two dismissals')]});
  discrepancies=['Ascoli–Benevento: gialli 6/7/8 nei riepiloghi, risolti dalla cronologia Sky: sei ammonizioni ordinarie e una seconda ammonizione separata. Falli 18/19 non risolti, esclusi. Cremonese–Pisa: riepiloghi 3/4/5 gialli e 2/3 rossi, risolti dalla cronologia Sky e Unionstat: 3 gialli ordinari, una seconda ammonizione e un rosso diretto. Conservati i totali originari. Sampdoria–Catanzaro: 7 gialli e una espulsione confermati OddAlerts; tipologia non ancora verificata.'];
  matches[0].directRedCards=1;matches[0].secondYellowCards=0;
  matches[0].verification=[source('https://www.skysports.com/football/sampdoria-vs-catanzaro/live/573945','Oliver Abildgaard red card, minute 64'),source('https://www.fotmob.com/players/650613/oliver-abildgaard','No yellow cards; one direct dismissal in this season, Catanzaro match')];
  discrepancies[0]=discrepancies[0].replace('tipologia non ancora verificata.','rosso diretto Abildgaard al 64, verificato con cronologia e profilo giocatore (nessuna ammonizione).');
 }
 for(const m of matches){
  m.verification=[...(m.verification||[]),source(key==='calzavara'?'https://ofstats.com/matches/referee/cesena-catanzaro-2026-03-21':url(slug,'of'),'Match history and fouls where available'),source(key==='calzavara'?'https://aipredict.io/football/referee/andrea-calzavara/':url(slug,'ai'),'Cross-check; discrepancies retained separately')];
  m.missingMetrics=['yellowCards','dismissals','directRedCards','secondYellowCards','fouls'].filter(k=>m[k]===null||m.disputedMetrics?.includes(k));
 }
 analyses.push({fixtureId:fixture+'-2026-27-md-07',refereeSlug:slug,matches,discrepancies,seasonCoverage:'Only individually verified available 2026/27 games before fixture; completeness across all competitions not certified',retrievedAt:'2026-10-18'});
}
data.fixtureAnalyses=analyses;
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Four fixture-scoped informational analyses saved; original profiles retained unchanged.');
