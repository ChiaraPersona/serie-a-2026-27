# Serie A 2026/27

Sito statico autonomo per Serie A, Coppa Italia e statistiche arbitrali, compatibile con GitHub Pages.

## Comandi

- `npm run build` genera tutte le pagine HTML dalle sorgenti condivise.
- `npm run import:calendar` rigenera squadre e calendario Serie A 2026/27.
- `npm run import:referee-calendars` prepara la join delle giornate 2025/26.
- `npm run import:referees:pilot` importa 10 gare di Serie A e 10 di Serie B.
- `npm run import:referees` importa l'intera stagione 2025/26 e genera gli aggregati.
- `npm run validate:referees:2025-26` controlla completezza, duplicati, stage e confronto fonti.
- `npm run download:logos` scarica e converte localmente gli stemmi.
- `npm test` esegue tutte le validazioni.

Per la verifica locale: `python -m http.server 8000`, poi aprire `http://localhost:8000`.

## Statistiche arbitrali

I dati restano distinti in tre livelli:

- `data/raw/referee-stats`: risposte originali del provider e snapshot calendario;
- `data/normalized/referee-matches`: fixture normalizzate, divise per competizione e stage;
- `data/generated/referee-stats`: aggregati e report di validazione usati dal sito.

Il provider si configura con `REFEREE_STATS_PROVIDER`; eventuali chiavi si passano solo tramite variabili d'ambiente. ESPN non richiede chiavi nel repository. La tabella centrale degli alias è `data/normalized/referee-aliases.json` e tutti gli aggregati usano slug canonici.

Le stagioni 2023/24 e 2024/25 sono registrate nei profili dell'importatore ma hanno stato `prepared-not-run`: non vengono eseguite insieme alla validazione 2025/26.

## Flusso del sito

`scripts/build-site.js` genera le shell HTML; `js/app.js` carica i JSON e costruisce le viste. Gli HTML generati non devono essere modificati manualmente.
