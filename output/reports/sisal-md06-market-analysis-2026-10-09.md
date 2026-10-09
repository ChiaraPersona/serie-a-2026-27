# Sisal MD6 — audit quote, confronto Prediction Engine V2 e analisi mercati

Generato: 2026-10-09T11:14:19.334Z. Ambito: Serie A 2026/27, MD6, 10 partite. **Nessuna formula o snapshot è stata modificata.**

## 1. Stato importazione Sisal

Import completo: **10/10 eventi**, 23.341 mercati, 77.247 quote, 18.205 mercati giocatore. Acquisizione: 2026-10-09T10:43:00.203Z. Duplicati market ID: 414; duplicati selection ID: 0.

| Partita | Inizio UTC | Mercati | Quote | Mercati giocatore | Selezioni sospese |
| --- | --- | --- | --- | --- | --- |
| Genoa - Fiorentina | 2026-10-10T13:00:00.000Z | 2268 | 7456 | 1725 | 2300 |
| Inter - Parma | 2026-10-10T16:00:00.000Z | 2519 | 8309 | 1976 | 2736 |
| Napoli - Frosinone | 2026-10-10T18:45:00.000Z | 2373 | 7667 | 1832 | 2460 |
| Como - Roma | 2026-10-11T10:30:00.000Z | 2594 | 8186 | 2043 | 2645 |
| Lazio  - Monza | 2026-10-11T13:00:00.000Z | 2391 | 7880 | 1944 | 2470 |
| Lecce - Bologna | 2026-10-11T13:00:00.000Z | 2357 | 7912 | 1813 | 2455 |
| Sassuolo - Milan | 2026-10-11T16:00:00.000Z | 2513 | 8126 | 1962 | 2630 |
| Cagliari - Juventus | 2026-10-11T18:45:00.000Z | 2413 | 7974 | 1868 | 2551 |
| Atalanta - Venezia | 2026-10-12T16:30:00.000Z | 1885 | 6701 | 1446 | 2019 |
| Torino - Udinese | 2026-10-12T18:45:00.000Z | 2028 | 7036 | 1596 | 2178 |

Mercati focus con aggiornamento più vecchio di 48 ore: 0. Mercati 1X2 più vecchi di 48 ore: 2. La soglia segnala età del dato, non dimostra da sola obsolescenza.

## 2. Prediction Engine V2, cutoff e snapshot

Engine operativo **4.13.0**, player-market V2, generato 2026-10-03T10:46:36.790Z; cutoff: matchday < 6, completed-only. Snapshot immutabile MD6: 2026-10-03T00:03:57.494Z, 10/10 partite, hash bb12972bedf482ab4210a11256ee3af1b68f442d264d3bdb106419c7aee38f78. Operativa: 200 giocatori con Expected Minutes e probabilità tiri/SOT.

Le probabili locali usate dal modello furono importate il 2026-10-03T10:12:38.948Z. La pagina Fantacalcio live è stata riletta il 2026-10-09T11:12:05.422Z: 20/20 squadre hanno almeno una variazione di XI, probabilità o modulo; ingressi titolari 21, uscite 21. **Non esiste un'operativa rigenerata sulle probabili del 9 ottobre.**

## 3. Integrità associazioni giocatore–mercato

Mercati giocatore: 18.205; associati al giocatore canonico: 17.901; non associati: 304. Focus tiri/SOT/card: 3636/3689. Provider player unici: 493; irrisolti complessivi: 31; irrisolti nei mercati focus: 6. Nessuna associazione incerta è stata forzata.

Provider non associati nei mercati focus (esclusi dall'analisi quantitativa):

| Partita | Etichetta Sisal | Esito matching |
| --- | --- | --- |
| Genoa – Fiorentina | DODO CORDEIRO | NO_NAME_MATCH |
| Napoli – Frosinone | ELAZZOUZI A. | NO_NAME_MATCH |
| Lecce – Bologna | AMAR ABDIRAHMAN | NO_NAME_MATCH |
| Lecce – Bologna | FAUSKE E. | NO_NAME_MATCH |
| Cagliari – Juventus | AKARAKIRI D. | NO_NAME_MATCH |
| Atalanta – Venezia | FANNE DABO M. | NO_NAME_MATCH |

## 4. Regole e compatibilità dei mercati

- Tiri giocatore `28507`: somma giocatore + sostituto, inclusi eventuali supplementari. Target diverso dal singolo giocatore V2.
- SOT giocatore `28506`: giocatore + sostituto, supplementari e pali/traverse inclusi. Target diverso dal SOT individuale V2.
- Cartellino `28576`: DUO all-contexts, inclusi panchina, post-finale, supplementari e rigori. Card V2 non è bookmaker-certified.
- 1X2 `3`: target esatto sui tre esiti; qui sono calcolabili overround, no-vig ed EV teorico dalla snapshot indipendente dalle quote.

Regolamento ufficiale consultato: https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf

## 5. Variazioni probabili formazioni

| Squadra | Modulo 03/10 | Modulo live | Ingressi XI | Uscite XI | Aggiornamento live |
| --- | --- | --- | --- | --- | --- |
| Genoa | 3-5-2 | 3-5-2 | Alexsandro Amorim | Djibril Sow | 09/10/2026 - 11:15 |
| Fiorentina | 4-3-2-1 | 4-2-3-1 | Goncalves P. | Arthur Atta | 09/10/2026 - 11:15 |
| Inter | 3-5-2 | 3-5-2 | Ivan Provedel, Carlos Augusto, Henrikh Mkhitaryan, Ange-Yoan Bonny | Josep Martínez, Alessandro Bastoni, Piotr Zielinski, Lautaro Martínez | 09/10/2026 - 11:28 |
| Parma | 3-5-2 | 3-4-2-1 | — | — | 09/10/2026 - 11:28 |
| Napoli | 4-3-3 | 4-3-3 | Leonardo Spinazzola, David Neres | Mathías Olivera, Noa Lang | 09/10/2026 - 13:08 |
| Frosinone | 4-2-3-1 | 4-2-3-1 | — | — | 09/10/2026 - 13:08 |
| Como | 4-2-3-1 | 4-2-3-1 | Anastasios Douvikas | Kean | 09/10/2026 - 13:01 |
| Roma | 3-4-2-1 | 3-4-2-1 | Evan Ndicka, Lorenzo Pellegrini | Leonardo Balerdi, Matìas Soulè | 09/10/2026 - 13:01 |
| Lazio | 4-3-3 | 4-3-3 | Danilho Doekhi | Josip Šutalo | 09/10/2026 - 11:06 |
| Monza | 3-4-2-1 | 3-4-2-1 | — | — | 09/10/2026 - 11:06 |
| Lecce | 4-3-3 | 4-3-3 | Willem Geubbels | Nikola Stulic | 09/10/2026 - 13:04 |
| Bologna | 3-4-2-1 | 3-4-2-1 | — | — | 09/10/2026 - 13:04 |
| Sassuolo | 4-3-3 | 4-3-3 | Vasilije Adzic | Darryl Bakola | 09/10/2026 - 10:57 |
| Milan | 3-4-2-1 | 4-4-1-1 | Davide Bartesaghi | Pervis Estupiñan | 09/10/2026 - 10:57 |
| Cagliari | 4-4-2 | 4-4-2 | — | — | 09/10/2026 - 13:03 |
| Juventus | 4-2-3-1 | 4-2-3-1 | Lloyd Kelly, Andrea Cambiaso, Sarr P., Edon Zhegrova | Jhon Lucumí, Zeki Çelik, Francisco Conceição, Kerim Alajbegović | 09/10/2026 - 13:03 |
| Atalanta | 4-3-3 | 4-3-3 | — | — | 09/10/2026 - 12:54 |
| Venezia | 3-5-2 | 3-5-2 | Armel Bella-Kotchap, Toma Basic | Joel Schingtienne, Thorir Johann Helgason | 09/10/2026 - 12:54 |
| Torino | 3-4-2-1 | 3-4-2-1 | — | — | 09/10/2026 - 11:54 |
| Udinese | 3-4-2-1 | 3-4-2-1 | — | — | 09/10/2026 - 11:54 |

## 6. Analisi partita per partita

### Genoa – Fiorentina

Arbitro ufficiale: **Maresca** (AIA, 7 ottobre). Mercati 2268; quote 7456. Probabili cambiate: SÌ. Titolari live non modellati: 2; giocatori dell'operativa non più nell'XI live: 2.

Volumi squadra: Genoa 12.7 tiri (9.6–17.3), 4.61 SOT (1.9–7.61); Fiorentina 11.6 tiri (6.4–15.9), 3.7 SOT (1.1–6.5).

Tiri 2+ direzionali: Franco Mastantuono 80.7% · quota 1.12; Vitinha 75.1% · quota 1.16; Tommaso Baldanzi 68.1% · quota 1.44.

SOT 1+ direzionali: Milutin Osmajić 65% · quota 1.44; Franco Mastantuono 65% · quota 1.44; Vitinha 62.5% · quota 1.5.

Cartellini osservazionali: Álex Jiménez · C2 13.5% · quota 3.25 · EV N/D; Alieu Njie · C2 9.4% · quota 4.5 · EV N/D; Leo Østigard · C2 18.6% · quota 4 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 2 titolari live senza previsione operativa MD6 aggiornata. 2 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Inter – Parma

Arbitro ufficiale: **Bonacina** (AIA, 7 ottobre). Mercati 2519; quote 8309. Probabili cambiate: SÌ. Titolari live non modellati: 3; giocatori dell'operativa non più nell'XI live: 3.

Volumi squadra: Inter 17.34 tiri (12.07–21.91), 5.82 SOT (3.27–7.76); Parma 9.8 tiri (5–14.1), 3 SOT (0.9–5.5).

Tiri 2+ direzionali: El Bilal Touré 64.1% · quota 1.65; José David Romero 59.7% · quota 1.5; Federico Dimarco 52.8% · quota 1.12.

SOT 1+ direzionali: Marcus Thuram 66.4% · quota 1.12; José David Romero 57.7% · quota 1.75; El Bilal Touré 57.3% · quota 2.

Cartellini osservazionali: Mariano Troilo · C2 17.6% · quota 4 · EV N/D; Diego Carlos · C2 17.2% · quota 3.75 · EV N/D; Hakan Çalhanoglu · C2 16.8% · quota 6 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 3 titolari live senza previsione operativa MD6 aggiornata. 3 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Napoli – Frosinone

Arbitro ufficiale: **Feliciani** (AIA, 7 ottobre). Mercati 2373; quote 7667. Probabili cambiate: SÌ. Titolari live non modellati: 2; giocatori dell'operativa non più nell'XI live: 2.

Volumi squadra: Napoli 13.52 tiri (9.89–16.75), 4.5 SOT (2.8–5.6); Frosinone 11.6 tiri (7.4–15.9), 3.5 SOT (1.1–5.3).

Tiri 2+ direzionali: Giorgi Kvernadze 66.9% · quota 1.25; Matteo Politano 57.5% · quota 1.05; Kevin De Bruyne 55.5% · quota 1.08.

SOT 1+ direzionali: Rasmus Højlund 67% · quota 1.2; Giorgi Kvernadze 49.3% · quota 1.65; Matteo Politano 48.3% · quota 1.5.

Cartellini osservazionali: Gabriele Bracaglia · C2 17.1% · quota 3.5 · EV N/D; Ilario Monterisi · C2 8.6% · quota 4.5 · EV N/D; Patrizio Masini · C2 6.9% · quota 4.5 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 2 titolari live senza previsione operativa MD6 aggiornata. 2 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Como – Roma

Arbitro ufficiale: **Fabbri** (AIA, 7 ottobre). Mercati 2594; quote 8186. Probabili cambiate: SÌ. Titolari live non modellati: 3; giocatori dell'operativa non più nell'XI live: 3.

Volumi squadra: Como 16.3 tiri (11.7–20.3), 5.3 SOT (3.1–7.4); Roma 12.14 tiri (7.62–16.25), 4.6 SOT (1.1–6.5).

Tiri 2+ direzionali: Nico Paz 95.1% · quota 1.05; Donyell Malen 81.9% · quota 1.02; Paulo Dybala 75.1% · quota 1.2.

SOT 1+ direzionali: Nico Paz 77.7% · quota 1.2; Donyell Malen 76.1% · quota 1.16; Paulo Dybala 59.8% · quota 1.47.

Cartellini osservazionali: Mario Hermoso · C2 21.5% · quota 2.5 · EV N/D; Jacobo Ramón · C2 17.4% · quota 3.75 · EV N/D; Gianluca Mancini · C2 14.1% · quota 3 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 3 titolari live senza previsione operativa MD6 aggiornata. 3 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Lazio – Monza

Arbitro ufficiale: **Collu** (AIA, 7 ottobre). Mercati 2391; quote 7880. Probabili cambiate: SÌ. Titolari live non modellati: 1; giocatori dell'operativa non più nell'XI live: 1.

Volumi squadra: Lazio 11.1 tiri (6.6–15), 4.1 SOT (1.8–6.4); Monza 13.5 tiri (8.6–18.4), 5 SOT (3.2–7.4).

Tiri 2+ direzionali: Gustavo Varela 73.1% · quota 1.33; Mattia Zaccagni 63.6% · quota 1.25; Jay Robinson 59.4% · quota 1.5.

SOT 1+ direzionali: Gustavo Varela 67% · quota 1.5; Mattia Zaccagni 63.6% · quota 1.4; Jay Robinson 56% · quota 1.57.

Cartellini osservazionali: Nuno Tavares · C2 9.3% · quota 6 · EV N/D; Lorenzo Lucchesi · C2 12.2% · quota 4 · EV N/D; Kenneth Taylor · C2 10.3% · quota 5 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 1 titolari live senza previsione operativa MD6 aggiornata. 1 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Lecce – Bologna

Arbitro ufficiale: **Pairetto** (AIA, 7 ottobre). Mercati 2357; quote 7912. Probabili cambiate: SÌ. Titolari live non modellati: 1; giocatori dell'operativa non più nell'XI live: 1.

Volumi squadra: Lecce 10 tiri (6.4–12.9), 3 SOT (0.9–4.6); Bologna 11.59 tiri (7.05–15.12), 3.83 SOT (1.01–6.05).

Tiri 2+ direzionali: Federico Bernardeschi 75% · quota 1.08; Roberto Piccoli 67.4% · quota 1.08; Joël Monteiro 45.2% · quota 1.57.

SOT 1+ direzionali: Federico Bernardeschi 64.3% · quota 1.33; Roberto Piccoli 51.8% · quota 1.33; Riccardo Orsolini 49.8% · quota 1.2.

Cartellini osservazionali: Lewis Ferguson · C2 6.9% · quota 5 · EV N/D; Danilo Veiga · C2 19% · quota 3.25 · EV N/D; Tommaso Pobega · C2 5.2% · quota 4.5 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 1 titolari live senza previsione operativa MD6 aggiornata. 1 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Sassuolo – Milan

Arbitro ufficiale: **Fourneau** (AIA, 7 ottobre). Mercati 2513; quote 8126. Probabili cambiate: SÌ. Titolari live non modellati: 2; giocatori dell'operativa non più nell'XI live: 2.

Volumi squadra: Sassuolo 12.2 tiri (7.3–15.6), 4.2 SOT (1.1–6.5); Milan 13.07 tiri (8.65–17.2), 4.24 SOT (2.22–6.56).

Tiri 2+ direzionali: Gonçalo Ramos 86.6% · quota 1.05; Armand Laurienté 84.6% · quota 1.25; Samuel Chukwueze 58.6% · quota 1.65.

SOT 1+ direzionali: Gonçalo Ramos 72.2% · quota 1.25; Armand Laurienté 66.7% · quota 1.5; Domenico Berardi 60.2% · quota 1.33.

Cartellini osservazionali: Duje Ćaleta-Car · C2 11.2% · quota 4 · EV N/D; Kristian Thorstvedt · C2 15.9% · quota 4 · EV N/D; Mario Gila · C2 12.2% · quota 4.5 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 2 titolari live senza previsione operativa MD6 aggiornata. 2 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Cagliari – Juventus

Arbitro ufficiale: **Marcenaro** (AIA, 7 ottobre). Mercati 2413; quote 7974. Probabili cambiate: SÌ. Titolari live non modellati: 4; giocatori dell'operativa non più nell'XI live: 4.

Volumi squadra: Cagliari 12.1 tiri (7.8–15.7), 3.4 SOT (1–4.9); Juventus 15.79 tiri (10.86–20.61), 5 SOT (2.2–7.6).

Tiri 2+ direzionali: Paul Mendy 75.5% · quota 1.4; Daniel Maldini 68.3% · quota 1.25; Nicolás González 63.3% · quota 1.08.

SOT 1+ direzionali: Paul Mendy 52.3% · quota 1.75; Daniel Maldini 51.8% · quota 1.57; Nicolás González 48.3% · quota 1.33.

Cartellini osservazionali: Bremer · C2 10.6% · quota 3.75 · EV N/D; Douglas Luiz · C2 9.2% · quota 3.75 · EV N/D; Zé Pedro · C2 16% · quota 4.5 · EV N/D.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 4 titolari live senza previsione operativa MD6 aggiornata. 4 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Atalanta – Venezia

Arbitro ufficiale: **Tremolada** (AIA, 7 ottobre). Mercati 1885; quote 6701. Probabili cambiate: SÌ. Titolari live non modellati: 2; giocatori dell'operativa non più nell'XI live: 2.

Volumi squadra: Atalanta 16.77 tiri (11.11–22.22), 5.48 SOT (2.03–9.13); Venezia 12 tiri (8.6–15.1), 3.5 SOT (2.2–5.4).

Tiri 2+ direzionali: Gianluca Scamacca 85% · quota 1.02; John Yeboah 84.7% · quota 1.25; Akor Adams 80.8% · quota 1.25.

SOT 1+ direzionali: Gianluca Scamacca 73% · quota 1.12; Akor Adams 69.3% · quota 1.4; John Yeboah 68% · quota 1.5.

Cartellini osservazionali: nessun mercato compatibile/disponibile.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. 2 titolari live senza previsione operativa MD6 aggiornata. 2 giocatori dell'operativa non più titolari live. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

### Torino – Udinese

Arbitro ufficiale: **Crezzini** (AIA, 7 ottobre). Mercati 2028; quote 7036. Probabili cambiate: SÌ. Titolari live non modellati: 0; giocatori dell'operativa non più nell'XI live: 0.

Volumi squadra: Torino 12.56 tiri (9.24–16.67), 3.72 SOT (1.81–4.62); Udinese 11.93 tiri (8.62–15.24), 4.1 SOT (2–6.1).

Tiri 2+ direzionali: Giovanni Simeone 79.3% · quota 1.05; Jurgen Ekkelenkamp 68.1% · quota 1.4; Keinan Davis 58.6% · quota 1.25.

SOT 1+ direzionali: Jurgen Ekkelenkamp 57.3% · quota 1.65; Keinan Davis 57.3% · quota 1.4; Giovanni Simeone 56.4% · quota 1.33.

Cartellini osservazionali: nessun mercato compatibile/disponibile.

Rischi: Probabili live cambiate rispetto alla previsione operativa del 3 ottobre. Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse. Card C4 non aggiornato con la designazione AIA ora disponibile.

## 7. TOP 10 — TIRI TOTALI

Classifica del segnale V2 2+ tra i titolari ancora presenti nella probabile live e con mercato Sisal associato. **Non è una classifica EV**, perché il mercato include il sostituto.

| # | Giocatore | Partita | Target V2 | P modello | Quota Sisal | P implicita grezza | Minuti | Live | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Nico Paz | Como – Roma | 2+ tiri | 95.1% | 1.05 | 95.2% | 83.1 | STARTER 80% | NO · sostituto incluso |
| 2 | Gonçalo Ramos | Sassuolo – Milan | 2+ tiri | 86.6% | 1.05 | 95.2% | 84.7 | STARTER 90% | NO · sostituto incluso |
| 3 | Gianluca Scamacca | Atalanta – Venezia | 2+ tiri | 85% | 1.02 | 98% | 59 | STARTER 60% | NO · sostituto incluso |
| 4 | John Yeboah | Atalanta – Venezia | 2+ tiri | 84.7% | 1.25 | 80% | 79.1 | STARTER 90% | NO · sostituto incluso |
| 5 | Armand Laurienté | Sassuolo – Milan | 2+ tiri | 84.6% | 1.25 | 80% | 86.4 | STARTER 90% | NO · sostituto incluso |
| 6 | Donyell Malen | Como – Roma | 2+ tiri | 81.9% | 1.02 | 98% | 70.9 | STARTER 90% | NO · sostituto incluso |
| 7 | Akor Adams | Atalanta – Venezia | 2+ tiri | 80.8% | 1.25 | 80% | 82.5 | STARTER 90% | NO · sostituto incluso |
| 8 | Franco Mastantuono | Genoa – Fiorentina | 2+ tiri | 80.7% | 1.12 | 89.3% | 75 | STARTER 65% | NO · sostituto incluso |
| 9 | Giovanni Simeone | Torino – Udinese | 2+ tiri | 79.3% | 1.05 | 95.2% | 73.6 | STARTER 90% | NO · sostituto incluso |
| 10 | Paul Mendy | Cagliari – Juventus | 2+ tiri | 75.5% | 1.4 | 71.4% | 71 | STARTER 90% | NO · sostituto incluso |

## 8. TOP 10 — TIRI IN PORTA

Classifica del segnale V2 1+ SOT. Il prezzo Sisal include sostituto e pali/traverse: edge ed EV restano N/D.

| # | Giocatore | Partita | Target V2 | P modello | Quota Sisal | P implicita grezza | Minuti | Live | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Nico Paz | Como – Roma | 1+ SOT | 77.7% | 1.2 | 83.3% | 83.1 | STARTER 80% | NO · sostituto incluso · pali/traverse |
| 2 | Donyell Malen | Como – Roma | 1+ SOT | 76.1% | 1.16 | 86.2% | 70.9 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 3 | Gianluca Scamacca | Atalanta – Venezia | 1+ SOT | 73% | 1.12 | 89.3% | 59 | STARTER 60% | NO · sostituto incluso · pali/traverse |
| 4 | Gonçalo Ramos | Sassuolo – Milan | 1+ SOT | 72.2% | 1.25 | 80% | 84.7 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 5 | Akor Adams | Atalanta – Venezia | 1+ SOT | 69.3% | 1.4 | 71.4% | 82.5 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 6 | John Yeboah | Atalanta – Venezia | 1+ SOT | 68% | 1.5 | 66.7% | 79.1 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 7 | Gustavo Varela | Lazio – Monza | 1+ SOT | 67% | 1.5 | 66.7% | 73.3 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 8 | Rasmus Højlund | Napoli – Frosinone | 1+ SOT | 67% | 1.2 | 83.3% | 74.3 | STARTER 70% | NO · sostituto incluso · pali/traverse |
| 9 | Armand Laurienté | Sassuolo – Milan | 1+ SOT | 66.7% | 1.5 | 66.7% | 86.4 | STARTER 90% | NO · sostituto incluso · pali/traverse |
| 10 | Marcus Thuram | Inter – Parma | 1+ SOT | 66.4% | 1.12 | 89.3% | 60.9 | STARTER 85% | NO · sostituto incluso · pali/traverse |

## 9. TOP 10 — OUTSIDER

Sono ammessi soltanto outsider già qualificati dall'Engine V2 e ancora titolari live; non vengono creati outsider per riempire la classifica.

| # | Giocatore | Partita | Target V2 | P modello | Quota Sisal | P implicita grezza | Minuti | Live | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Hassane Kamara | Torino – Udinese | 2+ tiri | 45.9% | 1.8 | 55.6% | 84.6 | STARTER 90% | NO · sostituto incluso |
| 2 | Nicolò Barella | Inter – Parma | 2+ tiri | 46.2% | 1.5 | 66.7% | 87.2 | STARTER 80% | NO · sostituto incluso |
| 3 | Nikola Vlasic | Torino – Udinese | 2+ tiri | 48.8% | 1.4 | 71.4% | 84.6 | STARTER 90% | NO · sostituto incluso |
| 4 | Federico Dimarco | Inter – Parma | 2+ tiri | 52.8% | 1.12 | 89.3% | 71.3 | STARTER 85% | NO · sostituto incluso |
| 5 | Samuele Birindelli | Lazio – Monza | 2+ tiri | 35.5% | 3 | 33.3% | 87.7 | STARTER 90% | NO · sostituto incluso |
| 6 | Leo Østigard | Genoa – Fiorentina | 2+ tiri | 29.7% | 3.75 | 26.7% | 85 | STARTER 90% | NO · sostituto incluso |
| 7 | Strahinja Pavlović | Sassuolo – Milan | 2+ tiri | 26.8% | 4.5 | 22.2% | 88.6 | STARTER 90% | NO · sostituto incluso |
| 8 | Kenneth Taylor | Lazio – Monza | 2+ tiri | 34.5% | 2 | 50% | 82.8 | STARTER 90% | NO · sostituto incluso |
| 9 | Michael Folorunsho | Lazio – Monza | 2+ tiri | 48.5% | 2.25 | 44.4% | 72.4 | STARTER 90% | NO · sostituto incluso |
| 10 | Nuno Tavares | Lazio – Monza | 2+ tiri | 28.3% | 1.8 | 55.6% | 73.8 | STARTER 90% | NO · sostituto incluso |

## 10. Cartellini

Card preview: 2026-10-03T23:33:48.833Z; stato **RESEARCH**; leader **UNRESOLVED**; actual esclusi. Le designazioni AIA ora esistono, ma C4 non è stato ricalcolato. Le righe partita-per-partita sono segnali osservazionali e non probabilità di vincita.

## 11. 1X2: confronto quantitativo ed EV teorico

| Partita | Esito | P modello | Quota | P implicita | P no-vig | Overround | EV teorico | Età prezzo h |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atalanta – Venezia | 1 | 61.8% | 1.52 | 65.8% | 60.8% | 108.2% | -6.1% | 28.5 |
| Atalanta – Venezia | X | 21.7% | 4 | 25% | 23.1% | 108.2% | -13.2% | 28.5 |
| Atalanta – Venezia | 2 | 16.5% | 5.75 | 17.4% | 16.1% | 108.2% | -5.1% | 28.5 |
| Cagliari – Juventus | 1 | 24.3% | 6 | 16.7% | 15.5% | 107.8% | 45.8% | 163.9 |
| Cagliari – Juventus | X | 25.9% | 3.75 | 26.7% | 24.7% | 107.8% | -2.9% | 163.9 |
| Cagliari – Juventus | 2 | 49.8% | 1.55 | 64.5% | 59.8% | 107.8% | -22.8% | 163.9 |
| Como – Roma | 1 | 46.2% | 2.6 | 38.5% | 36.5% | 105.5% | 20.1% | 0.2 |
| Como – Roma | X | 24.8% | 3.5 | 28.6% | 27.1% | 105.5% | -13.2% | 0.2 |
| Como – Roma | 2 | 29% | 2.6 | 38.5% | 36.5% | 105.5% | -24.6% | 0.2 |
| Genoa – Fiorentina | 1 | 36.7% | 3.25 | 30.8% | 29% | 106% | 19.3% | 2.5 |
| Genoa – Fiorentina | X | 25.7% | 3.25 | 30.8% | 29% | 106% | -16.5% | 2.5 |
| Genoa – Fiorentina | 2 | 37.6% | 2.25 | 44.4% | 41.9% | 106% | -15.4% | 2.5 |
| Inter – Parma | 1 | 73.1% | 1.13 | 88.5% | 84.6% | 104.6% | -17.4% | 18.7 |
| Inter – Parma | X | 16.8% | 9 | 11.1% | 10.6% | 104.6% | 51.2% | 18.7 |
| Inter – Parma | 2 | 10.1% | 20 | 5% | 4.8% | 104.6% | 102% | 18.7 |
| Lazio – Monza | 1 | 53.2% | 1.57 | 63.7% | 59.1% | 107.8% | -16.5% | 63.9 |
| Lazio – Monza | X | 22.6% | 3.75 | 26.7% | 24.7% | 107.8% | -15.2% | 63.9 |
| Lazio – Monza | 2 | 24.2% | 5.75 | 17.4% | 16.1% | 107.8% | 39.2% | 63.9 |
| Lecce – Bologna | 1 | 21.7% | 4.25 | 23.5% | 21.7% | 108.4% | -7.8% | 13.5 |
| Lecce – Bologna | X | 25.5% | 3.25 | 30.8% | 28.4% | 108.4% | -17.1% | 13.5 |
| Lecce – Bologna | 2 | 52.8% | 1.85 | 54.1% | 49.9% | 108.4% | -2.3% | 13.5 |
| Napoli – Frosinone | 1 | 49.4% | 1.45 | 69% | 65.4% | 105.4% | -28.4% | 16 |
| Napoli – Frosinone | X | 25% | 4.75 | 21.1% | 20% | 105.4% | 18.8% | 16 |
| Napoli – Frosinone | 2 | 25.6% | 6.5 | 15.4% | 14.6% | 105.4% | 66.4% | 16 |
| Sassuolo – Milan | 1 | 23% | 4 | 25% | 23.1% | 108.3% | -8% | 6.7 |
| Sassuolo – Milan | X | 23.7% | 3.6 | 27.8% | 25.6% | 108.3% | -14.7% | 6.7 |
| Sassuolo – Milan | 2 | 53.3% | 1.8 | 55.6% | 51.3% | 108.3% | -4.1% | 6.7 |
| Torino – Udinese | 1 | 32.4% | 2.3 | 43.5% | 40.8% | 106.5% | -25.5% | 0.8 |
| Torino – Udinese | X | 23% | 3.1 | 32.3% | 30.3% | 106.5% | -28.7% | 0.8 |
| Torino – Udinese | 2 | 44.6% | 3.25 | 30.8% | 28.9% | 106.5% | 45% | 0.8 |

EV teorici positivi (snapshot 3 ottobre; da rivedere manualmente per cambi XI): Inter – Parma 2 102%; Napoli – Frosinone 2 66.4%; Inter – Parma X 51.2%; Cagliari – Juventus 1 45.8%; Torino – Udinese 2 45%; Lazio – Monza 2 39.2%; Como – Roma 1 20.1%; Genoa – Fiorentina 1 19.3%; Napoli – Frosinone X 18.8%.

## 12. Mercati esclusi

Tiri DUO esclusi dall'EV: 2084; SOT DUO/pali-traverse: 1265; cartellini DUO all-contexts: 340; altri mercati fuori dal target quantitativo supportato: 19642.

## 13. Rischi e incertezze

- Nessuna previsione operativa rigenerata sulle probabili live del 9 ottobre.
- Il modello non stima il contributo del sostituto per i mercati DUO tiri/SOT.
- Il modello SOT non include pali/traverse nel target pubblicato.
- Card research leader unresolved; probabilità bookmaker-certified assente.
- C4 della preview Card non include le designazioni AIA pubblicate il 7 ottobre.
- La maggior parte dei mercati U/O giocatore espone un solo lato aperto: no-vig non calcolabile.
- Assenze/infortuni live non sono serializzati nell'operativa del 3 ottobre; i cambi di XI sono trattati come warning, non imputati al modello.

## 14. Verifiche di integrità

Manifest protetto prima/dopo: a1d657be9436e4f925f61ab922015172580dd523635da49f342b706112e1955e / a1d657be9436e4f925f61ab922015172580dd523635da49f342b706112e1955e; file protetti: 97; modifiche rilevate: 0. **PASS**.

Suite diagnostica: **PASS_WITH_KNOWN_BASELINE_FAILURE**.

| Controllo | Esito | Nota |
| --- | --- | --- |
| validate-sisal-odds | PASS | — |
| sisal/test | PASS | — |
| test-player-identities | PASS | — |
| test-prediction-snapshots | PASS | — |
| test-card-prediction-research | KNOWN_BASELINE_FAILURE | Manifest storico Card divergente su archivio raw Milan 2026-08-24; esterno al perimetro Sisal MD6. |
| test-predictions | PASS | — |
| git diff --check | PASS | — |

## 15. Conclusione operativa

Le opportunità player-market restano **candidati da revisione manuale**, non value bet certificate. Gli unici EV calcolabili in modo coerente sono i 1X2; quelli positivi restano sensibili alla distanza temporale e ai cambi di formazione intervenuti dopo la snapshot.


SISAL MD6 IMPORT: COMPLETE

MARKET MATCHING: PARTIAL

PLAYER MARKET V2: UNCHANGED

CARD MODEL: RESEARCH ONLY

IMMUTABLE SNAPSHOTS: UNCHANGED

PRODUCTION INTEGRITY: PASS

READY FOR MANUAL REVIEW: YES
