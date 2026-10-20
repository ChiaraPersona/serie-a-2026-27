# Validazione Champions: lavoro sui sei punti, MyCombo escluso

## Esito

È operativo un percorso di validazione per modello ed evento. Il blocco fisso di approvazione nella pipeline MD3 è stato sostituito dalla lettura di un registro verificato: un PASS effettivo può accedere al selettore condiviso Serie A; assenza di prove, famiglia/soglia/versione diversa o dati non disponibili prima della gara impediscono la promozione.

La Champions MD3 non è ancora statisticamente validata. Il registro reale non contiene osservazioni concluse del modello MD3 corrente: restano 78 previsioni preliminari e zero approvate. I casi sintetici utilizzati per verificare il percorso positivo sono eseguiti solo in memoria e non entrano negli artefatti reali.

## I sei punti

| Punto | Implementazione e stato |
|---|---|
| 1. Definire i mercati | Chiavi separate per versione del modello, metrica, scope squadra/partita/giocatore, soglia, direzione, periodo e regole DUO/pali/supplementari. Un certificato non si trasferisce a un altro evento. |
| 2. Test cronologico | Recupero degli snapshot Git delle prime due giornate, con timestamp del committer e generazione precedenti al kickoff. Snapshot prospettici immutabili delle 18 fixture MD3, con ricevute degli input e del codice; selezione dell'ultimo snapshot valido prima della gara. Replay storico comparativo separato. |
| 3. Esiti esatti | Normalizzazione dei risultati e dei conteggi disponibili; join con fixture/team/player ID esatti, conflitti quarantinati, assenza distinta da zero. Le probabilità condizionate alla titolarità richiedono conferma dell'effettiva partenza da titolare. |
| 4. Precisione e calibrazione | Brier, log-loss, ECE con tabella delle frequenze, bias e MAE. Stessi criteri numerici esportati dal modulo Serie A. Conteggio di gare indipendenti, non di soglie o righe duplicate. Nessun nuovo calibratore è stato fittato o attivato senza dati sufficienti. |
| 5. Prudenza e valore | Probabilità prudenziale e EV conservativo dopo PASS, con la deduzione MD7 invariata; quota mancante e probabilità non validata mantengono gli opportuni N/D. Gli EV centrali preesistenti non sono stati riscritti. |
| 6. Collegamento operativo | Registro con controllo di integrità, modello/versione e cronologia, letto dal builder MD3 e dalla pubblicazione. La catena di aggiornamento aggiorna il registro, costruisce il catalogo e acquisisce gli snapshot prima del kickoff. |

## Dati trovati e utilizzati

- 1.469 risultati europei storici, di cui 503 Champions: esiti sui 90 minuti, non statistiche di tiro inventate.
- 189 gare Champions 2025/26 con conteggi locali. Verifica dei referti raw: 186 terminate nei tempi regolamentari, due dopo supplementari e una ai rigori. Queste ultime tre sono escluse dai conteggi di riferimento sui 90 minuti.
- 36 gare concluse delle prime due giornate correnti: 36 righe squadra per tiri e SOT e 34 per corner, quindi copertura numerica parziale rispetto alle 72 righe squadra potenziali.
- 62 righe individuali con ID esatti dai dati disponibili; il precedente audit rigoroso rimane di 30 osservazioni. I casi senza titolarità verificata non diventano automaticamente esempi validi per probabilità condizionate alla partenza.
- Snapshot Git prepartita per tutte le 18 gare MD1 e tutte le 18 MD2. Le probabilità risultato originali alimentano solo diagnostiche delle loro versioni storiche; non certificano il modello MD3.
- 18 snapshot prospettici MD3 correnti, con 2.803 eventi supportati rappresentati, incluse probabilità esplicitamente indisponibili e relativi limiti. I file precedenti restano immutabili: il valutatore considera l'ultima versione valida per ogni fixture.

Gli snapshot sono acquisizioni locali al tempo di esecuzione, protette contro sovrascrittura e alterazioni rilevabili con hash. Non sono attestazioni temporali rilasciate da un'autorità esterna.

## Replay comparativo

Il motore statistico condiviso Serie A è stato eseguito come confronto diagnostico sui dati Champions: 93 gare training e 93 test. Dispersione stimata solo sul training; per ciascuna gara, input con data strettamente precedente. Nessun dato della gara stessa o delle successive entra nella sua previsione.

Esempio descrittivo, corner totali: Brier 0,2026 contro 0,2036 del riferimento, ECE 0,0233. Questo non autorizza la pubblicazione: il test ha 93 gare indipendenti, contro il minimo condiviso di 180; inoltre è un modello comparativo diverso da MD3 e mancano ricevute storiche complete di disponibilità degli input. Le soglie provider attuali sono una griglia diagnostica dichiarata, non un portafoglio 2025/26 preregistrato. Nessuna sottofamiglia comparativa è stata promossa.

I risultati completi delle nove sottofamiglie sono in `data/analysis/champions/event-validation/historical-count-replay.json`.

## Criteri e protezioni

Il modulo comune conserva i valori originali: almeno 180 fixture nel test, delta Brier massimo 0,005, ECE massimo 0,08, bias entro 2,5 tiri o 1,25 SOT/corner. Per l'evento esatto servono i conteggi di classe e i limiti specifici già previsti: almeno 30 positivi/30 negativi per le soglie, 60/120 per la 1X2 statistica, delta Brier massimo 0,015 ed ECE massimo 0,10. La numerosità da sola non produce PASS.

Anche un PASS statistico non bypassa disponibilità, coerenza, quota esatta e altri controlli del selettore condiviso. Un cambio di versione del modello o una validazione prodotta dopo il kickoff della fixture non concede un'approvazione retroattiva. I DUO restano separati: i conteggi del singolo non vengono usati come esiti DUO e le probabilità non disponibili non vengono ricostruite.

MyCombo è fuori ambito: il relativo array canonico è confrontato integralmente con quello iniziale ed è invariato. Nessun nuovo motore congiunto è stato costruito.

## Verifiche eseguite

PASS:

- `test-champions-event-validation.cjs`: dati futuri, modello/evento esatto, duplicati e conflitti, conteggio indipendente, null, DUO, periodo regolamentare, freeze immutabile e controllo hash, probabilità prudenziale/EV, protezioni degli artefatti.
- `test-champions-validation-integration.mjs`: un campione sintetico valido passa dal certificato al selettore e all'approvazione; il registro reale continua a non approvare. Nessun dato sintetico pubblicato.
- `test-md7-validation-parity.cjs`: confronto con il codice precedente all'intervento, conservato dal commit `de61abf4`; validazione, valutazioni e previsioni Serie A numericamente identiche sugli stessi input correnti.
- `test-champions-md3-publication.mjs`, `test-champions-md3-probable.mjs`, `test-champions-md3-approved.mjs`, `test-schedina-md07.mjs`, `test-personal-betslip.mjs`, `test-betting-selection-contract.js`, `test-reading-detail-adapters.mjs`, `test-reading-detail-internals.mjs`, `test-update-workflow.cjs`, `test-css-modules.js`.
- Browser: tutte le 18 Letture e le 18 fixture della Schedina; stessi ID selezionati, pulsanti di aggiunta/rimozione e dialog operativi. Schedina a 1440, 390 e 320 px senza overflow. Controllo visivo delle etichette di validazione su desktop/mobile.
- Quote, identità dei contratti, probabilità centrali, quote eque ed EV centrali dei 1.790 contratti confrontati con il catalogo iniziale: invariati. Slips storici, dati Serie A protetti e MyCombo invariati.
- `git diff --check` senza errori.

Test storici falliti, non modificati per nascondere l'esito:

- `test-md06-statistical-models.js`: il test pretende 50 gare correnti; l'artefatto già presente ne contiene 54. La parità numerica con il codice precedente passa.
- `test-champions-complete-forecast-snapshots.js`: confronto con un hash Phase 8 ormai superato di `champions-player-stats-2026-27.json`; quel dataset non è stato modificato da questo intervento. Le nuove verifiche mirate del freeze passano.

Suite globale non eseguita. Nessun commit, push o deploy eseguito da questo intervento.

## File principali e utilizzo

- `scripts/champions/event-validation.cjs`: metriche, criteri, cronologia e certificato per evento.
- `scripts/champions/validation-data.cjs`: censimento, ID/versioni, actual, ricevute e snapshot.
- `scripts/champions/historical-count-replay.cjs`: confronto retrospettivo con il motore condiviso.
- `scripts/build-champions-event-validation.cjs`: aggiorna dati di verifica, registro e report.
- `scripts/champions/md3-selection-requirements.cjs` e `scripts/build-champions-md3-schedina.cjs`: consumo del verdetto effettivo.
- `data/analysis/champions/event-validation/`: inventario, registro, osservazioni, pendenti, quarantena e metriche.
- `data/predictions/champions-event-snapshots/`: acquisizioni prepartita immutabili.

Aggiornamento dei controlli dopo avere acquisito gli esiti canonici:

    node scripts/build-champions-event-validation.cjs
    node scripts/build-champions-md3-schedina.cjs --catalog-only

Nuova acquisizione prima delle gare:

    node scripts/build-champions-event-validation.cjs --capture-current

Gli snapshot non vengono trasformati retroattivamente in previsioni originali. Per ottenere la validazione MD3 servono successivi esiti verificati abbinati alle previsioni congelate della stessa versione, fino a soddisfare numerosità e qualità richieste. La disponibilità degli actual storici, da sola, non sostituisce questo requisito.
