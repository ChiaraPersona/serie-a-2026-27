# Calcolo Serie A MD9 — 26 ottobre 2026

Aggiornamento locale delle dieci gare del 27–29 ottobre. Nessun commit, push o deploy.

## Input e metodo

- Probabili Fantacalcio: 20 squadre, 220 titolari e 219 riserve, tutti con player ID canonico; 17 riserve fuori rosa conservate separatamente. Snapshot HTML e metadati interni conservati. Stato `probable`, nessun nuovo undici ufficiale.
- Dieci designazioni AIA importate con `import-official-calendar.js --referee-matchday 9`; estrazione verificata in `aia-md09-verified-extraction.json`.
- Snapshot Sisal acquisito il 26 ottobre: 10 gare MD9, 19.426 mercati e 68.605 quote. Eventi delle altre giornate conservati.
- Riutilizzati motore 4.13.0, modelli statistici, validazione congelata MD6 e catalogo condiviso della procedura MD8. Nessuna modifica a formule, pesi o criteri di ammissione. Cutoff: gare concluse prima della MD9.

## Risultati

- Dieci Letture e dieci pronostici completi: 22/22 identità e 20/20 giocatori di movimento per gara.
- 202 pronostici condivisi Lettura/Schedina: 162 con quota verificata, 40 stime senza quota; nessun profilo obbligatorio o preferito aggiunto.
- 30 portafogli MyCombo, con validazione del rischio esistente.
- 103 contratti DUO nel catalogo tecnico: probabilità, quota equa ed EV non validati restano null. Lo stesso controllo è stato applicato alle gambe delle combinazioni.
- Verificate 1.490 quote del catalogo completo contro fixture, market ID, selection ID e quota del provider. Il catalogo completo include anche voci non suggerite.

## Verifiche

PASS: `test-reading-md09.cjs` (dati e 20 casi desktop/mobile), `test-schedina-md09.mjs`, `check-schedina-md09.cjs` (desktop/mobile, salvataggio, ricaricamento, rimozione, sincronizzazione), `test-schedina-loading.mjs`, `test-betting-selection-contract.js`, `test-duo-quote-repair.cjs`, `build-betting-matchday.js --matchday 9 --validate-only`, audit contratti e confronto di tutte le fixture/Letture/previsioni estranee con gli snapshot iniziali.

Il test generale `test-predictions.js` contiene ancora aspettative fisse alla MD8 (conteggio e versione dei pronostici futuri); inoltre associa esempi storici alla rosa probabile corrente. Non è stato modificato. Il test globale `test-reading-browser-data.mjs` rileva una divergenza storica della proiezione Napoli–Roma MD8 rispetto ai metadati ufficiali correnti dopo il build delle rose; la proiezione MD8 è stata preservata. Le verifiche MD9 controllano cutoff, identità, contratti, proiezioni e integrità delle altre giornate.

L'orchestratore generico inizialmente richiamava il vecchio generatore a otto schedine fisse e si fermava sul Poker ammoniti senza copertura. Per MD9 è stato collegato il catalogo condiviso già usato da MD8, senza forzare selezioni o abbassare soglie.

Comandi futuri: `node scripts/build-betting-matchday.js --matchday 9`; build di presentazione `node scripts/build-site.js --presentation-only --matchday 9`. Evidenze: `final-audit.json`, `reports/md09-reading-refresh/`, `reports/md09-schedina/`.
