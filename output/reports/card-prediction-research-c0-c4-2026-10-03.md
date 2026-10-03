# Card Prediction Research Framework C0–C4 — PHASE 2A

3 ottobre 2026 · RETROSPECTIVE_RESEARCH · configurationHash 4b8adf3b3f4725719f458b8e8dafb673b2890cb4e58fce2c88b8f6045f0dabd1

## A. Executive status

Framework C0–C4 implementato esclusivamente in ricerca, con metodi probabilistici espliciti e controlli temporali. Modello cartellini di produzione invariato. Audit della baseline originale su 8248 file: 8245 invariati. Lavoro Champions parallelo autorizzato dall'utente: 3 file originali modificati e 8 nuovi file. Zero cambiamenti inattesi. Nessuna promozione, publication, quota fair, EV o probabilità bookmaker.

Il risultato scientifico corrente è insufficienza del target osservabile, non superiorità di C4: il feed completo dei tipi di carte non certifica la loro eleggibilità on-pitch/periodo/post-match. Le probabilità di riferimento restano prior-only dove mancano esempi validi; una media prior 0,5 non è un tasso empirico stimato. Non si presentano errori calcolati sui soli negativi osservabili come confronto affidabile.

## B. Dataset

| Contatore | Valore |
| --- | --- |
| Partite Serie A finite | 50 |
| Player-match actual audit, inclusi inutilizzati | 1973 |
| Giocatori entrati | 1590 |
| Titolari actual, solo diagnosi | 1100 |
| Subentrati actual, solo diagnosi | 490 |
| Inutilizzati | 383 |
| Minuti actual totali | 98994 |
| Positivi ordinari registrati, contesto non certificato | 162 |
| Positivi registrati tra chi ha giocato | 161 |
| Tasso source-recorded tra chi ha giocato, non target valido | 0.101258 |
| Record PREMATCH_PROBABLE | 2037 |
| Record PREMATCH_OFFICIAL timestamp-certificati | 0 |
| Probabili titolari | 1078 |
| Riserve proiettate | 959 |
| Feed disciplinare completo nelle righe probabili | 2037 |
| Target individualmente determinato | 1256 |
| Primary eligible per coorte certificata | 0 |
| Esclusi dal campione primario | 2037 |

Target: almeno un giallo ordinario eleggibile on-pitch nei tempi regolamentari, condizionato all'effettiva partecipazione; rule SISAL_CARD_POINTS_REGULATION_V1 usata soltanto per il contesto di validità del PLAYER_YELLOW, non per punti o betting. yellowRedCard da solo e redCard non sono ordinary yellow. Un evento irrisolto non produce y=0.

La completezza di bookings consente alcuni negativi individuali certi, ma non certifica la coorte: per evitare complete-case selection dipendente dall'esito, il campione primario richiede una dichiarazione preventiva di contesto completo, resultCoverage.cardMarketContexts=COMPLETE, e la coerenza degli eventi con la regola. Campo attualmente assente, non aggiunto o inventato. Feed/context completi e target determinato sono dimensioni diverse. Gli inutilizzati restano nell'audit, esclusi dal target condizionato a playing.

Nessun record viene eliminato senza motivazione: tutte le righe/esclusioni sono in retrospective-player-match.json e sample-audit.json; universi indisponibili sono registrati separatamente. I conteggi delle ragioni possono sovrapporsi:

| Reason code | Righe |
| --- | --- |
| MATCH_TARGET_CONTEXT_NOT_SOURCE_CERTIFIED | 2037 |
| EVENT_CONTEXT_OR_TYPE_UNKNOWN | 146 |
| NO_ON_PITCH_EXPOSURE_CONDITIONAL_TARGET | 180 |
| PARTICIPATION_UNRESOLVED | 456 |
| TARGET_PLAYER_ID_NOT_IN_ACTUAL_REPORT | 431 |
| UNRESOLVED_PLAYER_IDENTITY | 25 |

| Campo mancante nel candidato pre-match | Righe |
| --- | --- |
| playerId | 25 |
| detailedRole | 637 |
| fouls | 88 |
| expectedMinutes | 2037 |
| referee | 0 |
| opponentFeatures | 220 |

| Giornata | N candidato | Eligible | Positivi target certi |
| --- | --- | --- | --- |
| 1 | 220 | 0 | 0 |
| 2 | 416 | 0 | 0 |
| 3 | 476 | 0 | 0 |
| 4 | 461 | 0 | 0 |
| 5 | 464 | 0 | 0 |

Le formazioni probabili sono snapshot di fonte del relativo turno: importedAt deve precedere il kickoff di ciascuna gara. Non vengono usate le sole cinque likelyBooked. Una fonte importata dopo il kickoff viene esclusa per quella gara; non è retrodatata attraverso un generico updatedAt. Le official date-only restano non dimostrate e non sono assimilate a informazioni pre-match. L'audit include i partecipanti actual non compresi nel candidato proiettato; questo limite di selezione è esplicito.

## C. Leakage audit

Target exclusion: true; future exclusion: true; actual target minutes predictor: false. Gli input sono ricostruzioni RETROSPECTIVE_RESEARCH, non frozen historical predictions. Exact cutoff usa Europe/Rome e kickoff confermato. Un match precedente contribuisce solo se completedAt è esplicito e prima del target, oppure se finito in una data di calendario strettamente precedente. Gare della stessa data senza completion timestamp sono escluse conservativamente, anche in MD precedenti. Le gare precedenti nella stessa giornata possono contribuire solo con questa prova temporale.

Ogni riga registra cutoff, sourceMatchIds, individualMatchIds e training match IDs/positivi. Ogni fonte pre-match ha availableAt verificato; ruoli dettagliati del roster sono usati soltanto quando il relativo generatedAt è anteriore al kickoff. Quando indisponibile: ruolo della fonte o UNKNOWN. I risultati storici possono essere stati corretti successivamente: la ricostruzione event-time non certifica che questo preciso payload fosse congelato allora.

Expected Minutes ricavati dall'attuale file predizioni non vengono retrodatati. Impiegabili soltanto record pre-match con fonte/timestamp e estimand dichiarato; target actual minutes/starter/substitution sono campi separati di outcome/diagnosi. PREMATCH_PROBABLE e PREMATCH_OFFICIAL hanno valutazioni separate.

## D. C0

Beta-Binomial gerarchico interpretabile. League prior Jeffreys Beta(0,5; 0,5), scelto come reference prior senza ottimizzazione sugli esiti. Posterior league p=(0,5+Y)/(1+N). Broad role: (12*pLeague+Yrole)/(12+Nrole). Detailed role: stessa stabilizzazione verso broad, disponibile solo con almeno 20 osservazioni target valide. Scala 12 riprende il principio di pseudocampione del repository, senza copiare coefficienti shot/referee. L'individuo target è escluso dal pool population per non riusare la sua evidenza in C1.

Fallback detailed role → broad → league → prior-only. GK e UNKNOWN sono conservati, senza trasformare un difensore generico in CB. Il prior-only 0,5 è un riferimento matematico non calibrato, evidenziato nei componenti, non una previsione validata. Metriche: INSUFFICIENT_FOR_INITIAL_BASELINE_COMPARISON; non si sceglie un prior diverso dopo gli esiti.

## E. C1

Posterior Beta con likelihood individuale temperata per esposizione: pC1=(12*pC0 + Yhist_eff + Ycur_eff)/(12+Nhist_eff+Ncur_eff). N_eff=discount*min(appearances, minutes/90), Y_eff=N_eff*(ordinary-yellow-positive matches / appearances). Discount corrente 1, storico 0,5 prespecificato; così 1–2 eventi in 20–45 minuti hanno peso molto limitato. È un power posterior trasparente, non un conteggio di successi maggiore del numero di trials.

Solo record di match individuali ordinari/eleggibili, canonici, con contesto e availability pre-target certificati contribuiscono. Totali previousSeason di categoria non certificano target, event context o data availability: sono documentati ma non entrano nella likelihood. Nessuna equivalenza automatica Serie B/Serie A; promosse e trasferiti usano solo ID e competizione verificati, altrimenti fallback al ruolo/lega. Lo storico valido futuro sarà per lo stesso playerId anche dopo trasferimento; mai rietichettato come se avesse sempre giocato nella squadra attuale.

Ogni output espone prior/historical/current weights, maturity, effective sample e reason fallback. Incremento misurabile su C0: NOT_ESTIMABLE nel campione corrente, non assunto positivo.

## F. C2

Propensity e exposure separate. Fouls/90 pre-match stabilizzati con 450 minuti verso il pool storico di falli disponibile, senza usare target/futuro. Logistic offset logit(pF)=logit(pC1)+bF*log(foul90/prior90), con pseudocostante 0,1 e ridge=4 (prior normale sul coefficiente). Coefficiente stimato solo su training temporale, con minimo 200 osservazioni, 20 match, 30 positivi e 30 negativi. Sotto gate: bF=0, fallback esplicito.

Esposizione: complementary log-log constant-hazard point approximation p(EM)=1-(1-pF)^(EM/referenceMinutes), mai p moltiplicata linearmente per minuti. ReferenceMinutes è la media dei soli minuti training precedenti, fallback prespecificato 60. Serve Expected Minutes pre-match con semantica CONDITIONAL_ON_PLAYING; una startingProbability non identifica P(play) o la distribuzione dei minuti. Affidabilità assente resta null. Il modello non stima in questo task l'unconditional probability; nessuna miscela di partecipazione viene inventata. L'approssimazione puntuale sui minuti non sostituisce una futura distribuzione di esposizione.

Ablazioni implementate: C1 senza EM, C1+EM, C1+fouls, full C2; team e home/away aggiunti soltanto in ablation separata. Missing EM lascia il modello neutro; non usa actual minutes al suo posto. Metriche ablation: INSUFFICIENT_FOR_INITIAL_BASELINE_COMPARISON, nessuna vittoria forzata.

## G. C3

Un'unica famiglia quantitativa candidata: opponent foul-drawing pre-match stabilizzato con 12 match verso l'ambiente di lega. Logistic offset training-only su C2. ACTIVE richiede almeno 30 match, campione binario valido, intervallo normale approssimato del coefficiente che escluda zero e segno coerente in due metà temporali con almeno 10 match ciascuna. WATCH/UNKNOWN/INACTIVE sono neutri. Questa è evidenza training per abilitare un segnale, non prova di miglioramento OOS.

No coefficiente del modello tiri copiato; nessun duel/flank effect dedotto dal nome/posizione; niente somma automatica di foul-drawing, ruolo, team e referee. Gli ulteriori segnali restano audit/data-only:

| Segnale | Feature N | Eligible training N | Status | Effetto / CI | Persistenza |
| --- | --- | --- | --- | --- | --- |
| OPPONENT_FOUL_DRAWING | 1817 | 0 | WATCH | NOT_ESTIMABLE | NOT_ESTIMABLE |
| ROLE_CARD_PRESSURE | 1054 | 0 | WATCH | NOT_ESTIMABLE | NOT_ESTIMABLE |
| DIRECT_DUEL | 0 | 0 | UNKNOWN | NOT_ESTIMABLE | NOT_ESTIMABLE |
| FLANK_CENTRAL_PRESSURE | 0 | 0 | UNKNOWN | NOT_ESTIMABLE | NOT_ESTIMABLE |
| OPPONENT_YELLOW_DRAWING | 0 | 0 | UNKNOWN | NOT_ESTIMABLE | NOT_ESTIMABLE |
| TEAM_DISCIPLINE_ABLATION | 1817 | 0 | WATCH | NOT_ESTIMABLE | NOT_ESTIMABLE |
| HOME_AWAY_ABLATION | 2037 | 0 | WATCH | NOT_ESTIMABLE | NOT_ESTIMABLE |

C3 può coincidere con C2 ed è così dove non c'è segnale ACTIVE.

## H. C4

Identità arbitro deve provenire da designazione con pubblicazione pre-kickoff. NO_DESIGNATION_AVAILABLE è fallback per missing information, non un'osservazione di arbitro medio. Un arbitro noto senza eligible target evidence ha reason KNOWN_REFEREE_TARGET_EVIDENCE_UNAVAILABLE, distinto da neutral estimate.

Framework referee Beta-Binomial sullo stesso target individuale, shrink verso ambiente C3 di lega. Quantificazione ammessa solo con almeno 20 match, 30 positivi, separazione dell'intervallo approssimato e persistenza tra metà temporali. Sono ammesse solo osservazioni della stessa competizione, source-certified; non si converte il semplice yellowCards/match da team totals in odds ratio per il giocatore. Attualmente effect nullo e C4=C3. MD6: nessuna designazione, reason NO_DESIGNATION_AVAILABLE.

## I. Model comparison

Common sample PREMATCH_PROBABLE: N=0, match=0, positives=0, gate=INSUFFICIENT_FOR_INITIAL_BASELINE_COMPARISON. È richiesto lo stesso insieme di ID/target/probabilità finite per tutti C0–C4. Non viene confrontato un modello sulle sole sue righe favorevoli.

| Modello | N valido | Brier | Log loss | ROC-AUC | PR-AUC/AP | Calibration bias | Ranking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pYellow_C0 | 0 | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE |
| pYellow_C1 | 0 | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE |
| pYellow_C2 | 0 | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE |
| pYellow_C3 | 0 | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE |
| pYellow_C4 | 0 | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE | NOT_ESTIMABLE |

Il framework calcola proper scores, observed/predicted rates, calibration-in-the-large (observed−predicted), slope se identificabile, ECE/bins, ROC-AUC e non-interpolated average precision con ties raggruppati. Sono implementati top-1/3/5 per match: any-hit, numero catturato, precision, recall e denominatori, tie-break canonico indipendente dagli esiti e bounds alle soglie. Si tratta del target condizionato a playing nell'universo proiettato, non della probabilità di giocare né della profittabilità.

Coarse calibration bins prespecificati [0;0,2;0,4;0,6;0,8;1], con N e stato insufficiente per celle piccole. Raw pair prediction/outcome preservati: target unknown=null, mai zero. Il diagramma calibration-status.svg mostra l'assenza di curva stimabile; nessun punto o curva empirica è fabbricato.

Riferimenti metodologici: [Gneiting & Raftery, proper scoring rules](https://sites.stat.washington.edu/people/raftery/Research/PDF/Gneiting2007jasa.pdf); [scikit-learn, average precision](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.average_precision_score.html). Implementazione locale e trasparente, non dipendente dalla disponibilità di librerie esterne.

## J. Legacy riskScore benchmark

Produzione invariata; nessun riskScore/150, Brier/log-loss su score, fair odds o EV. Archivio utilizzabile solo con generatedAt anteriore al kickoff, identity unica verificata e target eligible. L'attuale predictions.json ricostruito non è uno storico pre-match. Archivi MD1/MD2 post-kickoff vengono rifiutati per le gare coinvolte; MD4 con timestamp corretto può offrire subset di cinque candidati, separato dall'universo ampio.

Score pre-match matchabili nel universo di ricerca: 3; eligible target comuni: 0. ROC/AP/top-k: NOT_ESTIMABLE con questi target. L'audit di ogni archivio/timestamp e ID è nel JSON. Non si inventano score dei giocatori non presenti né una calibrazione legacy separata.

## K. Role diagnostics

| Ruolo | Universo N | Eligible N | Positivi | Tasso | Stato |
| --- | --- | --- | --- | --- | --- |
| AM | 154 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| CB | 264 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| CF/ST | 164 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| CM/DM | 149 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| FB/WB | 81 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| GK | 179 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| UNKNOWN | 983 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| W | 63 | 0 | 0 | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |

CB, FB/WB, CM/DM, AM, W, CF/ST, GK e UNKNOWN conservati quando documentati. Nessun CB derivato soltanto dal sourceRole D. Detailed role per cella in JSON con N/positives/predicted rate/Brier/log loss/bias ove stimabili. Celle sotto 30: INSUFFICIENT_SAMPLE.

## L. Exposure diagnostics

High EM ≥60; medium 30–<60; low 0–<30; missing separato. EM disponibili pre-match: 0/2037. Actual starter/substitute, projected starter/reserve e EM bins hanno tabelle separate nel JSON. Correlazione errori con EM error, actual minutes e substitution events solo diagnostica, oggi non stimabile. Gli unused mantengono target condizionato void/no exposure, non diventano automaticamente negativi per un estimand diverso.

## M. Team/opponent diagnostics

| Squadra | Universo N | Eligible | Positivi | Stato |
| --- | --- | --- | --- | --- |
| atalanta | 97 | 0 | 0 | INSUFFICIENT_SAMPLE |
| bologna | 107 | 0 | 0 | INSUFFICIENT_SAMPLE |
| cagliari | 105 | 0 | 0 | INSUFFICIENT_SAMPLE |
| como | 112 | 0 | 0 | INSUFFICIENT_SAMPLE |
| fiorentina | 98 | 0 | 0 | INSUFFICIENT_SAMPLE |
| frosinone | 113 | 0 | 0 | INSUFFICIENT_SAMPLE |
| genoa | 106 | 0 | 0 | INSUFFICIENT_SAMPLE |
| inter | 105 | 0 | 0 | INSUFFICIENT_SAMPLE |
| juventus | 99 | 0 | 0 | INSUFFICIENT_SAMPLE |
| lazio | 98 | 0 | 0 | INSUFFICIENT_SAMPLE |
| lecce | 106 | 0 | 0 | INSUFFICIENT_SAMPLE |
| milan | 88 | 0 | 0 | INSUFFICIENT_SAMPLE |
| monza | 110 | 0 | 0 | INSUFFICIENT_SAMPLE |
| napoli | 97 | 0 | 0 | INSUFFICIENT_SAMPLE |
| parma | 108 | 0 | 0 | INSUFFICIENT_SAMPLE |
| roma | 102 | 0 | 0 | INSUFFICIENT_SAMPLE |
| sassuolo | 100 | 0 | 0 | INSUFFICIENT_SAMPLE |
| torino | 108 | 0 | 0 | INSUFFICIENT_SAMPLE |
| udinese | 95 | 0 | 0 | INSUFFICIENT_SAMPLE |
| venezia | 83 | 0 | 0 | INSUFFICIENT_SAMPLE |

Opponents e home/away nel JSON, nessun effetto assunto. Team fouls hanno ablation indipendente; team yellow averages non inclusi automaticamente in C2/C3/C4. Tutti gli effect estimate/CI non supportati sono null. SOURCE_RECORDED_YELLOW rate è soltanto audit del provider, non un proxy target su cui ottimizzare i modelli.

## N. Referee diagnostics

Serie A 2025/26 regolare: pool di lega 380 match, 340 nominati, 40 bucket anonimo, media team yellow 3.594737. È il pool congelato del motore, distinto dai 720 match attribuibili del campione descrittivo A+B (2.853/720=3,9625). Non viene modificato né usato come denominatore per un arbitro nominato.

| Arbitro | Match A 2025/26 | Gialli | Gialli/match | Rate vs lega | Target status |
| --- | --- | --- | --- | --- | --- |
| Alberto Ruben Arena | 10 | 34 | 3.400000 | 0.945827 | UNKNOWN |
| Andrea Calzavara | 1 | 4 | 4.000000 | 1.112738 | UNKNOWN |
| Andrea Colombo | 14 | 64 | 4.570000 | 1.271303 | UNKNOWN |
| Andrea Zanotti | 1 | 3 | 3.000000 | 0.834553 | UNKNOWN |
| Antonio Rapuano | 7 | 27 | 3.860000 | 1.073792 | UNKNOWN |
| Daniele Chiffi | 13 | 31 | 2.380000 | 0.662079 | UNKNOWN |
| Daniele Doveri | 17 | 57 | 3.350000 | 0.931918 | UNKNOWN |
| Daniele Perenzoni | 1 | 3 | 3.000000 | 0.834553 | UNKNOWN |
| Davide Di Marco | 3 | 8 | 2.670000 | 0.742753 | UNKNOWN |
| Davide Massa | 15 | 65 | 4.330000 | 1.204539 | UNKNOWN |
| Ermanno Feliciani | 13 | 33 | 2.540000 | 0.706589 | UNKNOWN |
| Fabio Maresca | 10 | 40 | 4.000000 | 1.112738 | UNKNOWN |
| Federico La Penna | 13 | 43 | 3.310000 | 0.920791 | UNKNOWN |
| Francesco Fourneau | 11 | 45 | 4.090000 | 1.137775 | UNKNOWN |
| Gianluca Manganiello | 9 | 27 | 3.000000 | 0.834553 | UNKNOWN |
| Giovanni Ayroldi | 8 | 35 | 4.380000 | 1.218448 | UNKNOWN |
| Giuseppe Collu | 12 | 51 | 4.250000 | 1.182284 | UNKNOWN |
| Giuseppe Mucera | 2 | 6 | 3.000000 | 0.834553 | UNKNOWN |
| Juan Luca Sacchi | 10 | 38 | 3.800000 | 1.057101 | UNKNOWN |
| Kevin Bonacina | 10 | 33 | 3.300000 | 0.918009 | UNKNOWN |
| Livio Marinelli | 7 | 24 | 3.430000 | 0.954173 | UNKNOWN |
| Luca Pairetto | 10 | 53 | 5.300000 | 1.474378 | UNKNOWN |
| Luca Zufferli | 15 | 41 | 2.730000 | 0.759444 | UNKNOWN |
| Marco Di Bello | 11 | 26 | 2.360000 | 0.656515 | UNKNOWN |
| Marco Guida | 16 | 63 | 3.940000 | 1.096047 | UNKNOWN |
| Maria Sole Ferrieri Caputi | 2 | 9 | 4.500000 | 1.251830 | UNKNOWN |
| Mario Perri | 1 | 2 | 2.000000 | 0.556369 | UNKNOWN |
| Matteo Marcenaro | 12 | 49 | 4.080000 | 1.134993 | UNKNOWN |
| Matteo Marchetti | 13 | 44 | 3.380000 | 0.940264 | UNKNOWN |
| Maurizio Mariani | 14 | 54 | 3.860000 | 1.073792 | UNKNOWN |
| Michael Fabbri | 14 | 58 | 4.140000 | 1.151684 | UNKNOWN |
| Niccolò Turrini | 1 | 4 | 4.000000 | 1.112738 | UNKNOWN |
| Paride Tremolada | 2 | 14 | 7.000000 | 1.947291 | UNKNOWN |
| Simone Sozza | 15 | 47 | 3.130000 | 0.870717 | UNKNOWN |
| Valerio Crezzini | 8 | 27 | 3.380000 | 0.940264 | UNKNOWN |
| Federico Dionisi | 1 | 7 | 7.000000 | 1.947291 | UNKNOWN |
| Ivano Pezzuto | 1 | 4 | 4.000000 | 1.112738 | UNKNOWN |
| Luca Massimi | 1 | 6 | 6.000000 | 1.669107 | UNKNOWN |
| Marco Piccinini | 6 | 20 | 3.330000 | 0.926354 | UNKNOWN |
| Rosario Abisso | 10 | 35 | 3.500000 | 0.973646 | UNKNOWN |

| Stagione | A dataset / named / yellow usable | B dataset / named / yellow usable | Raw gzip A/B |
| --- | --- | --- | --- |
| 2023-24 | 380 / 380 / 380 | 380 / 380 / 0 | 0 / 0 |
| 2024-25 | 380 / 380 / 380 | 380 / 380 / 380 | 0 / 0 |
| 2025-26 | 380 / 340 / 340 | 380 / 380 / 380 | 0 / 0 |

Coperture per componente e record referee sono in JSON. Serie B 2023/24 ha 760 record squadra gialli mancanti; non zero e non pool Serie A. I raw gzip richiesti dai validator restano assenti; nessuna ricostruzione che impoverisca i derivati, nessun backfill di contesto.

## O. Shrinkage examples

Esempi esclusivamente SYNTHETIC_BEHAVIOURAL_CHECK, prior illustrativo 0,2; non snapshot o predizioni storiche di giocatori reali. Il nome Alex Jiménez-type identifica lo scenario richiesto, non un dato reale attribuito al giocatore.

| Scenario | pC1 | Prior weight | Historical weight | Current weight | Maturity |
| --- | --- | --- | --- | --- | --- |
| ALEX_JIMENEZ_TYPE_2_YELLOWS_45_MINUTES | 0.232000 | 0.960000 | 0.000000 | 0.040000 | VERY_LOW |
| ONE_YELLOW_20_MINUTES | 0.214545 | 0.981818 | 0.000000 | 0.018182 | VERY_LOW |
| LARGE_HIGH_RATE | 0.366667 | 0.166667 | 0.000000 | 0.833333 | HIGH |
| LARGE_LOW_RATE | 0.061111 | 0.166667 | 0.000000 | 0.833333 | HIGH |
| NEW_PLAYER_NO_HISTORY | 0.200000 | 1.000000 | 0.000000 | 0.000000 | VERY_LOW |
| HISTORICAL_ONLY | 0.200000 | 0.375000 | 0.625000 | 0.000000 | MEDIUM |
| CURRENT_CONTRADICTS_HISTORY | 0.168085 | 0.255319 | 0.638298 | 0.106383 | HIGH |

Maturity prespecificata: VERY_LOW fino al minimo LOW 450 min +5 appearances; MEDIUM 1.800 +20; HIGH 4.500 +50. Event/foul count e coverage sono separati, nessuna maturity compensa un target unknown. Esempi includono rate estremo in 45/20 minuti, campione ampio alto/basso, nuovo giocatore, history-only e corrente in conflitto con storico. Nessuna probabilità estrema causata dal solo campione minuscolo.

## P. Bootstrap uncertainty

Unit MATCH, seed 20261003, 2.000 repliche pianificate, confronti paired adiacenti C1−C0, C2−C1, C3−C2, C4−C3. Mantiene insieme tutti i giocatori del match; alpha family 0,05 e correzione per quattro confronti. CI per Brier/log-loss/AP; smaller losses e larger AP favoriscono after. Identità esatta → SIMILAR; evidenza concorde sui proper losses e AP non contraddittorio → BETTER_WITH_EVIDENCE; altrimenti INCONCLUSIVE/INSUFFICIENT_SAMPLE. Non è un test di equivalenza.

Esecuzione corrente: INSUFFICIENT_SAMPLE, repliche effettive 0. I CI non vengono inventati quando manca il common sample. I test esercitano il resampling deterministico su fixture sintetiche, mai spacciate per dati Serie A.

## Q. Limitations

- 164 historical periods/post-match states unknown; primary target cohort not source-certified.
- Date-only official lineups cannot prove capture before kickoff.
- Actual playing conditioning is not unconditional participation probability.
- Current production Expected Minutes/role sources cannot be backdated to all target matches.
- Historical category totals do not certify eligible ordinary on-pitch targets; Serie B is not directly pooled.
- MD6 referee designations absent; missing-information neutral fallback.
- Legacy archives post-kickoff rejected; five-candidate selection bias separately flagged.
- Missing referee raw gzip files block reconstruction/independent validation.
- riskScore and firstBooked remain heuristics; DUO/ANY/FIRST/POINTS secondary targets are data-only.
- Jeffreys prior-only 0.5 is mathematical reference, not empirical calibration.

PLAYER_ANY_CARD, PLAYER_DUO_CARD, FIRST_BOOKED_PLAYER, TEAM_CARD_POINTS restano contratti/data-only; nessuna probabilità o ottimizzazione secondaria. Individuo ≠ DUO; ranking 1 ≠ first-booked probability. L'intero percorso è ricerca retrospettiva con limitazioni di selezione ed eligibility esplicite.

## R. Prospective snapshot readiness

NOT_READY_FOR_MD6_RESEARCH_SNAPSHOT. Tutte le fixture, i tempi, gli ID, la fonte e l'assenza di actual MD6 sono auditati in md6-readiness.json. Il controllo non scrive snapshot. Bloccanti:

- NO_INITIAL_COMPARISON_WITH_SOURCE_CERTIFIED_PLAYER_YELLOW_TARGETS
- CONTEXT_CAPABLE_PROSPECTIVE_ACTUALS_PROVIDER_NOT_YET_CERTIFIED

Processo successivo: Provide source-certified on-pitch/period/post-match eligibility and completed historical target cohorts; keep unknown outcomes nullable. Re-run the deterministic research and tests with the same preregistered config; assess common-sample limitations. Update probable lineups before freezing; verify exact fixture kickoff, source hashes, identities and all timing gates again. A later explicit freeze must write a separate immutable research manifest; never edit Player Market MD6 snapshots.. Comando di recheck: node scripts/research/cards/run.js --snapshot-readiness. Nessun freeze command attivo mentre bloccato; prima di una futura cattura si possono aggiornare le probabili. Eventuale snapshot dovrà essere separato/immutabile, source hashes congelati e non retrodatato. Bookmaker DUO resta non pronto indipendentemente dal target individuale.

## S. Files changed

Solo file research isolati e due npm commands. I cambiamenti PHASE 1 già presenti all'inizio sono protetti e non attribuiti a PHASE 2A.

| File | Motivo |
| --- | --- |
| data/analysis/card-prediction-research/bootstrap.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/calibration-status.svg | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/config.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/evaluation.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/input-manifest.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/integrity-check-history.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/md6-readiness.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/model-registry.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/parallel-work-authorization.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/production-before.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/retrospective-player-match.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/sample-audit.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| data/analysis/card-prediction-research/validation.json | Artefatto locale di ricerca con provenienza/stato espliciti; nessuno snapshot storico o prospettico. |
| docs/card-prediction-research-c0-c4.md | Protocollo preregistrato, formule, target, cutoff, denominatori e limiti. |
| output/reports/card-prediction-research-c0-c4-2026-10-03.json | Rapporto finale A–T e dati macchina. |
| output/reports/card-prediction-research-c0-c4-2026-10-03.md | Rapporto finale A–T e dati macchina. |
| package.json | Due comandi isolati research/test; nessuna integrazione nei build di produzione. |
| scripts/research/cards/config.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/data.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/diagnostics.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/integrity.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/metrics.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/models.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/report.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/research/cards/run.js | Modulo isolato del framework: configurazione, input as-of, modelli, metriche, diagnostica, freeze check o rapporto. |
| scripts/test-card-prediction-research.js | Regressioni sintetiche e repository per leakage, probabilità, fallback, metriche e invarianti. |

Production-before.json conserva hash iniziali, il report JSON conserva before/after, zero cambiamenti inattesi. Protezioni includono prediction outputs/likelyBooked, motore/formule, MD6 snapshot/manifest, Team Profiles V2, exact-score research, betting/settlement records/odds, JS/CSS/HTML e rapporti precedenti. package.json è l'unica eccezione dichiarata per aggiungere i comandi; nessun workflow production li invoca.

Il primo recheck ha rilevato drift Champions e si è fermato. L'utente ha confermato: «Sì, lavoro Champions autorizzato in parallelo». La baseline originale non è stata aggiornata: parallel-work-authorization.json registra gli hash esatti accettati, inclusi i nuovi raw della medesima importazione, e ogni ulteriore modifica fallisce il controllo. Questi file non sono modifiche del task cartellini; sono riportati separatamente:

| File Champions esterno | Origine |
| --- | --- |
| data/sources/champions-pilot-match-stats-2025-27.json | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| scripts/build-champions-player-stats.js | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| scripts/import-champions-pilot-stats.js | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/normalized/champions-player-stats-2026-27.json | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/scoreboards/2026-27/gre.1/2026-as-of-2026-10-03.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/summaries/2026-27/gre.1/2026-10-03/401896758.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/summaries/2026-27/gre.1/2026-10-03/401896764.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/summaries/2026-27/gre.1/2026-10-03/401896769.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/summaries/2026-27/gre.1/2026-10-03/401896771.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| data/raw/champions-pilot/espn/summaries/2026-27/gre.1/2026-10-03/401896829.json.gz | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |
| scripts/test-champions-current-season-data.js | USER_CONFIRMED_PARALLEL_CHAMPIONS_WORK |

## T. Tests

| Suite | Esito |
| --- | --- |
| scripts/test-card-prediction-research.js | PASS |
| scripts/test-card-foundation.mjs | PASS |
| scripts/test-player-identities.js | PASS |
| scripts/test-predictions.js | PASS |
| scripts/test-team-matchup-profiles.js | PASS |
| scripts/test-future-data-readiness.js | PASS |
| scripts/test-prediction-snapshots.js | PASS |
| scripts/test-exact-score-research.js | FAIL |
| scripts/test-schedina.js | PASS |
| scripts/test-schedina-md04.js | PASS |
| scripts/test-schedina-md05-results.mjs | PASS |
| scripts/test-champions-player-markets.js | PASS |

11/12 suite pertinenti passate; regressioni research dettagliate in validation.json. Coprono cutoff esatto/target/futuro, card missing≠zero, identity/alias, tiny samples/new player/role fallback, Expected Minutes e actual minutes leakage, maturity gates, referee fallback/shrinkage, bounds/determinismo, proper metrics/ties/AP/bootstrap, retrospective separation e SHA invariance. Anche gli existing future-data, snapshot, exact-score, team, prediction e betting tests sono eseguiti direttamente, senza build che mutano output.

Fallimenti conservati, senza indebolire assertion o aggiornare baseline:

- scripts/test-exact-score-research.js: Legacy tmp/exact-score-m1-m2-before.json repository inventory predates Phase 1 and rejects separate new card research files; original assertion and baseline retained

Il test exact-score esegue i controlli del framework e poi incontra il vecchio inventario tmp/exact-score-m1-m2-before.json, che precede PHASE 1 e non ammette i nuovi file card research. La sua assertion resta invariata. Il controllo PHASE 2A conserva la baseline originale e verifica separatamente gli stessi artefatti exact-score e produzione cartellini: 8245 hash originali invariati, con i cambiamenti Champions autorizzati sopra rendicontati per hash esatto. Il fallimento originale resta FAIL nel JSON, non viene trasformato in PASS.

Nessuna UI modificata, quindi browser non necessario in questa fase. I tre validator referee storici della fase precedente continuano a richiedere 679226.json.gz, 712116.json.gz e 736790.json.gz assenti; sono limiti raw separati, nessuna assertion indebolita.

CARD MODEL STATE: RESEARCH

CARD RESEARCH DATA: INSUFFICIENT FOR INITIAL BASELINE COMPARISON

MD6 CARD RESEARCH SNAPSHOT: NOT READY

PRODUCTION CARD MODEL: UNCHANGED

NO MODEL PROMOTION
