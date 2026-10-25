# Chiusura parziale MD8 — 25 ottobre 2026

Aggiornamento locale delle cinque gare concluse mancanti, verificato alle 17:23 CET: Napoli–Roma 3–3, Lazio–Parma 2–1, Inter–Fiorentina 2–1, Atalanta–Frosinone 4–4, Genoa–Venezia 1–0. Lecce–Juventus in corso e Udinese–Milan non iniziata sono preservate. Totale stagione: 78 gare concluse, otto nella MD8.

Acquisiti 157 impiegati, statistiche di squadra e individuali, marcatori/assist, cartellini, sostituzioni e pali/traverse. Tiri, SOT, falli e legni individuali riconciliati con i totali squadra. MVP ufficiale e pubblico assenti restano null. Matteo Lavelli conserva identità canonica null, senza alias presunti. Atalanta–Frosinone: il riepilogo Corriere riportava 2–2, il referto finale strutturato riporta 4–4 con otto eventi gol riconciliati.

Corretto il titolare del Napoli: Meret al posto di Milinkovic-Savic, confermato anche dalla cronaca ufficiale della Lega. Il precedente dato è conservato in `postmatchCorrection` e nella baseline. Registro titolari e indice squadre sincronizzati. Nessuna nuova selezione retroattiva.

## Fonti interne

Referti StatMuse scaricati in `tmp/md08-112147.html`, `112148`, `112149`, `112151`, `112154` (stesso prefisso/suffisso). URL `https://www.statmuse.com/fc/match/-<ID>`, hash SHA-256 nella baseline. Risultati ed overlay importati con gli importatori esistenti.

Verifiche incrociate consultate:

- https://www.legaseriea.it/serie-a/news/napoli-roma-3-3-gara-ricca-di-gol-ed-emozioni
- https://sscnapoli.it/en/match-report-napoli-roma-3-3/
- https://www.legaseriea.it/serie-a/news/lazio-parma-2026-2027-2-1-cronaca-risultato-gol
- https://www.parmacalcio1913.com/news/seria-a-enilive-lazio-parma-2-1/
- https://www.tuttomercatoweb.com/serie-a/atalanta-frosinone-partita-bella-campionato-bergamo-finisce-4-4-2287111
- https://www.fantacalcio.it/news/calcio-italia/serie-a/ultima-giornata/25_10_2026/genoa-venezia-499731
- https://next2026.tuttosport.com/news/calcio/serie-a/2026/10/25-152135640/diretta_inter-fiorentina_risultato_in_tempo_reale_formazioni_ufficiali_chivu_non_pu_sbagliare

## Pipeline e verifiche

Eseguiti calendario ufficiale, aggregati squadre/leaderboard, archivio informativo dei soli cinque arbitri interessati, filtro titolari (zero rimozioni), build sito presentation-only MD8. Nessun ricalcolo delle previsioni storiche. Hash previsioni, Lettura, Schedina, cataloghi e quote identici alla baseline di inizio intervento. Altre 375 fixture e club estranei invariati. Archivio arbitrale non alimenta retroattivamente i pronostici prepartita.

Esiti statistici sul catalogo pubblicato: Napoli 13 corretti/6 errati, Inter 14/6, Lazio 24/2, Atalanta 18/4, Genoa 9/10. Totale 78/28, nessun esito N/D. Nessuna liquidazione bookmaker certificata o rendimento personale dichiarato.

Passati: `test-md08-postmatch-2026-10-25.mjs`, `test-reading-browser-data.mjs` (380 fixture), `test-personal-betslip.mjs`, `test-betting-selection-contract.js`, `check-md08-postmatch-2026-10-25.cjs` (Edge 1440/390: cinque gare, tabellini, persistenza, selezioni concluse disabilitate, altre fixture selezionabili, fonti nascoste, nessun overflow/errore JS), `git diff --check`.

`test-schedina-md08.mjs` fallisce sulla vecchia baseline `output/md08-schedina/baseline.json`, precedente all'intervento: l'hash predictions corrente è invece identico a quello acquisito all'inizio di questo aggiornamento. Windows ha impedito alcune sovrascritture nella sandbox: indice sostituito atomicamente e build/browser completati fuori sandbox con autorizzazione.

Evidenze: `output/md08-postmatch-2026-10-25/`: baseline, copie precedenti, `data-audit.json`, `settlement.json`, `browser-audit.json` e screenshot desktop/mobile. Nessun commit, push o deploy.
