# Aggiornamento Champions 13 ottobre 2026

Abbinati e controllati 58 identificativi univoci: fixture, etichetta, mercato, esito selezionato e quota corrispondono agli originali. Le soglie e i modificatori delle selezioni conservate sono invariati.

- Report originario: 58 mercati, 34 VERDE, 24 ROSSO. Nessuna liquidazione Sisal certificata da questi documenti.
- Eliminati: 4 mercati, i due di Édouard, Saka e Lookman. Originali conservati nelle fonti e nell'archivio tecnico.
- Gruppo operativo filtrato dopo la conferma dell'utente: 54 mercati; 29 verdi, 25 rossi, 0 controversi operativi.
- Rendimento ipotetico: 54 selezioni confermate a 1 €; ritorno 45,90 €, netto -8,10 €, ROI -15,00%. I quattro esclusi non partecipano al calcolo.
- Intera giornata MD2: 116 mercati dopo il filtro, dai 120 pubblicati. I 62 mercati esterni al report non ricevono nuovi esiti.
- Sostituzioni aggiunte: nessuna, trattandosi di partite concluse. La procedura futura è documentata in AGENTS.md e usa i builder e i criteri esistenti.

## Questioni aperte

L'utente ha confermato Ivanović, Doumbia e Gerard Moreno VERDE; Vetlesen, Osimhen e Nkunku ROSSO. Gli esiti sono ora applicati come conferma statistica dell'utente, con provenienza separata e senza dichiararli liquidazioni ufficiali Sisal. Le motivazioni incongruenti e le discordanti statistiche precedenti sono conservate nella fonte originaria e nel campo originalEvidenceReason. I quattro mercati esclusi conservano i caveat Sisal DUO. Il report originario di 58 mercati, 34 verdi e 24 rossi rimane immutato; il rendimento aggiornato usa i 54 operativi confermati.

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
- data/sources/champions-verification-confirmations-2026-10-14.json
- data/normalized/official-starter-registry.json
- data/normalized/schedina-champions-md02.json
- data/technical-archive/official-nonstarter-markets.json
- scripts/test-official-starter-policy.cjs
- scripts/check-official-starter-policy-browser.cjs
- output/champions-md02-settlement/verification-audit.json, REPORT.md e screenshot titolari/report 1440/390

Le altre modifiche già presenti all'avvio (arbitri, matches, renderer Champions e pagine generate) non sono attribuite a questo intervento. Nessun commit, push o deploy.

Il filtro è condiviso tra build, lettura dei dati e MyCombo, con registro aggiornato dalle fonti ufficiali e controllo fail-closed dell'identità. Per una nuova competizione occorre registrare il suo formato canonico ufficiale; la policy non presume che una formazione probabile sia ufficiale.
