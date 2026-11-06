# Storico xGOT: acquisizione di due stagioni

Acquisizione completata il 6 novembre 2026. Fonte di acquisizione: FotMob;
non è una certificazione indipendente del modello o dei valori pubblicati.

| Competizione | Stagione | Partite calendario / acquisite | Partite con xGOT di entrambe le squadre | Valori xGOT individuali pubblicati |
|---|---|---:|---:|---:|
| Serie A | 2024/25 | 380 / 380 | 380 | 2.388 |
| Champions League | 2024/25 | 189 / 189 | 189 | 1.356 |
| Serie A | 2025/26 | 380 / 380 | 380 | 2.378 |
| Champions League | 2025/26 | 189 / 189 | 189 | 1.397 |
| Totale | | 1.138 / 1.138 | 1.138 | 7.519 |

Champions comprende fase campionato, spareggi, eliminazione diretta e finale;
le qualificazioni preliminari sono escluse. I calendari restituiscono esattamente
380 o 189 partite concluse per stagione; nessun download fallito.

## File e comandi

- Referti originali compressi: `data/raw/xgot/fotmob/matches/<providerMatchId>.json.gz`.
- Calendari originali: `data/raw/xgot/fotmob/calendars/<leagueId>-<stagione>.json.gz`.
- Dati estratti per competizione e stagione: `data/normalized/xgot-history-seasons/`.
- Registro di copertura: `data/analysis/xgot/seasons/coverage.json`.
- Audit e lista degli ID attesi per stagione: `data/analysis/xgot/seasons/`.

`node scripts/acquire-xgot-seasons.cjs` acquisisce le quattro stagioni indicate nel
codice. Riusa gli archivi già esistenti e scarica solo i mancanti, con quattro
richieste concorrenti e un massimo di tre tentativi per referto. Scrive soltanto
le cartelle sopra elencate. Le risposte originali conservano URL, data di
acquisizione e payload completo. I dati estratti includono hash SHA-256 dei
referti e del calendario.

`node scripts/acquire-xgot-seasons.cjs --offline` rigenera le estrazioni dagli
archivi senza rete. `node scripts/test-xgot-seasons.cjs` verifica in sola lettura
hash, copertura, corrispondenza calendario/referto, estrazione esatta dei valori
pubblicati e gestione dei campi assenti.

Endpoint di acquisizione:

- `https://www.fotmob.com/api/data/leagues?id=<leagueId>&season=<stagione>`
- `https://www.fotmob.com/api/data/matchDetails?matchId=<providerMatchId>`

## Copertura e limiti

Sono presenti 2.276 valori squadra e 28.868 eventi di tiro. In 100 eventi l'xGOT
non è pubblicato: 94 autogol e 6 altri eventi. Questi campi restano `null`, senza
imputazione. La presenza di xGOT per entrambe le squadre non implica completezza
dei valori per ogni giocatore o tiro. Il conteggio corretto dei 7.519 valori individuali
comprende soltanto le osservazioni esplicite, compresi gli zeri pubblicati;
nessuno zero viene dedotto per gli altri giocatori.

Correzione dell'estrattore: il precedente conteggio di 9.750 includeva 2.231
valori di xGOT affrontato dai portieri. Ora `xgotFaced` è separato dall'xGOT
offensivo; si accettano esclusivamente le chiavi esatte del relativo campo.
Le previsioni del confronto v1, basate sui totali squadra, sono rimaste identiche.

I totali squadra sono estratti dal periodo `All` del provider. Non vengono
etichettati come soli 90 minuti: in Champions 4 partite nel 2024/25 e 3 nel
2025/26 contengono eventi dei supplementari. I singoli eventi mantengono il
periodo originale; non si sommano tempi parziali a un totale già completo.

Questi file rappresentano il punto 1, ampliamento dello storico: mantengono tutti
i referti acquisiti. In essi `fixtureId` resta null e
`canonicalIdentityValidationComplete` resta false, senza sovrascrivere gli
originali con conclusioni successive. I risultati dei punti 2 e 3 sono separati
e descritti in [xgot-validation-results.md](xgot-validation-results.md).

`predictiveUseApproved` resta false in tutti i dataset. Non sono modificati
formule, pesi operativi, quote, selezioni,
previsioni o interfaccia pubblica. La data di acquisizione odierna non è prova
della disponibilità del dato a una precedente data prepartita. La versione
storica del modello del provider resta sconosciuta (`modelVersion: null`).
