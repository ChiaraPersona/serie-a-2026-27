# Congelamento e verifica prospettica delle zone di tiro

Attivato il 29 ottobre 2026. Solo ricerca: non modifica formule operative, probabilità pubblicate, quote o selezioni. Non esegue liquidazioni individuali o DUO e non produce ROI certificati.

## Prima acquisizione reale

Fiorentina–Atalanta MD9 è stata congelata il **29 ottobre 2026 alle 19:17:42 CET**, prima del calcio d'inizio canonico delle **20:45 CET**. Formazioni disponibili: probabili, entrambe con undici ID canonici. Tutte le tre politiche territoriali hanno un segnale disponibile. Il protocollo e i coefficienti sono conservati senza successive ottimizzazioni sui risultati.

L'acquisizione è classificata `PILOT_POST_EXPLORATORY`: MD9 appartiene alla giornata già parzialmente esaminata. La coorte `PROSPECTIVE_PREDECLARED` parte da MD10. Le due coorti non vengono fuse per dichiarare un miglioramento.

Frosinone–Lecce MD9 è stata rifiutata perché il calcio d'inizio era già passato, benché il calendario locale la indicasse ancora come programmata. Tutte le altre otto gare MD9 concluse sono escluse da nuove acquisizioni.

Il risultato di Fiorentina–Atalanta rimane in attesa: nessuno zero, esito o rendimento è stato inserito per supposizione.

## Dati congelati

`data/predictions/spatial-prospective/` contiene:

- `protocol.json`: protocollo immutabile, istante di attivazione, policy, coefficienti e hash del codice del metodo.
- `manifest.json`: registro delle acquisizioni e delle revisioni, con ruolo della previsione, hash, formazione disponibile e cutoff di calendario.
- `2026-27/<fixtureId>/<istante>-<hash>.json`: previsione pubblicata integra, XI disponibili, vettori territoriali, contesto tecnico, tiri utilizzati, pesi della storia e previsioni sperimentali.
- `inputs/<SHA-256>.json.gz`: copie byte per byte degli input JSON, compresi coordinate, minuti e contesti individuali storici, compresse e deduplicate per contenuto. Sono incluse le statistiche di altre gare già disponibili al momento della cattura; i filtri temporali ne impediscono l'uso improprio per la fixture bersaglio.

Gli hash verificano l'integrità locale. Non costituiscono una firma con autorità temporale esterna. Le versioni storiche sono quelle osservate al momento del congelamento: non si afferma che fossero identiche alle versioni pubblicate originariamente prima delle vecchie gare.

Per il codice del metodo è ammessa esclusivamente la conversione LF/CRLF effettuata da Git, conservando gli hash congelati originali. Qualsiasi altra variazione viene bloccata. Gli HTML dei comunicati sono esclusi dalla normalizzazione del testo per preservarne gli hash byte per byte.

La formazione disponibile e la previsione pubblicata sono conservate con i loro rispettivi timestamp. La presenza di un nuovo XI ufficiale nell'acquisizione non implica che una previsione pubblicata più vecchia lo avesse già usato. Le revisioni mantengono traccia della differenza senza riscrivere la prima previsione.

## Regole del protocollo

Le politiche sono fisse:

1. Ultime cinque gare territoriali valide.
2. Peso decrescente con emivita di tre gare valide.
3. Solo ciclo osservato dell'allenatore noto prima del cutoff.

I coefficienti provengono dallo stesso campione di dieci gare MD6–7 impiegato nel confronto comune. Non si rifanno fit automaticamente quando arrivano gli esiti del nuovo test. Il controllo senza coordinate usa la calibrazione stimata sugli stessi ID. Il confronto con il modello pubblicato usa le lambda congelate; i mercati derivati sono conservati direttamente prima della partita.

Si mantengono la soglia di cinque gare osservate, i priors e i limiti del metodo sperimentale precedente. Campioni insufficienti, allenatore sconosciuto o baseline assente producono un'astensione esplicita; nessun valore mancante diventa zero. Gli xG per singolo tiro restano N/D.

Il cutoff delle feature è il più prudente tra la prima data della giornata bersaglio e la data locale della cattura. Sono escluse la fixture bersaglio, le gare della stessa giornata e le date uguali o successive al cutoff. Il contesto tecnico ammette le nomine solo dopo la pubblicazione e dalla decorrenza effettiva. I timestamp futuri delle formazioni vengono segnalati come indisponibili.

## Immutabilità e revisioni

L'acquisizione verifica stato, kickoff confermato, orologio UTC locale e assenza di un risultato già registrato. Una fixture iniziata viene bloccata anche se lo stato del calendario è rimasto indietro. L'orario viene ricontrollato durante la scrittura: un file completato troppo tardi non entra nel registro e non viene valutato.

La prima acquisizione registrata con baseline valida è `PRIMARY`. Acquisizioni successive possono aggiungere revisioni, ad esempio passando da probabili a ufficiali, ma non sostituiscono la primaria. Un primo tentativo senza baseline viene conservato come `ABSTENTION` e non impedisce di registrare in seguito una vera primaria, sempre prima del kickoff.

Una ripetizione con gli stessi input e lo stesso contenuto non crea duplicati. Scritture concorrenti sono bloccate da un lock; i file di snapshot e gli input vengono creati senza sovrascrivere quelli esistenti. Le modifiche al metodo bloccano nuove catture fino a una nuova versione del protocollo, senza influire sulle previsioni pubblicate.

## Funzionamento negli aggiornamenti

Il builder delle proiezioni Lettura chiama il congelamento dopo la rigenerazione. Se esiste un protocollo attivo, considera le giornate con almeno una previsione per una gara ancora acquisibile. Registra anche le astensioni delle altre fixture della stessa giornata. Non genera pronostici mancanti per giornate future.

La valutazione viene aggiornata nello stesso passaggio. Si scrive esclusivamente in `data/analysis/spatial-prospective/latest.json`; esecuzioni e blocchi sono riportati in `output/spatial-prematch/last-capture.json`. Un problema di integrità blocca la relativa ricerca e viene segnalato, senza cambiare il calcolo o la pubblicazione dei pronostici.

Non è un processo in background: acquisizione e valutazione avvengono quando si eseguono gli aggiornamenti della Lettura o i comandi dedicati. Senza un'esecuzione prima della gara non viene inventato uno snapshot retroattivo.

Lo staging dell'orchestratore imposta `SPATIAL_CAPTURE_DISABLED=1`: le copie di lavoro e le verifiche di staging non generano acquisizioni prospettiche. La variabile può essere usata anche per build locali puramente diagnostici. L'evaluatore manuale resta utilizzabile sugli snapshot reali già salvati.

```text
npm run snapshot:spatial -- --pending
npm run snapshot:spatial -- --match <fixture-id-canonico>
npm run snapshot:spatial -- --matchday 10
npm run evaluate:spatial:prospective
npm run test:spatial:prospective
```

Il protocollo è già inizializzato. `--initialize` serve solo alla prima attivazione in un ambiente nuovo con gli input di ricerca richiesti; non sovrascrive un protocollo esistente. Non sono previste opzioni per retrodatare o sostituire snapshot.

## Valutazione successiva

Si leggono solo le primarie registrate, dopo verifica di hash e input. Una gara entra nelle metriche solo con risultato canonico conclusivo, punteggi interi non negativi e kickoff passato. Gare assegnate a tavolino, annullate o con programma cambiato rispetto alla cattura sono escluse e segnalate.

Le metriche usano esclusivamente probabilità e lambda congelate; previsioni aggiornate in seguito non possono modificare il giudizio. Ogni politica viene confrontata con baseline e calibrazione sugli stessi incontri disponibili. È riportato anche il campione comune a tutte le politiche, insieme alle astensioni. Con pochi dati le metriche e gli intervalli sono N/D, non zero; l'intervallo per giornata richiede almeno sei giornate indipendenti nella policy fissata.

Rendimenti e liquidazioni certificate rimangono separati. Le anomalie storiche dei sei gol e delle tre gare già documentate conservano le esclusioni: il congelamento non le risolve né le riattribuisce arbitrariamente.

## Controlli effettuati

Test su blocco al kickoff, orari futuri delle formazioni, identità degli undici, prima baseline e revisioni, input originali compressi, astensioni, alterazioni degli snapshot e degli hash, lock concorrente, passaggio del kickoff durante la scrittura, valutazione sui soli dati congelati, attesa del risultato e separazione pilota/MD10. I test con orologio controllato usano cartelle isolate sotto `output/spatial-prematch-tests/`, mai il registro reale.

Build Lettura e verifiche delle 380 proiezioni completati. La ripetizione del build ha riconosciuto l'acquisizione reale già presente senza aggiungerne una duplicata. Pronostici, quote, Schedina, risultati, formazioni ufficiali, registro titolari e vecchi snapshot MD6 restano invariati. Nessun commit, push o deploy.
