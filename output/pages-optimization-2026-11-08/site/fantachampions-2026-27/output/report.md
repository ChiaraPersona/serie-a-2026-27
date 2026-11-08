# FantaChampions 2026/27 - ottimizzazione classifica generale

**Stato: PROVVISORIO.** Le rose rispettano i vincoli del PDF e usano il listone iniziale, ma devono essere ricontrollate nell'app per quotazioni correnti e indisponibilità last-minute. Il repository non contiene una base completa di voti Fantacalcio per tutti i 36 club: ogni voto base indicato è una proiezione, non un dato osservato.

## Correzioni regolamentari decisive

- Il limite ordinario è **2 cambi di mercato per turno**, non 5. Il numero 5 riguarda le sostituzioni automatiche dalla panchina.
- I moduli sono 3-4-2-1, 4-3-2-1 e 4-2-3-1. Il 3-4-2-1 vale +0,5 solo se, dopo le sostituzioni, restano tre D a voto.
- Panchina: 12 calciatori, con almeno un portiere; altri 5 restano fuori formazione.
- Le prime 8 possono usare nei due turni play-off il voto d'ufficio 6 (5 per i portieri) oppure sostituzioni temporanee di valore pari o inferiore, annullate automaticamente a fine play-off.
- I trasferimenti di giocatori eliminati o usciti dalla competizione non consumano i due cambi ordinari solo dopo la loro rimozione dalle liste di gioco.

## Copertura dati

- Listone estratto: 615 giocatori, 36 squadre, duplicati 0.
- Identità collegate agli archivi Champions: 587 (95.45%).
- Probabili titolari MD2 collegati: 395.
- Simulazioni avanzamento: 30,000; simulazioni rosa MD2: 12,000 per strategia.

## Confronto quantitativo

| Strategia | Budget | Modulo MD2 | xFP MD2 | P10 MD2 | P90 MD2 | P(11 voti) | xFP cumulativi | P10 cumul. | P90 cumul. | P(>=1056) |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A - Equilibrata | 280 | 4-2-3-1 | 78.73 | 70.56 | 87.37 | 94.87% | 981.56 | 906.80 | 1056.32 | 10.09% |
| B - Alto potenziale | 280 | 4-2-3-1 | 78.67 | 70.50 | 87.43 | 95.04% | 981.25 | 905.56 | 1056.94 | 10.28% |
| C - Lungo periodo | 280 | 4-2-3-1 | 78.76 | 70.73 | 87.33 | 97.97% | 979.58 | 906.59 | 1052.57 | 8.98% |

La soglia 1056 non è una stima di vittoria: equivale a 66 punti medi per 16 turni, lo stesso valore usato dal regolamento come bonus per ogni turno saltato da un'iscrizione tardiva. Le probabilità non modellano il campo degli altri partecipanti.

## A - Equilibrata

Budget 280/280; residuo 0. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 63.83 | 3.99 | 0.04 |
| 2 | P | Suzuki | Aston Villa | 8 | 96.5% | 5.32 | 53.81 | 6.73 | 0.10 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 5.96 | 78.66 | 6.55 | 0.05 |
| 4 | D | Upamecano | Bayern Monaco | 11 | 92.5% | 5.74 | 74.70 | 6.79 | 0.05 |
| 5 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.53 | 71.83 | 11.97 | 0.05 |
| 6 | D | Huijsen | Real Madrid | 5 | 92.5% | 5.46 | 65.83 | 13.16 | 0.09 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.79 | 77.67 | 7.77 | 0.04 |
| 8 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 5.99 | 76.56 | 10.94 | 0.05 |
| 9 | E | Wan-Bissaka | Aston Villa | 4 | 92.5% | 5.61 | 66.21 | 16.55 | 0.09 |
| 10 | C | Vitinha | Paris Saint-Germain | 14 | 92.5% | 6.19 | 81.68 | 5.83 | 0.04 |
| 11 | C | McGinn | Aston Villa | 13 | 92.5% | 6.34 | 81.36 | 6.26 | 0.04 |
| 12 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.10 | 78.70 | 7.87 | 0.05 |
| 13 | C | Kamara | Aston Villa | 6 | 92.5% | 5.84 | 75.30 | 12.55 | 0.05 |
| 14 | C | Zubimendi | Arsenal | 5 | 47.0% | 2.81 | 72.48 | 14.50 | 0.04 |
| 15 | C | Barkley | Aston Villa | 6 | 50.2% | 3.08 | 72.05 | 12.01 | 0.05 |
| 16 | F | Saka | Arsenal | 19 | 92.5% | 7.13 | 93.45 | 4.92 | 0.04 |
| 17 | F | Saibari | Bayern Monaco | 15 | 92.5% | 7.60 | 90.39 | 6.03 | 0.05 |
| 18 | F | Buendia | Aston Villa | 13 | 92.5% | 6.82 | 86.52 | 6.66 | 0.04 |
| 19 | F | Eze | Arsenal | 9 | 92.5% | 6.71 | 76.61 | 8.51 | 0.08 |
| 20 | F | Riquelme | Betis | 5 | 92.5% | 6.49 | 66.42 | 13.28 | 0.13 |
| 21 | F | Blomberg | Bodo Glimt | 5 | 92.5% | 6.93 | 65.99 | 13.20 | 0.16 |
| 22 | A | Havertz | Arsenal | 19 | 92.5% | 7.81 | 100.67 | 5.30 | 0.04 |
| 23 | A | Luis Diaz | Bayern Monaco | 24 | 92.5% | 7.93 | 97.35 | 4.06 | 0.05 |
| 24 | A | Jackson | Aston Villa | 16 | 92.5% | 7.88 | 88.51 | 5.53 | 0.09 |
| 25 | A | Suarez L.J. | Sporting CP | 14 | 92.5% | 7.87 | 83.75 | 5.98 | 0.12 |
| 26 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 8.93 | 81.07 | 16.21 | 0.16 |
| 27 | A | Christiansen P. | Viking | 2 | 92.5% | 7.32 | 64.39 | 32.20 | 0.23 |
| 28 | A | Edouard | Lens | 1 | 92.5% | 7.18 | 58.01 | 58.01 | 0.22 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 5.96, P(voto) 92.5%
- D - Upamecano (Bayern Monaco), 11 cr; xFP 5.74, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 5.99, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.79, P(voto) 92.5%
- C - McGinn (Aston Villa), 13 cr; xFP 6.34, P(voto) 92.5%
- C - Vitinha (Paris Saint-Germain), 14 cr; xFP 6.19, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 7.60, P(voto) 92.5%
- F - Saka (Arsenal), 19 cr; xFP 7.13, P(voto) 92.5%
- F - Blomberg (Bodo Glimt), 5 cr; xFP 6.93, P(voto) 92.5%
- A - Helmersen (Bodo Glimt), 5 cr; xFP 8.93, P(voto) 92.5%

### Panchina ordinata

1. P - Suzuki (Aston Villa)
2. D - Lindelof (Aston Villa)
3. E - Wan-Bissaka (Aston Villa)
4. C - Pavlovic A. (Bayern Monaco)
5. F - Buendia (Aston Villa)
6. A - Luis Diaz (Bayern Monaco)
7. A - Jackson (Aston Villa)
8. A - Suarez L.J. (Sporting CP)
9. A - Havertz (Arsenal)
10. A - Christiansen P. (Viking)
11. A - Edouard (Lens)
12. F - Eze (Arsenal)

### Fuori formazione

- F - Riquelme (Betis)
- C - Kamara (Aston Villa)
- D - Huijsen (Real Madrid)
- C - Barkley (Aston Villa)
- C - Zubimendi (Arsenal)

### Valore e rischi

Miglior rendimento atteso per credito: Edouard (58.01), Christiansen P. (32.20), Wan-Bissaka (16.55), Helmersen (16.21), Zubimendi (14.50).

Rischi principali: Christiansen P. (0.23), Edouard (0.22), Blomberg (0.16), Helmersen (0.16), Riquelme (0.13).

### Piano cambi

- **MD3-MD4**: Usare al massimo i due cambi ordinari solo per perdita del posto o infortunio confermati. Sorvegliati iniziali: Suzuki, Edouard.
- **MD5-MD6**: Ricalcolare l'avanzamento; spostare uno o due slot dalle squadre in discesa sotto il 24° posto verso quelle con maggiore probabilità di top 16.
- **MD7-MD8**: Proteggere flessibilità e valore residuo; i sostituti degli eliminati non consumano il limite ordinario solo dopo la rimozione dalle liste di gioco.
- **Play-off**: Per chi accede direttamente agli ottavi confrontare il 6/5 d'ufficio con un titolare temporaneo di prezzo uguale o inferiore; evitare il portiere temporaneo se non supera la base di 5 punti.
- **Knockout**: Concentrare i cambi sui titolari confermati delle squadre con maggiore probabilità condizionata di quarti e semifinali; non spendere entrambi i cambi prima dell'aggiornamento di formazioni e disponibilità.

## B - Alto potenziale

Budget 280/280; residuo 0. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 63.83 | 3.99 | 0.04 |
| 2 | P | Safonov | Paris Saint-Germain | 14 | 96.5% | 4.48 | 55.26 | 3.95 | 0.05 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 5.96 | 78.66 | 6.55 | 0.05 |
| 4 | D | Upamecano | Bayern Monaco | 11 | 92.5% | 5.74 | 74.70 | 6.79 | 0.05 |
| 5 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.53 | 71.83 | 11.97 | 0.05 |
| 6 | D | Huijsen | Real Madrid | 5 | 92.5% | 5.46 | 65.83 | 13.16 | 0.09 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.79 | 77.67 | 7.77 | 0.04 |
| 8 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 5.99 | 76.56 | 10.94 | 0.05 |
| 9 | E | Wan-Bissaka | Aston Villa | 4 | 92.5% | 5.61 | 66.21 | 16.55 | 0.09 |
| 10 | C | Vitinha | Paris Saint-Germain | 14 | 92.5% | 6.19 | 81.68 | 5.83 | 0.04 |
| 11 | C | McGinn | Aston Villa | 13 | 92.5% | 6.34 | 81.36 | 6.26 | 0.04 |
| 12 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.10 | 78.70 | 7.87 | 0.05 |
| 13 | C | Kamara | Aston Villa | 6 | 92.5% | 5.84 | 75.30 | 12.55 | 0.05 |
| 14 | F | Saka | Arsenal | 19 | 92.5% | 7.13 | 93.45 | 4.92 | 0.04 |
| 15 | F | Saibari | Bayern Monaco | 15 | 92.5% | 7.60 | 90.39 | 6.03 | 0.05 |
| 16 | F | Buendia | Aston Villa | 13 | 92.5% | 6.82 | 86.52 | 6.66 | 0.04 |
| 17 | F | Eze | Arsenal | 9 | 92.5% | 6.71 | 76.61 | 8.51 | 0.08 |
| 18 | F | Riquelme | Betis | 5 | 92.5% | 6.49 | 66.42 | 13.28 | 0.13 |
| 19 | F | Blomberg | Bodo Glimt | 5 | 92.5% | 6.93 | 65.99 | 13.20 | 0.16 |
| 20 | A | Havertz | Arsenal | 19 | 92.5% | 7.81 | 100.67 | 5.30 | 0.04 |
| 21 | A | Luis Diaz | Bayern Monaco | 24 | 92.5% | 7.93 | 97.35 | 4.06 | 0.05 |
| 22 | A | Jackson | Aston Villa | 16 | 92.5% | 7.88 | 88.51 | 5.53 | 0.09 |
| 23 | A | Suarez L.J. | Sporting CP | 14 | 92.5% | 7.87 | 83.75 | 5.98 | 0.12 |
| 24 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 8.93 | 81.07 | 16.21 | 0.16 |
| 25 | A | Christiansen P. | Viking | 2 | 92.5% | 7.32 | 64.39 | 32.20 | 0.23 |
| 26 | A | Jovic | Aek Atene | 4 | 92.5% | 6.57 | 63.12 | 15.78 | 0.23 |
| 27 | A | Edouard | Lens | 1 | 92.5% | 7.18 | 58.01 | 58.01 | 0.22 |
| 28 | A | Mickels | Sabah FK | 1 | 92.5% | 7.79 | 56.07 | 56.07 | 0.29 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 5.96, P(voto) 92.5%
- D - Upamecano (Bayern Monaco), 11 cr; xFP 5.74, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 5.99, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.79, P(voto) 92.5%
- C - McGinn (Aston Villa), 13 cr; xFP 6.34, P(voto) 92.5%
- C - Vitinha (Paris Saint-Germain), 14 cr; xFP 6.19, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 7.60, P(voto) 92.5%
- F - Saka (Arsenal), 19 cr; xFP 7.13, P(voto) 92.5%
- F - Blomberg (Bodo Glimt), 5 cr; xFP 6.93, P(voto) 92.5%
- A - Helmersen (Bodo Glimt), 5 cr; xFP 8.93, P(voto) 92.5%

### Panchina ordinata

1. P - Safonov (Paris Saint-Germain)
2. D - Lindelof (Aston Villa)
3. E - Wan-Bissaka (Aston Villa)
4. C - Pavlovic A. (Bayern Monaco)
5. F - Buendia (Aston Villa)
6. A - Luis Diaz (Bayern Monaco)
7. A - Jackson (Aston Villa)
8. A - Suarez L.J. (Sporting CP)
9. A - Havertz (Arsenal)
10. A - Mickels (Sabah FK)
11. A - Christiansen P. (Viking)
12. A - Edouard (Lens)

### Fuori formazione

- F - Eze (Arsenal)
- A - Jovic (Aek Atene)
- F - Riquelme (Betis)
- C - Kamara (Aston Villa)
- D - Huijsen (Real Madrid)

### Valore e rischi

Miglior rendimento atteso per credito: Edouard (58.01), Mickels (56.07), Christiansen P. (32.20), Wan-Bissaka (16.55), Helmersen (16.21).

Rischi principali: Mickels (0.29), Christiansen P. (0.23), Jovic (0.23), Edouard (0.22), Blomberg (0.16).

### Piano cambi

- **MD3-MD4**: Usare al massimo i due cambi ordinari solo per perdita del posto o infortunio confermati. Sorvegliati iniziali: Safonov, Mickels.
- **MD5-MD6**: Ricalcolare l'avanzamento; spostare uno o due slot dalle squadre in discesa sotto il 24° posto verso quelle con maggiore probabilità di top 16.
- **MD7-MD8**: Proteggere flessibilità e valore residuo; i sostituti degli eliminati non consumano il limite ordinario solo dopo la rimozione dalle liste di gioco.
- **Play-off**: Per chi accede direttamente agli ottavi confrontare il 6/5 d'ufficio con un titolare temporaneo di prezzo uguale o inferiore; evitare il portiere temporaneo se non supera la base di 5 punti.
- **Knockout**: Concentrare i cambi sui titolari confermati delle squadre con maggiore probabilità condizionata di quarti e semifinali; non spendere entrambi i cambi prima dell'aggiornamento di formazioni e disponibilità.

## C - Lungo periodo

Budget 280/280; residuo 0. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 63.83 | 3.99 | 0.04 |
| 2 | P | Safonov | Paris Saint-Germain | 14 | 96.5% | 4.48 | 55.26 | 3.95 | 0.05 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 5.96 | 78.66 | 6.55 | 0.05 |
| 4 | D | Upamecano | Bayern Monaco | 11 | 92.5% | 5.74 | 74.70 | 6.79 | 0.05 |
| 5 | D | Pacho | Paris Saint-Germain | 11 | 92.5% | 5.59 | 74.45 | 6.77 | 0.04 |
| 6 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.53 | 71.83 | 11.97 | 0.05 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.79 | 77.67 | 7.77 | 0.04 |
| 8 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 5.99 | 76.56 | 10.94 | 0.05 |
| 9 | E | White | Arsenal | 5 | 46.9% | 2.81 | 66.70 | 13.34 | 0.09 |
| 10 | E | Wan-Bissaka | Aston Villa | 4 | 92.5% | 5.61 | 66.21 | 16.55 | 0.09 |
| 11 | C | Vitinha | Paris Saint-Germain | 14 | 92.5% | 6.19 | 81.68 | 5.83 | 0.04 |
| 12 | C | McGinn | Aston Villa | 13 | 92.5% | 6.34 | 81.36 | 6.26 | 0.04 |
| 13 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.10 | 78.70 | 7.87 | 0.05 |
| 14 | C | Kimmich | Bayern Monaco | 11 | 92.5% | 5.93 | 76.76 | 6.98 | 0.05 |
| 15 | C | Kamara | Aston Villa | 6 | 92.5% | 5.84 | 75.30 | 12.55 | 0.05 |
| 16 | C | Zaire-Emery | Paris Saint-Germain | 7 | 55.1% | 3.33 | 73.27 | 10.47 | 0.04 |
| 17 | C | Zubimendi | Arsenal | 5 | 47.0% | 2.81 | 72.48 | 14.50 | 0.04 |
| 18 | C | Barkley | Aston Villa | 6 | 50.2% | 3.08 | 72.05 | 12.01 | 0.05 |
| 19 | C | Bischof | Bayern Monaco | 4 | 46.5% | 2.79 | 70.54 | 17.64 | 0.05 |
| 20 | F | Saka | Arsenal | 19 | 92.5% | 7.13 | 93.45 | 4.92 | 0.04 |
| 21 | F | Saibari | Bayern Monaco | 15 | 92.5% | 7.60 | 90.39 | 6.03 | 0.05 |
| 22 | F | Buendia | Aston Villa | 13 | 92.5% | 6.82 | 86.52 | 6.66 | 0.04 |
| 23 | F | Eze | Arsenal | 9 | 92.5% | 6.71 | 76.61 | 8.51 | 0.08 |
| 24 | F | Akliouche | Paris Saint-Germain | 8 | 50.4% | 3.13 | 75.36 | 9.42 | 0.04 |
| 25 | A | Havertz | Arsenal | 19 | 92.5% | 7.81 | 100.67 | 5.30 | 0.04 |
| 26 | A | Jackson | Aston Villa | 16 | 92.5% | 7.88 | 88.51 | 5.53 | 0.09 |
| 27 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 8.93 | 81.07 | 16.21 | 0.16 |
| 28 | A | Abraham | Aston Villa | 4 | 40.8% | 2.53 | 66.60 | 16.65 | 0.09 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 5.96, P(voto) 92.5%
- D - Upamecano (Bayern Monaco), 11 cr; xFP 5.74, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 5.99, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.79, P(voto) 92.5%
- C - McGinn (Aston Villa), 13 cr; xFP 6.34, P(voto) 92.5%
- C - Vitinha (Paris Saint-Germain), 14 cr; xFP 6.19, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 7.60, P(voto) 92.5%
- F - Saka (Arsenal), 19 cr; xFP 7.13, P(voto) 92.5%
- F - Buendia (Aston Villa), 13 cr; xFP 6.82, P(voto) 92.5%
- A - Helmersen (Bodo Glimt), 5 cr; xFP 8.93, P(voto) 92.5%

### Panchina ordinata

1. P - Safonov (Paris Saint-Germain)
2. D - Pacho (Paris Saint-Germain)
3. E - Wan-Bissaka (Aston Villa)
4. C - Pavlovic A. (Bayern Monaco)
5. F - Eze (Arsenal)
6. A - Jackson (Aston Villa)
7. A - Havertz (Arsenal)
8. C - Kimmich (Bayern Monaco)
9. C - Kamara (Aston Villa)
10. D - Lindelof (Aston Villa)
11. C - Zaire-Emery (Paris Saint-Germain)
12. F - Akliouche (Paris Saint-Germain)

### Fuori formazione

- C - Barkley (Aston Villa)
- E - White (Arsenal)
- C - Zubimendi (Arsenal)
- C - Bischof (Bayern Monaco)
- A - Abraham (Aston Villa)

### Valore e rischi

Miglior rendimento atteso per credito: Bischof (17.64), Abraham (16.65), Wan-Bissaka (16.55), Helmersen (16.21), Zubimendi (14.50).

Rischi principali: Helmersen (0.16), Wan-Bissaka (0.09), Jackson (0.09), Abraham (0.09), White (0.09).

### Piano cambi

- **MD3-MD4**: Usare al massimo i due cambi ordinari solo per perdita del posto o infortunio confermati. Sorvegliati iniziali: Safonov, Raya.
- **MD5-MD6**: Ricalcolare l'avanzamento; spostare uno o due slot dalle squadre in discesa sotto il 24° posto verso quelle con maggiore probabilità di top 16.
- **MD7-MD8**: Proteggere flessibilità e valore residuo; i sostituti degli eliminati non consumano il limite ordinario solo dopo la rimozione dalle liste di gioco.
- **Play-off**: Per chi accede direttamente agli ottavi confrontare il 6/5 d'ufficio con un titolare temporaneo di prezzo uguale o inferiore; evitare il portiere temporaneo se non supera la base di 5 punti.
- **Knockout**: Concentrare i cambi sui titolari confermati delle squadre con maggiore probabilità condizionata di quarti e semifinali; non spendere entrambi i cambi prima dell'aggiornamento di formazioni e disponibilità.

## Raccomandazione

Sceglierei **A - Equilibrata**: massimizza il criterio prudente xFP - 0,25 sigma tra le tre soluzioni, senza interpretare la dispersione come probabilità di vincere il concorso.

## Limiti e gate prima dell'acquisto

1. Confrontare nell'app tutte le 28 quotazioni: il PDF contiene quotazioni iniziali, non un feed corrente verificato.
2. Aggiornare indisponibilità e formazioni fino al termine regolamentare; nessun acquisto è stato effettuato.
3. Sostituire il proxy di voto base con voti Fantacalcio osservati appena disponibili per un campione sufficiente.
4. Rilanciare il modello dopo ogni giornata e prima di ogni finestra di mercato.

## Fonti e tracciabilità

- Listone SHA-256: `c18e6ac78cb7c5097d6974dbfc8ecc34769293668573cc8b22eb869b3e515ea2`.
- Regolamento SHA-256: `a3f82f3bce0d669048c5b766bb58b70e589eee3fab8ef35f27203a98a334c04c`.
- Archivi locali: calendario, 1X2, integrazione MD2, statistiche giocatori 2025/26 e 2026/27.
- Specialisti sui piazzati: articolo Fantacalcio.it del 12 ottobre 2026; segnale informativo, non bonus numerico inventato.
