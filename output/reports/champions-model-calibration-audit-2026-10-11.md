# Champions League 2026/27 — Fase 8 audit identità, calibrazione e backtest

Data audit: **2026-10-11**  
Cutoff dati Fase 7: **2026-10-09**  
Gate finale: **CHAMPIONS MODEL-CALIBRATION GATE = PARTIAL**

## A. Executive summary

Il baseline A è valutabile in modo cronologico ma soltanto su **30 osservazioni giocatore** in **6 partite** della prima giornata. Il campione è descrittivo e non abilita calibrazione. Il baseline B è bloccato perché il dataset individuale current-season è stato acquisito il 2026-10-09T20:50:55.469Z, dopo le gare. Il candidato C resta non calibrato: League Strength e pilot contestuale sono posteriori alla giornata e non esiste una finestra di training Champions precedente separata dal test.

Non emerge una contaminazione identitaria strutturale provata: il caso Atlético è uno slug URL fuorviante con **club ID 50124** e contenuto ufficiale Atlético; Veerman presenta PSV il 15 agosto e Dortmund dal 29 agosto, senza sovrapposizioni. Restano però 37 risoluzioni basate sulla sola corrispondenza nominale, 33 giocatori verificati UEFA ma assenti dal registro interno e Mika Medina irrisolto: tutti esclusi dalla calibrazione quando pertinenti.

## B. Audit identità prima della calibrazione

| caso | evidenza | decisione |
|---|---|---|
| Atlético de Madrid | URL richiesto https://www.uefa.com/uefachampionsleague/clubs/50124--athletic-club/squad/; club ID 50124; meta body Atlético=true; meta body Athletic=false | club-id-and-content-confirm-atletico; misleading slug is non-structural |
| Joey Veerman | PSV Eindhoven: 2026-08-15 → 2026-08-15; Borussia Dortmund: 2026-08-29 → 2026-09-19 | chronologically-consistent-club-change; lista UEFA Dortmund, nessun conflitto nella stessa data |
| exact-name only | 37 casi | non ammessi alla calibrazione senza affiliazione indipendente |
| exact-name + affiliazione ESPN | 26 casi | evidenza più forte, sempre soggetta al cutoff |
| provider ID su club diversi | 5 casi; conflitti stessa data 0 | sequenze temporali compatibili con cambio club |
| UEFA verificati fuori registro | 33: List A 7, List B 26 | discrepanza diagnostica; 74 flag invariati |
| Mika Medina | providerPlayerId=null; uefaPlayerId=null; stato=open | escluso da qualunque calibrazione |

Le statistiche storiche restano attribuite al club e alla data originali. Sono presenti 10 giocatori del registro corrente con evidenza su altro club; nessuna riga viene retroattivamente rietichettata come statistica del club corrente.

## C. Dataset di valutazione

| misura | valore |
|---|---:|
| Match candidati | 18 |
| Match ammessi | 6 |
| Match esclusi | 12 |
| Osservazioni giocatore candidate | 101 |
| Osservazioni ammesse | 30 |
| Osservazioni escluse | 71 |
| Giocatori unici ammessi | 30 |
| Osservazioni shots | 30 |
| Osservazioni SOT | 30 |

Il timestamp di disponibilità del forecast è il commit Git che contiene lo snapshot, e deve essere strettamente precedente al kickoff. La data evento degli actual non viene confusa con la data di disponibilità degli input.

Il perimetro giocatore è l'unione dei top-5 serializzati per tiri e per SOT in ciascuna gara: **non è un backtest dell'intero XI**. Con una sola giornata parzialmente coperta, il disegno è una valutazione di snapshot pre-match senza refit; una calibrazione rolling/expanding non è ancora identificabile.

| motivo esclusione osservazione | conteggio |
|---|---:|
| observed_champions_match_unavailable | 69 |
| no_observed_appearance | 2 |

## D. Disegno walk-forward e leakage audit

Per ogni gara è stato selezionato l'ultimo snapshot di `data/normalized/champions-player-markets-md01-2026-27.json` sia generato sia committato prima del kickoff. Gli actual sono stati uniti dopo la gara con chiave `teamId + registeredPlayerId`. Non sono state usate formazioni future, aggregate di fine finestra, trasferimenti retroattivi, rose UEFA successive, Elo successivo o parametri fittati sul test.

| stato | partite |
|---|---:|
| ADMITTED | 6 |
| EXCLUDED — actual individuali Champions non disponibili | 12 |
| EXCLUDED — altro | 0 |

## E. Confronto A / B / C

| modello | stato | campione accoppiato | decisione |
|---|---|---:|---|
| A — baseline production storico | EVALUATED_LIMITED | 30 | metriche descrittive consentite |
| B — domestic current-season, blending esistente | CHRONOLOGY_BLOCKED | 0 | input recuperati dopo le gare; nessun backfill causale |
| C — context-adjusted League Strength/Elo | UNCALIBRATED | 0 | nessuna finestra training/test separata; nessun coefficiente stimato |

Confronto paired A/B/C: **NON ESEGUITO**. Non esistono osservazioni comuni cronologicamente ammissibili; produrre delta o test statistici creerebbe un confronto artificiale.

## F. Metriche baseline A

| metrica | n | MAE | RMSE | bias |
|---|---:|---:|---:|---:|
| shots | 30 | 1,855 | 2,301 | 0,169 |
| SOT | 30 | 0,887 | 1,029 | 0,211 |

Il bias è `predetto - osservato`. Brier score: **NON CALCOLATO**; gli snapshot versionati conservano point forecast, non una superficie probabilistica esplicita completa sulle stesse osservazioni. Nessuna probabilità è stata ricostruita artificialmente.

| segmento | valore | n shots | MAE | RMSE | bias | uso campione | n SOT | MAE SOT | RMSE SOT | bias SOT | uso campione SOT |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|
| ruolo | attaccante | 20 | 1,961 | 2,494 | 0,256 | descriptive-small | 20 | 0,964 | 1,12 | 0,294 | descriptive-small |
| ruolo | centrocampista | 9 | 1,783 | 1,955 | 0,037 | tiny-no-claim | 9 | 0,779 | 0,856 | 0,088 | tiny-no-claim |
| ruolo | difensore | 1 | 0,36 | 0,36 | -0,36 | tiny-no-claim | 1 | 0,34 | 0,34 | -0,34 | tiny-no-claim |
| squadra | Fenerbahçe | 2 | 0,715 | 0,881 | 0,515 | tiny-no-claim | 2 | 0,615 | 0,822 | 0,545 | tiny-no-claim |
| squadra | Lens | 4 | 2,923 | 3,345 | -1,108 | tiny-no-claim | 4 | 1,15 | 1,281 | 0,225 | tiny-no-claim |
| squadra | Manchester United | 2 | 1,245 | 1,247 | 0,065 | tiny-no-claim | 2 | 0,97 | 1,358 | -0,97 | tiny-no-claim |
| squadra | Paris Saint-Germain | 6 | 2,267 | 2,917 | -1,547 | tiny-no-claim | 6 | 0,845 | 0,952 | -0,355 | tiny-no-claim |
| squadra | PSV Eindhoven | 4 | 1,487 | 1,878 | 1,012 | tiny-no-claim | 4 | 0,955 | 1,011 | 0,955 | tiny-no-claim |
| squadra | Roma | 2 | 0,5 | 0,673 | -0,5 | tiny-no-claim | 2 | 1,25 | 1,25 | -0,01 | tiny-no-claim |
| squadra | Sabah | 2 | 1,71 | 1,782 | 1,71 | tiny-no-claim | 2 | 0,81 | 0,81 | 0,81 | tiny-no-claim |
| squadra | Shakhtar Donetsk | 1 | 3,24 | 3,24 | 3,24 | tiny-no-claim | 1 | 1,3 | 1,3 | 1,3 | tiny-no-claim |
| squadra | Slavia Praha | 2 | 2,6 | 2,604 | 0,15 | tiny-no-claim | 2 | 1,22 | 1,238 | -0,21 | tiny-no-claim |
| squadra | Sporting CP | 5 | 1,524 | 1,609 | 1,524 | tiny-no-claim | 5 | 0,42 | 0,539 | 0,42 | tiny-no-claim |
| minuti | 1-30 | 2 | 1,79 | 2,031 | 1,79 | tiny-no-claim | 2 | 0,795 | 0,824 | 0,795 | tiny-no-claim |
| minuti | 31-60 | 1 | 1,21 | 1,21 | 1,21 | tiny-no-claim | 1 | 0,81 | 0,81 | 0,81 | tiny-no-claim |
| minuti | 61-90 | 27 | 1,883 | 2,35 | 0,011 | descriptive-small | 27 | 0,897 | 1,05 | 0,145 | descriptive-small |
| minuti high/low | high-minutes-60-plus | 27 | 1,883 | 2,35 | 0,011 | descriptive-small | 27 | 0,897 | 1,05 | 0,145 | descriptive-small |
| minuti high/low | low-minutes-under-60 | 3 | 1,597 | 1,8 | 1,597 | tiny-no-claim | 3 | 0,8 | 0,819 | 0,8 | tiny-no-claim |
| lega | limited-or-other-league | 16 | 1,679 | 1,921 | 1,229 | descriptive-small | 16 | 0,782 | 0,9 | 0,594 | descriptive-small |
| lega | major-five-league | 14 | 2,056 | 2,671 | -1,041 | tiny-no-claim | 14 | 1,008 | 1,159 | -0,228 | tiny-no-claim |

Le celle `tiny-no-claim` non supportano conclusioni. Anche le celle `descriptive-small` sono solo segnali da monitorare.

## G. Qualità del campione e trasferibilità

Il campione copre una sola giornata, soltanto 6/18 gare con actual individuali recuperati e solo i candidati top-5 serializzati. Le segmentazioni major-five-league e limited-or-other-league sono diagnostiche; non misurano ancora la trasferibilità europea. League Strength resta descrittiva e separata da opponent strength e da qualsiasi fattore player-level.

## H. Invarianti e hash

| controllo | elementi | esito |
|---|---:|---|
| File protetti | 21 | UNCHANGED |
| Raw Champions | 5451 | UNCHANGED |
| Flag predictionCandidateEligible | 74 | UNCHANGED |

Modello, builder, League Strength, Elo, expected minutes, team shots/SOT, blending, riconciliazione, 1X2, risultati esatti, Motivation, Surprise Factor, cards, UI, HTML, Serie A e MD6 non sono stati modificati. Nessuna calibrazione è stata attivata.

## I. File creati

- `scripts/create-champions-model-calibration-control.js`
- `scripts/build-champions-model-calibration-audit.js`
- `scripts/test-champions-model-calibration-audit.js`
- `data/analysis/champions/model-calibration-control-2026-10-11.json`
- `data/analysis/champions/model-calibration-audit-2026-10-11.json`
- `output/reports/champions-model-calibration-audit-2026-10-11.md`

## J. Gate finale

**CHAMPIONS MODEL-CALIBRATION GATE = PARTIAL**

- Baseline A has 30 chronology-admissible player observations across 6 matches.
- No severe structural identity collision was proven after resolving Atlético by UEFA club ID/content and Veerman by dated club observations.
- Baseline B is chronology-blocked and candidate C is uncalibrated; no A/B/C paired comparison is valid.
- 37 exact-name-only resolutions, 33 UEFA/internal-registry discrepancies and Mika Medina remain outside calibration.

Raccomandazione: **DO_NOT_ACTIVATE; collect versioned pre-match current-season inputs and at least two later chronological test windows, then rerun.**
