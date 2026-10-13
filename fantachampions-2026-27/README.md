# FantaChampions 2026/27 optimizer

Workspace separato per l'ottimizzazione della classifica generale dalla MD2 alla finale.
Non modifica il motore Champions, le letture o i pronostici del sito: li legge soltanto.

## Riproduzione

```powershell
& 'C:\Users\utente\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\fantachampions-2026-27\scripts\run_analysis.py
& 'C:\Users\utente\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest discover -s .\fantachampions-2026-27\tests -v
```

Output principali:

- `data/listone.json`: estrazione verificabile del PDF iniziale;
- `data/team-advancement.json`: simulazione Monte Carlo delle 36 squadre;
- `data/player-projections.json`: proiezioni dichiaratamente modellate per ogni giocatore e per ciascuna MD2-MD8, con avversario, xG da motore/fit Poisson, probabilità di voto e intervallo d'incertezza;
- `output/strategies.json`: tre rose, formazione MD2, panchina e controlli;
- `output/report.md`: report leggibile;
- `output/validation.json`: esito dei vincoli regolamentari e limiti dei dati.

## Limiti dichiarati

- Le quotazioni sono quelle iniziali del PDF del 30 settembre 2026. L'app non espone in una fonte pubblica verificabile le quotazioni correnti: ogni rosa resta `PROVVISORIA_PREZZI` finché non viene confrontata con l'app.
- Il repository non contiene uno storico completo dei voti Fantacalcio per tutti i 36 club. Il voto base è quindi una proiezione variabile, non un dato osservato e non un 6 fisso; le rose restano `PROVVISORIE_VOTI`.
- Il sorteggio della fase a eliminazione diretta è simulato con fasce e forza relativa, senza trattare l'avanzamento come certo.
- Le quote correnti e gli acquisti nell'app non vengono toccati.

