# Verifica dell’effetto dei nuovi dati individuali — 11 novembre 2026

## Esito

Questo primo test non dimostra un miglioramento complessivo dei pronostici di tiri/SOT. I recuperi club non cambiano le previsioni del campione valutabile. La sensibilità che aggiunge le presenze ufficiali della nazionale peggiora leggermente entrambi gli errori medi; le amichevoli migliorano di poco i tiri e peggiorano i SOT. Le differenze dei MAE sono piccole e gli intervalli appaiati includono zero. Nessuna variante viene promossa.

## Campione e controllo temporale

- 18 fixture con snapshot prepartita; 230 previsioni iniziali dei titolari. Usato il primo snapshot valido per ogni fixture.
- Hash dell’intero artifact MD3 identico a quello registrato negli snapshot. Replay numerico riuscito per 24 squadre; 0 squadre messe in quarantena per divergenze del replay o per dati correnti futuri/non databili.
- Coorte appaiata: **174 prestazioni di titolari effettivi in 14 partite Champions**, 20–21 ottobre 2026.
- Esclusi 55 candidati che non hanno iniziato effettivamente la gara e un giocatore senza identità provider ritrovata nel referto. I pronostici erano condizionati alla partenza da titolare: non si introducono sostituzioni retroattive né si valutano i non titolari come se lo fossero.
- Dodici squadre erano già bloccate dai criteri originali e non entrano nel confronto: il replay riguarda le 24 squadre già numeriche, non tutte le 36. Le presenze della panchina restano soltanto nella ripartizione originaria dei volumi.
- Tutti gli eventi correnti utilizzati dai canali archiviati precedono la data della fixture; anche i campioni usati per i minuti attesi precedono la gara. I nuovi dati di nazionale terminano il 30 giugno 2026.
- Le nuove fonti sono state acquisite a novembre: è un confronto retrospettivo con separazione per data degli eventi, non una validazione prospettica né una prova di disponibilità delle nuove fonti a ottobre.
- MD4 non è usata per dichiarazioni di accuratezza prepartita: mancano snapshot immutabili equivalenti e la data globale dell’artifact è successiva ad alcune partite.

## Varianti prefissate

Il protocollo è scritto prima del calcolo delle metriche in `data/analysis/champions/history-validation-2026-11-11/protocol.json`. Nessuna ricerca di pesi o scelta del risultato migliore a posteriori.

1. Baseline: previsioni pubblicate e congelate, riprodotte numericamente.
2. Recuperi club: integrazione delle sole lacune storiche, senza alterare le baseline già utilizzabili né gli altri blocchi.
3. Nazionale ufficiali: esperimento che somma conteggi e minuti delle sole osservazioni coerenti della nazionale maggiore alle osservazioni storiche club.
4. Nazionale amichevoli: esperimento distinto, con le sole amichevoli; non sommate alle ufficiali.

Le sensibilità nazionali introducono una nuova semantica di input, non approvata: danno lo stesso peso per minuto a club e nazionale, senza un correttivo validato per livello degli avversari o cambio di ruolo. Riutilizzano la regressione verso la media, il blend, i minuti attesi e la riconciliazione già esistenti. La riconciliazione viene rifatta sull’intera squadra, con lo stesso universo, budget e target; le variazioni possono propagarsi a giocatori senza dati nazionali.

## Errori di conteggio — più basso è meglio

| Variante | MAE tiri | MAE SOT | RMSE tiri | RMSE SOT |
|---|---:|---:|---:|---:|
| Pronostici archiviati | 0.8094 | 0.5038 | 1.1167 | 0.6797 |
| Recuperi club | 0.8094 | 0.5038 | 1.1167 | 0.6797 |
| Club + nazionale ufficiali | 0.8165 | 0.5051 | 1.1257 | 0.6832 |
| Club + nazionale amichevoli | 0.8081 | 0.5055 | 1.1164 | 0.6819 |

## Differenze appaiate

Intervalli al 95% da 2.000 bootstrap appaiati per fixture (14 cluster), seme fisso. Differenza = errore nuovo meno baseline; valori negativi favoriscono la variante. Il campione è piccolo e sono riportate più metriche: non si scelgono miglioramenti isolati per giustificare l’attivazione.

| Variante | Variazione MAE tiri | IC 95% differenza tiri | Variazione MAE SOT | IC 95% differenza SOT |
|---|---:|---|---:|---|
| Recuperi club | 0.00% | [0.00000, 0.00000] | 0.00% | [0.00000, 0.00000] |
| Club + nazionale ufficiali | 0.87% | [-0.00428, 0.02239] | 0.27% | [-0.00392, 0.00686] |
| Club + nazionale amichevoli | -0.16% | [-0.00473, 0.00165] | 0.34% | [-0.00034, 0.00367] |

## Probabilità individuali — diagnostica

Brier delle soglie 1+ tiri/SOT, calcolato con la stessa trasformazione Poisson condizionata alla titolarità. Più basso è meglio. Non sono probabilità DUO o nuove quote operative.

| Variante | Brier 1+ tiri | Brier 1+ SOT |
|---|---:|---:|
| Pronostici archiviati | 0.167457 | 0.188643 |
| Recuperi club | 0.167457 | 0.188643 |
| Club + nazionale ufficiali | 0.166533 | 0.188824 |
| Club + nazionale amichevoli | 0.166894 | 0.189711 |

Gli esiti delle probabilità sono misti: il piccolo miglioramento del Brier 1+ tiri non coincide con un miglioramento degli errori di conteggio e i SOT non migliorano. L’intervallo del Brier SOT delle amichevoli è sfavorevole, ma una sola metrica in un confronto multiplo non prova un peggioramento generalizzabile. NLL, log loss e soglie secondarie sono conservati nel JSON completo.

## Perché i recuperi club non cambiano il campione

I 20 recuperi club del supplemento compaiono 14 volte nell’artifact MD3 e 14 volte in MD4, usando ID canonici o provider esatti. Nessuna di queste occorrenze aveva una previsione numerica. Nessuna diventa eleggibile con la sola riparazione dello storico: restano minuti attesi mancanti, ruoli portiere o blocchi collettivi/volumi. L’elenco e i blocchi sono in results.json#recoveryCoverage.

Questo zero sul campione non significa che recuperare lo storico sia inutile: aumenta la copertura per le gare future, ma non è una percentuale di miglioramento dimostrata sui pronostici già valutabili.

## Integrità, riproducibilità e limiti

- Nessuna formula operativa, peso, quote, selezioni, snapshot, rosa o previsione pubblicata modificata; SHA-256 degli input protetti verificati prima e dopo.
- Tre moduli hanno hash diversi da quelli registrati negli snapshot. Questo drift è dichiarato nel risultato: il controllo rilevante qui è che tutti i numeri di baseline delle squadre incluse siano stati riprodotti esattamente, senza sbloccare squadre precedentemente escluse.
- Ricerca focalizzata su tiri/SOT individuali. Non dimostra miglioramenti di 1X2, gol, cartellini, corner, rendimento o liquidazioni.
- Nessuna probabilità DUO, quota equa, EV o rendimento viene inventato o ricavato dalle probabilità individuali.
- Nessun commit, push o deploy effettuato durante questa verifica.

## Comandi e fonti interne

```text
node scripts/research/champions-history-validation.cjs
node scripts/test-champions-history-validation.cjs
```

- Risultati completi: `data/analysis/champions/history-validation-2026-11-11/results.json`.
- Snapshot: `data/predictions/champions-event-snapshots/md03/`.
- Artifact e database: `data/normalized/champions-md03-probable-individuals-2026-27.json`, `champions-md03-player-database-2026-27.json`.
- Osservazioni effettive: `data/sources/champions-results-md03-2026-27.json`, referti ESPN in `detailedReportSource.rawPath`, collegati per ID evento, data, squadra e atleta.
- Nuove evidenze: `data/normalized/champions-player-history-context-2025-26.json`, `data/sources/champions-player-senior-national-observations-2025-26.json` e `champions-player-club-history-supplement-2025-26.json`.
- Formule: `scripts/champions/context-adjusted-player-baseline.js`, `current-season-offline.js`, `md3-lineup-policy.js`.
- Audit indipendente: `docs/reports/champions-history-validation-method-audit-2026-11-11.md`.
