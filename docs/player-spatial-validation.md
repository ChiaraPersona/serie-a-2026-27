# Coordinate territoriali per le proiezioni individuali

La v2 affianca la v1 senza modificare i suoi metodi o congelamenti. Nessun ramo sperimentale alimenta i pronostici pubblicati, i criteri di selezione o i contratti DUO.

## Pipeline

- `scripts/research/player-spatial-v2/enrich.cjs` verifica gli HTML compressi rispetto al manifest canonico e unisce gli eventi per fixture, tipo, sequenza, team e player provider ID. Recupera posizione e lato iniziali dove espliciti; non ricostruisce ruoli dinamici o tipi di tiro mancanti.
- `model.cjs` pesa lo storico usando recenza, episodio dell'allenatore, compagni previsti e posizione iniziale. Attenua i campioni piccoli mediante prior più forti. Usa esclusivamente storico anteriore alla giornata e al cutoff della baseline. Minuti e identità della formazione prevista restano quelli della previsione prepartita.
- `run.cjs` stima nuovamente i coefficienti prima di ciascuna giornata storica, utilizzando soltanto giornate precedenti. Riporta anche i periodi con sviluppo insufficiente, senza contarli come test calibrato. Conserva i risultati dei titolari effettivi separatamente dalle osservazioni tecniche degli altri giocatori.
- `prospective.cjs` congela baseline, riallocazione e volume in `data/predictions/player-spatial-v2-prospective/`. La prima cattura è primaria; le revisioni non la sostituiscono. I due rami non si sommano. I coefficienti del protocollo prospettico restano fissi: per aggiornarli occorre una nuova versione del protocollo, senza riscrivere i congelamenti esistenti.
- `auto-capture.cjs` è richiamato dal builder Lettura solo quando il protocollo v2 è già attivo. `SPATIAL_CAPTURE_DISABLED=1` disattiva anche questo congelamento negli staging. L'esito si trova in `output/player-spatial-v2-prematch/latest.json`.

## Comandi

```text
npm run research:player-spatial:v2
npm run test:player-spatial:v2
npm run snapshot:player-spatial:v2 -- --match ID_CANONICO
npm run evaluate:player-spatial:v2
```

L'inizializzazione esplicita usa `--initialize`. È stata eseguita il 29 ottobre 2026. Fiorentina–Atalanta è congelata dalle 19:30:21 UTC, prima del calcio d'inizio; resta un pilota successivo all'esplorazione. La coorte prospettica dichiarata parte dalla giornata 10. Per il pilota MD9 vengono usati i coefficienti sviluppati soltanto sulle MD6–8; per MD10 e successive quelli congelati dopo lo sviluppo sulle gare concluse MD6–9. Nessun parametro utilizza la fixture bersaglio o una giornata successiva.

Gli input derivati e i byte dei dati canonici sono conservati in blob compressi con hash SHA-256; l'estensione conserva anche gli hash dei raw originali. Il protocollo registra hash dei moduli matematici, del parser e dello studio di sviluppo. Le catture tardive o con metodo/studio alterato sono rifiutate. La prima cattura conserva già i parametri e il riferimento con hash allo studio; dalla revisione delle 19:31 UTC anche i byte dello studio sono inclusi nei blob condivisi. Nessuna cattura viene retrodatata.

## Limiti attuali

I dati disponibili non separano gioco aperto e piazzati non da rigore, né parate e blocchi a livello di evento. Non si attribuisce significato aggiuntivo al tag `standard`. I SOT cambiano soltanto per opportunità, mantenendo la precisione della baseline prima della riconciliazione; non esiste una nuova stima di precisione per zona. Il ramo volume riguarda soltanto il gruppo di giocatori con copertura sufficiente, non il totale di tutti i giocatori della squadra.

Il backtest storico è esplorativo anche se temporalmente corretto: MD8–9 erano già state esaminate. Il bootstrap raggruppa per giornata e non produce intervalli con meno di sei giornate indipendenti. I risultati v2 attuali non giustificano una promozione operativa: la riallocazione mantiene coefficiente zero e il ramo volume ha effetto minimo, non uniformemente favorevole sui SOT. Le previsioni successive congelate consentiranno il confronto senza scegliere revisioni a posteriori. Non è una liquidazione certificata e non stima ROI, probabilità o EV DUO.

Risultati e dettagli: [report v2](reports/player-spatial-v2-2026-10-29.md).
