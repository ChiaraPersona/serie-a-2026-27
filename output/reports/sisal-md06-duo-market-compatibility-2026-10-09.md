# Sisal MD6 DUO player markets — compatibilità V2

Data report: 2026-10-09. Ambito: Serie A 2026/27, MD6. Modalità research/shadow; nessuna promozione a produzione.

## A. Regolamento Sisal

Il testo ufficiale verifica somma con il sostituto diretto, partecipazione/rimborso, supplementari e definizioni tiri/SOT. Le quattro famiglie MD6 hanno un marketRuleId; la catena oltre il primo sostituto non è esplicitata e resta `RULE_UNVERIFIED`. La ragione della sostituzione e l'intervallo non sono esclusi dal testo generale, ma non hanno una clausola separata.

| Codice | marketRuleId | Metrica | Nominati | Legni | TS | Righe PDF |
| --- | --- | --- | --- | --- | --- | --- |
| 28506 | SISAL_CALCIO_SINGLE_DUO_SOT_WOODWORK_ET_2026-10-09 | SOT | 1 | Sì | Sì | 8197-8215 |
| 28507 | SISAL_CALCIO_SINGLE_DUO_TOTAL_SHOTS_ET_2026-10-09 | SHOTS | 1 | Sì | Sì | 8250-8264 |
| 31665 | SISAL_CALCIO_PAIR_DUO_STANDARD_SOT_ET_2026-10-09 | SOT | 2 | No | Sì | 7993-8012 |
| 31666 | SISAL_CALCIO_PAIR_DUO_TOTAL_SHOTS_ET_2026-10-09 | SHOTS | 2 | Sì | Sì | 8023-8039 |

Fonte: [regolamento ufficiale Sisal Calcio](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf).

## B. Differenze tra V2 e DUO

V2 stima il conteggio del singolo giocatore sui suoi Expected Minutes. Il DUO è il conteggio lungo una o due catene di partecipazione: nominato più sostituto diretto. Non è `P(player)+P(sub)` e non è automaticamente `1-(1-Pplayer)(1-Psub)`. Nessuna formula del motore individuale è stata modificata.

## C. Copertura mercati

| Voce | N |
| --- | --- |
| Mercati Sisal totali | 23341 |
| Mercati DUO analizzati | 3771 |
| DUO tiri | 2254 |
| DUO SOT | 1517 |
| Identità complete | 3578 |
| Proiezioni frozen complete | 1783 |
| Regola core verificata | 3771 |
| Regola completa incl. catena | 0 |
| Stime puntuali research | 0 |
| Solo sensibilità | 1220 |
| Indisponibili | 2551 |

| Stato | N |
| --- | --- |
| EXACT_TARGET_SUPPORTED | 0 |
| RESEARCH_ESTIMATE | 0 |
| SENSITIVITY_ONLY | 1220 |
| UNAVAILABLE | 2551 |

## D. Modello scenari

L'adattatore rappresenta intervalli di minuti disgiunti per ogni slot di sostituzione. In uno scenario completo somma i lambda proporzionali ai minuti e applica la Poisson V2. Per coppie, l'indipendenza condizionale tra slot deve essere dichiarata. L'aggregazione è ammessa solo con scenari mutuamente esclusivi e pesi non negativi normalizzati a 1; sui dati MD6 i pesi non esistono, quindi la probabilità aggregata resta `DUO_PROBABILITY_UNAVAILABLE`.

## E. Expected Minutes e sostituzioni

200/200 giocatori hanno Expected Minutes e 200/200 hanno substitutionRisk. Replacement candidate disponibili: 0. Le 238 riserve note non vengono abbinate per semplice ruolo. Identità del subentrante, probabilità d'ingresso e distribuzione del minuto non sono disponibili.

## F. Tiri totali

La definizione Sisal dei tiri totali è coerente con il conteggio standard V2. L'adattatore è quindi tecnicamente operativo in research, ma per MD6 produce solo sensibilità dove tutti i nominati hanno una proiezione: non esistono identità/tassi/pesi dei sostituti per una stima puntuale.

## G. SOT e legni

StatMuse espone SOT e WOOD come campi distinti, mentre il dataset locale V2 conserva SOT ma non WOOD e non porta un contratto di definizione campo. Il codice 28506 include esplicitamente pali/traverse: `SISAL_SOT_PROBABILITY_NOT_CERTIFIED`. Il 31665 usa SOT standard ed è mostrato soltanto come proxy di sensibilità; nessun SOT è bookmaker-certified. [Catalogo dati StatMuse](https://www.statmuse.com/product/data/fc).

## H. Sensitivity analysis

Le colonne 75/60/45 mostrano soltanto il contributo del nominato, non il DUO completo. Nessun peso è attribuito agli scenari.

| Giocatore | Exp min V2 | Rischio sub | P DUO se 90' e nessun sub | P componente giocatore 75' | P componente 60' | P componente 45' | Contributo sub |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nico Paz | 83.1 | low | 96.2% | 92.4% | 85.1% | 72% | N/D senza identità/tasso sub |
| Gonçalo Ramos | 84.7 | low | 88.6% | 81.5% | 70.8% | 55.5% | N/D senza identità/tasso sub |
| Gianluca Scamacca | 59 | high | 96.2% | 92.4% | 85.2% | 72.1% | N/D senza identità/tasso sub |
| Armand Laurienté | 86.4 | high | 85.1% | 77.3% | 65.9% | 50.4% | N/D senza identità/tasso sub |
| Franco Mastantuono | 75 | high | 89.3% | 82.5% | 72% | 56.7% | N/D senza identità/tasso sub |
| John Yeboah | 79.1 | high | 87.4% | 80% | 69.1% | 53.6% | N/D senza identità/tasso sub |
| Francisco Conceição | 72.4 | high | 88.9% | 81.9% | 71.3% | 56% | N/D senza identità/tasso sub |
| Kerim Alajbegović | 59.6 | high | 94.2% | 89.3% | 80.7% | 66.5% | N/D senza identità/tasso sub |
| Giovanni Simeone | 73.6 | high | 87.5% | 80.2% | 69.3% | 53.8% | N/D senza identità/tasso sub |
| Donyell Malen | 70.9 | medium | 87.8% | 80.6% | 69.8% | 54.4% | N/D senza identità/tasso sub |

## I. Confronto quote

Quote, selezioni, timestamp e probabilità implicite sono conservati per tutti i 3771 mercati nel JSON. `duoResearchProbability`, `sisalMarketCertifiedProbability` ed `evResearch` sono sempre null: il target completo non ha una distribuzione di sostituzione difendibile. Nessun prezzo viene trasformato in edge.

## J. Candidati MD6

Sono ranking individuali V2 tra giocatori con la specifica quota Sisal; la colonna DUO impedisce di leggerli come probabilità bookmaker validate.

### 1+ tiri

| # | Giocatore | Partita | P individuale V2 | Quota | P implicita | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Akor Adams | Atalanta - Venezia | 94.3% | 1.02 | 98% | SENSITIVITY_ONLY |
| 2 | Gustavo Varela | Lazio  - Monza | 92.3% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 3 | Paul Mendy | Cagliari - Juventus | 92% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 4 | Tommaso Baldanzi | Genoa - Fiorentina | 91.9% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 5 | Charles De Ketelaere | Atalanta - Venezia | 90.9% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 6 | Lazar Samardzic | Atalanta - Venezia | 90.4% | 1.02 | 98% | SENSITIVITY_ONLY |
| 7 | Jurgen Ekkelenkamp | Torino - Udinese | 89.8% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 8 | Milutin Osmajić | Genoa - Fiorentina | 89.1% | 1.02 | 98% | SENSITIVITY_ONLY |
| 9 | Daniel Maldini | Cagliari - Juventus | 88.8% | 1.02 | 98% | SENSITIVITY_ONLY |
| 10 | El Bilal Touré | Inter - Parma | 88.7% | 1.12 | 89.3% | SENSITIVITY_ONLY |
### 2+ tiri

| # | Giocatore | Partita | P individuale V2 | Quota | P implicita | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Nico Paz | Como - Roma | 94.7% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 2 | Gonçalo Ramos | Sassuolo - Milan | 86.4% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 3 | Gianluca Scamacca | Atalanta - Venezia | 84.5% | 1.02 | 98% | SENSITIVITY_ONLY |
| 4 | Armand Laurienté | Sassuolo - Milan | 83.5% | 1.25 | 80% | SENSITIVITY_ONLY |
| 5 | Franco Mastantuono | Genoa - Fiorentina | 82.5% | 1.12 | 89.3% | SENSITIVITY_ONLY |
| 6 | John Yeboah | Atalanta - Venezia | 82.4% | 1.25 | 80% | SENSITIVITY_ONLY |
| 7 | Francisco Conceição | Cagliari - Juventus | 80.4% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 8 | Kerim Alajbegović | Cagliari - Juventus | 80.4% | 1.02 | 98% | SENSITIVITY_ONLY |
| 9 | Giovanni Simeone | Torino - Udinese | 79.3% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 10 | Donyell Malen | Como - Roma | 78.1% | 1.02 | 98% | SENSITIVITY_ONLY |
### 3+ tiri

| # | Giocatore | Partita | P individuale V2 | Quota | P implicita | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Nico Paz | Como - Roma | 84.6% | 1.2 | 83.3% | SENSITIVITY_ONLY |
| 2 | Lautaro Martínez | Inter - Parma | 76.8% | 1.05 | 95.2% | SENSITIVITY_ONLY |
| 3 | Gonçalo Ramos | Sassuolo - Milan | 67.9% | 1.25 | 80% | SENSITIVITY_ONLY |
| 4 | Gianluca Scamacca | Atalanta - Venezia | 64.7% | 1.2 | 83.3% | SENSITIVITY_ONLY |
| 5 | Armand Laurienté | Sassuolo - Milan | 63% | 1.65 | 60.6% | SENSITIVITY_ONLY |
| 6 | Franco Mastantuono | Genoa - Fiorentina | 61.4% | 1.44 | 69.4% | SENSITIVITY_ONLY |
| 7 | John Yeboah | Atalanta - Venezia | 61.2% | 1.65 | 60.6% | SENSITIVITY_ONLY |
| 8 | Marcus Thuram | Inter - Parma | 59.5% | 1.12 | 89.3% | SENSITIVITY_ONLY |
| 9 | Francisco Conceição | Cagliari - Juventus | 58.1% | 1.33 | 75.2% | SENSITIVITY_ONLY |
| 10 | Kerim Alajbegović | Cagliari - Juventus | 58.1% | 1.16 | 86.2% | SENSITIVITY_ONLY |
### 1+ SOT

| # | Giocatore | Partita | P individuale V2 | Quota | P implicita | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Lautaro Martínez | Inter - Parma | 77% | 1.05 | 95.2% | UNAVAILABLE |
| 2 | Nico Paz | Como - Roma | 76.8% | 1.2 | 83.3% | UNAVAILABLE |
| 3 | Gianluca Scamacca | Atalanta - Venezia | 74.3% | 1.12 | 89.3% | UNAVAILABLE |
| 4 | Donyell Malen | Como - Roma | 73.6% | 1.16 | 86.2% | UNAVAILABLE |
| 5 | Gonçalo Ramos | Sassuolo - Milan | 71.1% | 1.25 | 80% | UNAVAILABLE |
| 6 | Marcus Thuram | Inter - Parma | 68.3% | 1.12 | 89.3% | UNAVAILABLE |
| 7 | Franco Mastantuono | Genoa - Fiorentina | 68% | 1.44 | 69.4% | UNAVAILABLE |
| 8 | Rasmus Højlund | Napoli - Frosinone | 67.4% | 1.2 | 83.3% | UNAVAILABLE |
| 9 | Akor Adams | Atalanta - Venezia | 66% | 1.4 | 71.4% | UNAVAILABLE |
| 10 | Milutin Osmajić | Genoa - Fiorentina | 65.7% | 1.44 | 69.4% | UNAVAILABLE |
### 2+ SOT

| # | Giocatore | Partita | P individuale V2 | Quota | P implicita | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Lautaro Martínez | Inter - Parma | 43.2% | 1.47 | 68% | UNAVAILABLE |
| 2 | Nico Paz | Como - Roma | 42.9% | 2 | 50% | UNAVAILABLE |
| 3 | Gianluca Scamacca | Atalanta - Venezia | 39.4% | 1.65 | 60.6% | UNAVAILABLE |
| 4 | Donyell Malen | Como - Roma | 38.4% | 1.75 | 57.1% | UNAVAILABLE |
| 5 | Gonçalo Ramos | Sassuolo - Milan | 35.2% | 2 | 50% | UNAVAILABLE |
| 6 | Marcus Thuram | Inter - Parma | 31.9% | 1.65 | 60.6% | UNAVAILABLE |
| 7 | Franco Mastantuono | Genoa - Fiorentina | 31.6% | 3 | 33.3% | UNAVAILABLE |
| 8 | Rasmus Højlund | Napoli - Frosinone | 30.8% | 2 | 50% | UNAVAILABLE |
| 9 | Akor Adams | Atalanta - Venezia | 29.4% | 3 | 33.3% | UNAVAILABLE |
| 10 | Milutin Osmajić | Genoa - Fiorentina | 29% | 3 | 33.3% | UNAVAILABLE |

## K. Outsider

Centrocampisti, esterni e difensori sono inclusi senza forzare un sostituto per ruolo.

| # | Giocatore | Ruolo | Partita | P individuale 1+ tiri | Quota | DUO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Tommaso Baldanzi | Centrocampista | Genoa - Fiorentina | 91.9% | 1.05 | SENSITIVITY_ONLY |
| 2 | Lazar Samardzic | Centrocampista | Atalanta - Venezia | 90.4% | 1.02 | SENSITIVITY_ONLY |
| 3 | Jurgen Ekkelenkamp | Centrocampista | Torino - Udinese | 89.8% | 1.05 | SENSITIVITY_ONLY |

## L. Limiti

- Nessuna identità/probabilità d'ingresso del sostituto.
- substitutionRisk è categorico, non un peso di scenario.
- La catena oltre il sostituto diretto è `RULE_UNVERIFIED`.
- V2 non serializza legni; il 28506 non è ricostruibile senza coefficiente arbitrario.
- Le quote U/O espongono spesso un solo lato aperto; non viene calcolato no-vig.
- Nessuna calibrazione prospettica specifica DUO.

## M. Test

Stato: **PASS**. Casi sintetici: partecipazione, DNP/rimborso, sostituzione, catena, intervalli, soglie 1+/2+/3+, bounds, normalizzazione, null, regola ignota, SOT incompatibile, replacement assente, identificativi, determinismo e leakage. Comando: `node scripts/research/sisal-duo/test.js`.

## N. Integrità produzione

Inventario protetto: 11816 file. SHA-256 manifest prima: `b2448e3d52c40be8dc00df6134e676a8d684752f0f0a7bd77da7f3f384945ddc`; dopo: `b2448e3d52c40be8dc00df6134e676a8d684752f0f0a7bd77da7f3f384945ddc`. File protetti cambiati: 0. Stato: **PASS**. Sono esclusi dal confronto solo adattatore/test research e i due report autorizzati.

## O. Decisione finale

L'adattatore scenari è chiuso in research/shadow. Per i tiri è pronto a calcolare una stima quando verranno forniti scenari completi e pesati; per MD6 resta sensitivity-only. Per i SOT gestisce il gate di compatibilità, ma non certifica il target con legni. Nessun mercato MD6 riceve una probabilità DUO puntuale o un EV.

`SISAL DUO RULES: PARTIAL`

`DUO SHOTS ADAPTER: RESEARCH_ONLY`

`DUO SOT ADAPTER: RESEARCH_ONLY`

`SUBSTITUTION MODEL: INSUFFICIENT`

`MD6 DUO MARKETS ANALYZED: 3771`

`MD6 QUANTITATIVE RESEARCH ESTIMATES: 0`

`MD6 MARKETS UNAVAILABLE: 2551`

`BOOKMAKER-CERTIFIED EV: NOT AVAILABLE`

`PLAYER MARKET V2: UNCHANGED`

`EXACT-SCORE SNAPSHOTS: UNCHANGED`

`CARD MODEL: UNCHANGED`

`PRODUCTION INTEGRITY: PASS`

`DUO RESEARCH PHASE: CLOSED`
