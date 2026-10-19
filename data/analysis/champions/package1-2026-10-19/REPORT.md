# Champions MD3 — Pacchetto 1: integrazione locale, 19 ottobre 2026

Esito: database individuale aggiornato. Nessun ricalcolo dei pronostici pubblicati. La verifica end-to-end delle letture MD3 resta limitata dall’assenza degli artefatti MD3 e delle formazioni.

| Indicatore | Risultato |
|---|---|
| Candidate | 817, 519 giocatori, 51 incontri |
| Approvate / importate | 817 / 817 |
| Duplicate tra candidate o nello storico | 0; audit e correzioni sono overlay, non nuove prestazioni |
| Quarantena tra le 817 candidate | 0 |
| Quarantena originale aggiuntiva | 21 righe fuori dalle 817, conservate senza importazione; segnalazione originale TEAM_SHOTS_UNAVAILABLE_OR_ZERO |
| Giocatori / squadre aggiornati | 519 / 31, su 36 squadre conservate |
| Minuti verificati / stimati / mancanti importati | 0 / 817 / 0 |
| Righe speciali riesaminate | 14 approvate confrontando nuovamente ID, squadra, incontro e statistiche |
| ID testuali corretti | 48 righe, mediante ID provider esatti |
| Test Node | 8 superati, 1 fallito |
| Browser | 40 controlli, 1280 e 390 px; nessun overflow, errore JS o contenuto vuoto |
| Integrità | 9250 file esistenti controllati; solo il dataset individuale corrente modificato |

## Validazione e significato dei dati

Tutte le candidate sono prestazioni di campionati nazionali, non prestazioni UEFA. Restano nei rispettivi bucket per competizione e squadra. Sono state confrontate con 51 summary ESPN acquisiti nuovamente: ID incontro, data, stagione, competizione, stato concluso, ID squadra e atleta, presenza, titolarità, tiri, SOT, gol, assist, cartellini e falli. Nessun confronto statistico discrepante. È una riconciliazione con il referto provider originale, non una certificazione indipendente da un secondo provider.

Gli identificativi testuali danneggiati non sono stati risolti con nomi approssimativi: sono stati usati gli ID ESPN canonici già presenti. Yann Sommer, ID 93197, è confermato nel referto del Club Brugge e incluso. Le 14 righe sono tutte confermate dal nuovo confronto; nessuna autorizzazione è stata dedotta dai loro report.

I CSV contenevano minuti vuoti. Gli 817 valori importati sono stime ricavate con il metodo esistente da titolarità e orologi delle sostituzioni, con limite a 90 minuti; non sono minuti osservati e non includono una misura verificata del recupero. Lo stato è registrato nel ledger, nei nuovi match degli aggregati e nei metadata raw. I test verificano che i minuti storici siano preservati e che il loro incremento coincida con le sole nuove stime.

Il builder di aggregazione esistente è riutilizzato senza cambiare formule o pesi. Sono conservati giocatori non interessati, competizioni non interessate e tutte le presenze precedenti. I vecchi raw non ancora acquisiti negli aggregati non sono stati aggiunti implicitamente. Il test controlla gli incrementi esatti delle statistiche per ogni giocatore e competizione. Una seconda esecuzione dell’importer importa zero righe.

Il dataset di squadra mantiene la copertura storica dei referti di squadra; package1IndividualEvidence indica separatamente il nuovo campione individuale. Gli as-of dei 31 gruppi individuali aggiornati sono al 19 ottobre; le cinque squadre estranee restano identiche.

## Copertura MD3

Tutte le 36 squadre e le 18 fixture sono presenti. Per ogni lato: giocatori aggiornati / rosa; copertura tiri e SOT negli aggregati correnti. Formazioni e panchine MD3 assenti per tutte le fixture. Non sono state inventate.

| Fixture | Partita | Nuovi giocatori casa / ospiti | Copertura tiri casa / ospiti | Copertura SOT casa / ospiti | Lettura MD3 |
|---|---|---|---|---|---|
| ucl-2026-27-md03-01 | Fenerbahçe – Slavia Praha | 17/36 · 0/25 | 21/36 · 15/25 | 21/36 · 15/25 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-02 | Sabah – Borussia Dortmund | 0/27 · 11/28 | 14/27 · 16/28 | 14/27 · 16/28 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-03 | Roma – Slovan Bratislava | 20/24 · 0/28 | 22/24 · 16/28 | 22/24 · 16/28 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-04 | Porto – PSV Eindhoven | 15/33 · 12/23 | 20/33 · 20/23 | 20/33 · 20/23 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-05 | Liverpool – Villarreal | 14/25 · 18/25 | 16/25 · 22/25 | 16/25 · 22/25 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-06 | Manchester City – AEK Athens | 17/23 · 14/22 | 19/23 · 19/22 | 19/23 · 19/22 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-07 | Paris Saint-Germain – Barcelona | 18/26 · 17/25 | 21/26 · 23/25 | 21/26 · 23/25 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-08 | Napoli – Bodø/Glimt | 18/23 · 17/32 | 22/23 · 21/32 | 22/23 · 21/32 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-09 | Stuttgart – Atlético de Madrid | 17/32 · 20/24 | 21/32 · 21/24 | 21/32 · 21/24 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-10 | Como – Manchester United | 17/21 · 17/25 | 20/21 · 19/25 | 20/21 · 19/25 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-11 | Lille – Galatasaray | 21/24 · 15/33 | 23/24 · 20/33 | 23/24 · 20/33 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-12 | Aston Villa – Viking | 17/23 · 16/30 | 22/23 · 26/30 | 22/23 · 26/30 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-13 | Club Brugge – Lens | 13/25 · 19/25 | 15/25 · 22/25 | 15/25 · 22/25 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-14 | Bayern München – Arsenal | 18/24 · 16/22 | 19/24 · 19/22 | 19/24 · 19/22 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-15 | Inter – Shakhtar Donetsk | 18/23 · 0/29 | 20/23 · 15/29 | 20/23 · 15/29 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-16 | Real Madrid – Leipzig | 21/35 · 17/22 | 21/35 · 20/22 | 21/35 · 20/22 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-17 | Real Betis – Feyenoord | 20/25 · 15/46 | 22/25 · 22/46 | 22/25 · 22/46 | Non generata; URL mostra calendario |
| ucl-2026-27-md03-18 | Sporting CP – LASK | 14/25 · 0/32 | 19/25 · 19/32 | 19/25 · 19/32 | Non generata; URL mostra calendario |

## Motore, mercati e pagine

Il file è compatibile con gli aggregatori esistenti e conserva per90, separazione per competizione e valori null. Il builder di mercati scripts/build-champions-player-markets.js:24 legge ancora champions-player-stats-2025-26.json. Il nuovo campione 2026/27 non viene quindi automaticamente usato nelle proiezioni pubblicate. Il calendario non ha formazioni MD3; non risultano pronostici MD3 né dataset mercati/Schedina MD3. Non è possibile validare stime numeriche MD3 di tiri/SOT o possibili subentranti che non esistono, senza un successivo intervento autorizzato.

I test dei mercati e dei contratti esistenti passano; questo attesta la compatibilità conservata, non la validazione di nuove selezioni MD3. Tutte le 18 URL richieste e calendario/Schedina sono state aperte a 1280 e 390 px. Le URL MD3 ripiegano sul calendario; la Schedina esistente funziona. Nessun errore JS, pagina vuota o overflow. Screenshot interni disponibili. Nessun build sito o policy degli undici ufficiali è stato eseguito: questa operazione non aggiorna formazioni.

## Test

- PASS `test-champions-package1.js`.
- PASS `test-champions-registered-squads.js`.
- PASS `test-champions-player-markets.js`.
- PASS `test-champions-pilot-predictions.js`.
- FAIL `test-champions-current-season-data.js`.
- PASS `test-champions-reading-page.mjs`.
- PASS `test-champions-schedina-page.mjs`.
- PASS `test-betting-selection-contract.js`.
- PASS `test-personal-betslip.mjs`.

Il test current-season fallisce perché impone uguaglianza con l’as-of del precedente import di squadra (9 ottobre), e nelle verifiche successive congela lo snapshot AEK al 3 ottobre. La nuova importazione individuale è al 19 ottobre. Il test non è stato alterato per nascondere il disallineamento; il nuovo test verifica invece incrementi, storico, null, competizioni e conservazione delle parti estranee. Output completo in test-results.json.

Ulteriori controlli: importer rieseguito con zero importazioni; git diff --check superato. Edge non si avviava nella sandbox; il controllo è stato completato con esecuzione locale autorizzata.

## File e vincoli

Unico file esistente modificato: `data/normalized/champions-player-stats-2026-27.json`. Nuovi file canonici: ledger `data/sources/champions-package1-performances-2026-10-19.json` e 51 snapshot raw gzip limitati agli ID approvati sotto `data/raw/champions-pilot/espn/summaries/2026-27/<league>/2026-10-19/`. Aggiunti cinque script di audit/import/test/browser/report. Tutti i percorsi individuali sono elencati in `files-manifest.json`.

Questa cartella conserva i quattro pacchetti estratti, 51 referti originali completi, snapshot precedente, audit riga per riga, esito import, copertura MD3, risultati test/browser, screenshot e verifica hash. Fonti e metadati restano esclusivamente interni.

Quote Sisal, ID mercati, selezioni, storico 2025/26, Serie A, motori, esiti, pagine e CSS invariati secondo gli hash. Test della persistenza e compatibilità delle schedine salvate superato; nessuna sessione personale del browser è stata modificata. Nessun commit, push, deploy, Pacchetto 2 o ricalcolo definitivo.

Problemi aperti: collegamento esplicito del campione corrente alle proiezioni da valutare separatamente; snapshot test da aggiornare con policy esplicita; formazioni, panchine e artefatti MD3 mancanti. Attendere autorizzazione prima di ricalcoli definitivi o pubblicazione.
