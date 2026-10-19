# Unificazione Schedine Champions / Serie A — 19 ottobre 2026

## Risultato e perimetro

Champions MD1, MD2 e MD3 usano ora i renderer e il gestore personale già impiegati dalla Serie A in `js/pages/betting.js`. Un adattatore di presentazione legge i dati canonici di ogni giornata e fornisce lo stesso catalogo a Letture e Schedina. Nessun nuovo motore, nessun ricalcolo dei pronostici, nessuna nuova copia normalizzata delle previsioni.

La visibilità delle card non è stata modificata. Dimensioni, fronte, tema, collegamenti e comportamento flip preesistenti sono conservati. I dati di CL1/CL2 e delle sette singole CL3 sono identici alla fotografia iniziale. Non sono stati eseguiti commit, push o deploy.

## Differenze individuate e interventi

| Funzione | Situazione precedente Champions | Situazione attuale |
|---|---|---|
| Pronostici per partita | MD1 solo schedine archiviate; MD2 pannelli dedicati; MD3 elenco separato di sette singole e catalogo manuale | Stessi pannelli e righe selezionabili Serie A, raggruppati per tipologia; archivi conclusi in sola lettura |
| MyCombo / costruttore | MD3 montava ripetutamente l'interfaccia dedicata sulle 18 fixture | Un costruttore per pagina e giornata; stesso renderer MyCombo e stessi controlli della Serie A |
| Letture | Percorsi diversi per MD1/2 e MD3; catalogo MD3 distinto dalla vista dei pronostici approvati | Le 54 Letture accedono all'adattatore comune e al medesimo gestore personale della Schedina |
| Selezioni MD3 | Le probabilità esistenti non erano tutte esposte nella vista dei pronostici | 167 contratti con probabilità congelata, comprese le sette approvate; 490 scelte manuali con probabilità N/D |
| Retro CL1 | Successo e rendimento presenti, importi economici incompleti | Puntato, ritorno e netto aggiunti usando `archiveStats`, senza cambiare gli esiti |
| Retro CL2 | Già basato su archivio audit e calcoli comuni | Invariato, inclusi i nove esiti non definiti |
| Retro CL3 | Simulazione limitata alle sette singole | Simulazione separata di 1 € per ciascuna delle 167 previsioni valutabili, con lo stesso `archiveStats`; indicatori N/D prima dei risultati |
| Tema nelle Letture | Le regole del costruttore scuro erano applicate soltanto alla pagina Schedina | Stesse regole estese al pannello condiviso dentro le Letture Champions; nessun effetto Serie A |

## Funzionalità già equivalenti, riutilizzate

- Store personale, identificazione dei contratti, separazione competizione/stagione/giornata, salvataggio locale, rimozione e ripristino delle selezioni.
- Controlli su duplicati, contraddizioni, sovrapposizioni e combinabilità commerciale sconosciuta.
- Quota combinata teorica come prodotto matematico, distinta da una quota MyCombo confermata; nessuna probabilità congiunta inventata.
- Funzioni condivise di valutazione degli esiti e calcolo economico. Le liquidazioni storiche già archiviate restano prioritarie; le nuove valutazioni richiedono gara conclusa e punteggio effettivo.
- Struttura glass, card fronte/retro, spaziature, vista personale desktop e dialog mobile, controlli accessibili da tastiera e touch.

## Catalogo MD3 effettivamente disponibile

| Tipologia | Mercati | Selezioni aperte | Con probabilità congelata |
|---|---:|---:|---:|
| Risultato | 18 | 54 | 54 |
| Doppia chance | 18 | 52 | 5 |
| Gol | 141 | 244 | 108 |
| Corner | 58 | 116 | 0 |
| Tiri / SOT collettivi | 191 | 191 | 0 |
| Totale | 426 | 657 | 167 |

Le 167 previsioni non costituiscono 167 consigli approvati: le sette singole mantengono la dicitura di approvazione e sono nel gruppo principale MyCombo; le altre sono alternative con probabilità già disponibili. Nessuna selezione viene inserita automaticamente nella schedina personale. Le combinazioni e le alternative vengono valutate separatamente, mai trasformate in una multipla automatica.

La simulazione economica del catalogo considera ogni esito valutabile come singola indipendente da 1 €, anche quando due alternative dello stesso mercato sono reciprocamente esclusive. Non rappresenta un investimento effettuato, una combinazione Sisal o il solo paniere delle sette approvate. Le 490 scelte senza probabilità non entrano nel rendimento del modello.

## Integrità ed economia storica

| Archivio | Esiti | Vinti | Persi | In attesa | Puntato | Ritorno | Netto | Successo | ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CL1 | 52 | 31 | 21 | 0 | 52,00 € | 43,80 € | −8,20 € | 59,62% | −15,77% |
| CL2 | 117 | 74 | 34 | 9 | 108,00 € | 116,30 € | +8,30 € | 68,52% | +7,69% |
| CL3 | 167 | — | — | 167 | N/D | N/D | N/D | N/D | N/D |

Il filtro operativo MD2 resta a 113 contratti; i 117 contratti originari dell'audit rimangono visibili solo come archivio storico, compresi i quattro contratti non titolari. Nessuna nuova giocata può essere aggiunta dalle righe delle gare concluse. CL1 conserva anche la consultazione delle otto schedine originarie, senza ricalcolarle.

Sono rimasti identici 9.505 file protetti preesistenti, compresi dati normalizzati, fonti interne, quote e identificativi, preview congelata, statistiche individuali, motori e builder di previsione. I cambiamenti rispetto alla fotografia iniziale sono solo di presentazione, adattamento e verifica.

## Blocchi dovuti ai dati

- Le probabilità per i 490 contratti rimanenti non sono disponibili: nessuna viene dedotta dalla media prevista di tiri, SOT, corner o cartellini.
- Nessun nuovo contratto individuale viene proposto. Le probabilità individuali preliminari non equivalgono ai contratti DUO con sostituto, tempi supplementari, pali/traverse o periodi diversi dello snapshot. Gli altri dati individuali rimangono invariati nelle Letture.
- Nessuna combinazione commerciale Sisal è confermata automaticamente. Gli avvisi del gestore comune rimangono attivi.
- I nove esiti MD2 non risolti restano in attesa, esclusi da puntato, ritorno e ROI.
- Le quote sono quelle dello snapshot esistente; non è stata eseguita una nuova raccolta.

## Verifiche

Superati:

- `test-champions-shared-workspace.mjs`: 54 fixture; cataloghi 52/117/657; 167 probabilità identiche; 490 N/D; sette approvazioni esatte; nessun duplicato; quote, soglie, modificatori e ID immutati; persistenza, contesti, contraddizioni; simulazione di gara conclusa tramite funzioni comuni; integrità dei 9.505 file protetti.
- `test-personal-betslip.mjs`.
- `test-champions-md3-preliminary.mjs`.
- `test-champions-md3-approved.mjs`.
- `test-champions-md02-audit-display.mjs`.
- `test-champions-schedina-page.mjs`.
- `test-champions-referee-readings-md02-page.mjs`: 18/18.
- `test-betting-selection-contract.js`: 6 contratti Schedina e 137+137 gambe MyCombo/previsioni Serie A.
- `test-champions-reading-page.mjs`.

Browser: verifica completa in corso; l'esito finale e le catture sono salvati in questa directory.

Anomalia preesistente, non aggirata: `test-champions-md02-schedina.mjs` attende 120 selezioni operative ma il file attuale ne contiene 113. Il test e il file dei dati hanno entrambi lo stesso hash di inizio attività. Il test specifico dell'archivio audit 117/113 è superato. Non sono state modificate le attese storiche per ottenere un esito verde.

## File interessati

Modificati:

- `js/pages/betting.js`: riuso del workspace, righe, MyCombo, gestore personale e calcolo economico già presenti; contenuti dei retro Champions.
- `js/pages/champions.js`: collegamento delle Letture al catalogo e al gestore comuni.
- `css/betting.css`: applicazione dello stesso tema al workspace nelle Letture, con selettori limitati a Champions.
- `scripts/build-site.js`: versionamento degli asset di presentazione Champions/Schedina.
- `champions-league.html`, `schedina.html`: soli shell rigenerati con `--md3-pages-only --presentation-only`.

Aggiunti:

- `js/pages/champions-workspace-catalog.mjs`: adattatore di sola presentazione dei dati canonici MD1/2/3.
- `scripts/test-champions-shared-workspace.mjs`.
- `scripts/check-champions-shared-workspace-browser.cjs`.
- Questa directory di report, fotografia iniziale, risultati e catture browser.

Nessuna attivazione in produzione. Nessun commit, push o deploy.
