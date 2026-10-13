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

| Strategia | Budget | Modulo MD2 | xFP MD2 | P10 MD2 | P90 MD2 | xFP cumulativi | P10 cumul. | P90 cumul. | P(>=1056) |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| A - Equilibrata | 280 | 4-2-3-1 | 81.37 | 72.36 | 91.28 | 1010.33 | 932.83 | 1087.84 | 22.51% |
| B - Alto potenziale | 278 | 4-2-3-1 | 82.81 | 72.83 | 93.30 | 1011.54 | 931.37 | 1091.71 | 23.86% |
| C - Lungo periodo | 280 | 4-2-3-1 | 80.40 | 71.80 | 89.56 | 998.32 | 923.72 | 1072.92 | 16.09% |

La soglia 1056 non è una stima di vittoria: equivale a 66 punti medi per 16 turni, lo stesso valore usato dal regolamento come bonus per ogni turno saltato da un'iscrizione tardiva. Le probabilità non modellano il campo degli altri partecipanti.

## A - Equilibrata

Budget 280/280; residuo 0. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 67.91 | 4.25 | 0.04 |
| 2 | P | Suzuki | Aston Villa | 8 | 96.5% | 5.32 | 55.60 | 6.95 | 0.10 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 6.21 | 76.54 | 6.38 | 0.05 |
| 4 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.44 | 66.37 | 11.06 | 0.05 |
| 5 | D | Huijsen | Real Madrid | 5 | 92.5% | 5.40 | 63.43 | 12.69 | 0.09 |
| 6 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 6.30 | 75.48 | 10.78 | 0.05 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.75 | 72.62 | 7.26 | 0.04 |
| 8 | C | McGinn | Aston Villa | 13 | 92.5% | 6.50 | 77.94 | 6.00 | 0.04 |
| 9 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.16 | 74.52 | 7.45 | 0.05 |
| 10 | C | Veiga | Porto | 9 | 92.5% | 6.59 | 70.40 | 7.82 | 0.15 |
| 11 | C | Zubimendi | Arsenal | 5 | 47.0% | 2.80 | 70.31 | 14.06 | 0.04 |
| 12 | C | Kamara | Aston Villa | 6 | 92.5% | 5.71 | 69.21 | 11.54 | 0.05 |
| 13 | C | Barkley | Aston Villa | 6 | 50.2% | 3.10 | 69.11 | 11.52 | 0.05 |
| 14 | C | Bischof | Bayern Monaco | 4 | 46.5% | 2.80 | 68.25 | 17.06 | 0.05 |
| 15 | F | Saibari | Bayern Monaco | 15 | 92.5% | 8.05 | 94.71 | 6.31 | 0.05 |
| 16 | F | Kvaratskhelia | Paris Saint-Germain | 30 | 92.5% | 7.65 | 92.68 | 3.09 | 0.04 |
| 17 | F | Saka | Arsenal | 19 | 92.5% | 7.22 | 88.89 | 4.68 | 0.04 |
| 18 | F | Buendia | Aston Villa | 13 | 92.5% | 6.76 | 80.78 | 6.21 | 0.04 |
| 19 | F | Eze | Arsenal | 9 | 92.5% | 6.56 | 74.45 | 8.27 | 0.08 |
| 20 | F | Riquelme | Betis | 5 | 92.5% | 6.41 | 66.29 | 13.26 | 0.13 |
| 21 | F | Blomberg | Bodo Glimt | 5 | 92.5% | 6.98 | 61.89 | 12.38 | 0.16 |
| 22 | A | Havertz | Arsenal | 19 | 92.5% | 7.64 | 92.53 | 4.87 | 0.04 |
| 23 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 9.93 | 87.57 | 17.51 | 0.16 |
| 24 | A | Suarez L.J. | Sporting CP | 14 | 92.5% | 8.10 | 85.08 | 6.08 | 0.12 |
| 25 | A | Jackson | Aston Villa | 16 | 92.5% | 7.80 | 83.21 | 5.20 | 0.09 |
| 26 | A | Muriqi | Fenerbahce | 10 | 92.5% | 6.82 | 72.67 | 7.27 | 0.21 |
| 27 | A | Christiansen P. | Viking | 2 | 92.5% | 7.35 | 60.74 | 30.37 | 0.23 |
| 28 | A | Edouard | Lens | 1 | 92.5% | 7.05 | 60.26 | 60.26 | 0.22 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 6.21, P(voto) 92.5%
- D - Lindelof (Aston Villa), 6 cr; xFP 5.44, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 6.30, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.75, P(voto) 92.5%
- C - Veiga (Porto), 9 cr; xFP 6.59, P(voto) 92.5%
- C - McGinn (Aston Villa), 13 cr; xFP 6.50, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 8.05, P(voto) 92.5%
- F - Kvaratskhelia (Paris Saint-Germain), 30 cr; xFP 7.65, P(voto) 92.5%
- F - Saka (Arsenal), 19 cr; xFP 7.22, P(voto) 92.5%
- A - Helmersen (Bodo Glimt), 5 cr; xFP 9.93, P(voto) 92.5%

### Panchina ordinata

1. P - Suzuki (Aston Villa)
2. A - Suarez L.J. (Sporting CP)
3. A - Jackson (Aston Villa)
4. A - Havertz (Arsenal)
5. F - Blomberg (Bodo Glimt)
6. A - Christiansen P. (Viking)
7. F - Buendia (Aston Villa)
8. A - Edouard (Lens)
9. F - Eze (Arsenal)
10. A - Muriqi (Fenerbahce)
11. F - Riquelme (Betis)
12. C - Pavlovic A. (Bayern Monaco)

### Fuori formazione

- C - Kamara (Aston Villa)
- D - Huijsen (Real Madrid)
- C - Barkley (Aston Villa)
- C - Zubimendi (Arsenal)
- C - Bischof (Bayern Monaco)

### Valore e rischi

Miglior rendimento atteso per credito: Edouard (60.26), Christiansen P. (30.37), Helmersen (17.51), Bischof (17.06), Zubimendi (14.06).

Rischi principali: Christiansen P. (0.23), Edouard (0.22), Muriqi (0.21), Blomberg (0.16), Helmersen (0.16).

### Piano cambi

- **MD3-MD4**: Use at most two ordinary transfers only for confirmed loss of role or injury. Sorvegliati iniziali: Suzuki, Edouard.
- **MD5-MD6**: Re-run advancement simulation; move one or two slots from teams drifting below 24th to top-16 probabilities.
- **MD7-MD8**: Protect flexibility and retain cash/value; eliminated-player replacements do not consume the ordinary limit once removed from the game list.
- **Play-off**: For direct-R16 players compare the guaranteed 6/5 office vote with a temporary equal-or-cheaper starter; avoid a temporary goalkeeper unless the replacement exceeds the 5-point office baseline.
- **Knockout**: Concentrate transfers on confirmed starters from teams with the highest conditional reach-QF/SF probability; never spend both ordinary changes before lineups and availability are refreshed.

## B - Alto potenziale

Budget 278/280; residuo 2. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 67.91 | 4.25 | 0.04 |
| 2 | P | Urbig | Bayern Monaco | 1 | 96.5% | 4.32 | 34.95 | 34.95 | 0.22 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 6.21 | 76.54 | 6.38 | 0.05 |
| 4 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.44 | 66.37 | 11.06 | 0.05 |
| 5 | D | Huijsen | Real Madrid | 5 | 92.5% | 5.40 | 63.43 | 12.69 | 0.09 |
| 6 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 6.30 | 75.48 | 10.78 | 0.05 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.75 | 72.62 | 7.26 | 0.04 |
| 8 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.16 | 74.52 | 7.45 | 0.05 |
| 9 | C | Veiga | Porto | 9 | 92.5% | 6.59 | 70.40 | 7.82 | 0.15 |
| 10 | C | Kamara | Aston Villa | 6 | 92.5% | 5.71 | 69.21 | 11.54 | 0.05 |
| 11 | F | Saibari | Bayern Monaco | 15 | 92.5% | 8.05 | 94.71 | 6.31 | 0.05 |
| 12 | F | Saka | Arsenal | 19 | 92.5% | 7.22 | 88.89 | 4.68 | 0.04 |
| 13 | F | Buendia | Aston Villa | 13 | 92.5% | 6.76 | 80.78 | 6.21 | 0.04 |
| 14 | F | Eze | Arsenal | 9 | 92.5% | 6.56 | 74.45 | 8.27 | 0.08 |
| 15 | F | Riquelme | Betis | 5 | 92.5% | 6.41 | 66.29 | 13.26 | 0.13 |
| 16 | F | Til | Psv Eindhoven | 8 | 92.5% | 7.58 | 62.46 | 7.81 | 0.20 |
| 17 | F | Blomberg | Bodo Glimt | 5 | 92.5% | 6.98 | 61.89 | 12.38 | 0.16 |
| 18 | F | Mendoza G. | Shakhtar Donetsk | 4 | 92.5% | 8.39 | 54.38 | 13.60 | 0.34 |
| 19 | A | Kane | Bayern Monaco | 39 | 92.5% | 10.51 | 121.25 | 3.11 | 0.05 |
| 20 | A | Havertz | Arsenal | 19 | 92.5% | 7.64 | 92.53 | 4.87 | 0.04 |
| 21 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 9.93 | 87.57 | 17.51 | 0.16 |
| 22 | A | Suarez L.J. | Sporting CP | 14 | 92.5% | 8.10 | 85.08 | 6.08 | 0.12 |
| 23 | A | Jackson | Aston Villa | 16 | 92.5% | 7.80 | 83.21 | 5.20 | 0.09 |
| 24 | A | Muriqi | Fenerbahce | 10 | 92.5% | 6.82 | 72.67 | 7.27 | 0.21 |
| 25 | A | Gabriel Jesus | Barcellona | 11 | 92.5% | 9.04 | 69.42 | 6.31 | 0.22 |
| 26 | A | Christiansen P. | Viking | 2 | 92.5% | 7.35 | 60.74 | 30.37 | 0.23 |
| 27 | A | Edouard | Lens | 1 | 92.5% | 7.05 | 60.26 | 60.26 | 0.22 |
| 28 | A | Mickels | Sabah FK | 1 | 92.5% | 7.38 | 48.71 | 48.71 | 0.29 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 6.21, P(voto) 92.5%
- D - Lindelof (Aston Villa), 6 cr; xFP 5.44, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 6.30, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.75, P(voto) 92.5%
- C - Veiga (Porto), 9 cr; xFP 6.59, P(voto) 92.5%
- C - Pavlovic A. (Bayern Monaco), 10 cr; xFP 6.16, P(voto) 92.5%
- F - Mendoza G. (Shakhtar Donetsk), 4 cr; xFP 8.39, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 8.05, P(voto) 92.5%
- F - Til (Psv Eindhoven), 8 cr; xFP 7.58, P(voto) 92.5%
- A - Kane (Bayern Monaco), 39 cr; xFP 10.51, P(voto) 92.5%

### Panchina ordinata

1. P - Urbig (Bayern Monaco)
2. A - Helmersen (Bodo Glimt)
3. A - Gabriel Jesus (Barcellona)
4. A - Suarez L.J. (Sporting CP)
5. A - Jackson (Aston Villa)
6. F - Saka (Arsenal)
7. A - Havertz (Arsenal)
8. A - Mickels (Sabah FK)
9. F - Blomberg (Bodo Glimt)
10. A - Christiansen P. (Viking)
11. F - Buendia (Aston Villa)
12. A - Edouard (Lens)

### Fuori formazione

- A - Muriqi (Fenerbahce)
- F - Eze (Arsenal)
- F - Riquelme (Betis)
- C - Kamara (Aston Villa)
- D - Huijsen (Real Madrid)

### Valore e rischi

Miglior rendimento atteso per credito: Edouard (60.26), Mickels (48.71), Urbig (34.95), Christiansen P. (30.37), Helmersen (17.51).

Rischi principali: Mendoza G. (0.34), Mickels (0.29), Christiansen P. (0.23), Urbig (0.22), Edouard (0.22).

### Piano cambi

- **MD3-MD4**: Use at most two ordinary transfers only for confirmed loss of role or injury. Sorvegliati iniziali: Urbig, Mickels.
- **MD5-MD6**: Re-run advancement simulation; move one or two slots from teams drifting below 24th to top-16 probabilities.
- **MD7-MD8**: Protect flexibility and retain cash/value; eliminated-player replacements do not consume the ordinary limit once removed from the game list.
- **Play-off**: For direct-R16 players compare the guaranteed 6/5 office vote with a temporary equal-or-cheaper starter; avoid a temporary goalkeeper unless the replacement exceeds the 5-point office baseline.
- **Knockout**: Concentrate transfers on confirmed starters from teams with the highest conditional reach-QF/SF probability; never spend both ordinary changes before lineups and availability are refreshed.

## C - Lungo periodo

Budget 280/280; residuo 0. Modulo MD2: **4-2-3-1**.

### Rosa completa

| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |
|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | P | Raya | Arsenal | 16 | 96.5% | 5.68 | 67.91 | 4.25 | 0.04 |
| 2 | P | Safonov | Paris Saint-Germain | 14 | 96.5% | 4.48 | 54.19 | 3.87 | 0.05 |
| 3 | D | Marquinhos | Paris Saint-Germain | 12 | 92.5% | 6.21 | 76.54 | 6.38 | 0.05 |
| 4 | D | Lindelof | Aston Villa | 6 | 92.5% | 5.44 | 66.37 | 11.06 | 0.05 |
| 5 | D | Huijsen | Real Madrid | 5 | 92.5% | 5.40 | 63.43 | 12.69 | 0.09 |
| 6 | E | Davies A. | Bayern Monaco | 7 | 92.5% | 6.30 | 75.48 | 10.78 | 0.05 |
| 7 | E | Calafiori | Arsenal | 10 | 92.5% | 5.75 | 72.62 | 7.26 | 0.04 |
| 8 | E | White | Arsenal | 5 | 46.9% | 2.79 | 63.62 | 12.72 | 0.09 |
| 9 | C | McGinn | Aston Villa | 13 | 92.5% | 6.50 | 77.94 | 6.00 | 0.04 |
| 10 | C | Vitinha | Paris Saint-Germain | 14 | 92.5% | 6.29 | 77.77 | 5.55 | 0.04 |
| 11 | C | Rice | Arsenal | 14 | 92.5% | 5.97 | 75.28 | 5.38 | 0.04 |
| 12 | C | Pavlovic A. | Bayern Monaco | 10 | 92.5% | 6.16 | 74.52 | 7.45 | 0.05 |
| 13 | C | Zubimendi | Arsenal | 5 | 47.0% | 2.80 | 70.31 | 14.06 | 0.04 |
| 14 | C | Zaire-Emery | Paris Saint-Germain | 7 | 55.1% | 3.31 | 69.70 | 9.96 | 0.04 |
| 15 | C | Kamara | Aston Villa | 6 | 92.5% | 5.71 | 69.21 | 11.54 | 0.05 |
| 16 | C | Barkley | Aston Villa | 6 | 50.2% | 3.10 | 69.11 | 11.52 | 0.05 |
| 17 | C | Bischof | Bayern Monaco | 4 | 46.5% | 2.80 | 68.25 | 17.06 | 0.05 |
| 18 | C | Bernal | Barcellona | 4 | 48.2% | 2.91 | 62.84 | 15.71 | 0.07 |
| 19 | F | Saibari | Bayern Monaco | 15 | 92.5% | 8.05 | 94.71 | 6.31 | 0.05 |
| 20 | F | Saka | Arsenal | 19 | 92.5% | 7.22 | 88.89 | 4.68 | 0.04 |
| 21 | F | Buendia | Aston Villa | 13 | 92.5% | 6.76 | 80.78 | 6.21 | 0.04 |
| 22 | F | Eze | Arsenal | 9 | 92.5% | 6.56 | 74.45 | 8.27 | 0.08 |
| 23 | F | Akliouche | Paris Saint-Germain | 8 | 50.4% | 3.10 | 71.19 | 8.90 | 0.04 |
| 24 | A | Havertz | Arsenal | 19 | 92.5% | 7.64 | 92.53 | 4.87 | 0.04 |
| 25 | A | Helmersen | Bodo Glimt | 5 | 92.5% | 9.93 | 87.57 | 17.51 | 0.16 |
| 26 | A | Suarez L.J. | Sporting CP | 14 | 92.5% | 8.10 | 85.08 | 6.08 | 0.12 |
| 27 | A | Jackson | Aston Villa | 16 | 92.5% | 7.80 | 83.21 | 5.20 | 0.09 |
| 28 | A | Abraham | Aston Villa | 4 | 40.8% | 2.51 | 63.26 | 15.82 | 0.09 |

### Formazione MD2

- P - Raya (Arsenal), 16 cr; xFP 5.68, P(voto) 96.5%
- D - Marquinhos (Paris Saint-Germain), 12 cr; xFP 6.21, P(voto) 92.5%
- D - Lindelof (Aston Villa), 6 cr; xFP 5.44, P(voto) 92.5%
- E - Davies A. (Bayern Monaco), 7 cr; xFP 6.30, P(voto) 92.5%
- E - Calafiori (Arsenal), 10 cr; xFP 5.75, P(voto) 92.5%
- C - McGinn (Aston Villa), 13 cr; xFP 6.50, P(voto) 92.5%
- C - Vitinha (Paris Saint-Germain), 14 cr; xFP 6.29, P(voto) 92.5%
- F - Saibari (Bayern Monaco), 15 cr; xFP 8.05, P(voto) 92.5%
- F - Saka (Arsenal), 19 cr; xFP 7.22, P(voto) 92.5%
- F - Buendia (Aston Villa), 13 cr; xFP 6.76, P(voto) 92.5%
- A - Helmersen (Bodo Glimt), 5 cr; xFP 9.93, P(voto) 92.5%

### Panchina ordinata

1. P - Safonov (Paris Saint-Germain)
2. A - Suarez L.J. (Sporting CP)
3. A - Jackson (Aston Villa)
4. A - Havertz (Arsenal)
5. F - Eze (Arsenal)
6. C - Pavlovic A. (Bayern Monaco)
7. C - Rice (Arsenal)
8. C - Kamara (Aston Villa)
9. D - Huijsen (Real Madrid)
10. C - Zaire-Emery (Paris Saint-Germain)
11. F - Akliouche (Paris Saint-Germain)
12. C - Barkley (Aston Villa)

### Fuori formazione

- C - Bernal (Barcellona)
- C - Zubimendi (Arsenal)
- C - Bischof (Bayern Monaco)
- E - White (Arsenal)
- A - Abraham (Aston Villa)

### Valore e rischi

Miglior rendimento atteso per credito: Helmersen (17.51), Bischof (17.06), Abraham (15.82), Bernal (15.71), Zubimendi (14.06).

Rischi principali: Helmersen (0.16), Suarez L.J. (0.12), Huijsen (0.09), Jackson (0.09), Abraham (0.09).

### Piano cambi

- **MD3-MD4**: Use at most two ordinary transfers only for confirmed loss of role or injury. Sorvegliati iniziali: Safonov, Bernal.
- **MD5-MD6**: Re-run advancement simulation; move one or two slots from teams drifting below 24th to top-16 probabilities.
- **MD7-MD8**: Protect flexibility and retain cash/value; eliminated-player replacements do not consume the ordinary limit once removed from the game list.
- **Play-off**: For direct-R16 players compare the guaranteed 6/5 office vote with a temporary equal-or-cheaper starter; avoid a temporary goalkeeper unless the replacement exceeds the 5-point office baseline.
- **Knockout**: Concentrate transfers on confirmed starters from teams with the highest conditional reach-QF/SF probability; never spend both ordinary changes before lineups and availability are refreshed.

## Raccomandazione

Sceglierei **B - Alto potenziale**: massimizza il criterio prudente xFP - 0,25 sigma tra le tre soluzioni, senza interpretare la dispersione come probabilità di vincere il concorso.

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
