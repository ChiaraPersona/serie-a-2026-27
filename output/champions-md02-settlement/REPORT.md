# Aggiornamento Champions 13 ottobre 2026

Abbinati e controllati 58 identificativi univoci: fixture, etichetta, mercato, esito selezionato e quota corrispondono agli originali. Le soglie e i modificatori delle selezioni conservate sono invariati.

- Report originario: 58 mercati, 34 VERDE, 24 ROSSO. Nessuna liquidazione Sisal certificata da questi documenti.
- Eliminati: 4 mercati, i due di Édouard, Saka e Lookman. Originali conservati nelle fonti e nell'archivio tecnico.
- Gruppo operativo filtrato: 54 mercati; 26 verdi, 22 rossi, 6 controversi senza colore definitivo.
- Rendimento ipotetico: 48 selezioni confermate a 1 €; ritorno 41,05 €, netto -6,95 €, ROI -14,48%. I quattro esclusi e i sei controversi non partecipano al calcolo.
- Intera giornata MD2: 116 mercati dopo il filtro, dai 120 pubblicati. I 62 mercati esterni al report non ricevono nuovi esiti.
- Sostituzioni aggiunte: nessuna, trattandosi di partite concluse. La procedura futura è documentata in AGENTS.md e usa i builder e i criteri esistenti.

## Questioni aperte

Le motivazioni di Ivanović over 1,5 tiri, Doumbia over 1,5 tiri e Gerard Moreno over 1,5 tiri riportano statistiche di Rashford/Amad. Restano pending finché non sono fornite prove pertinenti. Vetlesen, Osimhen e Nkunku SOT presentano discordanza tra tabellino e cronaca: mantenuti pending. I quattro mercati esclusi presentano inoltre caveat Sisal DUO. Il totale originario non viene riscritto come totale confermato.

## Verifiche

Passano test dedicato al filtro (correzione ufficiale, fixture probabile, modificatori, quote/soglie e fixture del 14 ottobre), eliminazione cache MyCombo e blocco aggiunta diretta, BetSelection, store personale, titolari Serie A MD6 (89 mercati), forecast sync e browser a 1440/390 px. Nessun errore JavaScript o overflow orizzontale; quattro selezioni assenti dalle righe cliccabili di Letture/Schedina.

Il test preesistente `test-champions-md02-integration.js` fallisce sul checksum del calendario: integrazione attende 765C565CF54FD53101EFB723F9FCEC9961BBFA404F79E3009125CAE1968BF900 mentre il calendario già in HEAD ha 31C9FD7B158F08FF1B52A78BA6821B2F35A9E0AC05D81342497A52B502B866ED. Nessun calendario Champions o integrazione è stato modificato per mascherare il problema.

## File di questo intervento

- AGENTS.md
- js/official-starter-policy.js
- js/services/data-service.js
- js/pages/personal-betslip-store.mjs
- js/pages/shared-forecast-contract.mjs
- js/pages/betting.js (aggiunta del report sul retro; preesistenti modifiche preservate)
- scripts/betting-selection-contract.js
- scripts/apply-official-starter-policy.js
- scripts/apply-champions-verification.js
- scripts/build-champions-md02-schedina.js
- scripts/build-site.js (hook del filtro; preesistenti modifiche preservate)
- css/betting.css, css/styles.css
- data/sources/champions-original-markets-md02-2026-10-13.json
- data/sources/champions-verification-md02-2026-10-14.json
- data/normalized/official-starter-registry.json
- data/normalized/schedina-champions-md02.json
- data/technical-archive/official-nonstarter-markets.json
- scripts/test-official-starter-policy.cjs
- scripts/check-official-starter-policy-browser.cjs
- output/champions-md02-settlement/verification-audit.json, REPORT.md e screenshot titolari/report 1440/390

Le altre modifiche già presenti all'avvio (arbitri, matches, renderer Champions e pagine generate) non sono attribuite a questo intervento. Nessun commit, push o deploy.

Il filtro è condiviso tra build, lettura dei dati e MyCombo, con registro aggiornato dalle fonti ufficiali e controllo fail-closed dell'identità. Per una nuova competizione occorre registrare il suo formato canonico ufficiale; la policy non presume che una formazione probabile sia ufficiale.
