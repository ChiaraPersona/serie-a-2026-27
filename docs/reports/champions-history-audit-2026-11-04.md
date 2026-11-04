# Audit storico e criteri di approvazione Champions

Audit eseguito il 4 novembre 2026. Ricerca interna, nessuna modifica al modello operativo o alle soglie.

## Significato di PASS

PASS è l'esito del protocollo nel codice, non una garanzia sul prossimo incontro o sul rendimento economico. La validazione deve riguardare la stessa versione del modello e lo stesso evento/contratto. I risultati di un Elo non certificano una conversione Poisson o un mercato DUO.

Le soglie sono importate da `scripts/md06-statistical-models.js` e applicate da `scripts/champions/event-validation.cjs`, senza copiarle in un nuovo motore.

| Controllo per 1X2 | Soglia attuale |
| --- | --- |
| Partite indipendenti della famiglia | Almeno 180 |
| Casi per il singolo esito, ad esempio 1 | Almeno 60 esiti verificati e 120 non verificati |
| Brier della famiglia meno Brier baseline | Non oltre +0,005 |
| ECE della famiglia | Non oltre 0,08 |
| Brier del singolo evento meno Brier baseline | Non oltre +0,015 |
| ECE del singolo evento | Non oltre 0,10 |

Brier misura l'errore delle probabilità, penalizzando le previsioni sicure e sbagliate. Un delta negativo è un miglioramento sulla baseline; il criterio esistente consente anche un piccolo peggioramento entro la tolleranza indicata. Non richiede di battere i bookmaker. La baseline del gate è un riferimento storico prepartita verificato, non necessariamente una quota.

ECE misura la differenza media ponderata fra probabilità assegnate e frequenze osservate, raggruppando le probabilità in fasce. Un ECE di 0,08 corrisponde a otto punti percentuali di scarto medio, non a un limite massimo su ogni fascia né a una garanzia per ogni partita. La log loss è registrata fra le metriche diagnostiche ma non ha una soglia obbligatoria nel gate corrente.

Prima delle soglie numeriche vengono i requisiti di ammissibilità: previsione originale salvata prima del kickoff, input/training/baseline anteriori al kickoff, versione esatta, esito verificato sui tempi regolamentari e fase di test indipendente preregistrata. La baseline deve avere almeno 30 casi positivi e 30 negativi. Duplicati e conflitti non aumentano il campione. La successiva pubblicazione deve superare anche i controlli ordinari di selezione e di contratto.

Raggiungere 180 partite da solo non basta: nelle 189 Champions 2025–26 l'esito 1 è avvenuto 94 volte e non è avvenuto 95 volte. Questo non raggiunge i 120 casi negativi richiesti per l'1. L'esito 2 ha 61 positivi e 128 negativi: supera il solo requisito di numerosità, ma non costituisce un'approvazione del modello o delle sue probabilità. Le soglie rimangono invariate.

## Censimento verificato

| Stagione | Champions | Europa League | Conference League |
| --- | ---: | ---: | ---: |
| 2023–24 | 125 | 141 | 141 |
| 2024–25 | 189 | 189 | 153 |
| 2025–26 | 189 | 189 | 153 |
| Totale | 503 | 519 | 447 |

Sono 1.469 righe uniche utilizzabili come risultati, senza duplicati o conflitti rilevati, con ID squadra, score90 e kickoff. Questo verifica il contratto del dataset canonico; non trasforma i risultati acquisiti a posteriori in input prepartita certificati.

La mappa UEFA corrente risolve entrambe le squadre di 60 delle 189 gare Champions 2025–26. Applicando `profileRows` del motore attuale a ciascuna data storica, nessuna delle 189 gare ha entrambi i profili domestici con la copertura richiesta e ricevute anteriori al cutoff. La prima acquisizione delle osservazioni domestiche nel file esaminato è del 6 settembre 2026. Non si devono retrodatare quelle ricevute. Un replay retrospettivo può essere esplorativo, ma non diventa una previsione originale prepartita.

L'archivio quote normalizzato esaminato contiene 36 eventi con 1X2 completo, ID provider esatti e snapshot strettamente prima del kickoff canonico: 18 MD3 e 18 MD4 della stagione 2026–27. Non contiene contratti storici verificati delle tre stagioni 2023–26. Questo limite riguarda l'archivio ispezionato; eventuali file grezzi o quote non collegate non sono stati contati come evidenza verificata.

## Evidenza attuale e separazione dei modelli

- Il registro operativo contiene 88 osservazioni ammissibili, su 18 fixture indipendenti per famiglia, e zero approvazioni. Il campione è inferiore a 180.
- L'archivio prospettico MD4 contiene 27 acquisizioni/revisioni valide ma soltanto nove fixture indipendenti. Per l'1X2 del modello condiviso sono presenti otto fixture. Le revisioni non sono nuove partite; questa evidenza non va sommata a quella di un altro modello.
- Il vecchio esperimento Elo dispone di training 2023–24, validazione 2024–25 e test 2025–26. È un riferimento utile, ma quel test è già stato esaminato. Tarare un nuovo modello dopo averne visto i risultati non crea un nuovo holdout intatto.
- Il vecchio report Elo usa Brier multiclass; il registro di eventi usa Brier binario per evento. I numeri grezzi delle due scale non devono essere confrontati direttamente.

## Decisione e lavoro successivo

La ricerca su un rating europeo può partire subito con i risultati disponibili, mantenendo la valutazione retrospettiva chiaramente diagnostica. Il replay storico esatto dell'adattatore domestico attuale richiede invece profili versionati per data, ricevute di disponibilità e una mappa squadra storica più ampia. Il confronto con quote storiche richiede contratti verificati delle stesse partite.

La nuova versione dovrà essere congelata insieme a input, baseline e regole di astensione prima di raccogliere un nuovo holdout indipendente. I dati delle competizioni europee possono aiutare ad apprendere un rating comune; non si presume automaticamente che una validazione Europa/Conference certifichi la Champions. Nessuna approvazione automatica viene aggiunta dal presente audit.

## Riproduzione e verifiche

- `node scripts/research/champions-history-audit.cjs`: inventario e dettagli in `output/champions-result-validation/history-audit.json`, con hash degli input e controllo che non siano stati modificati.
- `node scripts/test-champions-history-audit.cjs`: passa; copre duplicati, conflitti, risultati mancanti, identità, contratti esatti e cutoff rispetto al kickoff canonico.
- Nessuna modifica a sito pubblico, formule, pesi, quote, contratti o formazioni. Nessun build necessario per questo audit interno. Nessun commit, push o deploy.
