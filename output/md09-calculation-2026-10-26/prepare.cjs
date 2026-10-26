const fs=require('fs');
const dir=__dirname;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
for(const file of ['data/normalized/matches.json','data/normalized/readings.json','data/normalized/predictions.json','data/sources/referee-assignments-2026-27.json']) fs.copyFileSync(file,dir+'/'+file.split('/').at(-1));
const data=read('data/sources/referee-assignments-2026-27.json');
const refs=new Map(data.matchdays.flatMap(d=>d.assignments.map(a=>[a.referee.slug,a.referee])));
const rows=[
['sassuolo-lazio','luca-zufferli','DI GIOIA','MINIUTTI','TREMOLADA','COSSO','AURELIANO'],
['roma-cagliari','ermanno-feliciani','ZINGARELLI','FONTANI','MARIANI','GHERSINI','CAMPLONE'],
['torino-como','giuseppe-collu','LUCIANI','GRASSO','SOZZA','MARINI','DI PAOLO'],
['milan-bologna','juan-luca-sacchi','BACCINI','DEI GIUDICI','COLOMBO','GIUA','PATERNA'],
['parma-udinese','davide-massa','SCATRAGLI','GALIMBERTI','BONACINA','MAZZOLENI','BARONI'],
['venezia-inter','luca-pairetto','MELI','CECCON','FOURNEAU','CAMPLONE','VOLPI'],
['genoa-juventus','daniele-doveri','PALERMO','YOSHIKAWA','DI MARCO','AURELIANO','PEZZUTO'],
['monza-napoli','giovanni-ayroldi','PASSERI','COSTANZO','MARCENARO','MERAVIGLIA','MARINI'],
['frosinone-lecce','rosario-abisso','ALASSIO','DI GIACINTO','MARESCA','PICCININI','MAZZOLENI'],
['fiorentina-atalanta','federico-la-penna','BAHRI','MORO','MARINELLI','GARIGLIO','DIONISI']];
const source={name:'Associazione Italiana Arbitri',sourceType:'aia-figc-designations',url:'https://www.aia-figc.it/news/serie-a-enilive-designazioni-9a-giornata-28800/'};
const assignments=rows.map(([id,slug,a,b,fourthOfficial,varOfficial,avar])=>{if(!refs.has(slug))throw Error(slug);return {matchId:id+'-2026-27-md-09',referee:refs.get(slug),assistants:[a,b],fourthOfficial,var:varOfficial,avar};});
data.matchdays=data.matchdays.filter(d=>d.matchday!==9).concat({matchday:9,publishedAt:'2026-10-26',retrievedAt:'2026-10-26',source,assignments});
write('data/sources/referee-assignments-2026-27.json',data);
write(dir+'/aia-md09-verified-extraction.json',{source,verifiedAt:new Date().toISOString(),assignments});
const matches=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===9);
const probable=read('data/sources/probable-lineups-md9-2026-27.json');
for(const m of matches){
 const teams=[m.homeTeam,m.awayTeam].map(id=>probable.teams.find(t=>t.teamId===id));
 const a=assignments.find(a=>a.matchId===m.id);
 const section=(content,signals=[])=>({content,signals,sources:[]});
 const reading={id:'lettura-'+m.id,matchId:m.id,status:'published',prototype:true,updatedAt:'2026-10-26',title:teams.map(t=>t.team).join(' - '),summary:'Analisi prepartita della nona giornata con formazioni probabili. Ballottaggi e indisponibilità possono modificare le proiezioni.',sections:{
 context:section(`Serie A 2026/27, 9ª giornata. ${m.date} alle ${m.kickoff}. Meteo attendibile N/D.`),
 form:section('Statistiche storiche e gare concluse della stagione corrente prima della nona giornata. Dati mancanti N/D.'),
 availability:section('Formazioni probabili: undici e riserve non sono ancora confermati.',teams.map(t=>`${t.team}: ${t.formation}; ${t.players.filter(p=>p.lineupStatus==='starter').length} probabili titolari, ${t.ballots?.length||0} ballottaggi, ${t.unavailable?.length||0} indisponibili.`)),
 tactics:section('Proiezioni individuali e di squadra calcolate con ruolo, minuti attesi e avversario. Gli assetti restano provvisori.',teams.map(t=>`${t.team}: ${t.formation}, formazione probabile.`)),
 referee:section(`Arbitro designato: ${a.referee.name}.`,[`Assistenti: ${a.assistants.join(' - ')}.`,`IV ufficiale: ${a.fourthOfficial}.`,`VAR: ${a.var}; AVAR: ${a.avar}.`]),
 market:section('Quote prepartita aggiornate al 26 ottobre. Per i contratti DUO non validati probabilità, quota equa ed EV restano N/D.'),
 synthesis:section('Pronostico e scenari calcolati dal modello corrente; possibili variazioni dopo le formazioni ufficiali.')},internalSources:[{label:probable.provider,url:probable.sourceUrl,rawSnapshot:probable.rawSnapshot,retrievedAt:probable.importedAt},source]};
 write('data/sources/readings/'+m.id+'.json',reading);
}
console.log('MD9: dieci designazioni e dieci Letture preparate.');
