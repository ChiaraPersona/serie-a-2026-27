# Ottimizzazione JSON Lettura

Misure HTTP locali a cache fredda, bytes JSON non compressi; richieste ripetute incluse. Stessi valori a 1440 e 390 px.

| Pagina | Prima | Dopo | Riduzione | Richieste JSON |
| --- | ---: | ---: | ---: | ---: |
| Indice | 25.821.452 B | 102.432 B | 99,60% | 14 → 1 |
| Fiorentina–Como G7 | 56.606.031 B | 1.384.177 B | 97,55% | 27 → 3 |
| Milan–Atalanta G7 | 56.663.313 B | 1.459.102 B | 97,42% | 27 → 3 |
| Atalanta–Frosinone G8 | 40.002.750 B | 810.554 B | 97,97% | 24 → 3 |
| ID sconosciuto | 29.334.766 B | 102.432 B | 99,65% | 15 → 1 |

## Implementazione

`scripts/build-reading-browser-data.cjs` genera l'indice, i dettagli per fixture e cataloghi mirati per la riconciliazione dei salvataggi. Integrato nel build di Lettura, anche presentation-only. Non richiama importatori o motori previsionali.

L'indice conserva tutte le 380 fixture, calendario, stato e risultato; non scarica previsioni, rose o archivi. I dettagli conservano il report partita completo, la previsione originale, i precedenti e le evidenze delle due squadre. Gli oggetti di contratto suggeriti restano integri. Il servizio applica la policy ufficiale esistente, con la stessa eccezione per gli archivi conclusi. I cataloghi di altre partite sono richiesti solo per selezioni già salvate nel contesto attivo.

## Verifiche

- `scripts/test-reading-browser-data.mjs`: PASS su 380 fixture per risultati/report completi, previsioni, contratti pubblicati e cataloghi salvati; identità, rose, panchinari e scenari verificati per G1/G6/G7/G8.
- `scripts/check-reading-loading.cjs`: PASS su 10 combinazioni pagina/viewport, testo visibile identico alla baseline, nessun overflow o errore JavaScript; archivio apri/chiudi, giornate future, navigazione sezioni, schede giocatori, filtro titolari/panchinari, dialogo schedina, blocco selezione su gara conclusa e riconciliazione fra due fixture salvate.
- Screenshot desktop/mobile acquisiti e ispezionati; tutti e cinque gli screenshot mobile sono identici byte per byte alla baseline.
- Test adattatori, internals, H2H e roster: PASS. Roster: 106 fixture, 2.332 titolari e 1.322 panchinari.
- SHA-256 di 13 archivi verificato invariato prima/dopo un'ulteriore rigenerazione. Nessuna modifica a fonti canoniche, risultati, motori o formule.
- `git diff --check` sui file modificati: PASS.

## Limiti dei test esistenti

`test-reading-cards.mjs` richiede cinque barre, mentre lo scenario corrente ne produce sei (modulo scenario non modificato).

`test-reading-bench-starter-scenarios.mjs` segnala un'associazione mancante per Vincent Sierro, Parma–Torino G7, usando direttamente archivi originali. Il nuovo test confronta anche queste evidenze prima/dopo e conferma parità; nessun ricalcolo o riparazione degli archivi eseguito.

## Comandi

```text
npm run build:readings:browser-data
npm run test:readings:browser-data
npm run test:readings:loading:browser
node scripts/build-site.js --presentation-only --readings-index-only
```

Nessun comando di commit, push o deploy eseguito. Durante il lavoro è stato osservato un aggiornamento esterno di HEAD al commit `2944d1df` (`alleggerimento`); non è stato creato o annullato da questa esecuzione.

Successivamente è cambiato esternamente anche `data/normalized/predictions.json`. Le proiezioni sono state rigenerate dai nuovi dati e il test di parità sulle 380 fixture è passato nuovamente. Il confronto byte/testo/screenshot prima-dopo della tabella riguarda la baseline iniziale; `current.json` e gli screenshot `current-*` documentano l'ulteriore verifica browser sui dati aggiornati. Il controllo SHA-256 citato sopra riguarda la rigenerazione precedente all'aggiornamento esterno.
