# Serie A 2026/27 — Fase 5B.1: audit tecnico dei 886 esiti del Gruppo B

Data audit: 2026-10-09  
Ambito: esclusivamente diagnostico; nessun mercato aggiunto alla Schedina.

## Esito sintetico

- Ricostruiti **886/886** esiti con identificativi Sisal canonici.
- Riconciliazione raw → normalizzato: **886/886** esatta; sovrapposizioni con le 160 selezioni correnti: **0**.
- Livelli: **B1 0**, **B2 203**, **B3 527**, **B4 156**.
- I **203 B2** sono esclusivamente Multigoal partita, Multigoal squadra e Over gol squadra: la probabilità è derivabile dalla matrice punteggi e dalle sensibilità già usate dall’Engine V2.
- Non esistono B1 nel perimetro stretto dei 886. Le probabilità canoniche dirette erano già confluite nel Gruppo A o nelle 35 righe iniziali.
- I volumi tiri in porta/corner non passano a B2: centralità e deviazione standard non dimostrano una distribuzione calibrata per la soglia commerciale.
- I mercati DUO non possono usare le probabilità del singolo giocatore: il target include il sostituto e, nei SOT, pali/traverse.

## 1. Riconciliazione dei 886 esiti

Ogni riga conserva partita e `matchId`, mercato, variante, esito, soglia, quota, `providerMarketId`, `providerSelectionId`, eventuali `providerPlayerIds`, stato raw/normalizzato, filtro policy, titolarità e motivo della classificazione. Il dettaglio completo è nel JSON strutturato `output/reports/serie-a-md06-group-b-audit-2026-10-09.json`.

Il raw Sisal `data/raw/odds/sisal/serie-a/2026-10-09T10-43-00-203Z.json.gz` e il normalizzato `data/normalized/odds/sisal/serie-a.json` coincidono per tutti gli 886 esiti su ID mercato/esito, nome mercato, variante, soglia, esito, quota e stato. Tutte le quote sono aperte e numericamente valide nel perimetro ricostruito.

Il motivo comune del mancato recupero in Fase 5A è `GROUP_B_NO_COMPLETE_CANONICAL_EVALUATION`: nessuna di queste righe disponeva già del contratto completo P/fair/EV per l’identico `providerSelectionId`.

| Partita | B1 | B2 | B3 | B4 | Totale |
|---|---|---|---|---|---|
| Genoa – Fiorentina | 0 | 16 | 33 | 5 | 54 |
| Inter – Parma | 0 | 20 | 68 | 43 | 131 |
| Napoli – Frosinone | 0 | 21 | 39 | 0 | 60 |
| Como – Roma | 0 | 21 | 90 | 49 | 160 |
| Lazio – Monza | 0 | 21 | 46 | 0 | 67 |
| Lecce – Bologna | 0 | 20 | 43 | 0 | 63 |
| Sassuolo – Milan | 0 | 21 | 65 | 47 | 133 |
| Cagliari – Juventus | 0 | 20 | 56 | 6 | 82 |
| Atalanta – Venezia | 0 | 22 | 63 | 6 | 91 |
| Torino – Udinese | 0 | 21 | 24 | 0 | 45 |
| Totale | 0 | 203 | 527 | 156 | 886 |

## 2. Classificazione completa per famiglia

“Titolari” conta soltanto i mercati individuali riconciliati tramite `providerPlayerId` → `playerId` canonico e presenti nell’XI ufficiale o, in assenza dell’ufficiale, nell’XI probabile. “EV N/D” non viene trasformato in zero.

| Famiglia | Totale | Policy elig. | Quota valida | Titolari | B1 | B2 | B3 | B4 | Δ vis. | Δ eval. | EV + | EV − | EV N/D | Rischio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Corner totali full-match · Over | 21 | 21 | 21 | 0 | 0 | 0 | 21 | 0 | 0 | 0 | 0 | 0 | 21 | alto |
| Corner squadra full-match · Over | 32 | 32 | 32 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 32 | alto |
| Tiri in porta partita · Over | 32 | 32 | 32 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 32 | alto |
| Tiri in porta squadra · Over | 25 | 25 | 25 | 0 | 0 | 0 | 25 | 0 | 0 | 0 | 0 | 0 | 25 | alto |
| Multigoal partita | 105 | 105 | 105 | 0 | 0 | 105 | 0 | 0 | 105 | 105 | 8 | 97 | 0 | medio-basso |
| Multigoal squadra | 71 | 71 | 71 | 0 | 0 | 71 | 0 | 0 | 71 | 71 | 9 | 62 | 0 | medio-basso |
| Gol squadra · Over | 27 | 27 | 27 | 0 | 0 | 27 | 0 | 0 | 27 | 27 | 4 | 23 | 0 | medio-basso |
| Entrambe almeno X tiri in porta | 15 | 15 | 15 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 15 | alto |
| CALCI ANGOLO 1X2 T.R. | 5 | 5 | 5 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 5 | alto |
| Tiri in porta giocatore DUO | 336 | 336 | 336 | 194 | 0 | 0 | 194 | 142 | 0 | 0 | 0 | 0 | 336 | molto alto |
| Tiri totali giocatore DUO | 217 | 217 | 217 | 203 | 0 | 0 | 203 | 14 | 0 | 0 | 0 | 0 | 217 | molto alto |

Totale controllato: **886**.

## 3. Capacità effettive dell’Engine V2

### Disponibili e utilizzabili senza nuove ipotesi

- Distribuzione discreta dei punteggi ottenuta da `expectedGoals.home/away` con matrice Poisson normalizzata 0–7.
- Quattro matrici di sensibilità già usate dal motore: λ casa/trasferta variati di ±10%.
- Predicati già esistenti per Multigoal, Multigoal squadra e U/O gol squadra.
- Formula B2: somma delle celle compatibili; probabilità prudente uguale al minimo fra matrice centrale e sensibilità; fair `1/P`; EV `P × quota − 1`.
- Validazione formula: **4/4** gambe omologhe già serializzate dall’Engine replicate entro la tolleranza di arrotondamento per P centrale, P prudente, fair ed EV.

### Presenti ma non sufficienti per B2

- Tiri in porta e corner di squadra/partita: sono serializzati media centrale, deviazione standard, p20/p80 e campione. `configuredVolumeAssessment` applica una CDF normale e haircut euristici 0,92/0,90, ma non è stata trovata una validazione prospettica/calibrazione delle probabilità per soglia. Usarla come B2 introdurrebbe un’assunzione statistica non certificata.
- Tiri giocatore: esistono probabilità Poisson individuali per 1+/2+/3+ tiri e 1+/2+ SOT. Non coincidono con il contratto DUO Sisal.
- `CALCI ANGOLO 1X2 T.R.`: le marginali casa/trasferta non forniscono la distribuzione congiunta discreta del differenziale corner né la massa del pareggio.
- Cartellini: `likelyBooked`/`riskScore` restano euristiche non calibrate, non probabilità di mercato.

## 4. Livelli B1/B2/B3/B4

- **B1 — 0:** nessun collegamento diretto nel perimetro stretto dei 886.
- **B2 — 203:** derivazioni dalla matrice punteggi già prodotta e dai predicati esistenti.
- **B3 — 527:** richiedono una distribuzione/calibrazione nuova o un target predittivo differente.
- **B4 — 156:** non eleggibili dopo riconciliazione identità/titolarità/policy/quota.

Tutti i motivi sono serializzati per singolo esito nel JSON. Le classificazioni non sono state assegnate per semplice somiglianza testuale.

## 5. Mercati giocatore

- Esiti DUO complessivi nel Gruppo B: **553**.
- Titolari probabili/ufficiali eleggibili: **397**.
- Non eleggibili o identità non risolvibile: **156**.
- Dettaglio B4: **156** senza crosswalk affidabile `providerPlayerId → playerId`, **0** riserve, **0** non titolari ufficiali, **0** esclusioni per policy/quota/raw.
- Formazioni ufficiali MD6 disponibili: **0**; in loro assenza è stata usata la fonte probabile Fantacalcio del 2026-10-09T13:14:40.957Z.

L’identità è stata risolta usando i `providerPlayerIds` Sisal già collegati dall’Engine a un `playerId` canonico, poi verificata sulla formazione. Le probabilità individuali vengono conservate soltanto come diagnostica di incompatibilità e non sono usate per calcolare fair o EV del DUO.

## 6. Famiglie richieste ma assenti dai 886

| Famiglia richiesta | Dentro gli 886 | Evidenza esterna al perimetro |
|---|---|---|
| Esiti partita 1X2 | 0 | Già visibili/Gruppo A con confronto canonico V2. |
| Doppia chance 1X/X2 | 0 | Già visibili/Gruppo A; la variante 12 resta esclusa dalla policy. |
| Draw No Bet | 0 | 20 righe canoniche dirette, aperte e ammesse dalla policy, ma classificate fuori dai 886 nell’audit originario. |
| Goal/No Goal | 0 | Già visibili/Gruppo A; nei 886 compaiono invece Multigoal e Over squadra. |
| Tiri totali partita/squadra | 0 | 145 Over partita e 297 Over squadra aperti fuori dalla tassonomia B originaria. |
| Cartellini giocatore | 0 | 2085 esiti aperti fuori dal Gruppo B; segnali disciplinari non calibrati. |
| Cartellini squadra/partita | 0 | 374 esiti aperti fuori dal Gruppo B; nessuna probabilità V2 calibrata. |

Questa è un’anomalia di perimetro del vecchio audit, non una ragione per alterare retroattivamente il totale 886. In particolare i **20 Draw No Bet** sono una coda B1 adiacente: hanno P/fair/EV canonici, quota aperta e policy ammessa, ma il generatore li escludeva prima della tassonomia Gruppo B.

## 7. EV diagnostico

- EV positivo: **21**.
- EV negativo: **182**.
- EV esattamente zero: **0**.
- EV non calcolabile senza nuova capacità: **683**.

I valori sono calcolati soltanto per i B2 e non costituiscono nuove previsioni. Esempi con EV B2 più alto, non raccomandazioni:

| Partita | Mercato | Esito | Quota | P prudente | Fair | EV |
|---|---|---|---|---|---|---|
| Torino – Udinese | U/O 1.5 SQUADRA 2 | OVER | 2,90 | 47,0% | 2,13 | +36,2% |
| Torino – Udinese | MULTIGOAL SQUADRA 2 MULTIESITI | 2-4 | 2,90 | 44,7% | 2,24 | +29,7% |
| Torino – Udinese | MULTIGOAL SQUADRA 2 MULTIESITI | 2-3 | 3,10 | 39,3% | 2,54 | +21,9% |
| Inter – Parma | MULTIGOAL SQUADRA 1 MULTIESITI | 1-2 | 2,60 | 44,7% | 2,24 | +16,3% |
| Torino – Udinese | MULTIGOAL MULTIESITI 16 ESITI | 3-6 | 2,10 | 52,7% | 1,90 | +10,6% |

## 8. Simulazioni senza modifica dei dati

| Scenario | Selezioni visibili | Con valutazione V2 | NOT_MODELLED |
|---|---:|---:|---:|
| Catalogo Fase 5A | 160 | 144 | 16 |
| Dopo soli B1 del perimetro 886 | 160 | 144 | 16 |
| Dopo B1+B2 del perimetro 886 | 363 | 347 | 16 |

Scenario separato, subordinato a correzione esplicita del perimetro: i 20 DNB porterebbero il catalogo B1 a **180** righe, di cui **164** valutate. Non sono inclusi nelle simulazioni ufficiali dei 886.

## 9. Priorità proposta per la sottofase successiva

1. **Correggere/decidere la tassonomia DNB**: 20 collegamenti diretti ad alta affidabilità, ma fuori dal perimetro 886 originario. Nessuna implementazione senza approvazione esplicita.
2. **B2 matrice punteggi (203)**: Multigoal partita, Multigoal squadra, Over squadra. Impatto alto, rischio medio-basso; riusare i predicati e le sensibilità già esistenti.
3. **Validazione prospettica dei volumi**: SOT e corner full-match. Non promuovere finché la CDF per soglia non supera un gate di calibrazione.
4. **Modello corner 1X2**: richiede distribuzione congiunta/differenziale e massa del pareggio.
5. **DUO giocatore**: ultimo per priorità; richiede modellazione del sostituto, semantica pali/traverse e settlement coerente.

Le quote elevate non sono state usate come criterio di priorità.

## 10. File e funzioni candidati per una futura implementazione

Nessuno di questi file è stato modificato in questa fase diagnostica.

- `scripts/predictions/engine.js`: condividere in un modulo puro `configuredScorePredicate`, matrici di sensibilità e valutazione per singolo esito; non cambiare le probabilità.
- `scripts/md06-market-catalog.js`: importare in futuro soltanto B1/B2 approvati, con deduplica rispetto alle 160 righe.
- `scripts/build-md06-betting-decision-package.mjs`: integrare il nuovo layer diagnostico/contrattuale dopo approvazione.
- `scripts/betting-selection-contract.js`: serializzare provenienza della derivazione B2 e distinzione central/prudent.
- `scripts/generate-mycombo-md01.js`: rivedere la classificazione DNB e l’attuale assessment all-or-nothing; non necessario per calcolare i B2 singoli.
- `scripts/test-schedina-md06.js` e `scripts/test-betting-selection-contract.js`: aggiungere invarianti su predicato, soglia, identità e formula.
- `js/pages/betting.js`: nessuna nuova logica probabilistica; dovrà solo rendere contratti già calcolati, se approvati.

## 11. Vincoli e stato

Non sono stati modificati Engine V2, probabilità esistenti, quote, dati normalizzati, policy, MyCombo, interfaccia, archivi MD1–MD5 o Champions. Non sono state aggiunte selezioni alla Schedina. Gli artefatti prodotti sono esclusivamente questo report, il JSON diagnostico e lo script ripetibile dell’audit.

Il worktree contiene l’unico artefatto estraneo non tracciato `scripts/create-champions-data-recovery-control.js`, preesistente e fuori ambito; non è stato toccato da questo audit.
