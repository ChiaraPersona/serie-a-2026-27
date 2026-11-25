# Champions MD5: ufficiali del 25 novembre, ore 18:45

Aggiornate esclusivamente Sabah–Barcelona (`ucl-2026-27-md05-10`) e Slavia Praha–Villarreal (`ucl-2026-27-md05-11`) dai quattro screenshot dell'utente: 44 titolari e 47 riserve. Entrambe le fonti canoniche della giornata contengono i quattro undici ufficiali e le panchine. Evidenze: `data/sources/official-lineup-evidence/champions-md05-nov25-early/`.

Identità di Junior Almeida collegata all'ID canonico esistente `erivaldo-almeida`, già presente con lo stesso alias nella formazione ufficiale MD3, numero 33 e UEFA ID 250221486. Gistau O. (Barcelona, 42) e Tidiane Thiam C. (Villarreal, 30) conservati come riserve con identità non risolta; nessun ID o dato statistico inventato. Rimangono i blocchi statistici individuali preesistenti per Sabah e Slavia e i singoli giocatori senza evidenza sufficiente.

Eseguiti i builder esistenti per le sole due fixture, senza modifiche a formule, pesi o criteri. Le righe individuali dei non titolari João Cancelo, Raphinha (due contratti) e Carlos Romero sono conservate nell'archivio tecnico e rimosse dal catalogo operativo. I nuovi suggerimenti ricalcolati conservano contratti e quote provider verificati e lo stato preliminare; nessuna approvazione statistica aggiunta, probabilità/fair odds/EV DUO restano N/D.

Suggerimenti: Sabah–Barcelona da 13 a 17; Slavia–Villarreal da 14 a 13. La differenza comprende anche il ricalcolo dei mercati collettivi con gli undici ufficiali. Questo aggiornamento non applica i filtri prudenti sperimentali discussi nell'audit: la politica odierna rimane invariata.

## Verifiche dati e selezioni salvate

- `build-champions-md04.cjs --matchday 5 --official --fixtures ucl-2026-27-md05-10,ucl-2026-27-md05-11`: completato.
- `apply-official-starter-policy.js`: completato; 22 ID canonici per ciascuna fixture nel registro condiviso.
- `build-site.js --presentation-only --champions-pages-only --matchday 5`: completato.
- `test-champions-md04.cjs --matchday 5`: superato, 18 fixture e 271 suggerimenti; contratti esatti, filtro delle selezioni personali salvate e delle gambe MyCombo, riconciliazione con il contratto condiviso Lettura/Schedina.
- `test-betting-selection-contract.js`: superato.
- Hash delle altre 16 fixture del catalogo e di tutti gli scenari estranei invariati; quote, soglie e modificatori dei contratti conservati invariati. Evidenza: `output/champions-md05/nov25-early/data-check.json`.

## Verifiche desktop e mobile

`check-champions-md05-nov25-early-browser.cjs`: superato a 1440 e 390 pixel. Verificati tutti i nomi dei titolari e delle panchine, corrispondenza dei suggerimenti Lettura/Schedina, assenza di overflow e di errori JavaScript, provenienza statistica nascosta secondo policy. Report e screenshot in `output/champions-md05/nov25-early/browser/`.

Nessun commit, push o deploy. Le verifiche di esito e i rendimenti delle gare concluse non sono stati ricalcolati.
