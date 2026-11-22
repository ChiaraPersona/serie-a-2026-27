# Verifica della stima gol Sabah–Barcelona

Verifica al 20 novembre 2026; fixture `ucl-2026-27-md05-10`, 25 novembre. Diagnosi, nessuna modifica operativa.

## Dati osservati e perimetro

Estrazione con parser da `data/sources/champions-pilot-match-stats-2025-27.json`: identificativi canonici `sabah` / `barcelona`, provider ESPN 21922 / 83, crosswalk Sabah VARStats e canonicalTeamId, leghe `aze.1` / `esp.1`, stagione `2026-27`. Nessun join approssimativo per nomi. Risultati europei da `data/generated/champions-team-history.json`; riscontro primario separato nel report `sabah-barcelona-primary-check-2026-11-20.md`.

| Campione | Gare | GF | GA | GF/gara | GA/gara |
|---|---:|---:|---:|---:|---:|
| Barcelona Liga corrente | 12 | 48 | 13 | 4,00 | 1,08 |
| Barcelona Liga corrente fuori casa | 6 | 24 | 6 | 4,00 | 1,00 |
| Barcelona Champions corrente | 4 | 14 | 6 | 3,50 | 1,50 |
| Barcelona Champions corrente fuori casa | 2 | 6 | 5 | 3,00 | 2,50 |
| Sabah campionato, campione disponibile | 8 | 15 | 6 | 1,875 | 0,75 |
| Sabah Champions corrente | 4 | 4 | 10 | 1,00 | 2,50 |
| Sabah Champions corrente in casa | 2 | 3 | 2 | 1,50 | 1,00 |
| Sabah Champions corrente fuori casa | 2 | 1 | 8 | 0,50 | 4,00 |

La copertura domestica Sabah è parziale: non chiamare queste otto gare intero campionato. Le dodici gare Liga e quattro Champions del Barcelona coincidono con i risultati ufficiali del club: [risultati](https://www.fcbarcelona.es/es/football/primer-equipo/resultados), [classifica](https://www.fcbarcelona.com/en/football/first-team/standings). Il 4–1 Viking è documentato nel [referto UEFA](https://www.uefa.com/newsfiles/UCL/2027/2049624_FR.pdf): Sabah espulso al 77', due gol successivi; non correggere arbitrariamente il risultato né trattarlo come misura a undici costanti.

Il [calendario ufficiale AFFA](https://www.affa.az/index.php/yarlar/topaz-premyer-liqas/tqvim/i-dvr/2436) permette di contare dieci risultati domestici Sabah fino all'8 novembre: **22 gol fatti, 6 subiti**, medie **2,20 / 0,60** (2–0 Kəpəz, 1–0 Araz, 5–0 Zirə, 3–0 Şəfa, 3–1 İmişli, 0–0 Neftçi, 4–0 Qəbələ, 0–0 Qarabağ, 2–3 Turan, 2–2 Şamaxı). Non acquisire automaticamente volumi individuali o di squadra mancanti da soli risultati.

Durante il lavoro il file condiviso canonico è cambiato: prima lettura con 12 gare Barcelona, ultima rilettura con 11 (46 GF / 12 GA, ultimo 31 ottobre); la proiezione già generata dichiara ancora ultima gara 8 novembre e 50 gare su due stagioni. Per le medie correnti di questa verifica fanno fede le fonti ufficiali sopra, 12 gare / 48 GF / 13 GA. Non dichiarare un replay operativo identico su snapshot differenti; nessuna riparazione della pipeline effettuata in questa diagnosi.

Non selezionare soltanto le sconfitte Sabah: includere il 2–0 interno allo Slavia. Viceversa, due partite casalinghe non bastano a certificare difesa forte contro Barcelona. Il contesto di Liga e Premyer Liqa va distinto; le medie delle due competizioni non sono direttamente intercambiabili. I [coefficienti UEFA](https://www.uefa.com/nationalassociations/uefarankings/?year=2026) documentano il livello europeo aggregato delle associazioni (Spagna terza), ma non sono moltiplicatori dei gol.

## Perché il candidato produce 2,3887

Il modello congelato in `data/analysis/champions/opta-direct-goals-2026-11-19/results.json` usa rating Sabah 83,28436 e Barcelona 97,59480, intercetta 0,494706, vantaggio casa 0,209149 e pendenza 0,335861. La relazione è `log(lambda_away)=mu-homeAdvantage/2-beta*(rating_home-rating_away)/10`. Non legge direttamente né le medie stagionali né gli avversari delle ultime gare.

Conseguenza strutturale: `lambda_home*lambda_away=exp(2*mu)=2,68965`. Non può rappresentare liberamente due profili offensivi/difensivi: a parità di divario assegna le stesse medie. La forza dei campionati può essere riflessa nei rating, ma manca una decomposizione verificata attacco/difesa con trasferimento tra leghe. Aggiungere un bonus Liga separato rischia di contare due volte il segnale.

Il valore 2,39 è circa il 40% inferiore ai 4,00 gol/gara Liga, il 32% inferiore ai 3,50 europei e il 20% inferiore ai 3,00 europei esterni. Queste differenze segnalano un controllo necessario; non provano da sole una sottostima, perché cambiano avversari e numerosità.

Anche il motore operativo ha un limite distinto: `scripts/champions/shared-scenario.cjs` normalizza i volumi rispetto alla media di ogni lega e poi a una scala comune; tale passaggio non stima da solo la differenza di qualità degli avversari. La proiezione corrente usa 8 gare Sabah contro 50 Barcelona (due stagioni) e dichiara `recentOpponentStrengthAdjustment:false`. Non attribuire questo problema al solo esperimento Opta.

## Sensibilità dei risultati esatti, non nuovo pronostico

Tenendo il Sabah artificialmente fisso a 1,125975, si varia solo la media Barcelona per mostrare l'effetto sui punteggi. È una sensibilità esterna alla formula congelata, non un modello rifittato né un intervallo di confidenza.

| Media Barcelona ipotetica | P(1–1) | Tre punteggi più probabili |
|---|---:|---|
| 2,388733, candidato reale | 8,00% | 1–2; 0–2; 1–1 |
| 3,50, riferimento descrittivo Champions | 3,86% | 1–3; 0–3; 1–4 |
| 4,00, riferimento descrittivo Liga | 2,68% | 1–3 / 1–4 a pari probabilità; 0–3 / 0–4 a pari probabilità |

Probabilità calcolate con Poisson indipendenti, senza quote o EV. Ai tassi interi i punteggi adiacenti sono pari; non scegliere un ordine sostanziale da errori floating point.

## Conclusione

I 2,39 gol sono riprodotti matematicamente, ma non risultano verificati come stima specifica migliore per questa gara. I dati correnti sostengono il dubbio di compressione dell'attacco Barcelona; il rendimento interno Sabah e i campioni piccoli impediscono di certificare semplicemente 3,5 o 4 come nuova media attesa. Un modello successivo dovrà distinguere attacco/difesa, sede, stagione e qualità degli avversari con trasferimento tra leghe stimato e verificato fuori campione. Nessun nuovo parametro o correttivo deciso sulla sola partita, nessuna modifica del sito, commit, push o deploy.
