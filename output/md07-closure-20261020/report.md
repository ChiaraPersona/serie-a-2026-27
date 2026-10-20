# Serie A 2026/27 — audit e chiusura MD7, 20 ottobre 2026

Aggiornamento locale eseguito. Nessun commit, push o deploy. Nessun pronostico, soglia, quota, peso o formula V2 rigenerato. Il confronto binario con il baseline acquisito prima degli aggiornamenti conferma gli artefatti storici invariati.

## 1. Stato delle dieci partite

Tutte concluse; nessuna gara aperta, rinviata o sospesa nella MD7 verificata. Sei referti nuovi importati; quattro risultati esistenti ricontrollati, con correzione identitaria nel referto Roma–Genoa. I finali sono stati confrontati con le dieci cronache ufficiali Lega.

| Partita | Finale | Con quota: vinte | Perse | Void | N/D |
|---|---|---:|---:|---:|---:|
| bologna-inter | 1–3 | 13 | 7 | 0 | 0 |
| fiorentina-como | 1–3 | 15 | 2 | 0 | 0 |
| frosinone-sassuolo | 4–2 | 22 | 0 | 0 | 0 |
| juventus-lazio | 0–3 | 8 | 18 | 0 | 0 |
| milan-atalanta | 3–2 | 11 | 11 | 0 | 0 |
| monza-cagliari | 4–0 | 15 | 7 | 0 | 0 |
| parma-torino | 0–3 | 9 | 8 | 0 | 0 |
| roma-genoa | 2–0 | 9 | 6 | 1 | 0 |
| udinese-lecce | 0–3 | 7 | 10 | 0 | 0 |
| venezia-napoli | 1–0 | 12 | 7 | 0 | 0 |

## 2. Squadre

20/20 aggiornate a 7 gare; 70 referti stagionali. Controllati risultati, punti, GF/GS, tiri e tiri nello specchio effettuati e concessi, possesso, corner, falli, componenti disciplinari, xG osservati e split casa/trasferta. Totali e medie confrontati con la somma dei referti. Integrati negli split anche falli, rossi e corner concessi. Le ultime cinque gare di ogni squadra sono elencate in audit.json; i 20 profili matchup esistenti sono aggiornati con sette gare senza alterarne le formule. I campi avanzati non disponibili in origine (es. field tilt, progressive passes) restano N/D.

## 3. Giocatori

316 righe giocatore-partita nella MD7; 2226 righe stagionali in 70 referti; 479 aggregati giocatore/squadra confrontati con classifiche e comparatore. Nessun ID nullo tra i partecipanti. Verificate presenze, titolarità, minuti, gol, assist, tiri, SOT, falli e per90; esportate titolarità e medie per presenza nei dati del comparatore. Copertura MD7: 100% dei nove campi squadra e dei nove campi individuali osservati richiesti, inclusi xG e pali/traverse; rating accessorio mancante per Artem Dovbyk in Bologna–Inter, mantenuto null. Cartellini e sostituzioni conservati nel referto completo, inclusi i subentranti richiesti dai contratti DUO.

## 4. Classifica

| Pos. | Squadra | Punti | G | V | N | P | GF | GS | DR |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | inter | 19 | 7 | 6 | 1 | 0 | 21 | 9 | 12 |
| 2 | lazio | 19 | 7 | 6 | 1 | 0 | 14 | 4 | 10 |
| 3 | roma | 17 | 7 | 5 | 2 | 0 | 16 | 3 | 13 |
| 4 | milan | 15 | 7 | 4 | 3 | 0 | 14 | 7 | 7 |
| 5 | como | 14 | 7 | 4 | 2 | 1 | 12 | 7 | 5 |
| 6 | frosinone | 13 | 7 | 4 | 1 | 2 | 13 | 9 | 4 |
| 7 | cagliari | 13 | 7 | 4 | 1 | 2 | 6 | 7 | -1 |
| 8 | juventus | 11 | 7 | 3 | 2 | 2 | 9 | 8 | 1 |
| 9 | napoli | 10 | 7 | 3 | 1 | 3 | 10 | 7 | 3 |
| 10 | torino | 10 | 7 | 3 | 1 | 3 | 10 | 9 | 1 |
| 11 | atalanta | 9 | 7 | 3 | 0 | 4 | 10 | 11 | -1 |
| 12 | lecce | 9 | 7 | 3 | 0 | 4 | 9 | 12 | -3 |
| 13 | sassuolo | 8 | 7 | 2 | 2 | 3 | 12 | 14 | -2 |
| 14 | monza | 7 | 7 | 2 | 1 | 4 | 13 | 15 | -2 |
| 15 | bologna | 5 | 7 | 1 | 2 | 4 | 6 | 10 | -4 |
| 16 | udinese | 4 | 7 | 1 | 1 | 5 | 9 | 16 | -7 |
| 17 | genoa | 4 | 7 | 1 | 1 | 5 | 5 | 13 | -8 |
| 18 | fiorentina | 4 | 7 | 1 | 1 | 5 | 8 | 17 | -9 |
| 19 | parma | 4 | 7 | 1 | 1 | 5 | 4 | 13 | -9 |
| 20 | venezia | 3 | 7 | 1 | 0 | 6 | 6 | 16 | -10 |

Ricalcolata con il modulo esistente. Tutte le 20 posizioni, le gare, le vittorie e i gol fatti coincidono con le 20 schede ufficiali Lega (URL e controlli in audit.json). La pagina centrale Lega classifica restituisce una tabella priva di righe: non si dichiara un confronto tabellare completo con quella pagina. Nessuna penalizzazione introdotta; i punti rimangono 3V+N e sono coerenti con le posizioni ufficiali. Ordinamento provvisorio corrente: punti, differenza reti, gol fatti; coincide con le posizioni ufficiali MD7. Verificato il C.U. FIGC 244/A: classifica avulsa e spareggi riguardano i titoli a fine campionato; non applicati anticipatamente a MD7. Sky/Opta presenta GF/GS di Parma e Torino incompatibili con lo 0–3 ufficiale (sembra includere un gol annullato): preservati i risultati ufficiali, senza copiarne l’errore.

## 5–6. Pronostici e simulazione economica

218 pronostici pubblicati: 141 vinti, 76 persi, 1 void, 0 non verificabili, 0 aperti. Successo statistico complessivo: 64,98% (void escluso).

198 selezioni con quota verificata: 121 vinte, 76 perse, 1 void. Successo su vinte+perse: 61,42%. Puntata simulata 198,00 €, ritorno 182,21 €, netto -15,79 €, ROI -7,97%. Le 20 selezioni senza quota sono valutate statisticamente e non generano vincite o puntate simulate.

Riutilizzato settleLeg e il riepilogo economico del renderer esistente. Rispetto dei contratti salvati per DUO, sostituti, pali/traverse e periodo; nessuna probabilità o quota inventata. È verifica statistica delle selezioni, non liquidazione certificata dal bookmaker. Rendimento originale distinto dal filtro operativo: il void originale resta in archivio anche quando il giocatore non è negli undici ufficiali.

## 7. Anomalie corrette

- Sei gare ancora scheduled: importati i referti finali e gli overlay individuali tramite parser/importatore esistenti.
- Relja Obrić e Alessandro Di Nunzio non collegati: aggiunti alias agli ID canonici esistenti.
- Nomi abbreviati di sette partecipanti: collegamento esatto del dato pali/traverse, senza deduzioni da statistiche mancanti.
- Diallo in Parma–Torino: il provider riporta Djibril Diallo; il tabellino del club identifica Diallo Thiao subentrante a Britschgi al 69°. Risoluzione circoscritta alla fixture, documentata internamente; nessun alias globale fra le due persone.
- Formazioni complete con panchina: il builder delle squadre seleziona ora solo gli starter per comporre gli undici. Nuove registrazioni canoniche per Parma–Torino e Roma–Genoa.
- Il filtro titolari nascondeva il void originale nell’archivio: dati e presentazione storica preservano i contratti delle gare concluse. Il filtro operativo e la riconciliazione delle selezioni salvate rimangono rigorosi.
- Test predittivi sintetici mescolavano MD7 reale e MD7 sintetica; ora il dataset sintetico parte dal cutoff MD6. Il test Schedina non applica una condizione prepartita ai contratti storici di gare concluse.

## 8. File modificati

Fonti canoniche:

- `data/sources/match-results-2026-27.json`
- `data/sources/statmuse-player-stats-2026-27.json`
- `data/sources/official-lineups-2026-27.json`
- `data/sources/player-identity-aliases-2026-27.json`

Codice e test:

- `scripts/update-results-md07-2026-10-20.js`
- `scripts/audit-md07-closure.mjs`
- `scripts/check-md07-closure-browser.cjs`
- `scripts/test-md07-archive-service.mjs`
- `scripts/team-pages/build.js`
- `scripts/test-future-data-readiness.js`
- `scripts/test-schedina-md07.mjs`
- `js/official-starter-policy.js`
- `js/services/data-service.js`
- `js/pages/shared-forecast-contract.mjs`
- `js/pages/betting.js`
- `js/pages/readings.js`
- `js/pages/reading-detail/forecasts.mjs`
- `js/pages/reading-detail/serie-a-adapter.mjs`

Dati generati:

- `data/normalized/matches.json`
- `data/normalized/official-starter-registry.json`
- `data/normalized/team-matchup-profiles-2026-27.json`
- `data/teams/index.json`
- `data/teams/player-leaderboards.json`
- `data/teams/atalanta.json`
- `data/teams/bologna.json`
- `data/teams/cagliari.json`
- `data/teams/como.json`
- `data/teams/fiorentina.json`
- `data/teams/frosinone.json`
- `data/teams/genoa.json`
- `data/teams/inter.json`
- `data/teams/juventus.json`
- `data/teams/lazio.json`
- `data/teams/lecce.json`
- `data/teams/milan.json`
- `data/teams/monza.json`
- `data/teams/napoli.json`
- `data/teams/parma.json`
- `data/teams/roma.json`
- `data/teams/sassuolo.json`
- `data/teams/torino.json`
- `data/teams/udinese.json`
- `data/teams/venezia.json`

Build di presentazione eseguito: pagine radice e 20 schede squadra aggiornate con le versioni degli asset correnti. Nessun restyling; nessun CSS modificato da questa attività. Il checkout ha ricevuto modifiche concorrenti Champions e cache degli asset: non ripristinate né attribuite a questo audit. Artefatti di audit nella presente cartella; audit.json include il dettaglio dei 198 contratti quotati e delle riconciliazioni.

## 9. Test e browser

- PASS `scripts/test-schedina-md07.mjs`
- PASS `scripts/test-md07-archive-service.mjs`
- PASS `scripts/test-player-identities.js`
- PASS `scripts/test-future-data-readiness.js`
- PASS `scripts/test-schedina-md06-results.mjs`
- PASS `scripts/test-results-md06-complete.mjs`
- PASS `scripts/team-pages/test-all-teams.js`
- FAIL `scripts/test-champions-md02-integration.js`
- PASS `scripts/test-champions-md3-squads.mjs`
- PASS `scripts/audit-md07-closure.mjs`: 10 gare, 20 squadre, 479 aggregati, integrità contratti.
- PASS browser Edge: 36 pagine a 1440 px e 36 a 390 px; 141 verdi, 76 rossi, 1 void; nessun errore JavaScript o overflow orizzontale. Verificati card economica, home, 20 squadre, Giocatori, comparatore, 10 Letture, pagina Champions.
- PASS ripristino e riconciliazione MyCombo di una selezione non titolare precedentemente salvata: rimossa dal contesto operativo, mantenuta nell’archivio.
- PASS policy ufficiali: zero rimozioni dai cataloghi persistiti.
- PASS build sito di presentazione e rigenerazione dati.
- PASS git diff --check (avvisi di normalizzazione LF/CRLF separati).

Il test Champions MD2 supera lo snapshot storico, poi fallisce con `Missing current odds ucl-2026-27-md02-01`: il feed quote corrente è già passato a MD3. File quote e integrazione MD2 coincidono byte per byte con HEAD; non sono stati modificati da questa attività. MD3 supera il suo test. Modifiche concorrenti ai dataset MD3 impediscono di dichiarare l’intero checkout Champions immutato rispetto al baseline, ma i file storici rilevanti sono preservati.

## 10. Limiti e problemi aperti

- Rating Dovbyk N/D; nessun impatto sugli esiti richiesti.
- Liquidazione bookmaker non certificata: non sono disponibili ricevute o certificati di liquidazione.
- Confronto centrale della classifica Lega non disponibile; riscontro ufficiale svolto su tutte le schede club.
- Test corrente Champions MD2 incompatibile con il feed quote MD3; non alterate quote storiche per farlo passare.
- Dataset e referti avanzati conservano i limiti già documentati, senza sostituire dati osservati con proiezioni.

Fonti interne principali: [Lega Serie A](https://www.legaseriea.it/serie-a), le 20 schede club documentate in audit.json, [tabellino Parma](https://www.parmacalcio1913.com/news/seria-a-enilive-parma-torino-0-3/), [convocati Roma](https://www.asroma.com/it/notizie/76081/i-convocati-giallorossi-per-roma-genoa), referti StatMuse conservati in tmp e URL nelle fonti canoniche. Nessuna nuova sezione fonti nell’interfaccia pubblica.
