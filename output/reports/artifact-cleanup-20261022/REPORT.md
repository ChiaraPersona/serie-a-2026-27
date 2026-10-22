# Pulizia prudente di reports e output

22 ottobre 2026. Nessun commit, push, deploy, staging o modifica della cronologia Git eseguiti.

## Spazio recuperato

| Eliminati | File | Byte |
|---|---:|---:|
| Screenshot PNG vecchi senza riferimenti rilevati | 983 | 411.762.783 |
| Log temporanei vecchi | 18 | 18.860 |
| Cache Python `.pyc` rigenerabili | 3 | 147.891 |
| **Totale** | **1.004** | **411.929.534** |

Totale: **411,93 MB decimali / 392,85 MiB** di contenuto eliminato dal working tree. La cronologia Git e i relativi oggetti restano intatti: questo non è un recupero di spazio nella cartella `.git`.

## Controlli prima della rimozione

- Inventario completo delle due cartelle e scansione di 2.898 sorgenti/documenti, inclusi script archiviati e baseline. Ricerca conservativa dei riferimenti letterali per nome file: anche un nome omonimo citato altrove è stato mantenuto.
- Verifica delle attività nel repository: le altre chat pertinenti risultavano inattive. Consultata anche l'analisi precedente delle due cartelle. Conservate comunque tutte le evidenze recenti delle ottimizzazioni MD2, Schedina e MD3, i file creati nel giorno corrente e gli artefatti delle verifiche risultati del 22 ottobre.
- Conservate immagini con indicazione baseline, before, template, reference o original, immagini referenziate dai sorgenti/documenti e materiale PDF/OCR non classificabile con certezza come screenshot temporaneo.
- Prima di ogni gruppo: nuovo controllo dei riferimenti, dimensioni e timestamp; validazione dei percorsi assoluti sotto `reports` o `output`, assenza di link/reparse point e tipo file consentito. Nessuna cancellazione ricorsiva di cartelle.
- Rimossi soltanto gruppi/file elencati nel manifest. Ogni directory mista conserva gli altri contenuti.

Sono stati preservati **4.314 file**, verificati byte per byte tramite SHA-256 prima e dopo build/test. Fra questi: tutti gli ZIP, JSON, script, report, baseline e le immagini necessarie o recenti. Il contenuto conservato ammonta a 2.508.556.512 byte nell'inventario iniziale. Le tre cache Python erano dentro copie baseline: sono stati eliminati soltanto i bytecode rigenerabili, conservando i sorgenti originali.

Il recupero è volutamente inferiore alla stima generale di circa 1,22 GiB dell'analisi precedente: in questa operazione sono stati mantenuti anche gli screenshot di baseline, quelli citati nei documenti e quelli recenti.

## Gitignore

Aggiornato `.gitignore` con regole limitate alle estensioni temporanee nei gruppi ripuliti e ai singoli percorsi nelle cartelle miste. Nessuna esclusione globale di `reports`, `output`, ZIP, JSON o script. I bytecode Python sono esclusi soltanto sotto `__pycache__` nelle due cartelle.

`git check-ignore --no-index` conferma che tutti i 1.004 artefatti eliminati sono coperti e tutti i 1.433 candidati mantenuti restano tracciabili. I file già tracciati restano deletions nel working tree finché l'utente non decide di registrarle: `.gitignore` non modifica l'indice o la cronologia.

## Build e test

- PASS build completo di presentazione: `node scripts/build-site.js --presentation-only`. Rigenerati i payload UI; nessun motore previsionale o importer eseguito. Ripristinati i soli shell HTML precedentemente puliti che il controllo aveva riscritto, conservando le modifiche Schedina già presenti all'inizio dell'operazione.
- PASS `test-schedina-loading.mjs`.
- PASS `test-champions-md3-browser-data.mjs`: 18 fixture, 1.797 contratti, 187 selezioni salvate.
- PASS `test-champions-md02-browser-data.mjs`: 18 confronti markup e 18 confronti rose.
- PASS `test-personal-betslip.mjs` e `test-betting-selection-contract.js`.
- PASS `test-reading-player-rosters.mjs`: 106 fixture, 2.332 titolari e 1.322 voci di panchina.
- PASS `test-css-modules.js`.
- PASS `test-schedina-md06.js`, che legge report JSON/Markdown di output: dipendenze conservate.
- PASS `test-update-workflow.cjs`.
- `test-reading-cards.mjs`: fallisce perché attende 5 righe mentre il renderer attuale ne produce 6. L'asserzione è alla riga 7, prima della lettura della baseline JSON alla riga 18. Né renderer, né test, né baseline sono stati modificati dalla pulizia: è un'aspettativa non aggiornata, non un file rimosso mancante.

Risultato: **9 test superati, 1 aspettativa obsoleta**; non viene dichiarata verde l'intera suite. Node segnala inoltre il warning già presente sui moduli ESM senza `type` nel package; il build termina correttamente.

## Evidenze

- `plan.json`: inventario, motivazione per i file conservati, riferimenti, gruppi e hash di tutti i file protetti.
- `deleted.json`: percorsi e dimensioni dei file effettivamente eliminati.
- `integrity.json`: risultato del controllo finale dei file conservati.
- `scripts/audit-report-cleanup.cjs`: inventario e pianificazione, senza cancellazione automatica.

Le modifiche delle ottimizzazioni precedenti già presenti nel checkout sono state conservate. Nessun dato del sito, fonte, contratto, quota o formula è stato alterato per la pulizia.
