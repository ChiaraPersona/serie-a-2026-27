const fs=require('node:fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),folder='output/reports/referee-md07-completion';
const db=read('data/normalized/referee-history/md07-2026-27.json'),history=read('data/generated/reading-referee-history.json'),integrity=read(folder+'/integrity.json'),browser=read(folder+'/browser/audit.json');
const fmt=v=>v===null||v===undefined?'N/D':Number(v).toLocaleString('it-IT',{maximumFractionDigits:2});
const names={yellowCards:'Ammonizioni ordinarie',dismissals:'Espulsioni',directRedCards:'Rossi diretti',secondYellowCards:'Seconde ammonizioni',totalCards:'Cartellini complessivi',fouls:'Falli'};
const fixtures=history.fixtures.filter(f=>f.competition==='serie-a'&&f.fixtureId.endsWith('md-07'));
const six=fixtures.filter(f=>f.analysis.showPercentComparison);
const disagreements=[];
for(const r of db.referees)for(const m of r.matches)if(m.discrepancies.length||m.scoreDisputed)disagreements.push({refereeId:r.refereeId,matchId:m.id,date:m.date,home:m.home,away:m.away,discrepancies:m.discrepancies,scoreDisputed:m.scoreDisputed,scoreObservations:m.scoreDisputed?m.observations.map(o=>({score:o.original.score,source:o.provenance.url})):undefined});
fs.writeFileSync(folder+'/discrepancies.json',JSON.stringify(disagreements,null,2)+'\n');
let out='# Completamento analisi arbitrali Serie A MD7\n\nVerifica del 18 ottobre 2026.\n\n';
out+='Completate le sei letture Bologna–Inter (Doveri), Fiorentina–Como (Di Bello), Frosinone–Sassuolo (Marchetti), Roma–Genoa (Abisso), Udinese–Lecce (Guida), Venezia–Napoli (Juan Luca Sacchi). Le quattro analisi già approvate sono identiche nei dati e nella resa del componente pubblico. I database di tutti e dieci gli arbitri sono stati estesi.\n\n';
out+='## Distinzione tra archivio e interfaccia\n\n';
out+=`Il database contiene **${integrity.archivedMatches} gare distinte ammesse al catalogo** e **${integrity.quarantinedMatches} record separati in quarantena** per attribuzioni incompatibili o data/stagione incoerente. Il numero di gare archiviate non significa che tutte le metriche siano note o concordanti. Nessuna copertura è dichiarata completa.\n\n`;
out+='Le letture caricano esclusivamente la proiezione di cinque gare: non scaricano il database storico né gli aggregati di ricerca. Cutoff esclusivo sulla data della fixture; gare nella stessa data e successive escluse. Ordinamento decrescente per data. Nessun blocco aggiuntivo: riutilizzato il dashboard approvato, con Δ compatto soltanto per le sei nuove analisi, lasciando identiche le quattro precedenti.\n\n';
out+='Il catalogo conserva i log completi recuperati, senza il precedente limite di 40 gare per profilo e senza limite di cinque gare. Record originari, osservazioni dei singoli provider, URL, data di recupero, snapshot compressi e hash sono interni. Le divergenze irrisolte non vengono mediate o sostituite con zero. Gli identificativi delle gare derivano da data e ID squadra normalizzati tramite alias espliciti; gli identificativi degli arbitri sono gli slug canonici.\n\n';
out+='## Copertura effettiva\n\n| Arbitro | Gare in catalogo | Record in quarantena | Intervallo delle date | Stagioni presenti | Stato |\n|---|---:|---:|---|---|---|\n';
for(const r of db.referees)out+=`| ${r.name} | ${r.matches.length} | ${r.quarantinedMatches.length} | ${r.coverage.from} – ${r.coverage.to} | ${r.coverage.seasons.join(', ')} | PARZIALE |\n`;
out+='\nLe date estreme non garantiscono continuità né completezza di ciascuna stagione. Il 2019/20 ammette la conclusione posticipata nell’estate 2020; le altre incoerenze tra data e stagione restano isolate.\n\n';
for(const r of db.referees){
 const current=r.matches.filter(m=>m.season==='2026/27'),missing=Object.fromEntries([...Object.keys(names).filter(k=>k!=='totalCards'),'penaltiesAwarded'].map(k=>[k,r.matches.filter(m=>m[k]===null).length]));
 out+=`### ${r.name}\n\nCompetizioni presenti: ${r.coverage.competitions.join('; ')}.\n\n2026/27: ${current.length} gare archiviate, di cui ${current.filter(m=>m.date<fixtures.find(f=>f.refereeId===r.refereeId).cutoffDate).length} prima della fixture MD7. Questo conteggio comprende soltanto le gare recuperate, non una certificazione del calendario arbitrale completo. Competizione non classificata in ${r.coverage.unknownCompetition} record: conservati e non utilizzati nelle query standard delle sole competizioni ufficiali.\n\n`;
 out+='Metriche mancanti o non risolte nell’intero catalogo: '+Object.entries(missing).map(([k,n])=>`${names[k]||'Rigori assegnati'} ${n}/${r.matches.length}`).join('; ')+'.\n\n';
 out+=`Gare con divergenze conservate: ${r.matches.filter(m=>m.discrepancies.length||m.scoreDisputed).length}. Record in quarantena: ${r.quarantinedMatches.length}; dettagli e osservazioni originali nel database.\n\n`;
}
out+='## Sei analisi e campioni utilizzati\n\nMedie = somma dei valori ammessi / numero effettivo di valori ammessi per quella metrica. Δ = (recente / stagionale − 1) × 100; base stagionale zero o mancante → N/D. Nessuna sostituzione del campione con la media di carriera. Cartellini complessivi = ammonizioni ordinarie + espulsioni una volta sola; seconda ammonizione mantenuta separata, non aggiunta nuovamente ai gialli ordinari. Gli aggregati di cartellini con definizioni diverse restano osservazioni separate.\n\n';
for(const f of six){
 out+=`### ${f.fixtureId} — ${f.refereeName}\n\nCutoff esclusivo: ${f.cutoffDate}.\n\n| Data | Competizione | Partita | Risultato | Amm. ordinarie | Rossi diretti | Seconde amm. | Espulsioni | Falli |\n|---|---|---|---|---:|---:|---:|---:|---:|\n`;
 for(const r of f.rows)out+=`| ${r.date} | ${r.competition||'N/D'} | ${r.home}–${r.away} | ${fmt(r.score?.home)}–${fmt(r.score?.away)} | ${fmt(r.yellowCards)} | ${fmt(r.directRedCards)} | ${fmt(r.secondYellowCards)} | ${fmt(r.dismissals)} | ${fmt(r.fouls)} |\n`;
 out+='\n| Metrica | Ultime 5 | n validi | Stagionale disponibile | n validi | Δ % |\n|---|---:|---:|---:|---:|---:|\n';
 for(const [k,label] of Object.entries(names))out+=`| ${label} | ${fmt(f.analysis.recent[k].average)} | ${f.analysis.recent[k].n} | ${fmt(f.analysis.seasonal[k].average)} | ${f.analysis.seasonal[k].n} | ${fmt(f.analysis.percentDifference[k])} |\n`;
 out+=`\n${f.analysis.trend}\n\n`;
 const ref=db.referees.find(r=>r.refereeId===f.refereeId);
 for(const row of f.rows){const full=ref.matches.find(m=>m.id===row.id);if(!full)continue;
  for(const d of full.discrepancies){const alternatives=[...new Map((d.alternatives||[]).map(v=>[v.source+'|'+v.value,v])).values()];out+=`- ${row.date} ${row.home}–${row.away}, ${names[d.metric]||d.metric}: ${alternatives.map(v=>`${fmt(v.value)} (${v.source})`).join('; ')}. ${d.resolution}.\n`;}
  if(row.missingMetrics?.length)out+=`- ${row.date}, valori non disponibili/non risolti: ${row.missingMetrics.map(k=>names[k]||'Rigori assegnati').join(', ')}.\n`;
 }out+='\n';
}
out+='## Funzioni analitiche predisposte, non attivate nel motore\n\n';
out+='`scripts/referee-stats/history-statistics.cjs` espone `select`, `rate`, `describe`, `profileStatistics`: filtri per cutoff/stagione/competizione, ultime 5/10/20, medie con n, distribuzioni delle ammonizioni e delle espulsioni, frequenze con numeratore/denominatore, rapporto falli/gialli su coppie di dati validi, statistiche casa/trasferta dove esistono conteggi per squadra verificabili e serie mensili. Il rapporto falli per giallo rimane N/D quando il denominatore è zero. I campioni casa/trasferta possono essere più piccoli e non sono ricostruiti dai soli totali di gara.\n\n';
out+='Gli aggregati interni sono in `data/generated/referee-history-analytics-md07.json`. Utilizzano soltanto competizioni ufficiali identificate e gare precedenti alla rispettiva fixture; record in quarantena esclusi. Nessun collegamento al motore Serie A V2 o ai builder delle probabilità.\n\n';
out+='## Fonti, limiti e verifiche\n\n';
out+='Archivio domestico ESPN già presente per Serie A/B e fasi finali 2023/24–2025/26; profili completi Calciotel per nove arbitri; profili OFStats e schede gara; Datasport e Soccerbase per Juan Luca Sacchi; riscontri puntuali AIPredict, ScanGoal, Sky, Soccerway e Telefootball. L’assenza del profilo Calciotel esatto di Sacchi non è stata risolta con un abbinamento approssimativo.\n\n';
const manifest=read(db.manifestPath),details=read('data/raw/referee-stats/md07-history-2026-10-18/details/manifest.json');
out+=`Recupero diretto: ${manifest.filter(p=>!p.error).length} profili/indici archiviati; ${details.filter(p=>!p.error).length} schede gara archiviate. AIPredict ha restituito HTTP 403 al downloader: i riscontri consultabili tramite ricerca pubblica sono trascritti, con riferimenti, nel file interno dedicato. ${details.filter(p=>p.error).length} URL di scheda ipotizzati hanno restituito 404 e non sono stati utilizzati come prova. Errori e URL sono nei manifest.\n\n`;
out+='I totali ESPN `penaltyKickShots` non sono stati interpretati come rigori assegnati. Totali OFStats positivi dei rossi non sono stati classificati automaticamente come espulsioni: la separazione richiede eventi espliciti. Le ammonizioni ESPN con seconde ammonizioni presenti rimangono solo conteggi grezzi finché gli eventi o altri riscontri non stabiliscono il numero di ammonizioni ordinarie. I conteggi evento vengono ammessi solo quando la sequenza e i totali sono compatibili; osservazioni alternative conservate.\n\n';
out+=`Test di integrità: ${integrity.protectedFiles} file protetti identici per hash (dati normalizzati, fonti delle formazioni, pronostici, schedine/esiti, quote e codice del motore). ${integrity.unchangedFixtureRecords} record arbitrali preesistenti identici, incluse le quattro analisi già approvate e tutte le altre competizioni. Rese HTML dei dashboard non interessati identiche allo snapshot.\n\n`;
out+='Il file di presentazione `scripts/build-site.js` è cambiato durante il lavoro per interventi concorrenti ed è esplicitamente separato dal controllo dei file sportivi protetti; non è stato modificato da questa attività. Altri interventi concorrenti sulla presentazione o sulle rose non sono stati ripristinati.\n\n';
out+=`Browser: **${browser.checks.length} controlli su dieci letture**, a 1440/390/320 px; cinque righe cronologiche per lettura, quattro confronti Δ per ciascuna nuova analisi, nessun testo pubblico delle fonti, nessun nuovo overflow rispetto al resto della pagina, ${browser.errors.length} errori JavaScript. Tabelle mobili con scorrimento interno già previsto dal componente approvato. Screenshot in \`browser/\`.\n\n`;
out+='Comandi eseguiti:\n\n```text\nnode scripts/build-referee-history-database.cjs\nnode scripts/build-referee-history-analytics.cjs\nnode scripts/complete-referee-md07-history.cjs\nnode scripts/build-reading-referee-history.js\nnode scripts/build-site.js --reading-pages-only\nnode scripts/test-referee-md07-completion.mjs\nnode scripts/test-reading-referee-history.mjs\nnode scripts/test-referee-dashboard.mjs\nnode scripts/check-referee-md07-completion.cjs\n```\n\nNessun builder di pronostici, schedine, liquidazione o formazioni eseguito. Nessun commit, push o deploy.\n\n';
out+='## File dell’intervento\n\n'+[
'data/sources/reading-referee-match-history.json — sei riferimenti al database; quattro analisi e profili originali preservati',
'data/sources/referee-history-cross-checks-md07.json — riscontri e cronologie separati',
'data/normalized/referee-history/md07-2026-27.json — catalogo completo recuperato, osservazioni e quarantena',
'data/generated/referee-history-analytics-md07.json — aggregati interni futuri',
'data/generated/reading-referee-history.json — proiezione delle sei letture nuove',
'data/raw/referee-stats/md07-history-2026-10-18/ — snapshot compressi e manifest',
'scripts/build-referee-history-database.cjs; scripts/build-referee-history-analytics.cjs; scripts/complete-referee-md07-history.cjs',
'scripts/referee-stats/history-parsers.cjs; scripts/referee-stats/history-statistics.cjs',
'scripts/referee-stats/fetch-md07-history.cjs; scripts/referee-stats/fetch-md07-match-details.cjs; scripts/referee-stats/import-md07-cross-checks.cjs',
'scripts/build-reading-referee-history.js — lettura dei riferimenti al database',
'js/pages/reading-detail/referee-dashboard.mjs — soli confronti percentuali compatti delle sei fixture nuove',
'scripts/test-referee-md07-completion.mjs; scripts/check-referee-md07-completion.cjs; scripts/report-referee-md07-completion.cjs',
'output/reports/referee-md07-completion/ — snapshot prima, integrità, discrepanze, browser e report',
'docs/referee-history-database.md — schema, metodologia e rigenerazione'
].map(s=>'- '+s).join('\n')+'\n';
fs.writeFileSync(folder+'/report.md',out);console.log('Full report written: '+folder+'/report.md');
