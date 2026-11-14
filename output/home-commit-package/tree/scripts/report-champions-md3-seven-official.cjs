'use strict';
const fs=require('fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const artifact=read('data/derived/champions-md03/market-catalog-official-seven-v2-2026-10-20.json');
const individual=read('data/derived/champions-md03/official-individuals-seven-v2-2026-10-20.json');
const calendar=read('data/normalized/champions-league-2026-27.json');
const folder='data/analysis/champions/official-seven-2026-10-20';
const n=v=>Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:2}):'N/D';
const lines=['# Champions: sette gare del 20 ottobre, ore 21:00','',
 'Aggiornamento locale su 154 titolari ufficiali. 85 selezioni preliminari: 45 collettive e 40 individuali DUO. Nessuna selezione è stata promossa ad approvata; nessuna combinazione è stata forzata.','',
 '## Contratti e limiti','',
 '- Le 40 quote individuali sono i contratti Sisal esatti dello snapshot già acquisito, con fixture, provider player ID, mercato, soglia e selezione verificati. Non sono quote live appena scaricate.',
 '- DUO tiri: giocatore ed eventuale sostituto. DUO tiri in porta: anche pali e traverse inclusi. La probabilità del solo titolare non viene applicata al DUO: probabilità DUO, quota equa ed EV DUO restano N/D.',
 '- Le nuove selezioni individuali riguardano esclusivamente i titolari ufficiali. Panchinari e selezioni escluse restano nell’archivio tecnico; le selezioni salvate sui non titolari vengono rimosse al ricaricamento.',
 '- Campioni correnti: soltanto referti riconciliati con minuti effettivi verificati e bucket senza conflitti. Mancanza di singole partite non equivale a zero; non è richiesta artificialmente una copertura completa di tutta la stagione.',
 '- Restano invariati formule, pesi, criteri di ammissione, quote, previsioni collettive e le altre undici fixture. Le proiezioni individuali utilizzano il ricalcolo dei builder esistenti e i nuovi input osservati.',
 '- Due nomi in panchina restano con identità canonica N/D: Alessandro Di Nunzio e Jorge Dominguez. Nessuna assegnazione automatica a Lituba. Tutti i 154 titolari hanno identità canonica.',
 '- Corretto l’alias Samu del Porto nel nuovo calcolo MD3: ESPN 364815, FotMob 1414859, data di nascita 05/05/2004 e numero 9. Escluso il precedente collegamento ESPN 206714 a un omonimo. Le vecchie statistiche globali e gli snapshot storici sono preservati; questa correzione è applicata esplicitamente al nuovo input delle sette gare.','',
 '## Distribuzione delle selezioni','',
 '| Partita | Collettive | Individuali DUO | Totale |','|---|---:|---:|---:|'];
for(const row of artifact.summary.byFixture){const f=calendar.fixtures.find(f=>f.id===row.fixtureId);lines.push(`| ${f.homeTeam} – ${f.awayTeam} | ${row.selected-row.individual} | ${row.individual} | ${row.selected} |`);}
lines.push('','## Squadre con individuali N/D','', '| Squadra | Motivo del controllo non superato |','|---|---|');
const reasons={'blocked-collective-only':'Perimetro del modello esistente limitato alle previsioni collettive','blocked-incomplete-official-starter-evidence':'Minuti o baseline insufficienti per alcuni titolari ufficiali; il controllo di riconciliazione richiede l’undici completo','blocked-existing-reconciliation-limit':'Riconciliazione tra SOT e tiri individuali e volumi di squadra non superata con i limiti esistenti'};
for(const f of individual.fixtures)for(const t of f.teams)if(!t.players.some(p=>p.projectedRole==='starter'&&p.projectedShots!==null))lines.push(`| ${t.team} | ${reasons[t.reconciliation.status]||t.reconciliation.status} |`);
for(const m of artifact.matches){
 const f=calendar.fixtures.find(f=>f.id===m.matchId);lines.push('',`## ${f.homeTeam} – ${f.awayTeam}`,'','Formazioni ufficiali · 21:00 · proposte preliminari.','',
 '| Squadra | Tiri previsti | SOT previsti | Corner previsti |','|---|---:|---:|---:|');
 for(const t of m.forecastCoverage.teamProjections)lines.push(`| ${t.team} | ${n(t.shotsTotal?.central)} | ${n(t.shotsOnTarget?.central)} | ${n(t.corners?.central)} |`);
 lines.push('','| Selezione | Quota snapshot | Probabilità del contratto | Probabilità solo titolare, separata dal DUO |','|---|---:|---:|---:|');
 for(const l of m.selections.filter(l=>l.suggestionAnalysis.suggested).sort((a,b)=>a.suggestionAnalysis.rank-b.suggestionAnalysis.rank)){
  const e=l.betSelection.evaluation;lines.push(`| ${l.label.replaceAll('|','/')} | ${n(l.odds)} | ${n(e.modelProbabilityPct)}${Number.isFinite(e.modelProbabilityPct)?'%':''} | ${n(e.individualReference?.modelProbabilityPct)}${Number.isFinite(e.individualReference?.modelProbabilityPct)?'%':''} |`);
 }
}
lines.push('','## Verifiche e file interni','',
 '- `tests.json`: identità e undici, contratti e quote, preservazione fixture estranee e archivi, eliminazione selezioni salvate sui non titolari e conservazione dei titolari.',
 '- `output/champions-md3-seven-official/browser.json`: verifiche Schedina e sette Letture a 1440, 390 e 320 pixel, sincronizzazione e assenza di overflow/errori JavaScript.',
 '- `data/sources/champions-official-formations-md03-2026-27.json`: fonte canonica degli undici, panchine e indisponibili.',
 '- `data/sources/champions-md03-identity-corrections-2026-10-20.json`: prove della correzione di identità.',
 '- `data/technical-archive/champions-md03/seven-official-excluded-2026-10-20.json`: precedenti individuali e candidati privi di quota esatta.',
 '- Le versioni sette-v1 sono snapshot tecnici precedenti alla correzione e sono sostituite nell’interfaccia dalla versione sette-v2.',
 '- Fonti e prove restano interne; nessuna sezione pubblica di provenienza è stata aggiunta. Nessun commit, push o deploy eseguito dall’agente.');
fs.writeFileSync(folder+'/REPORT.md',lines.join('\n')+'\n');console.log(folder+'/REPORT.md');
