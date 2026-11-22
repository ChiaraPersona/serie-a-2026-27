# Prova risultati esatti da rating Opta

Modello congelato della prova del 19 novembre: nessun nuovo fitting o modifica operativa.
Probabilità dei punteggi sui 90 minuti, recupero incluso, supplementari esclusi. Prime cinque combinazioni ordinate per probabilità; coda non rinormalizzata.

| Gara | Cinque risultati più probabili |
|---|---|
| Bodø/Glimt – LASK | 2–1 (9.65%); 1–1 (8.85%); 2–0 (7.83%); 1–0 (7.18%); 3–1 (7.02%) |
| Galatasaray – Aston Villa | 1–1 (10.07%); 1–2 (8.71%); 2–1 (7.84%); 2–2 (6.77%); 0–1 (6.48%) |
| Arsenal – Borussia Dortmund | 2–1 (9.63%); 1–1 (8.34%); 2–0 (8.26%); 3–1 (7.40%); 1–0 (7.16%) |
| Como – AEK Athens | 2–1 (9.65%); 1–1 (8.77%); 2–0 (7.90%); 1–0 (7.18%); 3–1 (7.08%) |
| Feyenoord – Porto | 1–1 (10.08%); 1–2 (8.67%); 2–1 (7.89%); 2–2 (6.78%); 0–1 (6.44%) |
| Manchester City – Napoli | 2–1 (9.53%); 2–0 (8.55%); 1–1 (7.91%); 3–1 (7.66%); 1–0 (7.09%) |
| Leipzig – Lens | 1–1 (9.56%); 2–1 (9.44%); 1–0 (7.02%); 2–0 (6.94%); 1–2 (6.51%) |
| Real Madrid – PSV Eindhoven | 2–1 (9.64%); 1–1 (8.42%); 2–0 (8.20%); 3–1 (7.35%); 1–0 (7.17%) |
| Slovan Bratislava – Real Betis | 1–2 (9.49%); 1–1 (9.48%); 0–2 (7.06%); 0–1 (7.06%); 2–2 (6.37%) |
| Sabah – Barcelona | 1–2 (9.56%); 0–2 (8.49%); 1–1 (8.00%); 1–3 (7.61%); 0–1 (7.11%) |
| Slavia Praha – Villarreal | 1–1 (9.91%); 2–1 (9.10%); 1–2 (7.26%); 1–0 (6.76%); 2–2 (6.67%) |
| Atlético de Madrid – Viking | 2–1 (9.60%); 1–1 (9.17%); 2–0 (7.48%); 1–0 (7.14%); 3–1 (6.70%) |
| Club Brugge – Liverpool | 1–1 (10.12%); 2–1 (8.41%); 1–2 (8.19%); 2–2 (6.80%); 1–0 (6.25%) |
| Inter – Stuttgart | 2–1 (9.62%); 1–1 (9.10%); 2–0 (7.56%); 1–0 (7.15%); 3–1 (6.78%) |
| Shakhtar Donetsk – Fenerbahçe | 1–1 (10.11%); 1–2 (8.50%); 2–1 (8.09%); 2–2 (6.80%); 0–1 (6.32%) |
| Lille – Bayern München | 1–2 (9.65%); 1–1 (8.88%); 0–2 (7.79%); 0–1 (7.17%); 1–3 (6.99%) |
| Paris Saint-Germain – Roma | 2–1 (9.65%); 1–1 (8.67%); 2–0 (7.99%); 1–0 (7.18%); 3–1 (7.17%) |
| Sporting CP – Manchester United | 1–1 (9.93%); 2–1 (9.07%); 1–2 (7.31%); 1–0 (6.74%); 2–2 (6.68%) |

## Verifica storica descrittiva

| Modello | Gare | Primo risultato centrato | Nei primi 3 | Nei primi 5 | NLL punteggio ↓ |
|---|---:|---:|---:|---:|---:|
| opta | 37 | 1 | 8 | 15 | 3.0979 |
| constant | 37 | 1 | 7 | 12 | 3.2249 |

Le 37 gare sono il test già consultato nella ricerca precedente; nessun nuovo test indipendente. Il riferimento costante non è il motore operativo. I conteggi top-k sono descrittivi, con parità ordinate per gol casa e poi ospiti. Nessuna prova di superiorità sul modello attuale, nessuna quota o EV attribuita.
Verificati massa totale, medie, coerenza 1X2 e riproduzione della NLL storica. Nessuna promozione, commit, push o pubblicazione.
