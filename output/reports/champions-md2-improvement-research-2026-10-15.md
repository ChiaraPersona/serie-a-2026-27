# Champions League MD2 — ricerca dei miglioramenti

Data: 15 ottobre 2026. Report separato dall’audit; ricerca locale riproducibile. **Nessuna modifica candidata viene approvata per la produzione.**

## 1. Esito e perimetro

Il ramo da investigare per primo è **gol/Under-Over**, non l’intero motore: 2/13 vinte, −73,69% ROI. Tiri e SOT individuali restano positivi nel campione verificato; non c’è prova sufficiente per ridurne indiscriminatamente i coefficienti. Il filtro titolari e la distinzione tra proiezione individuale e contratto DUO vanno conservati.

Fonte di partenza: [audit aggiornato](./champions-post-match-audit-2026-10-15.md), hash JSON `759e57197c83838ff79a1fd589b8b780f95e403caa7ea1ab5004f5fac52e98d3`. Universo: ultimo snapshot prepartita di ciascuna delle 18 gare, 117 contratti; i 3 rimossi prima del kickoff restano fuori. Non si usano le selezioni operative odierne per ricostruire il portafoglio. Puntata piatta di 1 € per contratto verificato, senza commissioni o liquidazione Sisal certificata.

| Campione | Tot | Verificati | V/P | Grigi | Hit rate | Quota media verificati | Netto € | ROI | Copertura |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Originario | 117 | 108 | 74/34 | 9 | 68.52% | 1.76 | 8.30 | 7.69% | 92.31% |
| Filtrato titolari | 113 | 104 | 73/31 | 9 | 70.19% | 1.76 | 11.05 | 10.63% | 92.04% |

Il denominatore 117 include quattro contratti di non titolari partecipanti (1 V, 3 P), non quattro VOID. Il portafoglio filtrato contiene 113 contratti: 104 verificati e 9 grigi. Copertura originaria 108/117 = 92.31%. Bootstrap per fixture, 3.000 repliche, seed 20261015: ROI originario 95% [-11.75; 28.64]%; filtrato [-8.10; 30.09]%. Intervalli descrittivi, condizionati alla copertura, con sole 18 unità gara; le 108 selezioni non sono indipendenti. Se tutti i 9 grigi perdessero/vincessero, il ROI sull’intero portafoglio originario sarebbe rispettivamente -0.60% / 15.43%: estremi contabili, non stime.

## 2. Prestazioni ricalcolate per mercato

Quota media di **tutti i verificati**, non sola media delle quote vincenti. V/P = vinte/perse. Gli intervalli ROI raggruppano per fixture; nessun confronto multiplo è trattato come scoperta confermata.

| Mercato | Tot | n orig. (V/P) | Grigi | Hit orig. | ROI orig. | Quota media | n filtrato | Hit filtr. | ROI filtr. | Gare | CI ROI orig. 95% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Doppia chance | 9 | 9 (6/3) | 0 | 66.67% | -2.67% | 1.60 | 9 | 66.67% | -2.67% | 9 | [-48.33; 42.44] |
| Tiri giocatore | 51 | 47 (33/14) | 4 | 70.21% | 10.98% | 1.76 | 44 | 75.00% | 18.55% | 17 | [-22.23; 47.43] |
| Tiri in porta giocatore | 24 | 20 (16/4) | 4 | 80.00% | 9.05% | 1.55 | 19 | 78.95% | 8.21% | 15 | [-16.18; 29.00] |
| Esito finale | 9 | 9 (7/2) | 0 | 77.78% | 56.44% | 1.83 | 9 | 77.78% | 56.44% | 9 | [-15.67; 137.67] |
| Gol | 13 | 13 (2/11) | 0 | 15.38% | -73.69% | 2.27 | 13 | 15.38% | -73.69% | 8 | [-100.00; -44.46] |
| Tiri squadra | 3 | 3 (3/0) | 0 | 100.00% | 46.33% | 1.46 | 3 | 100.00% | 46.33% | 3 | [27.00; 72.00] |
| Corner squadra | 5 | 4 (4/0) | 1 | 100.00% | 85.50% | 1.85 | 4 | 100.00% | 85.50% | 4 | [66.00; 105.00] |
| Tiri in porta squadra | 3 | 3 (3/0) | 0 | 100.00% | 42.00% | 1.42 | 3 | 100.00% | 42.00% | 3 | [36.00; 45.00] |

| Mercato | Errore principale / confronto | Affidabilità |
| --- | --- | --- |
| Gol | Under ripetuti su gare aperte e Over persi su gare da 2 gol; soglie annidate amplificano gli stessi errori. | Allarme operativo forte; generalizzazione bassa: 13 contratti e poche gare. |
| Tiri giocatore | Ueda/Rashford concentrano più soglie perse; Olmo/Dybala perdono la soglia alta e vincono quella più bassa. | Descrittiva: molti contratti correlati e 4 grigi. Nessuna prova di bias uniforme. |
| SOT giocatore | Ueda, Rashford, Osimhen, Mijnans; sostituto e legni cambiano il target. | Bassa: piccoli n, 4 grigi, probabilità contrattuali assenti. |
| Esito finale / doppia chance | Inter e Bayern falliscono da favoriti; Lens/PSV/Roma perdono la doppia chance. | MD2 insufficiente; esiste holdout storico Elo indipendente. |
| Volumi squadra / corner | Nessuna perdita verificata; corner Feyenoord discordante. | Molto bassa: 3–4 verificati per famiglia; 100% hit non è una garanzia. |

### Gol: direzione e soglia

| Direzione/soglia | n | V/P | Hit | P media | ROI | Brier | Log loss |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OVER | 3 | 0/3 | 0.00% | 58.20% | -100.00% | 0.3494 | 0.9004 |
| UNDER | 10 | 2/8 | 20.00% | 49.18% | -65.80% | 0.1954 | 0.5811 |
| OVER 2.5 | 2 | 0/2 | 0.00% | 65.50% | -100.00% | 0.4290 | 1.0642 |
| UNDER 3.5 | 6 | 2/4 | 33.33% | 55.58% | -43.00% | 0.2202 | 0.6310 |
| UNDER 2.5 | 4 | 0/4 | 0.00% | 39.57% | -100.00% | 0.1583 | 0.5061 |
| OVER 3.5 | 1 | 0/1 | 0.00% | 43.60% | -100.00% | 0.1901 | 0.5727 |

La famiglia Gol è sovrastimata nel campione MD2, ma non è dimostrato che lo sia sistematicamente fuori da questa giornata. Gli intervalli bootstrap dei mercati con zero sconfitte restano meccanicamente positivi e non rappresentano il rischio di nuove sconfitte non osservate; con 3–4 fixture non sono un criterio di approvazione.

Le quote e le probabilità dei gol non sono tutte elevate: alcune selezioni perdenti avevano P inferiore al 50%. Perderle non prova da solo un errore; qui preoccupa l’insieme: 6.66 vittorie attese contro 2 osservate e bias probabilistico 35.88 punti percentuali. Non si applica un test binomiale i.i.d. a soglie della stessa gara.

## 3. Perse contro vinte: ricorrenze e variabilità

| Esito | n | Quota media | P media dove presente | Contratti player | Minuti medi previsti player disponibili | Affidabilità storica media player | Outsider |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ROSSO | 34 | 2.18 | 52.56% | 18 | 84.60 | 0.739 | 14 |
| VERDE | 74 | 1.57 | 66.30% | 49 | 84.60 | 0.732 | 9 |

| Fascia quota | n | V/P | Hit | ROI |
| --- | --- | --- | --- | --- |
| 1.5–2 | 25 | 13/12 | 52.00% | -11.72% |
| <1.5 | 54 | 48/6 | 88.89% | 10.61% |
| ≥3 | 10 | 4/6 | 40.00% | 52.50% |
| 2–3 | 19 | 9/10 | 47.37% | 1.32% |

- **Concentrazione del rischio:** Ueda perde 3 contratti nella stessa gara; Rashford altri 3. Non sono sei evidenze indipendenti a favore di una penalità globale. Dybala vince Over 1,5 e perde Over 3,5 con lo stesso DUO da 3 tiri; Olmo vince Over 1,5 e perde Over 3,5 con 3 tiri DUO. Il problema candidato è selezione/esposizione sulle linee alte, non un’identità da rimuovere dopo la sconfitta.
- **Minuti non sufficienti a spiegare tutto:** Osimhen e André giocano 90 minuti e producono rispettivamente 1 e 0 tiri. Aumentare la previsione minuti non correggerebbe questi casi. Politano e Dybala hanno invece esposizioni reali più brevi; Greenwood vince il contratto alto grazie al tiro del sostituto.
- **Matchup/volume:** Lille senza SOT e United povero di tentativi dei selezionati suggeriscono un errore di volume squadra o allocazione; richiedono actual squadra accoppiati al forecast. Non si attribuisce causalmente il risultato a modulo, possesso o marcatura senza i relativi dati prepartita. Kane e altre selezioni di volume vincenti impediscono una riduzione indiscriminata.
- **Quote:** hit rate alto non implica valore. I 13 gol erano tutti EV positivi secondo le probabilità salvate e hanno perso nettamente; il filtro “EV positivo” eredita la calibrazione del modello. Non si sceglie ex post una quota massima ottimale.
- **Effetti casuali:** favoriti sconfitti, soglie mancate per un tiro e code di gare ad alto punteggio sono compatibili con variabilità. Un errore ricorrente diventa strutturale solo se persiste su campioni temporali indipendenti, con definizioni stabili e intervalli accoppiati.

### Campionati dei giocatori selezionati

| Gruppo lega della squadra corrente | n | V/P | Grigi | Hit | ROI |
| --- | --- | --- | --- | --- | --- |
| other-domestic | 18 | 13/5 | 5 | 72.22% | 47.50% |
| major-five | 49 | 36/13 | 2 | 73.47% | -3.22% |
| UEFA-fallback | 0 | 0/0 | 1 | N/D | N/D |

È un raggruppamento per campionato della squadra al match, non certificazione che tutta la storia del giocatore provenga da quella lega. I fallback UEFA sono distinti dalle leghe domestiche minori; non si usa la nazione per applicare un coefficiente post hoc.

## 4. Verifica della matematica

### Probabilità e prezzi

| Famiglia | n con P | P media | Frequenza | Bias pp | Brier | Log loss |
| --- | --- | --- | --- | --- | --- | --- |
| Doppia chance | 9 | 64.27% | 66.67% | -2.40 | 0.2082 | 0.6059 |
| Esito finale | 9 | 60.50% | 77.78% | -17.28 | 0.2019 | 0.5913 |
| Gol | 13 | 51.26% | 15.38% | 35.88 | 0.2309 | 0.6547 |
| Tiri squadra | 3 | 75.10% | 100.00% | -24.90 | 0.0765 | 0.2994 |
| Corner squadra | 4 | 61.25% | 100.00% | -38.75 | 0.1513 | 0.4918 |
| Tiri in porta squadra | 3 | 79.67% | 100.00% | -20.33 | 0.0420 | 0.2278 |

Totale: 42 contratti hanno P originale, di cui 1 grigio (corner Feyenoord); 41 entrano nello scoring. Brier complessivo 0.1867, log loss 0.5570, ECE a bande fisse 10 punti 0.1410. Brier CI 95% per fixture [0.15; 0.22]; bias in probabilità [-0.12; 0.11]. Le bande hanno pochi casi e composizione diversa: nessuna calibrazione per decile autorizzata.

| Banda P | n | P media | Frequenza | Gap pp |
| --- | --- | --- | --- | --- |
| 60-70% | 19 | 63.82% | 68.42% | -4.61 |
| 70-80% | 5 | 75.26% | 100.00% | -24.74 |
| 40-50% | 3 | 45.60% | 0.00% | 45.60 |
| 50-60% | 8 | 56.01% | 62.50% | -6.49 |
| 30-40% | 4 | 37.88% | 0.00% | 37.88 |
| 80-90% | 1 | 83.20% | 100.00% | -16.80 |
| 90-100% | 1 | 90.20% | 100.00% | -9.80 |

Controlli: P in [0,100], quota >1, EV = 100×(P×quota−1), quota equa =1/P; tolleranza 0,11 pp EV e 0,011 quota per arrotondamento. Anomalie EV 0, quota equa 0, disallineamento ID player/BetSelection 0, squadra/lato 0. Il controllo è interno agli ID congelati, non una nuova verifica di affiliazione esterna. I testi copiati Rashford sotto altri nomi e l’attribuzione Donnarumma/Ferran Torres sono anomalie di provenienza già riconciliate nell’audit: non diventano nuovi errori del motore né si riusano come actual. 75 contratti senza P restano fuori dagli score probabilistici: **null non diventa zero né una Poisson inventata**. Il confronto grezzo 1/quota (Brier 0.2105) include margine e non è la probabilità equa del bookmaker; non è il benchmark principale.

### Bias tiri/SOT e minuti: confronto a target omogeneo

Il vecchio blocco volume dell’audit conserva 11 righe. Questo report NON lo modifica: esclude Ferri dai point-score SOT (zero contestato) e minuti (78 vs cambio al 79), e integra soltanto conteggi individuali espliciti dei casi di recupero. Gli esiti DUO possono restare grigi anche quando il tiro del nominato è noto. Fonti secondarie/estratti indicizzati ereditano i limiti dell’audit; nessun nuovo referto certificato viene dichiarato.

| Campione | n | MAE | RMSE | Bias pred−oss |
| --- | --- | --- | --- | --- |
| MD2 tiri individuali esatti | 12 | 1.4500 | 1.7382 | 0.7567 |
| MD2 SOT standard individuali | 8 | 0.9163 | 1.0118 | -0.3838 |
| MD2 minuti individuali | 14 | 12.2429 | 17.3297 | 4.6714 |
| MD1 tiri (94 originali) | 94 | 1.4284 | 1.8309 | 0.1450 |
| MD1 SOT (94 originali) | 94 | 0.8368 | 1.0319 | 0.0711 |

Tra i 56 giocatori distinti presenti nei contratti, 53 hanno proiezione individuale numerica: la copertura degli actual utilizzabili è 12/53 per i tiri (22,64%), 8/53 per i SOT (15,09%) e 14/53 per i minuti (26,42%). Il denominatore è l’universo player dei contratti con forecast, non le 75 scommesse player. La copertura player MD2 è selettiva, non il totale dei 396 titolari o l’universo completo delle rose; SOT standard e SOT+legni sono target diversi. Non confrontare questi MAE con quelli del DUO. Deduplicazione per fixture+player; mai contare le soglie dello stesso giocatore come nuovi point forecast. La MD1 aggiornata supera il vecchio benchmark da 30 osservazioni, non lo somma: usa gli originali pre-kickoff top-5 tiri ∪ top-5 SOT, 94/101 osservazioni candidate, oltre top-5 nessun forecast originale.

### Formula, campionati e tattica

- Il builder MD2 espone 84,6 minuti = 0,94×90 per i giocatori di movimento; non è un modello individuale delle uscite. La Fase 11 ha un candidato storico minuti, ma su MD1 è generato dopo kickoff e non sostituisce gli originali. Il richiamo a quella fase non dimostra che MD2 stesse usando quei minuti.
- Le proiezioni player sono riconciliate ai volumi squadra. Cambiare solo minuti e poi riconciliare nuovamente può annullare una parte della correzione: validare sia quota allocata sia target squadra, non soltanto il fattore per90.
- I volumi squadra sono normalizzati rispetto alla baseline della rispettiva lega e combinano produzione propria, concessioni avversarie e forma recente. Questo non equivale a una correzione validata della forza relativa tra leghe. Moduli, assenze e arbitri risultano informativi e non modificano automaticamente i volumi; niente nuovi boost tattici da questa giornata.
- Gol: il codice usa un prior totale (domestico, limitato a 1,6–4,2, oppure storico apertura Champions), poi cerca lambda 0,3–3,8 in step 0,025 per avvicinare l’1X2 Elo, loss 0,82 risultato + 0,18 prior; matrice 0–9 rinormalizzata. È un accoppiamento risultato↔gol da sottoporre ad ablation, non un bug dimostrato dai punteggi alti.

## 5. Simulazioni isolate

### A. Riscalatura dei volumi: training precedente, validation e test separati

Protocollo fissato nel nuovo script: **8 settembre training (34), 9 settembre validation (33), 10 settembre test (27)**; nessun riadattamento dopo validation, nessuna ricerca di iperparametri su MD2. Modello storico originale contro k×forecast, k = Σ(pred×actual)/Σ(pred²), separato per tiri e SOT. Variante ulteriore: stesso metodo per gruppo di lega, senza coefficienti trasferiti da Serie A. È un replay retrospettivo: i referti sono stati recuperati in ottobre, non si sostiene che fossero già disponibili l’8 settembre. Le partizioni sono indipendenti per partita ma appartengono alla stessa MD1 già esplorata; non è una prova prospettica cieca.

Coefficienti training globali: tiri 1.0202, SOT 1.1089.

| Training per gruppo | n | k tiri | k SOT |
| --- | --- | --- | --- |
| other-domestic | 13 | 0.7777 | 0.7296 |
| major-five | 21 | 1.1880 | 1.3489 |

| Candidato | Finestra | Target | n | MAE attuale | MAE candidato | RMSE attuale | RMSE candidato | Bias attuale | Bias candidato | CI ΔMAE 95% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| global | validation | shots | 33 | 1.3445 | 1.3564 | 1.7910 | 1.7896 | 0.0633 | 0.1143 | [-0.01; 0.04] |
| global | validation | sot | 33 | 0.7591 | 0.7784 | 0.9253 | 0.9243 | -0.0118 | 0.0958 | [-0.03; 0.07] |
| global | test | shots | 27 | 1.8411 | 1.8551 | 2.2248 | 2.2360 | 0.4004 | 0.4527 | [-0.01; 0.03] |
| global | test | sot | 27 | 0.9896 | 1.0478 | 1.1665 | 1.2066 | 0.2985 | 0.4157 | [0.03; 0.09] |
| league | validation | shots | 33 | 1.3445 | 1.2685 | 1.7910 | 1.6637 | 0.0633 | 0.2980 | [-0.35; 0.17] |
| league | validation | sot | 33 | 0.7591 | 0.7319 | 0.9253 | 0.9022 | -0.0118 | 0.1800 | [-0.13; 0.08] |
| league | test | shots | 27 | 1.8411 | 1.8978 | 2.2248 | 2.2137 | 0.4004 | 0.5892 | [-0.05; 0.23] |
| league | test | sot | 27 | 0.9896 | 1.0633 | 1.1665 | 1.1880 | 0.2985 | 0.4803 | [-0.07; 0.21] |

Δ = candidato−attuale (negativo migliora). Copertura 100% delle rispettive osservazioni ammesse. Brier/log loss/ROI: **N/D**, mancano probabilità originali e quote sullo stesso target singolo. Non si converte k×media in una P DUO. Il moltiplicatore globale peggiora MAE e RMSE di entrambi i target nel test: tiri 1,8411→1,8551 MAE, SOT 0,9896→1,0478. Anche i coefficienti per lega peggiorano entrambi i MAE nel test (pur migliorando lievemente RMSE tiri). **SCARTARE questi coefficienti stimati**, senza vietare un futuro modello gerarchico meglio supportato. Nessun risultato di questo replay da solo autorizza una modifica: poche fixture per finestra, selezione top-5 e versione storica diversa dalla MD2.

| MD1 gruppo lega | n | Bias tiri | MAE tiri | Bias SOT | MAE SOT |
| --- | --- | --- | --- | --- | --- |
| other-domestic | 26 | 0.8927 | 1.1981 | 0.4631 | 0.6962 |
| major-five | 63 | -0.2625 | 1.4486 | -0.1248 | 0.8762 |
| UEFA-fallback | 5 | 1.3920 | 2.3720 | 0.5000 | 1.0720 |

### B. Minuti: decomposizione oracle, non previsione realizzabile

Sostituisco nell’analisi l’esposizione prevista con i minuti reali, senza riaddestrare né riconciliare ai volumi squadra: forecast×minuti reali/minuti previsti. Si usa lo stesso sottoinsieme esatto per baseline e oracle. Il risultato misura quanto spiega l’esposizione, **non** il beneficio raggiungibile da un modello minuti prepartita.

| Campione | n | MAE | RMSE | Bias pred−oss |
| --- | --- | --- | --- | --- |
| Tiri baseline accoppiato | 9 | 1.3844 | 1.6740 | 0.4600 |
| Tiri con minuti reali ORACLE | 9 | 1.2756 | 1.6397 | 0.3780 |
| SOT baseline accoppiato | 8 | 0.9163 | 1.0118 | -0.3838 |
| SOT con minuti reali ORACLE | 8 | 0.7785 | 0.9012 | -0.5083 |

Un modello minuti storico è **TESTARE**, non validato: servono la previsione individuale congelata, disponibilità/rotazioni timestampate e actual completi. Il benchmark Serie A separato ha MAE minuti 14.40 su 198 osservazioni; non ne trasferisco coefficienti né considero lo score prova Champions.

### C. Gol: ablation del prior e ancoraggio alle quote

Solo diagnostica MD2, **nessun parametro scelto con MD2 può essere dichiarato validato su MD2**. Recupero il pilot dal medesimo commit Git di ogni contratto e verifico P e quota della soglia. Prove separate: (1) Poisson con il prior totale pre-fit, senza adattamento all’1X2; (2) media fissa 50/50 tra P originale e probabilità delle quote Over/Under normalizzate a somma uno. Le probabilità ottenute sono nuove simulazioni esplicite, mai riscritte tra le P originali. La normalizzazione elimina il margine proporzionalmente, non rivela una vera probabilità.

| Modello su 13 gol | Brier | Log loss | P media | Bias pp | ROI puntando tutti |
| --- | --- | --- | --- | --- | --- |
| Attuale | 0.2309 | 0.6547 | 51.26% | 35.88 | -73.69% |
| Bookmaker normalizzato, solo benchmark | 0.1900 | 0.5677 | 43.42% | 28.03 | -73.69% |
| Mix fisso 50/50 | 0.2088 | 0.6083 | 47.34% | 31.95 | -73.69% |
| Solo prior pre-fit | 0.2316 | 0.6554 | 52.04% | 36.66 | -73.69% |

Conteggio totale gol sulle 18 fixture (non solo sulle gare dove è stata selezionata una scommessa):

| Campione | n | MAE | RMSE | Bias pred−oss |
| --- | --- | --- | --- | --- |
| Lambda attuale, 18 gare | 18 | 2.0628 | 2.4552 | -0.9650 |
| Prior pre-fit, 18 gare | 18 | 2.0928 | 2.4907 | -1.0272 |

Entrambe sono proiezioni di conteggio; il mix tra P non implica invece un lambda unico. La copertura delle simulazioni gol è 13/13 contratti e 18/18 conteggi. Il solo prior non migliora Brier/log loss nei contratti: scartare la sostituzione diretta con questo prior come soluzione oggi dimostrata. Il mix riduce gli score ma, con filtro EV>0, peggiora il ROI; nessuna approvazione.

Il ROI è identico quando contratti e puntate restano identici: cambiare P non cambia l’esito storico. Riapplicando solo EV>0 alla simulazione: mix tiene 8/13, ROI -76.25%; prior tiene 13/13, ROI -73.69%. Sono controfattuali condizionati, non profitti ottenibili certificati né parametri approvati. MAE/RMSE di queste P: non adatti al conteggio gol; senza una nuova media per il mix non invento un lambda.

Per validare: ricostruire lo stesso baseline congelato su stagioni antecedenti, train/calibration precedenti al test, split per fixture, intere superfici Over/Under e quote al cutoff. Il benchmark Elo storico riguarda 1X2, non calibra la distribuzione dei gol; manca un confronto storico paired del ramo gol esatto, quindi **APPROVARE non è disponibile**.

### D. Selezione: policy fissate, nessuna ottimizzazione della quota

| Campione | Tot | Verificati | V/P | Grigi | Hit rate | Quota media verificati | Netto € | ROI | Copertura |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current filtered | 113 | 104 | 73/31 | 9 | 70.19% | 1.76 | 11.05 | 10.63% | 92.04% |
| Exclude only known negative EV | 103 | 94 | 66/28 | 9 | 70.21% | 1.81 | 12.13 | 12.90% | 91.26% |
| Only modelled positive EV | 32 | 31 | 18/13 | 1 | 58.06% | 2.05 | 2.41 | 7.77% | 96.88% |
| Exclude goals (post-hoc diagnostic) | 100 | 91 | 71/20 | 9 | 78.02% | 1.69 | 20.63 | 22.67% | 91.00% |

Copertura = verificati/contratti trattenuti; per evitare illusioni da astensione, retention sul portafoglio filtrato: Current filtered: 100.00%; Exclude only known negative EV: 91.15%; Only modelled positive EV: 28.32%; Exclude goals (post-hoc diagnostic): 88.50%. Le regole EV si applicano ai valori originali: null non diventa positivo. “Escludi solo EV negativo” conserva i DUO N/D e non li certifica convenienti. L’esclusione gol è appositamente **post hoc**: mostra concentrazione della perdita e non giustifica un blocco di produzione. MAE/RMSE non applicabili a policy di selezione; gli score probabilistici su sottoinsiemi diversi non costituiscono un confronto paired del modello. Serve validazione futura con astensione e copertura dichiarate.

## 6. Cosa è già efficace: benchmark indipendenti

| Componente / campione | Attuale | Benchmark | Interpretazione |
| --- | --- | --- | --- |
| Elo 1X2, holdout UEFA 2025/26 | Log loss 0.97566; Brier 0.58086 | Log loss 1.02367; Brier 0.61717 | Conservare: training 2023/24, selection 2024/25, holdout 2025/26. |
| totalShots, domestico walk-forward n=538 | MAE 4.407; RMSE 5.583; Brier 0.184 | MAE 4.812; RMSE 6.109; Brier 0.21 | Copertura intervallo 51.3% (nominale circa 60%); non certifica trasferibilità interlega né DUO. |
| shotsOnTarget, domestico walk-forward n=538 | MAE 2.011; RMSE 2.51; Brier 0.207 | MAE 2.174; RMSE 2.717; Brier 0.231 | Copertura intervallo 49.8% (nominale circa 60%); non certifica trasferibilità interlega né DUO. |
| wonCorners, domestico walk-forward n=538 | MAE 2.264; RMSE 2.904; Brier 0.229 | MAE 2.401; RMSE 3.066; Brier 0.243 | Copertura intervallo 55.8% (nominale circa 60%); non certifica trasferibilità interlega né DUO. |

I numeri di questa sezione sono benchmark esistenti letti, non un nuovo replay o una loro certificazione. Brier Elo multiclass (somma su 3 esiti) e Brier binario dei contratti non sono confrontabili direttamente. Le metriche domestiche usano soglie e granularità squadra; non vanno attribuite ai mercati individuali. Il benchmark di volumi richiede 8 precedenti/3 per sede, mentre produzione richiede 6/2: differenza di universo da riallineare prima di dichiarare validata una selezione. Nessun log loss/ROI viene inventato quando il benchmark non lo serializza.

## 7. Decisioni ordinate per impatto e affidabilità

| Priorità | Componente / modifica candidata | Decisione | Evidenza e rischio | Condizione per avanzare |
| --- | --- | --- | --- | --- |
| P0 | Contratto esatto, null DUO e legni; ID e provenienza | MANTENERE | Alta: 75 contratti senza P; eventi ambigui, nessun ID BetSelection divergente. | Congelare regole versione/data e catene dirette; registrare missing e conflitti, mai zero presunto. |
| P0 | Filtro titolari e archivio separato | MANTENERE | Alta correttezza operativa; +10,63% vs +7,69% descrittivo, solo quattro esclusi. | Verificare policy al cutoff; nessuna prova di incremento ROI causale da 4 casi. |
| P1 | Ramo gol: separare prior totale dal fit 1X2 / ancoraggio quote | TESTARE | Impatto alto; perdita concentrata, ma test candidato soltanto MD2. | Holdout di stagione successiva al training, Brier/log loss paired e ROI/copertura; superficie completa. |
| P1 | Minuti individuali storici con probabilità ingresso e uscite | TESTARE | Impatto alto; 84,6 costante, oracle diagnostico e dati secondari parziali. | Snapshot completi, actual minuti, test temporale indipendente; migliorare MAE/RMSE senza regressioni player-volume. |
| P1 | Policy di astensione EV e limiti esposizione correlata | TESTARE | Quote e calcoli verificabili; redditività dipende dalla calibrazione; rischio di selezione post hoc. | Policy preregistrata, riportare retention/netto/ROI e cluster-bootstrap su finestre future. |
| P2 | Elo 1X2 esistente e blending volumi squadra | MANTENERE | Benchmark precedente favorevole; MD2 non smentisce da sola l’intero ramo. | Monitorare calibrazione e drift per mercato; non trasferire la validazione Elo ai gol. |
| P2 | Moltiplicatori stimati globali / per gruppo di lega dei player | SCARTARE | I coefficienti provati peggiorano MAE tiri e SOT nel test MD1; campioni ridotti. | Non adottare questi coefficienti; un diverso modello gerarchico richiede nuova ipotesi e nuovo test. |
| P2 | Sostituzione del fit gol con il solo prior pre-fit | SCARTARE | Non migliora Brier/log loss dei 13 contratti MD2; nessun beneficio indipendente dimostrato. | Eventuale nuovo ramo gol va testato su altre stagioni, non ritoccato su MD2. |
| P2 | Riduzione uniforme arbitraria tiri/SOT scelta dai perdenti MD2 | SCARTARE | Nessun test indipendente del coefficiente; penalizza vincitori e confonde player/DUO. | Non adottare; sostituire con protocollo temporale, non ritoccare finché il ROI sale. |
| P2 | Boost/penalità tattici o di lega ricavati dai risultati MD2 | SCARTARE | Moduli e dati contestuali non accoppiati, fallback eterogenei. | Solo futura ablation con input prepartita documentati e holdout per lega. |
| P3 | Modello completo DUO + legni | TESTARE | Target economico corretto, ma sostituto non noto al kickoff e legni individuali mancanti. | Modello di sostituzione probabilistico prepartita; eventi unici con SOT/legni; nessuna somma inversa o doppio palo-gol. |

**APPROVARE: nessuna modifica.** Mantenere componenti efficaci è diverso dall’approvare un nuovo coefficiente. Per le promozioni future richiedere split temporale senza riuso MD2, confronto sullo stesso universo, intervalli paired per fixture favorevoli su loss primaria fissata prima del test, controllo delle metriche secondarie e nessuna regressione rilevante per lega/ruolo. Il ROI da solo, soprattutto con missing, non basta.

## 8. Dati necessari e limiti irrisolti

- I 9 grigi originali restano tali; non sono perdite né dati di training. Recuperare referti finali con ID per Vetlesen/Lemaréchal, Nkunku, Ferri/van den Elshout, Kauã Elias/Meirelles, Auklend, Parrott/Cucho, e corner Feyenoord. L’elenco contratti qui sotto mantiene le soglie distinte di Ferri.
- Point actual e minuti completi di tutti i selezionati, sostituzioni dirette e legni individuali; copertura dei perdenti e vincenti simmetrica. Gli over provati da un limite inferiore hanno esito valido ma non un conteggio esatto per MAE.
- Dataset di input pre-kickoff per disponibilità, ruolo tattico, avversario e volume concesso; identificativi e timestamp di acquisizione oltre alla data dell’evento. Per MD1 oltre top-5 mancano forecast originali.
- La prima MD1 è l’unica giornata player con originali storici confrontabili nel dataset recuperato; lo split intra-MD non crea tre giornate indipendenti. La Fase 11 resta post-kickoff per MD1.
- Le quote originali sono prezzi, non probabilità calibrate. Le ricevute Sisal non sono presenti: si valuta rendimento statistico, non liquidazione certificata.

| Grigio / selectionId | Fixture | Contratto | Fonte necessaria |
| --- | --- | --- | --- |
| sisal:4858180:822318867:5378989938 | Inter - Club Brugge | Hugo Vetlesen over 0,5 SOT · sostituto incluso · pali/traverse inclusi | Referto UEFA/Opta individuale di Vetlesen e Lemaréchal, legni attribuiti e revisione del conteggio SOT. |
| sisal:4858176:822440794:5379720627 | Leipzig - PSV Eindhoven | Christopher Nkunku over 0,5 SOT · sostituto incluso · pali/traverse inclusi | Opta/UEFA: classificazione del tiro al 67 e attribuzione di eventuali legni a Nkunku. |
| sisal:4858181:822445310:5379737948 | Feyenoord - Como | Nacho Ferri over 2,5 tiri · sostituto incluso | Conteggio completo UEFA/Opta dei tiri di Ferri e Tobias van den Elshout nel 14/10, con ID verificati. |
| sisal:4858181:822308423:5379056413 | Feyenoord - Como | Feyenoord over 4,5 corner | Referto corner UEFA/Opta finale, con distinzione assegnati/eseguiti ed eventuale rettifica di fine partita. |
| sisal:4858181:822445292:5379737866 | Feyenoord - Como | Nacho Ferri over 0,5 SOT · sostituto incluso · pali/traverse inclusi | Eventi di tiro con classificazione e legni per Ferri e van den Elshout, provider UEFA/Opta. |
| sisal:4858181:822444815:5379737104 | Feyenoord - Como | Nacho Ferri over 1,5 SOT · sostituto incluso · pali/traverse inclusi | Referto completo SOT+legni Ferri e van den Elshout, con assenza/presenza di altri cambi certificata. |
| sisal:4858144:822494796:5380035442 | Shakhtar Donetsk - AEK Athens | Kauã Elias over 1,5 tiri · sostituto incluso | Referto individuale tiri di Kauã Elias e Luca Meirelles nel 14/10 da UEFA/Opta. |
| sisal:4858142:822436643:5379692328 | Bodø/Glimt - Borussia Dortmund | Sondre Auklend over 2,5 tiri · sostituto incluso | Tabellino individuale datato 14/10, con tiri totali e 90 minuti di Auklend, preferibilmente UEFA/Opta. |
| sisal:4858175:822427746:5379618392 | Real Betis - Porto | Troy Parrott over 2,5 tiri · sostituto incluso | Tiri totali UEFA/Opta di Parrott e Cucho Hernández, inclusi respinti, fino al termine. |


## 9. Registro completo del confronto (nessun cambio di esito)

Tutte le 34 perse e tutte le 74 vinte sono riportate separatamente; il JSON diagnostico allegato conserva segmenti, actual omogenei e simulazioni. L’audit originario resta la fonte degli esiti. P e minuti N/D restano N/D.

### Perse (34)

| ID | Gara | Contratto | Quota | P % | Minuti previsti | Filtro | Motivo audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sisal:4858138:810819234:5317120249 | Lens - Sporting CP | Lens o pareggio (1X) | 1.50 | 61.3 | N/D | incluso | Finale 0-2, selezione 1X. |
| sisal:4858138:821928592:5376859993 | Lens - Sporting CP | Odsonne Édouard over 3,5 tiri · sostituto incluso | 3.25 | N/D | N/D | escluso non titolare | Riga FBref indicizzata del 13/10: subentrante, 33 minuti, 1 tiro e 1 SOT. Nessuna successiva uscita nella cronologia completa dei cambi: il DUO nominato Édouard vale 1 tiro, non 3 di Ivanović + 1. 1 < 3,5. Non titolare, non VOID. |
| sisal:4858137:810810961:5317134384 | Sabah - Slavia Praha | Totale partita over 2,5 gol | 1.57 | 65.5 | N/D | incluso | Gol totali 2; OVER 2.5. |
| sisal:4858146:821922356:5376832575 | Arsenal - Lille | Bukayo Saka over 2,5 tiri · sostituto incluso | 1.33 | N/D | N/D | escluso non titolare | Riga FBref del 13/10: subentrante, 26 minuti, 1 tiro (il gol), nessun cambio successivo. 1 < 2,5. Non si aggiunge il tiro di Madueke, uscito al suo ingresso. |
| sisal:4858146:821922408:5376832817 | Arsenal - Lille | Ayase Ueda over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.75 | N/D | 84.6 | incluso | Lille 0 tiri in porta e 0 pali/traverse complessivi (Sky Sport) |
| sisal:4858146:821922449:5376832991 | Arsenal - Lille | Ayase Ueda over 1,5 tiri · sostituto incluso | 1.75 | N/D | 84.6 | incluso | Ueda 1 tiro; sostituto Giroud 0 tiri |
| sisal:4858146:810823358:5317157812 | Arsenal - Lille | Totale partita under 2,5 gol | 2.40 | 46.4 | N/D | incluso | Gol totali 3; UNDER 2.5. |
| sisal:4858146:821922371:5376832677 | Arsenal - Lille | Ayase Ueda over 2,5 tiri · sostituto incluso | 3.50 | N/D | 84.6 | incluso | Ueda 1 tiro; sostituto Giroud 0 tiri |
| sisal:4858146:821921851:5376819861 | Arsenal - Lille | Benjamin André over 0,5 tiri · sostituto incluso | 2.50 | N/D | 84.6 | incluso | André 0 tiri, ha giocato 90 minuti |
| sisal:4858177:821890410:5376642298 | Atlético de Madrid - Manchester United | Ademola Lookman over 2,5 tiri · sostituto incluso | 1.25 | N/D | N/D | escluso non titolare | Riga FBref del 13/10: subentrante, 20 minuti, 1 tiro/1 gol; resta in campo fino al termine. 1 < 2,5. I 3 tiri di Baena, che gli ha lasciato il posto, non si sommano al contratto Lookman. |
| sisal:4858177:821888605:5376633847 | Atlético de Madrid - Manchester United | Marcus Rashford over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.65 | N/D | 84.6 | incluso | Rashford 0 SOT + Amad Diallo 0 SOT. Legno United attribuito a Bruno Fernandes, non a Rashford/Amad. |
| sisal:4858177:810814205:5317191046 | Atlético de Madrid - Manchester United | Totale partita over 2,5 gol | 1.60 | 65.5 | N/D | incluso | Gol totali 2; OVER 2.5. |
| sisal:4858177:821888775:5376634522 | Atlético de Madrid - Manchester United | Marcus Rashford over 1,5 tiri · sostituto incluso | 1.50 | N/D | 84.6 | incluso | Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. |
| sisal:4858177:810814206:5317191050 | Atlético de Madrid - Manchester United | Totale partita over 3,5 gol | 2.50 | 43.6 | N/D | incluso | Gol totali 2; OVER 3.5. |
| sisal:4858177:821888897:5376635025 | Atlético de Madrid - Manchester United | Marcus Rashford over 3,5 tiri · sostituto incluso | 4.50 | N/D | 84.6 | incluso | Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. |
| sisal:4858180:810827979:5317179996 | Inter - Club Brugge | Inter (1) | 1.25 | 56.4 | N/D | incluso | Finale 3-4, selezione 1. |
| sisal:4858143:822328597:5379080809 | Galatasaray - Barcelona | Victor Osimhen over 3,5 tiri · sostituto incluso | 1.57 | N/D | 84.6 | incluso | Victor Osimhen: 1 tiro in 90 minuti, nessun sostituto; Over 3,5 non raggiunto. |
| sisal:4858143:822328741:5379081413 | Galatasaray - Barcelona | Victor Osimhen over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | 84.6 | incluso | FBref: 1 tiro totale, 90 minuti, 0 SOT; cronaca descrive 1 SOT. Galatasaray ha 0 legni nella tabella e Osimhen non è sostituito: il contratto assume 0 oppure 1, comunque < 1,5. La discordanza sul conteggio resta annotata, ma non cambia l'esito. |
| sisal:4858143:810812673:5317142893 | Galatasaray - Barcelona | Totale partita under 3,5 gol | 2.40 | 46.8 | N/D | incluso | Gol totali 5; UNDER 3.5. |
| sisal:4858143:822328609:5379080871 | Galatasaray - Barcelona | Dani Olmo over 3,5 tiri · sostituto incluso | 2.75 | N/D | 84.6 | incluso | Olmo 2 conclusioni e Gabriel Jesus, suo sostituto, 1 conclusione: totale 3, inferiore a 4. |
| sisal:4858176:810827927:5317179754 | Leipzig - PSV Eindhoven | Pareggio o PSV Eindhoven (X2) | 2.30 | 61.7 | N/D | incluso | Finale 1-0, selezione X2. |
| sisal:4858176:822442814:5379721386 | Leipzig - PSV Eindhoven | Sven Mijnans over 2,5 tiri · sostituto incluso | 1.47 | N/D | 84.6 | incluso | Mijnans: 2 tiri (7 e 51); sostituto Mikkel Hansen all’84, nessun tiro nella cronaca completa. |
| sisal:4858176:822440956:5379722099 | Leipzig - PSV Eindhoven | Sven Mijnans over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 3.75 | N/D | 84.6 | incluso | Mijnans: 1 tiro in porta (7), un tiro fuori (51); sostituto Hansen all’84 senza SOT/legni nella cronaca. |
| sisal:4858141:810811557:5317137107 | Viking - Bayern München | Bayern München (2) | 1.10 | 61.6 | N/D | incluso | Finale 3-3, selezione 2. |
| sisal:4858141:810812050:5317139355 | Viking - Bayern München | Totale partita under 3,5 gol | 2.90 | 39.6 | N/D | incluso | Gol totali 6; UNDER 3.5. |
| sisal:4858139:821933832:5376899615 | Villarreal - Napoli | Matteo Politano over 1,5 tiri · sostituto incluso | 1.50 | N/D | 84.6 | incluso | Politano 1 tiro + Neres 0 tiri = 1. Neres entra al 61° per Politano. |
| sisal:4858179:810815376:5317198125 | LASK - Liverpool | Totale partita under 3,5 gol | 1.80 | 58.0 | N/D | incluso | Gol totali 9; UNDER 3.5. |
| sisal:4858179:810815375:5317198121 | LASK - Liverpool | Totale partita under 2,5 gol | 3.10 | 35.9 | N/D | incluso | Gol totali 9; UNDER 2.5. |
| sisal:4858182:810824498:5317163714 | Roma - Real Madrid | Roma o pareggio (1X) | 1.85 | 63.0 | N/D | incluso | Finale 3-4, selezione 1X. |
| sisal:4858182:810824494:5317163698 | Roma - Real Madrid | Totale partita under 3,5 gol | 1.72 | 59.7 | N/D | incluso | Gol totali 7; UNDER 3.5. |
| sisal:4858182:810824493:5317163694 | Roma - Real Madrid | Totale partita under 2,5 gol | 2.90 | 37.5 | N/D | incluso | Gol totali 7; UNDER 2.5. |
| sisal:4858182:822397215:5379468394 | Roma - Real Madrid | Paulo Dybala over 3,5 tiri · sostituto incluso | 2.40 | N/D | 84.6 | incluso | Contratto originale 3,5: Dybala 1 + sostituto diretto Rodrigo Mora 2 = 3, inferiore a 3,5. Nessun trasferimento delle statistiche di un altro compagno. |
| sisal:4858142:822436691:5379692496 | Bodø/Glimt - Borussia Dortmund | Patrick Berg over 1,5 tiri · sostituto incluso | 1.47 | N/D | 84.6 | incluso | Successivo recupero della riga FBref indicizzata del 14/10: Berg, Bodø/Glimt contro Dortmund, 90 minuti e 1 tiro totale. Nessun sostituto; 1 < 1,5. Il profilo OFStats fermo al 10/10 è scartato e non interpretato come zero. |
| sisal:4858140:810819774:5317123345 | Slovan Bratislava - Stuttgart | Totale partita under 2,5 gol | 3.25 | 38.5 | N/D | incluso | Gol totali 3; UNDER 2.5. |

### Vinte (74)

| ID | Gara | Contratto | Quota | P % | Minuti previsti | Filtro | Motivo audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sisal:4858138:821926893:5376855525 | Lens - Sporting CP | Luis Suárez over 2,5 tiri · sostituto incluso | 1.40 | N/D | 84.6 | incluso | 3 tiri individuali (StatMuse); sostituto incluso non necessario |
| sisal:4858138:821927618:5376863469 | Lens - Sporting CP | Odsonne Édouard over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | N/D | escluso non titolare | Édouard entra al 58 per Ivanović: un SOT proprio al 62, corroborato dalla tabella individuale (33 minuti, 1 SOT). 1 > 0,5, senza contributi del predecessore. Non titolare ma partecipante; nessun VOID. |
| sisal:4858138:821927322:5376857359 | Lens - Sporting CP | Franjo Ivanović over 1,5 tiri · sostituto incluso | 1.20 | N/D | 84.6 | incluso | Due conclusioni fuori e una descritta in porta nella cronaca prima del cambio: almeno 3 tiri propri > 1,5. Non serve conoscere i tiri di Édouard. Eliminato il testo estraneo su Rashford. |
| sisal:4858138:821927323:5376857369 | Lens - Sporting CP | Issa Doumbia over 1,5 tiri · sostituto incluso | 2.40 | N/D | 84.6 | incluso | Cronaca: tiro fuori al 73 e gol al 74, entrambi prima del cambio con Pedro Lima. Almeno 2 tiri > 1,5. Nessuna dipendenza dal conteggio di Rashford o dal sostituto. |
| sisal:4858137:810810469:5317115820 | Sabah - Slavia Praha | Sabah (1) | 3.75 | 61.7 | N/D | incluso | Finale 2-0, selezione 1. |
| sisal:4858146:810822866:5317155562 | Arsenal - Lille | Arsenal (1) | 1.20 | 75.9 | N/D | incluso | Finale 3-0, selezione 1. |
| sisal:4858146:821921916:5376820147 | Arsenal - Lille | Eberechi Eze over 1,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Almeno 3 conclusioni in porta di Eze (StatMuse) |
| sisal:4858146:810823359:5317157816 | Arsenal - Lille | Totale partita under 3,5 gol | 1.52 | 68.6 | N/D | incluso | Gol totali 3; UNDER 3.5. |
| sisal:4858177:810813713:5317148815 | Atlético de Madrid - Manchester United | Atlético de Madrid (1) | 1.95 | 53.2 | N/D | incluso | Finale 2-0, selezione 1. |
| sisal:4858177:821891749:5376648956 | Atlético de Madrid - Manchester United | Alejandro Grimaldo over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | 84.6 | incluso | Legno colpito da Grimaldo; contratto include pali/traverse. |
| sisal:4858180:822319165:5378991126 | Inter - Club Brugge | Lautaro Martínez over 2,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Lautaro 12 tiri |
| sisal:4858180:822318885:5378990012 | Inter - Club Brugge | Nicolo Tresoldi over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.57 | N/D | 84.6 | incluso | Tresoldi autore di tre gol, almeno un tiro in porta |
| sisal:4858180:822318847:5378989876 | Inter - Club Brugge | Hakan Çalhanoğlu over 1,5 tiri · sostituto incluso | 1.12 | N/D | 84.6 | incluso | Çalhanoğlu 2 tiri |
| sisal:4858180:822318899:5378990067 | Inter - Club Brugge | Club Brugge over 10,5 tiri | 1.72 | 60.7 | N/D | incluso | 18 tiri totali del Club Brugge (Sky Sport) |
| sisal:4858180:822315691:5378999317 | Inter - Club Brugge | Marcus Thuram over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | 84.6 | incluso | Thuram 0 SOT, sostituto Francesco Esposito 1 SOT; sostituto incluso |
| sisal:4858143:810812179:5317140495 | Galatasaray - Barcelona | Barcelona (2) | 1.28 | 52.4 | N/D | incluso | Finale 1-4, selezione 2. |
| sisal:4858143:822328638:5379080986 | Galatasaray - Barcelona | Lamine Yamal over 2,5 tiri · sostituto incluso | 1.12 | N/D | 84.6 | incluso | Cronaca StatMuse: Yamal 5 conclusioni (12, 25, 52, 63, 69 minuti), supera 2,5. |
| sisal:4858143:822328537:5379080617 | Galatasaray - Barcelona | Dani Olmo over 1,5 tiri · sostituto incluso | 1.20 | N/D | 84.6 | incluso | Olmo 2 conclusioni (24 e 45); anche senza il sostituto supera 1,5. |
| sisal:4858176:822440767:5379720511 | Leipzig - PSV Eindhoven | Brajan Gruda over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.33 | N/D | 84.6 | incluso | Gruda marcatore al 75°, dunque almeno un tiro in porta |
| sisal:4858176:821951423:5376985276 | Leipzig - PSV Eindhoven | PSV Eindhoven over 4,5 corner | 2.00 | 57.4 | N/D | incluso | 13 corner del PSV (Sky Sport) |
| sisal:4858141:822324471:5379048990 | Viking - Bayern München | Harry Kane over 2,5 tiri · sostituto incluso | 1.02 | N/D | 84.6 | incluso | Harry Kane: 5 tiri, 90 minuti; Over 2,5 soddisfatto senza sostituto. |
| sisal:4858141:822325380:5379058260 | Viking - Bayern München | Harry Kane over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.02 | N/D | 84.6 | incluso | Kane ha segnato 2 gol |
| sisal:4858141:822325406:5379058382 | Viking - Bayern München | Michael Olise over 2,5 tiri · sostituto incluso | 1.12 | N/D | 84.6 | incluso | Olise 2 SOT al 6° e 10°, più 1 tiro fuori al 32° |
| sisal:4858141:822307883:5379053237 | Viking - Bayern München | Peter Christiansen over 1,5 tiri · sostituto incluso | 1.57 | N/D | 84.6 | incluso | Christiansen 2 tiri in porta nel tabellino |
| sisal:4858141:822325176:5379023059 | Viking - Bayern München | Kristoffer Askildsen over 1,5 tiri · sostituto incluso | 4.00 | N/D | 84.6 | incluso | Askildsen: 2 tiri e 90 minuti (FBref). |
| sisal:4858139:810811510:5317136887 | Villarreal - Napoli | Villarreal o pareggio (1X) | 1.30 | 64.8 | N/D | incluso | Finale 3-1, selezione 1X. |
| sisal:4858139:821933839:5376899635 | Villarreal - Napoli | Georges Mikautadze over 2,5 tiri · sostituto incluso | 1.33 | N/D | 84.6 | incluso | Mikautadze 2 tiri (FBref) + Freeman sostituto diretto almeno 1 tiro bloccato al 78° (Futbol24). |
| sisal:4858139:821934911:5376899499 | Villarreal - Napoli | Georges Mikautadze over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | 84.6 | incluso | Mikautadze segna al 23’: il gol basta per Over 0,5 SOT. |
| sisal:4858139:821934797:5376899039 | Villarreal - Napoli | Gerard Moreno over 1,5 tiri · sostituto incluso | 1.25 | N/D | 84.6 | incluso | Due tiri fuori distinti nella cronaca (prima del cambio diretto con Oluwaseyi): almeno 2 > 1,5. Rimossa la motivazione copiata da Rashford; sostituto non necessario. |
| sisal:4858139:821934696:5376893722 | Villarreal - Napoli | Giovanni Di Lorenzo over 0,5 tiri · sostituto incluso | 1.80 | N/D | 84.6 | incluso | 1 tiro in porta nel tabellino individuale, sufficiente per Over 0,5 tiri totali. |
| sisal:4858181:810829154:5317187926 | Feyenoord - Como | Feyenoord o pareggio (1X) | 1.85 | 61.8 | N/D | incluso | Finale 3-2, selezione 1X. |
| sisal:4858181:822444069:5379739299 | Feyenoord - Como | Anis Hadj Moussa over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | 84.6 | incluso | Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858181:822445073:5379738881 | Feyenoord - Como | Nicolás Paz over 2,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | PlayerStats riporta 3 tiri di Nico Paz. La cronaca OFStats documenta tiro respinto al 56 e conclusioni fuori al 70 e 89; restano tiri totali, senza promuoverli a SOT. Almeno 3 > 2,5. |
| sisal:4858181:822445407:5379748908 | Feyenoord - Como | Feyenoord over 3,5 tiri in porta | 1.45 | 83.2 | N/D | incluso | Sky Sports e PlayerStats riportano entrambi 5 SOT Feyenoord: 5 > 3,5. Il conflitto sui corner non invalida questa metrica concorde. |
| sisal:4858179:810814883:5317194823 | LASK - Liverpool | Liverpool (2) | 1.28 | 60.5 | N/D | incluso | Finale 3-6, selezione 2. |
| sisal:4858179:822421335:5379593659 | LASK - Liverpool | Kasper Jørgensen over 1,5 tiri · sostituto incluso | 2.00 | N/D | 84.6 | incluso | Minimo documentato 4 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858179:822423448:5379557227 | LASK - Liverpool | Florian Wirtz over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.40 | N/D | 84.6 | incluso | Minimo documentato 4 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858179:822421392:5379593873 | LASK - Liverpool | Kasper Jørgensen over 2,5 tiri · sostituto incluso | 4.50 | N/D | 84.6 | incluso | Minimo documentato 4 shots > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822400406:5379468966 | Roma - Real Madrid | Donyell Malen over 2,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Minimo documentato 3 shotsOnTarget > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822399568:5379481854 | Roma - Real Madrid | Kylian Mbappé over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.02 | N/D | 84.6 | incluso | Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822397458:5379471995 | Roma - Real Madrid | Matías Soulé over 1,5 tiri · sostituto incluso | 1.33 | N/D | 84.6 | incluso | Minimo documentato 2 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822328128:5379068529 | Roma - Real Madrid | Roma over 4,5 corner | 2.10 | 58.4 | N/D | incluso | corners: 5, soglia 4.5. |
| sisal:4858182:822399841:5379482976 | Roma - Real Madrid | Roma over 3,5 tiri in porta | 1.45 | 78.1 | N/D | incluso | shotsOnTarget: 7, soglia 3.5. |
| sisal:4858182:822400587:5379489006 | Roma - Real Madrid | Paulo Dybala over 1,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Dybala 1 tiro nei primi 45 minuti; sostituzione diretta con Rodrigo Mora, che la riga FBref del 14/10 accredita di 2 tiri. Somma DUO 1+2=3 > 1,5. |
| sisal:4858182:822399634:5379482130 | Roma - Real Madrid | Marten De Roon over 0,5 tiri · sostituto incluso | 2.00 | N/D | 84.6 | incluso | Minimo documentato 1 shots > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858178:810814257:5317191197 | Aston Villa - Fenerbahçe | Aston Villa (1) | 1.62 | 70.2 | N/D | incluso | Finale 6-0, selezione 1. |
| sisal:4858178:822473431:5379916496 | Aston Villa - Fenerbahçe | Nicolas Jackson over 2,5 tiri · sostituto incluso | 1.47 | N/D | 84.6 | incluso | Tabella StatMuse: 3 SOT propri; anche i due gol e il distinto tiro fuori della cronaca provano almeno 3 conclusioni. 3 > 2,5, senza bisogno del contributo di Abraham. |
| sisal:4858178:822464266:5379907715 | Aston Villa - Fenerbahçe | Mason Greenwood over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | 84.6 | incluso | Riga FBref del 14/10: Greenwood, Fenerbahçe contro Aston Villa, 68 minuti, 3 tiri e 1 SOT. Il singolo SOT proprio basta per Over 0,5; nessuna assunzione su legni o Nene Dorgeles. |
| sisal:4858178:822464375:5379908171 | Aston Villa - Fenerbahçe | Johan Manzambi over 1,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Tentativo individuale al minuto 8 e gol al 12: almeno due conclusioni distinte > 1,5. Il conflitto fra descrizione in porta e tabella SOT=1 non cambia il numero minimo di tiri totali: la prima conclusione può essere riclassificata senza cancellarla. Il contributo del sostituto João Gomes non è necessario; non si assegna un nuovo actual SOT. |
| sisal:4858178:822481714:5379908219 | Aston Villa - Fenerbahçe | Mason Greenwood over 3,5 tiri · sostituto incluso | 2.25 | N/D | 84.6 | incluso | Righe FBref del 14/10: Greenwood 3 tiri in 68 minuti, Nene Dorgeles 1 tiro in 22. StatMuse documenta il cambio diretto: somma 4 > 3,5. |
| sisal:4858144:810821027:5317129797 | Shakhtar Donetsk - AEK Athens | Shakhtar Donetsk o pareggio (1X) | 1.50 | 66.4 | N/D | incluso | Finale 3-1, selezione 1X. |
| sisal:4858144:822490878:5379976360 | Shakhtar Donetsk - AEK Athens | Aboubakary Koita over 1,5 tiri · sostituto incluso | 1.40 | N/D | 84.6 | incluso | Minimo documentato 2 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858144:822326236:5379066966 | Shakhtar Donetsk - AEK Athens | AEK Athens under 4,5 corner | 1.62 | 63.7 | N/D | incluso | corners: 2, soglia 4.5. |
| sisal:4858142:810820323:5317125221 | Bodø/Glimt - Borussia Dortmund | Bodø/Glimt o pareggio (1X) | 1.75 | 65.9 | N/D | incluso | Finale 1-0, selezione 1X. |
| sisal:4858142:822436328:5379691269 | Bodø/Glimt - Borussia Dortmund | Jens Petter Hauge over 1,5 tiri · sostituto incluso | 1.33 | N/D | 84.6 | incluso | Minimo documentato 3 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858142:822436384:5379691483 | Bodø/Glimt - Borussia Dortmund | Bodø/Glimt over 10,5 tiri | 1.27 | 90.2 | N/D | incluso | Bodø/Glimt: 11 tiri totali, concordi tra Sky Sports e StatMuse. 11 > 10,5. I respinti restano parte del totale senza essere aggiunti una seconda volta. |
| sisal:4858174:810826340:5317172512 | Manchester City - Paris Saint-Germain | Paris Saint-Germain (2) | 3.00 | 52.6 | N/D | incluso | Finale 2-4, selezione 2. |
| sisal:4858174:822414877:5379541937 | Manchester City - Paris Saint-Germain | Erling Haaland over 2,5 tiri · sostituto incluso | 1.20 | N/D | 84.6 | incluso | Minimo documentato 3 shotsOnTarget > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858174:822415651:5379562391 | Manchester City - Paris Saint-Germain | Erling Haaland over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.12 | N/D | 84.6 | incluso | Minimo documentato 3 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858174:822308666:5379057520 | Manchester City - Paris Saint-Germain | Manchester City over 4,5 corner | 1.70 | 65.5 | N/D | incluso | StatMuse registra 11 corner Manchester City e descrive almeno cinque esecuzioni distinte prima dell'intervallo. Anche senza il totale finale, il limite inferiore 5 supera 4,5. |
| sisal:4858174:822410688:5379527485 | Manchester City - Paris Saint-Germain | Paris Saint-Germain over 3,5 tiri in porta | 1.36 | 77.7 | N/D | incluso | Quattro marcatori PSG nella cronaca UEFA: almeno quattro SOT, sufficienti per Over 3,5. |
| sisal:4858174:822407528:5379562023 | Manchester City - Paris Saint-Germain | Ousmane Dembélé over 1,5 tiri · sostituto incluso | 1.16 | N/D | 84.6 | incluso | Dembélé segna, poi è sostituito direttamente da Ferran Torres. UEFA documenta il rigore di Torres parato nel finale: almeno 1 tiro di Dembélé + 1 di Torres = 2 > 1,5. Scartata l'attribuzione errata a Donnarumma nella cronaca StatMuse. |
| sisal:4858174:822410566:5379526973 | Manchester City - Paris Saint-Germain | Enzo Fernández over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | 84.6 | incluso | Minimo documentato 1 shotsOnTargetAndWoodwork > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858175:810827383:5317178572 | Real Betis - Porto | Real Betis o pareggio (1X) | 1.30 | 67.6 | N/D | incluso | Finale 3-2, selezione 1X. |
| sisal:4858175:822427728:5379618338 | Real Betis - Porto | Troy Parrott over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.40 | N/D | 84.6 | incluso | Cucho Hernández entra per Parrott al 62 e segna al 74. Almeno 1 SOT del sostituto diretto > 0,5; eventuali tiri e legni di Parrott non sono necessari. |
| sisal:4858175:822427450:5379631228 | Real Betis - Porto | André Silva over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | 84.6 | incluso | André Silva esce per Samu al 59, Samu segna al 61: almeno 1 SOT del sostituto diretto > 0,5. Il palo-gol è una sola conclusione, non due. |
| sisal:4858175:822427489:5379632168 | Real Betis - Porto | Porto over 10,5 tiri | 1.40 | 74.4 | N/D | incluso | Porto 11 tiri totali, concordi Sky Sports e StatMuse: 11 > 10,5. Nessuna somma aggiuntiva dei tiri respinti al totale già comprensivo. |
| sisal:4858175:822426842:5379630012 | Real Betis - Porto | Abde Ezzalzouli over 1,5 tiri · sostituto incluso | 1.20 | N/D | 84.6 | incluso | FBref indicizzato: 90 minuti e 5 tiri, di cui 2 SOT, nel Betis–Porto del 14/10. 5 > 1,5; non occorre un sostituto. |
| sisal:4858175:822427716:5379618278 | Real Betis - Porto | Abde Ezzalzouli over 3,5 tiri · sostituto incluso | 2.50 | N/D | 84.6 | incluso | Stessa riga originale del 14/10: 5 tiri in 90 minuti. 5 > 3,5, senza modificare soglia, quota o previsione. |
| sisal:4858140:810819779:5317123379 | Slovan Bratislava - Stuttgart | Pareggio o Stuttgart (X2) | 1.06 | 65.9 | N/D | incluso | Finale 0-3, selezione X2. |
| sisal:4858140:822497290:5380053783 | Slovan Bratislava - Stuttgart | Deniz Undav over 2,5 tiri · sostituto incluso | 1.25 | N/D | 84.6 | incluso | Cronaca: una conclusione al 24, gol al 29 e ulteriore tentativo al 79; almeno 3 tiri propri > 2,5. Non è necessario contare due volte le due descrizioni della conclusione al 24. Sufficiente senza sommare compagni o sostituti. |
| sisal:4858140:822496187:5380045189 | Slovan Bratislava - Stuttgart | Deniz Undav over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | 84.6 | incluso | Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858140:822491294:5379978203 | Slovan Bratislava - Stuttgart | Bilal El Khannouss over 1,5 tiri · sostituto incluso | 1.08 | N/D | 84.6 | incluso | El Khannouss effettua una conclusione al 44 prima di uscire al 81 per Demirović, che segna al 90. Il DUO ha almeno 2 tiri > 1,5; l'ulteriore tentativo al 62 non è necessario e la sua classificazione SOT resta separata. |
| sisal:4858140:810819775:5317123351 | Slovan Bratislava - Stuttgart | Totale partita under 3,5 gol | 1.90 | 60.8 | N/D | incluso | Gol totali 3; UNDER 3.5. |

### Actual individuali usati nei point-score

| Gara | Giocatore | Min prev/real | Tiri prev/real | SOT prev/real | Provenienza/limite |
| --- | --- | --- | --- | --- | --- |
| Arsenal - Lille | Benjamin André | 84.6/90.0 | 0.86/0.00 | 0.27/N/D | Audit volume table; inherited secondary evidence |
| Galatasaray - Barcelona | Victor Osimhen | 84.6/90.0 | 4.29/1.00 | 1.95/N/D | Audit volume table; inherited secondary evidence |
| Viking - Bayern München | Harry Kane | 84.6/90.0 | 3.48/5.00 | 1.85/N/D | Audit volume table; inherited secondary evidence |
| Viking - Bayern München | Kristoffer Askildsen | 84.6/90.0 | 1.82/2.00 | 0.49/N/D | Audit volume table; inherited secondary evidence |
| Feyenoord - Como | Nacho Ferri | 84.6/N/D | 3.73/1.00 | 1.52/N/D | Gray recovery case 11; secondary evidence, including indexed extracts. Same player, not replacement. |
| Feyenoord - Como | Anis Hadj Moussa | 84.6/89.0 | 3.24/N/D | 1.32/3.00 | Audit volume table; inherited secondary evidence |
| LASK - Liverpool | Kasper Jørgensen | 84.6/45.0 | 2.06/N/D | 0.62/0.00 | Audit volume table; inherited secondary evidence |
| Roma - Real Madrid | Donyell Malen | 84.6/90.0 | 4.03/N/D | 1.65/3.00 | Audit volume table; inherited secondary evidence |
| Roma - Real Madrid | Matías Soulé | 84.6/62.0 | 2.19/N/D | 0.72/1.00 | Audit volume table; inherited secondary evidence |
| Roma - Real Madrid | Paulo Dybala | 84.6/45.0 | 2.57/1.00 | 0.98/0.00 | Gray recovery case 17; secondary evidence, including indexed extracts. Same player, not replacement. |
| Roma - Real Madrid | Marten De Roon | 84.6/90.0 | 0.84/N/D | 0.22/1.00 | Audit volume table; inherited secondary evidence |
| Aston Villa - Fenerbahçe | Mason Greenwood | 84.6/68.0 | 3.26/3.00 | 1.53/1.00 | Gray recovery case 20; secondary evidence, including indexed extracts. Same player, not replacement. |
| Bodø/Glimt - Borussia Dortmund | Patrick Berg | 84.6/90.0 | 2.30/1.00 | 0.67/N/D | Gray recovery case 24; secondary evidence, including indexed extracts. Same player, not replacement. |
| Real Betis - Porto | Abde Ezzalzouli | 84.6/90.0 | 2.54/5.00 | 0.89/2.00 | Gray recovery case 33; secondary evidence, including indexed extracts. Same player, not replacement. |
| Leipzig - PSV Eindhoven | Christopher Nkunku | 84.6/90.0 | 2.02/1.00 | 0.99/N/D | Gray recovery case 9; secondary evidence, including indexed extracts. Same player, not replacement. |
| Feyenoord - Como | Nicolás Paz | 84.6/N/D | 3.35/3.00 | 1.40/N/D | Gray recovery case 12; secondary evidence, including indexed extracts. Same player, not replacement. |
| Shakhtar Donetsk - AEK Athens | Kauã Elias | 84.6/N/D | 2.86/1.00 | 1.12/N/D | Gray recovery case 23; secondary evidence, including indexed extracts. Same player, not replacement. |

## 10. Riproducibilità e protezioni

Eseguire dalla root: `node output/reports/analyze-champions-md2-improvements-2026-10-15.cjs`. Scrive esclusivamente il nuovo report Markdown e JSON in output/reports. Legge audit e dataset locali; nessun fetch, nessuna nuova verifica live dei provider. Le conclusioni riguardano le prove già conservate, senza migliorare artificialmente il grado della fonte.

Fonti locali principali:

- [Audit MD2](./champions-post-match-audit-2026-10-15.md) e relativo JSON congelato.
- [Recupero storico aggiornato MD1](./champions-historical-recovery-audit-2026-10-13.md): sostituisce il benchmark parziale da 30 con 94 osservazioni.
- [Candidato minuti Fase 11](./champions-substitute-minutes-2026-10-13.md): limiti cronologici conservati.
- `data/generated/uefa-1x2-backtest.json`, `data/normalized/champions-pilot-volume-backtest.json`, `data/analysis/prediction-calibration-v2.json`: benchmark distinti per obiettivo e competizione.
- Codice letto: `scripts/build-champions-pilot-predictions.js`, `scripts/build-champions-md02-integration.js`, `scripts/build-champions-md02-schedina.js`, `scripts/backtest-champions-pilot-volumes.js`. Nessuno eseguito in scrittura.

Controlli: conteggi 117/108/104 riconciliati; 34 perdenti e 74 vincenti; soglie, probabilità e quote dei 13 gol uguali al blob pre-kickoff; 94 ID storici unici e timestamp forecast/commit precedenti al kickoff; hash SHA256 di 13152 file tracciati identici prima/dopo (inclusi motore, dati, quote, UI e audit esistente). Nessun commit, push, deploy o build del sito.

Nota sul checkout condiviso: al controllo finale sono comparse modifiche concorrenti in `css/base.css`, `css/layout.css` e `css/players.css`, assenti nello status iniziale. Questa analisi non ha scritto quei file e le ha lasciate intatte. Gli hash dichiarati attestano l’invarianza durante la singola esecuzione del programma di ricerca; non attestano che l’intero checkout sia rimasto invariato per tutte le attività concorrenti della sessione.
