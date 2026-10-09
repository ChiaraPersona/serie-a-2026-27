# Serie A MD6 — Analisi operativa finale Player Market V2

Generato: 2026-10-09T13:31:51.073Z. Modello 4.13.0, Player Market V2.

## Esito operativo

- Probabili Fantacalcio importate il 2026-10-09T13:14:40.957Z; copertura 20/20 squadre, 220 titolari, 0 non collegati.
- Operativa MD6 rigenerata il 2026-10-09T13:15:05.527Z: 10/10 partite, 200 giocatori di movimento.
- Sisal recuperata il 2026-10-09T10:43:00.203Z: matching PARTIAL; 353/400 mercati presenti, 352 identità verificate, compatibilità individuale 0/352, perché i mercati sono DUO.
- Snapshot immutabili Player ed exact-score: invariati. Formule, coefficienti e Team Profiles: invariati.

## Regole di lettura Sisal

La probabilità V2 riportata è sempre del singolo titolare e dipende dai suoi Expected Minutes. La probabilità implicita grezza è solo `1/quota` e non viene confrontata come target equivalente: Sisal 28507 somma tiri di giocatore e sostituto e include i supplementari; Sisal 28506 aggiunge anche pali e traverse. Il rischio sostituzione aumenta quindi la distanza semantica tra i due target. Nessuna quota più bassa è trattata automaticamente come più sicura e nessun EV è certificato.

| Partita | Mercati focus mancanti | Identità da rivedere |
| --- | --- | --- |
| Genoa - Fiorentina | 6 | nessuna |
| Inter - Parma | 5 | nessuna |
| Napoli - Frosinone | 5 | nessuna |
| Como - Roma | 4 | nessuna |
| Lazio - Monza | 4 | nessuna |
| Lecce - Bologna | 5 | nessuna |
| Sassuolo - Milan | 4 | nessuna |
| Cagliari - Juventus | 5 | nessuna |
| Atalanta - Venezia | 3 | John Yeboah / tiri: SCHINGTIENNE J. U/O 0.5 SOMMA TIRI TOTALI E SUO SOST. INCL. T.S. |
| Torino - Udinese | 6 | nessuna |

## Confronto importazione 3 → 9 ottobre

| Partita | Squadra | Modulo | Entrati XI | Usciti XI | Δ titolarità ≥10 pp | Δ minuti ≥3 |
| --- | --- | --- | --- | --- | --- | --- |
| Genoa - Fiorentina | Genoa | 3-5-2 → 3-5-2 | Alexsandro Amorim | Djibril Sow | Alexsandro Amorim +25; Drameh +20; Vitinha -10; Hamed Traoré +10 | nessuna |
| Genoa - Fiorentina | Fiorentina | 4-3-2-1 → 4-2-3-1 | Goncalves P. | Arthur Atta | Goncalves P. +30; Viery -25; Franco Mastantuono -25; Alieu Njie +15; Mateo Pellegrino -10; João Mário -10; Christ Inao Oulaï +10 | nessuna |
| Inter - Parma | Inter | 3-5-2 → 3-5-2 | Ivan Provedel, Henrikh Mkhitaryan, Ange-Yoan Bonny | Josep Martínez, Piotr Zielinski, Lautaro Martínez | Ivan Provedel +65; Josep Martínez -50; Manuel Akanji -35; Alessandro Bastoni -35; Henrikh Mkhitaryan +35; Andy Diouf -30; Lautaro Martínez -30; Djed Spence +20; Piotr Zielinski -15; Nicolò Barella -10; Hakan Çalhanoglu +10 | nessuna |
| Inter - Parma | Parma | 3-5-2 → 3-4-2-1 | nessuno | nessuno | Adrián Bernabé -20; Sascha Britschgi +15; José David Romero -15; Vincent Sierro -10; El Bilal Touré +10; Dominik Drobnic +10; Lautaro Valenti +10 | nessuna |
| Napoli - Frosinone | Napoli | 4-3-3 → 4-3-3 | Leonardo Spinazzola, David Neres | Mathías Olivera, Noa Lang | Matteo Politano -35; Leonardo Spinazzola +30; Giovane +25; Rafa Marín -15; Alex Meret +10; Billy Gilmour +10; Rasmus Højlund -10; Sam Beukema +10; Noa Lang -10 | nessuna |
| Napoli - Frosinone | Frosinone | 4-2-3-1 → 4-2-3-1 | nessuno | nessuno | Tomáš Bobček +20; Ilario Monterisi -15; Luis Hasa +15 | nessuna |
| Como - Roma | Como | 4-2-3-1 → 4-2-3-1 | Anastasios Douvikas | Kean | Anastasios Douvikas +30; Yan Couto -25; Máximo Perrone -25; Martin Baturina -25; Kean -15; Nico Paz -10 | nessuna |
| Como - Roma | Roma | 3-4-2-1 → 3-4-2-1 | Evan Ndicka, Lorenzo Pellegrini | Leonardo Balerdi, Matìas Soulè | Lorenzo Pellegrini +30; Nahuel Molina -15; Donyell Malen +15; Leonardo Balerdi -15; Wesley +10; Paulo Dybala +10; Matìas Soulè -10 | nessuna |
| Lazio - Monza | Lazio | 4-3-3 → 4-3-3 | Danilho Doekhi | Josip Šutalo | Adam Marusic +30; Tijjani Noslin -15; Alfonso Pedraza -15; Josip Šutalo -15; Gustav Isaksen -10 | nessuna |
| Lazio - Monza | Monza | 3-4-2-1 → 3-4-2-1 | nessuno | nessuno | Patrick Cutrone -15; Jay Robinson -10 | nessuna |
| Lecce - Bologna | Lecce | 4-3-3 → 4-3-3 | Willem Geubbels | Nikola Stulic | Willem Geubbels +20; Olaf Gorter -15; Jamil Siebert -10; Youssef Maleh -10; Nikola Stulic -10 | nessuna |
| Lecce - Bologna | Bologna | 3-4-2-1 → 3-4-2-1 | nessuno | nessuno | Eivind Helland -25; Tommaso Pobega -25; Massimo Pessina +25; Lukasz Skorupski -10; Riccardo Orsolini -10; Lorenzo De Silvestri -10; Nicolo Casale +10 | nessuna |
| Sassuolo - Milan | Sassuolo | 4-3-3 → 4-3-3 | Vasilije Adzic | Darryl Bakola | Stefano Turati +40; Arijanet Muric -15; Josh Doig -10; Darryl Bakola -10 | nessuna |
| Sassuolo - Milan | Milan | 3-4-2-1 → 4-4-1-1 | Davide Bartesaghi | Pervis Estupiñan | Koni De Winter -20; Davide Bartesaghi +20; Pervis Estupiñan -15; Ardon Jashari -10 | nessuna |
| Cagliari - Juventus | Cagliari | 4-4-2 → 4-4-2 | nessuno | nessuno | Nzola +30; Adam Obert -10 | nessuna |
| Cagliari - Juventus | Juventus | 4-2-3-1 → 4-2-3-1 | Lloyd Kelly, Andrea Cambiaso, Sarr P., Edon Zhegrova | Jhon Lucumí, Zeki Çelik, Francisco Conceição, Kerim Alajbegović | Nicolás González -35; Zeki Çelik -30; Lloyd Kelly +25; Jhon Lucumí -25; Sarr P. +20; Randal Kolo Muani +15; Kerim Alajbegović -15; Teun Koopmeiners -15; Andrea Cambiaso +10; Francisco Conceição -10 | nessuna |
| Atalanta - Venezia | Atalanta | 4-3-3 → 4-3-3 | nessuno | nessuno | Gianluca Scamacca -20; Lorenzo Bernasconi -15; Lazar Samardzic -15 | nessuna |
| Atalanta - Venezia | Venezia | 3-5-2 → 3-5-2 | Armel Bella-Kotchap, Toma Basic | Joel Schingtienne, Thorir Johann Helgason | Thorir Johann Helgason -20; Thierry Correia -15; Matías Moreno -10; Redouane Halhal -10; Kornel Lisman +10 | nessuna |
| Torino - Udinese | Torino | 3-4-2-1 → 3-4-2-1 | nessuno | nessuno | Cesare Casadei -15; Saúl Coco -10; Adrian Ismajli -10; Rodriguez R. -10 | nessuna |
| Torino - Udinese | Udinese | 3-4-2-1 → 3-4-2-1 | nessuno | nessuno | Mërgim Vojvoda -20; Matteo Palma +20; Unai Gomez -15; James Abankwah -10; Oumar Solet +10; Keinan Davis +10; Jovanovic +10 | nessuna |

## 1. Genoa - Fiorentina

Kick-off: 2026-10-10T13:00:00.000Z. Probabili aggiornate: Genoa 09/10/2026 - 14:23; Fiorentina 09/10/2026 - 14:23.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Genoa | 3-5-2 → 3-5-2 | Justin Bijlow 90%, Alessandro Marcandalli 90%, Leo Østigard 90%, Johan Vásquez 90%, Ehizibue 80%, Morten Frendrup 90%, Alexsandro Amorim 85%, Tommaso Baldanzi 90%, Mikael Ellertsson 90%, Vitinha 60%, Milutin Osmajić 90% | Alexsandro Amorim | Djibril Sow |
| Fiorentina | 4-3-2-1 → 4-2-3-1 (cambio) | David de Gea 90%, Álex Jiménez 90%, Radu Dragusin 90%, Luca Ranieri 85%, Viery 65%, Cher Ndour 90%, Nicolò Fagioli 90%, Franco Mastantuono 65%, Goncalves P. 90%, Alieu Njie 85%, Mateo Pellegrino 60% | Goncalves P. | Arthur Atta |

- Genoa: squalificati nessuno; infortunati/assenti Venturino (problema al tendine rotuleo, ipotesi rientro fine ottobre); Meichtry (distrazione della muscolatura di un'anca, out contro Fiorentina); Colombo (problema alla caviglia, ipotesi rientro fine ottobre); Havel (problema alla caviglia, rientro da metà ottobre); Sow (distrazione muscolare al bicipite femorale della coscia sinistra, rientro da inizio novembre); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Alexsandro Amorim 60%→85% (+25 pp); Drameh 30%→50% (+20 pp); Vitinha 70%→60% (-10 pp); Hamed Traoré 50%→60% (+10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Sow [infortunato]; rimossi nessuno.
- Fiorentina: squalificati nessuno; infortunati/assenti Parisi (infortunio al legamento crociato, rientro da dicembre); Atta (sovraccarico funzionale dell'addome, out per Genova); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Goncalves P. 60%→90% (+30 pp); Viery 90%→65% (-25 pp); Franco Mastantuono 90%→65% (-25 pp); Alieu Njie 70%→85% (+15 pp); Mateo Pellegrino 70%→60% (-10 pp); João Mário 50%→40% (-10 pp); Christ Inao Oulaï 50%→60% (+10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Atta [infortunato]; rimossi nessuno.

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 1.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Franco Mastantuono | Fiorentina | 75 | 3.1 | 95.5% | 81.5% | 59.9% | MEDIA |
| Vitinha | Genoa | 59.8 | 2.76 | 93.7% | 76.2% | 52.1% | BASSA |
| Tommaso Baldanzi | Genoa | 66.2 | 2.4 | 90.9% | 69.2% | 43.0% | MEDIA |
| Milutin Osmajić | Genoa | 71.2 | 2.13 | 88.1% | 62.8% | 35.9% | ALTA |
| Mateo Pellegrino | Fiorentina | 76 | 1.76 | 82.8% | 52.5% | 25.9% | MEDIA |
| Goncalves P. | Fiorentina | 43.5 | 1.48 | 77.2% | 43.5% | 18.6% | MEDIA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Franco Mastantuono | Fiorentina | 75 | 1.09 | 66.4% | 29.7% | 1.44 | NO: DUO + pali/traverse + TS |
| Milutin Osmajić | Genoa | 71.2 | 1.07 | 65.7% | 29.0% | 1.44 | NO: DUO + pali/traverse + TS |
| Vitinha | Genoa | 59.8 | 0.99 | 62.8% | 26.1% | 1.5 | NO: DUO + pali/traverse + TS |
| Tommaso Baldanzi | Genoa | 66.2 | 0.64 | 47.3% | 13.5% | 1.75 | NO: DUO + pali/traverse + TS |
| Goncalves P. | Fiorentina | 43.5 | 0.64 | 47.3% | 13.5% | N/D | N/D |
| Mateo Pellegrino | Fiorentina | 76 | 0.62 | 46.2% | 12.8% | 1.33 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Leo Østigard | Difensore · Difensore centrale | 85 | 67.0% | 44.6% | QUALIFICATO | score tiri 59.7; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Nicolò Fagioli | Centrocampista · Centrocampista centrale | 77.1 | 68.7% | 28.1% | QUALIFICATO | score tiri 53; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Johan Vásquez | Difensore · Difensore centrale sinistro | 76.7 | 59.8% | 24.4% | QUALIFICATO | score tiri 51; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 9 profili ad alto rischio; più rilevanti Franco Mastantuono (75'), Vitinha (59.8'), Tommaso Baldanzi (66.2'), Goncalves P. (43.5'), Alieu Njie (56.7').
- Fallback/maturity: 0 fallback; segnali low/unknown 3.
- Matchup: 13 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 6; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Franco Mastantuono | Fiorentina | 2+ tiri | 81.5% | N/D | 0.0% | 75 | miglior profilo 2+ tiri eleggibile; λ tiri 3.1; matchup x0.96; 75 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | MEDIA: segnale medium; stabilità tiri medium; titolarità 65%; rischio sostituzione high; nessun fallback |
| Milutin Osmajić | Genoa | 1+ SOT | 65.7% | 1.44 | 69.4% | 71.2 | miglior profilo 1+ SOT distinto; λ SOT 1.07; matchup x1.08; 71.2 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Tommaso Baldanzi | Genoa | 1+ tiri | 90.9% | 1.05 | 95.2% | 66.2 | profilo meno ovvio supportato dal volume V2; λ tiri 2.4; matchup x1.07; 66.2 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | MEDIA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 2. Inter - Parma

Kick-off: 2026-10-10T16:00:00.000Z. Probabili aggiornate: Inter 09/10/2026 - 14:58; Parma 09/10/2026 - 14:58.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Inter | 3-5-2 → 3-5-2 | Ivan Provedel 70%, Yann Bisseck 85%, Manuel Akanji 55%, Alessandro Bastoni 55%, Andy Diouf 60%, Nicolò Barella 80%, Hakan Çalhanoglu 80%, Henrikh Mkhitaryan 70%, Federico Dimarco 85%, Marcus Thuram 85%, Ange-Yoan Bonny 55% | Ivan Provedel, Henrikh Mkhitaryan, Ange-Yoan Bonny | Josep Martínez, Piotr Zielinski, Lautaro Martínez |
| Parma | 3-5-2 → 3-4-2-1 (cambio) | Edoardo Corvi 90%, Enrico Del Prato 90%, Mariano Troilo 90%, Diego Carlos 90%, Sascha Britschgi 85%, Vincent Sierro 80%, Mandela Keita 90%, Emanuele Valeri 90%, Adrián Bernabé 60%, El Bilal Touré 80%, José David Romero 55% | nessuno | nessuno |

- Inter: squalificati nessuno; infortunati/assenti Stones (risentimento ai flessori della coscia sinistra, da valutare convocazione contro il Parma); Jones C. (risentimento miofasciale agli adduttori della coscia destra, tentativo rientro dalla fine di ottobre); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Ivan Provedel 5%→70% (+65 pp); Josep Martínez 80%→30% (-50 pp); Manuel Akanji 90%→55% (-35 pp); Alessandro Bastoni 90%→55% (-35 pp); Henrikh Mkhitaryan 35%→70% (+35 pp); Andy Diouf 90%→60% (-30 pp); Lautaro Martínez 90%→60% (-30 pp); Djed Spence 30%→50% (+20 pp); Piotr Zielinski 75%→60% (-15 pp); Nicolò Barella 90%→80% (-10 pp); Hakan Çalhanoglu 70%→80% (+10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Stones [infortunato], Jones C. [infortunato]; rimossi Stones [in dubbio], Calhanoglu [in dubbio].
- Parma: squalificati nessuno; infortunati/assenti Ndiaye (contusione alla gamba, da valutare contro l'Inter); Nicolussi Caviglia (lesione di medio grado alla coscia destra, rientro da dicembre); Almqvist (lesione muscolare polpaccio sinistro, rientro da fine ottobre); in dubbio Drobnic (frattura dello scafoide del polso sinistro, in dubbio contro l'Inter).
  Variazioni titolarità ≥10 pp: Adrián Bernabé 80%→60% (-20 pp); Sascha Britschgi 70%→85% (+15 pp); José David Romero 70%→55% (-15 pp); Vincent Sierro 90%→80% (-10 pp); El Bilal Touré 70%→80% (+10 pp); Dominik Drobnic 25%→35% (+10 pp); Lautaro Valenti 40%→50% (+10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Ndiaye [infortunato], Almqvist [infortunato]; rimossi nessuno.

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 1.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marcus Thuram | Inter | 60.9 | 3.63 | 97.4% | 87.7% | 70.3% | MEDIA |
| El Bilal Touré | Parma | 75.3 | 2.18 | 88.7% | 64.0% | 37.2% | MEDIA |
| Federico Dimarco | Inter | 71.3 | 2.12 | 88.0% | 62.5% | 35.6% | ALTA |
| José David Romero | Parma | 49.6 | 2.01 | 86.6% | 59.7% | 32.6% | BASSA |
| Nicolò Barella | Inter | 87.2 | 1.89 | 84.9% | 56.3% | 29.4% | ALTA |
| Hakan Çalhanoglu | Inter | 50.1 | 1.78 | 83.1% | 53.1% | 26.4% | BASSA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marcus Thuram | Inter | 60.9 | 1.25 | 71.4% | 35.5% | 1.12 | NO: DUO + pali/traverse + TS |
| José David Romero | Parma | 49.6 | 0.86 | 57.7% | 21.3% | 1.75 | NO: DUO + pali/traverse + TS |
| El Bilal Touré | Parma | 75.3 | 0.85 | 57.3% | 20.9% | 2 | NO: DUO + pali/traverse + TS |
| Federico Dimarco | Inter | 71.3 | 0.63 | 46.7% | 13.2% | 1.5 | NO: DUO + pali/traverse + TS |
| Hakan Çalhanoglu | Inter | 50.1 | 0.62 | 46.2% | 12.8% | 1.25 | NO: DUO + pali/traverse + TS |
| Nicolò Barella | Inter | 87.2 | 0.55 | 42.3% | 10.6% | 1.8 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Nicolò Barella | Centrocampista · Centrocampista centrale destro | 87.2 | 84.9% | 42.3% | QUALIFICATO | score tiri 65.6; segnale high; stabilità tiri high; titolarità 80%; rischio sostituzione medium; nessun fallback |
| Federico Dimarco | Difensore · Esterno sinistro | 71.3 | 88.0% | 46.7% | QUALIFICATO | score tiri 64.8; segnale high; stabilità tiri high; titolarità 85%; rischio sostituzione medium; nessun fallback |
| Manuel Akanji | Difensore · Difensore centrale destro | 83.3 | 70.8% | 21.3% | QUALIFICATO | score tiri 56.4; segnale medium; stabilità tiri medium; titolarità 55%; rischio sostituzione low; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 10 profili ad alto rischio; più rilevanti Marcus Thuram (60.9'), José David Romero (49.6'), Hakan Çalhanoglu (50.1'), Henrikh Mkhitaryan (43.4'), Andy Diouf (69.3').
- Fallback/maturity: 0 fallback; segnali low/unknown 7.
- Matchup: 20 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 5; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marcus Thuram | Inter | 2+ tiri | 87.7% | N/D | 0.0% | 60.9 | miglior profilo 2+ tiri eleggibile; λ tiri 3.63; matchup x1.07; 60.9 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | MEDIA: segnale medium; stabilità tiri medium; titolarità 85%; rischio sostituzione high; nessun fallback |
| El Bilal Touré | Parma | 1+ SOT | 57.3% | 2 | 50.0% | 75.3 | miglior profilo 1+ SOT distinto; λ SOT 0.85; matchup x0.91; 75.3 minuti attesi; segnale low; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | MEDIA: segnale low; stabilità tiri low; titolarità 80%; rischio sostituzione medium; nessun fallback |
| Federico Dimarco | Inter | 1+ tiri | 88.0% | N/D | 0.0% | 71.3 | profilo meno ovvio supportato dal volume V2; λ tiri 2.12; matchup x1.08; 71.3 minuti attesi; segnale high; quota solo DUO, non usata per graduare | NO_COMPATIBLE_QUOTE | ALTA: segnale high; stabilità tiri high; titolarità 85%; rischio sostituzione medium; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 3. Napoli - Frosinone

Kick-off: 2026-10-10T18:45:00.000Z. Probabili aggiornate: Napoli 09/10/2026 - 14:11; Frosinone 09/10/2026 - 14:11.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Napoli | 4-3-3 → 4-3-3 | Alex Meret 80%, Giovanni Di Lorenzo 90%, Amir Rrahmani 90%, Rafa Marín 65%, Leonardo Spinazzola 85%, Billy Gilmour 90%, Stanislav Lobotka 90%, Kevin De Bruyne 90%, Matteo Politano 55%, Rasmus Højlund 70%, David Neres 55% | Leonardo Spinazzola, David Neres | Mathías Olivera, Noa Lang |
| Frosinone | 4-2-3-1 → 4-2-3-1 | Lorenzo Palmisani 90%, Anthony Oyono 90%, Gabriele Calvani 90%, Ilario Monterisi 55%, Gabriele Bracaglia 90%, Giacomo Calo 90%, Patrizio Masini 90%, Farès Ghedjemis 90%, Romano Schmid 90%, Giorgi Kvernadze 90%, Tomáš Bobček 90% | nessuno | nessuno |

- Napoli: squalificati nessuno; infortunati/assenti Buongiorno (problema al menisco del ginocchio destro, rientro da fine dicembre); Olivera (lesione distrattiva del muscolo otturatore esterno destro, rientro dalla metà di ottobre); Zambo Anguissa (lesione miofasciale di basso grado dell'adduttore lungo, da valutare contro il Frosinone); Vergara (lesione distrattiva al polpaccio, rientro da inizio novembre); Santos A. (lesione di medio grado al bicipite femorale sinistro, tentativo rientro dalla seconda metà di ottobre); Favasuli (lesione muscolare al retto femorale, rientro da metà novembre); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Matteo Politano 90%→55% (-35 pp); Leonardo Spinazzola 55%→85% (+30 pp); Giovane 25%→50% (+25 pp); Rafa Marín 80%→65% (-15 pp); Alex Meret 70%→80% (+10 pp); Billy Gilmour 80%→90% (+10 pp); Rasmus Højlund 80%→70% (-10 pp); Sam Beukema 50%→60% (+10 pp); Noa Lang 70%→60% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Olivera [infortunato], Vergara [infortunato]; rimossi Marianucci [infortunato], McTominay [infortunato], Meret [in dubbio], Spinazzola [in dubbio], Giovane [in dubbio].
- Frosinone: squalificati nessuno; infortunati/assenti Raimondo (tendinopatia al tendine d'Achille destro, da valutare contro il Napoli); Grillitsch (sindrome retto-adduttoria, rientro da inizio novembre); Terzic (lesione di basso grado del bicipite femorale della coscia sinistra, da valutare convocazione contro il Napoli); Birligea (Lesione muscolare al quadricipite sinistro, rientro da fine ottobre); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Tomáš Bobček 70%→90% (+20 pp); Ilario Monterisi 70%→55% (-15 pp); Luis Hasa 35%→50% (+15 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Raimondo [infortunato], Birligea [infortunato]; rimossi Raimondo [in dubbio].

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 0.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rasmus Højlund | Napoli | 74.3 | 2.51 | 91.9% | 71.5% | 45.9% | ALTA |
| Giorgi Kvernadze | Frosinone | 84.3 | 2.3 | 90.0% | 66.9% | 40.4% | ALTA |
| Matteo Politano | Napoli | 69.4 | 1.9 | 85.0% | 56.6% | 29.6% | BASSA |
| Kevin De Bruyne | Napoli | 67.5 | 1.83 | 84.0% | 54.6% | 27.7% | MEDIA |
| Farès Ghedjemis | Frosinone | 59.4 | 1.83 | 84.0% | 54.6% | 27.7% | MEDIA |
| David Neres | Napoli | 45.8 | 1.57 | 79.2% | 46.5% | 20.9% | BASSA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rasmus Højlund | Napoli | 74.3 | 1.09 | 66.4% | 29.7% | 1.2 | NO: DUO + pali/traverse + TS |
| Giorgi Kvernadze | Frosinone | 84.3 | 0.68 | 49.3% | 14.9% | 1.65 | NO: DUO + pali/traverse + TS |
| Matteo Politano | Napoli | 69.4 | 0.65 | 47.8% | 13.9% | 1.5 | NO: DUO + pali/traverse + TS |
| Farès Ghedjemis | Frosinone | 59.4 | 0.63 | 46.7% | 13.2% | 1.75 | NO: DUO + pali/traverse + TS |
| Kevin De Bruyne | Napoli | 67.5 | 0.61 | 45.7% | 12.5% | 1.5 | NO: DUO + pali/traverse + TS |
| Giacomo Calo | Frosinone | 84.8 | 0.55 | 42.3% | 10.6% | 2.5 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Amir Rrahmani | Difensore · Difensore centrale | 88.3 | 67.0% | 18.9% | QUALIFICATO | score tiri 53.7; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Gabriele Bracaglia | Difensore · Terzino sinistro | 83 | 63.9% | 31.6% | QUALIFICATO | score tiri 50; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Giacomo Calo | Centrocampista · Esterno destro | 84.8 | 77.0% | 42.3% | QUALIFICATO | score tiri 49.4; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 8 profili ad alto rischio; più rilevanti Giorgi Kvernadze (84.3'), Matteo Politano (69.4'), Kevin De Bruyne (67.5'), Farès Ghedjemis (59.4'), David Neres (45.8').
- Fallback/maturity: 0 fallback; segnali low/unknown 7.
- Matchup: 20 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 5; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rasmus Højlund | Napoli | 2+ tiri | 71.5% | N/D | 0.0% | 74.3 | miglior profilo 2+ tiri eleggibile; λ tiri 2.51; matchup x1.03; 74.3 minuti attesi; segnale high; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | ALTA: segnale high; stabilità tiri high; titolarità 70%; rischio sostituzione medium; nessun fallback |
| Giorgi Kvernadze | Frosinone | 1+ SOT | 49.3% | 1.65 | 60.6% | 84.3 | miglior profilo 1+ SOT distinto; λ SOT 0.68; matchup x0.97; 84.3 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |
| Kevin De Bruyne | Napoli | 1+ tiri | 84.0% | N/D | 0.0% | 67.5 | profilo meno ovvio supportato dal volume V2; λ tiri 1.83; matchup x0.98; 67.5 minuti attesi; segnale high; quota solo DUO, non usata per graduare | NO_COMPATIBLE_QUOTE | MEDIA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 4. Como - Roma

Kick-off: 2026-10-11T10:30:00.000Z. Probabili aggiornate: Como 09/10/2026 - 13:01; Roma 09/10/2026 - 13:01.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Como | 4-2-3-1 → 4-2-3-1 | Jean Butez 75%, Yan Couto 55%, Jacobo Ramón 90%, Trevoh Chalobah 90%, Álex Valle 75%, Lucas Da Cunha 75%, Máximo Perrone 55%, Assane Diao 85%, Nico Paz 80%, Martin Baturina 60%, Anastasios Douvikas 90% | Anastasios Douvikas | Kean |
| Roma | 3-4-2-1 → 3-4-2-1 | Mile Svilar 90%, Gianluca Mancini 90%, Evan Ndicka 60%, Mario Hermoso 85%, Nahuel Molina 65%, Marten de Roon 85%, Manu Koné 90%, Wesley 90%, Paulo Dybala 90%, Lorenzo Pellegrini 55%, Donyell Malen 90% | Evan Ndicka, Lorenzo Pellegrini | Leonardo Balerdi, Matìas Soulè |

- Como: squalificati nessuno; infortunati/assenti nessuno; in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Anastasios Douvikas 60%→90% (+30 pp); Yan Couto 80%→55% (-25 pp); Máximo Perrone 80%→55% (-25 pp); Martin Baturina 85%→60% (-25 pp); Kean 70%→55% (-15 pp); Nico Paz 90%→80% (-10 pp).
- Roma: squalificati nessuno; infortunati/assenti Cristante (infiammazione al ginocchio, da valutare contro il Como); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Lorenzo Pellegrini 25%→55% (+30 pp); Nahuel Molina 80%→65% (-15 pp); Donyell Malen 75%→90% (+15 pp); Leonardo Balerdi 70%→55% (-15 pp); Wesley 80%→90% (+10 pp); Paulo Dybala 80%→90% (+10 pp); Matìas Soulè 70%→60% (-10 pp).

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 1.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nico Paz | Como | 83.1 | 4.73 | 99.1% | 94.9% | 85.1% | ALTA |
| Donyell Malen | Roma | 70.9 | 3.27 | 96.2% | 83.8% | 63.4% | ALTA |
| Paulo Dybala | Roma | 80.1 | 2.82 | 94.0% | 77.2% | 53.5% | MEDIA |
| Anastasios Douvikas | Como | 69.6 | 2.69 | 93.2% | 75.0% | 50.4% | MEDIA |
| Assane Diao | Como | 70.7 | 2.12 | 88.0% | 62.5% | 35.6% | MEDIA |
| Martin Baturina | Como | 59 | 1.37 | 74.6% | 39.8% | 15.9% | BASSA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Donyell Malen | Roma | 70.9 | 1.54 | 78.6% | 45.6% | 1.16 | NO: DUO + pali/traverse + TS |
| Nico Paz | Como | 83.1 | 1.44 | 76.3% | 42.2% | 1.2 | NO: DUO + pali/traverse + TS |
| Anastasios Douvikas | Como | 69.6 | 1.3 | 72.8% | 37.3% | 1.25 | NO: DUO + pali/traverse + TS |
| Paulo Dybala | Roma | 80.1 | 0.99 | 62.8% | 26.1% | 1.47 | NO: DUO + pali/traverse + TS |
| Assane Diao | Como | 70.7 | 0.7 | 50.3% | 15.6% | 1.65 | NO: DUO + pali/traverse + TS |
| Lorenzo Pellegrini | Roma | 71.6 | 0.5 | 39.4% | 9.0% | 1.75 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Lucas Da Cunha | Centrocampista · Esterno sinistro | 69.4 | 74.1% | 28.1% | QUALIFICATO | score tiri 46.3; segnale medium; stabilità tiri medium; titolarità 75%; rischio sostituzione high; nessun fallback |
| Yan Couto | Difensore · Terzino destro | 81.3 | 59.3% | 31.6% | QUALIFICATO | score tiri 45.5; segnale medium; stabilità tiri medium; titolarità 55%; rischio sostituzione medium; nessun fallback |
| Martin Baturina | Centrocampista · Trequartista sinistro | 59 | 74.6% | 36.2% | WATCH, non qualificato | score tiri 47.2; segnale low; stabilità tiri low; titolarità 60%; rischio sostituzione high; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 9 profili ad alto rischio; più rilevanti Anastasios Douvikas (69.6'), Assane Diao (70.7'), Martin Baturina (59'), Lorenzo Pellegrini (71.6'), Lucas Da Cunha (69.4').
- Fallback/maturity: 0 fallback; segnali low/unknown 6.
- Matchup: 12 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 4; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nico Paz | Como | 2+ tiri | 94.9% | N/D | 0.0% | 83.1 | miglior profilo 2+ tiri eleggibile; λ tiri 4.73; matchup x1.08; 83.1 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | ALTA: segnale medium; stabilità tiri medium; titolarità 80%; rischio sostituzione low; nessun fallback |
| Donyell Malen | Roma | 1+ SOT | 78.6% | 1.16 | 86.2% | 70.9 | miglior profilo 1+ SOT distinto; λ SOT 1.54; matchup x0.92; 70.9 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Martin Baturina | Como | 1+ tiri | 74.6% | 1.05 | 95.2% | 59 | profilo meno ovvio supportato dal volume V2; λ tiri 1.37; matchup x0.94; 59 minuti attesi; segnale low; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | BASSA: segnale low; stabilità tiri low; titolarità 60%; rischio sostituzione high; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 5. Lazio - Monza

Kick-off: 2026-10-11T13:00:00.000Z. Probabili aggiornate: Lazio 09/10/2026 - 14:44; Monza 09/10/2026 - 14:44.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Lazio | 4-3-3 → 4-3-3 | Christos Mandas 90%, Romano Floriani 80%, Danilho Doekhi 55%, Oliver Provstgaard 90%, Nuno Tavares 90%, Davide Frattesi 90%, Reda Belahyane 85%, Kenneth Taylor 90%, Gustav Isaksen 60%, Tijjani Noslin 55%, Mattia Zaccagni 90% | Danilho Doekhi | Josip Šutalo |
| Monza | 3-4-2-1 → 3-4-2-1 | Noel Törnqvist 90%, Eddy Kouadio 90%, Lorenzo Lucchesi 90%, Andrea Carboni 90%, Samuele Birindelli 90%, Ebenezer Akinsanmiro 90%, Michael Folorunsho 90%, Ricardo Mangas 90%, Patrick Cutrone 55%, Jay Robinson 70%, Gustavo Varela 90% | nessuno | nessuno |

- Lazio: squalificati nessuno; infortunati/assenti Cataldi (problema muscolare al quadricipite, out contro il Monza); Rovella (problema muscolare al polpaccio, da valutare convocazione contro il Monza); Gudmundsson A. (problema alla spalla destra, tentativo rientro dalla fine di ottobre); in dubbio Marusic (problema muscolare alla coscia destra, da valutare convocazione contro il Monza).
  Variazioni titolarità ≥10 pp: Adam Marusic 20%→50% (+30 pp); Tijjani Noslin 70%→55% (-15 pp); Alfonso Pedraza 55%→40% (-15 pp); Josip Šutalo 70%→55% (-15 pp); Gustav Isaksen 70%→60% (-10 pp).
- Monza: squalificati nessuno; infortunati/assenti Ciurria (noie fisiche, out contro Lazio); Pessina (lussazione della rotula del ginocchio destro, tentativo rientro da inizio novembre); Ziolkowski (fascite plantare, out contro la Lazio); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Patrick Cutrone 70%→55% (-15 pp); Jay Robinson 80%→70% (-10 pp).

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 1.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gustavo Varela | Monza | 73.3 | 2.59 | 92.5% | 73.1% | 47.9% | ALTA |
| Mattia Zaccagni | Lazio | 87 | 2 | 86.5% | 59.4% | 32.3% | MEDIA |
| Jay Robinson | Monza | 58.6 | 2 | 86.5% | 59.4% | 32.3% | MEDIA |
| Patrick Cutrone | Monza | 56.7 | 1.76 | 82.8% | 52.5% | 25.9% | BASSA |
| Michael Folorunsho | Monza | 72.4 | 1.63 | 80.4% | 48.5% | 22.4% | ALTA |
| Davide Frattesi | Lazio | 73.5 | 1.57 | 79.2% | 46.5% | 20.9% | MEDIA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gustavo Varela | Monza | 73.3 | 1.11 | 67.0% | 30.5% | 1.5 | NO: DUO + pali/traverse + TS |
| Mattia Zaccagni | Lazio | 87 | 0.96 | 61.7% | 24.9% | 1.4 | NO: DUO + pali/traverse + TS |
| Jay Robinson | Monza | 58.6 | 0.82 | 56.0% | 19.8% | 1.57 | NO: DUO + pali/traverse + TS |
| Tijjani Noslin | Lazio | 55.4 | 0.73 | 51.8% | 16.6% | 1.4 | NO: DUO + pali/traverse + TS |
| Gustav Isaksen | Lazio | 51.4 | 0.6 | 45.1% | 12.2% | 1.33 | NO: DUO + pali/traverse + TS |
| Samuele Birindelli | Monza | 87.7 | 0.59 | 44.6% | 11.9% | 2.5 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Samuele Birindelli | Difensore · Esterno destro | 87.7 | 71.4% | 44.6% | QUALIFICATO | score tiri 62.6; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Michael Folorunsho | Centrocampista · Centrocampista centrale sinistro | 72.4 | 80.4% | 27.4% | QUALIFICATO | score tiri 58.3; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Kenneth Taylor | Centrocampista · Esterno sinistro | 82.8 | 68.0% | 30.2% | QUALIFICATO | score tiri 58; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 7 profili ad alto rischio; più rilevanti Gustavo Varela (73.3'), Jay Robinson (58.6'), Patrick Cutrone (56.7'), Tijjani Noslin (55.4'), Gustav Isaksen (51.4').
- Fallback/maturity: 0 fallback; segnali low/unknown 4.
- Matchup: 19 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 4; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gustavo Varela | Monza | 2+ tiri | 73.1% | N/D | 0.0% | 73.3 | miglior profilo 2+ tiri eleggibile; λ tiri 2.59; matchup x0.96; 73.3 minuti attesi; segnale high; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |
| Mattia Zaccagni | Lazio | 1+ SOT | 61.7% | 1.4 | 71.4% | 87 | miglior profilo 1+ SOT distinto; λ SOT 0.96; matchup x1.08; 87 minuti attesi; segnale low; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | MEDIA: segnale low; stabilità tiri low; titolarità 90%; rischio sostituzione low; nessun fallback |
| Michael Folorunsho | Monza | 1+ tiri | 80.4% | 1.25 | 80.0% | 72.4 | profilo meno ovvio supportato dal volume V2; λ tiri 1.63; matchup x1.05; 72.4 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione medium; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 6. Lecce - Bologna

Kick-off: 2026-10-11T13:00:00.000Z. Probabili aggiornate: Lecce 09/10/2026 - 13:04; Bologna 09/10/2026 - 13:04.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Lecce | 4-3-3 → 4-3-3 | Wladimiro Falcone 90%, Danilo Veiga 90%, Tiago Gabriel 85%, Jamil Siebert 60%, Antonino Gallo 90%, Lassana Coulibaly 90%, Ivan Ilic 90%, Youssef Maleh 60%, Santiago Pierotti 80%, Willem Geubbels 75%, Joël Monteiro 85% | Willem Geubbels | Nikola Stulic |
| Bologna | 3-4-2-1 → 3-4-2-1 | Lukasz Skorupski 70%, Eivind Helland 55%, Torbjørn Heggem 90%, Arthur Theate 90%, Nadir Zortea 90%, Tommaso Pobega 55%, Lewis Ferguson 90%, Juan Miranda 90%, Riccardo Orsolini 60%, Federico Bernardeschi 75%, Roberto Piccoli 80% | nessuno | nessuno |

- Lecce: squalificati nessuno; infortunati/assenti Berisha M. (sovraccarico muscolare alla gamba, da valutare convocazione contro il Bologna); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Willem Geubbels 55%→75% (+20 pp); Olaf Gorter 55%→40% (-15 pp); Jamil Siebert 70%→60% (-10 pp); Youssef Maleh 70%→60% (-10 pp); Nikola Stulic 70%→60% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti nessuno; rimossi Geubbels [in dubbio].
- Bologna: squalificati nessuno; infortunati/assenti Holm (problema al tendine della coscia destra, ipotesi rientro da fine febbraio); Odgaard (lesione ai flessori della coscia destra, rientro dalla seconda metà di ottobre); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Eivind Helland 80%→55% (-25 pp); Tommaso Pobega 80%→55% (-25 pp); Massimo Pessina 5%→30% (+25 pp); Lukasz Skorupski 80%→70% (-10 pp); Riccardo Orsolini 70%→60% (-10 pp); Lorenzo De Silvestri 40%→30% (-10 pp); Nicolo Casale 30%→40% (+10 pp).

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 3.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Federico Bernardeschi | Bologna | 74.3 | 2.69 | 93.2% | 75.0% | 50.4% | MEDIA |
| Roberto Piccoli | Bologna | 73.2 | 2.32 | 90.2% | 67.4% | 40.9% | ALTA |
| Riccardo Orsolini | Bologna | 45.1 | 1.73 | 82.3% | 51.6% | 25.1% | BASSA |
| Willem Geubbels | Lecce | 45.8 | 1.69 | 81.5% | 50.4% | 24.0% | BASSA |
| Joël Monteiro | Lecce | 58.1 | 1.53 | 78.3% | 45.2% | 19.9% | BASSA |
| Lassana Coulibaly | Lecce | 88.3 | 1.52 | 78.1% | 44.9% | 19.6% | ALTA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Federico Bernardeschi | Bologna | 74.3 | 1.03 | 64.3% | 27.5% | 1.33 | NO: DUO + pali/traverse + TS |
| Willem Geubbels | Lecce | 45.8 | 0.73 | 51.8% | 16.6% | 1.75 | NO: DUO + pali/traverse + TS |
| Roberto Piccoli | Bologna | 73.2 | 0.73 | 51.8% | 16.6% | 1.33 | NO: DUO + pali/traverse + TS |
| Riccardo Orsolini | Bologna | 45.1 | 0.69 | 49.8% | 15.2% | 1.2 | NO: DUO + pali/traverse + TS |
| Lassana Coulibaly | Lecce | 88.3 | 0.6 | 45.1% | 12.2% | 3 | NO: DUO + pali/traverse + TS |
| Santiago Pierotti | Lecce | 76.4 | 0.58 | 44.0% | 11.5% | 2.4 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Lassana Coulibaly | Centrocampista · Esterno sinistro | 88.3 | 78.1% | 45.1% | QUALIFICATO | score tiri 48.2; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Lewis Ferguson | Centrocampista · Esterno sinistro | 87.4 | 63.9% | 24.4% | QUALIFICATO | score tiri 46.9; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Tommaso Pobega | Centrocampista · Esterno sinistro | 60 | 73.3% | 35.6% | WATCH, non qualificato | score tiri 52.6; segnale medium; stabilità tiri medium; titolarità 55%; rischio sostituzione high; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 11 profili ad alto rischio; più rilevanti Federico Bernardeschi (74.3'), Riccardo Orsolini (45.1'), Willem Geubbels (45.8'), Joël Monteiro (58.1'), Santiago Pierotti (76.4').
- Fallback/maturity: 0 fallback; segnali low/unknown 5.
- Matchup: 19 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 5; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Federico Bernardeschi | Bologna | 2+ tiri | 75.0% | N/D | 0.0% | 74.3 | miglior profilo 2+ tiri eleggibile; λ tiri 2.69; matchup x1; 74.3 minuti attesi; segnale high; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | MEDIA: segnale high; stabilità tiri high; titolarità 75%; rischio sostituzione high; nessun fallback |
| Roberto Piccoli | Bologna | 1+ SOT | 51.8% | 1.33 | 75.2% | 73.2 | miglior profilo 1+ SOT distinto; λ SOT 0.73; matchup x0.97; 73.2 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 80%; rischio sostituzione medium; nessun fallback |
| Lassana Coulibaly | Lecce | 1+ tiri | 78.1% | 1.5 | 66.7% | 88.3 | profilo meno ovvio supportato dal volume V2; λ tiri 1.52; matchup x0.97; 88.3 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 7. Sassuolo - Milan

Kick-off: 2026-10-11T16:00:00.000Z. Probabili aggiornate: Sassuolo 09/10/2026 - 14:30; Milan 09/10/2026 - 14:30.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Sassuolo | 4-3-3 → 4-3-3 | Arijanet Muric 55%, Simone Cinquegrano 85%, Duje Ćaleta-Car 90%, Fedde Leysen 90%, Josh Doig 60%, Kristian Thorstvedt 85%, Nemanja Matic 90%, Vasilije Adzic 55%, Domenico Berardi 90%, Sebastiano Esposito 75%, Armand Laurienté 90% | Vasilije Adzic | Darryl Bakola |
| Milan | 3-4-2-1 → 4-4-1-1 (cambio) | Mike Maignan 90%, Mario Gila 90%, Koni De Winter 60%, Strahinja Pavlović 90%, Davide Bartesaghi 60%, Samuel Chukwueze 80%, Luka Modrić 90%, Adrien Rabiot 90%, Diego Moreira 85%, Christian Pulisic 90%, Gonçalo Ramos 90% | Davide Bartesaghi | Pervis Estupiñan |

- Sassuolo: squalificati nessuno; infortunati/assenti Idzes (lesione di grado moderato al quadricipite della gamba sinistra, tentativo rientro dalla seconda metà di ottobre); Walukiewicz (trauma contusivo alla gamba destra, da valutare convocazione dalla seconda metà di ottobre); Candè (rottura legamento crociato anteriore ginocchio destro, rientro da fine ottobre); Pieragnolo (lesione legamento crociato anteriore gamba destra, ipotesi rientro da fine ottobre); Boloca (problema al ginocchio, da valutare rientro da fine ottobre); Konè I. (rottura di tibia e perone gamba sinistra, rientro da dicembre); Volpato (lesione di grado moderato al flessore della gamba destra, da valutare convocazione contro il Milan); in dubbio Muric (noie fisiche, in dubbio dal 1' contro il Milan).
  Variazioni titolarità ≥10 pp: Stefano Turati 5%→45% (+40 pp); Arijanet Muric 70%→55% (-15 pp); Josh Doig 70%→60% (-10 pp); Darryl Bakola 70%→60% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Muric [in dubbio]; rimossi nessuno.
- Milan: squalificati nessuno; infortunati/assenti Saelemaekers (problema alla caviglia, out contro Sassuolo); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Koni De Winter 80%→60% (-20 pp); Davide Bartesaghi 40%→60% (+20 pp); Pervis Estupiñan 70%→55% (-15 pp); Ardon Jashari 50%→40% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Saelemaekers [infortunato]; rimossi Saelemaekers [in dubbio].

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 3.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gonçalo Ramos | Milan | 84.7 | 3.59 | 97.2% | 87.3% | 69.5% | ALTA |
| Armand Laurienté | Sassuolo | 86.4 | 3.25 | 96.1% | 83.5% | 63.0% | MEDIA |
| Samuel Chukwueze | Milan | 79.9 | 2 | 86.5% | 59.4% | 32.3% | MEDIA |
| Christian Pulisic | Milan | 48.3 | 1.66 | 81.0% | 49.4% | 23.2% | MEDIA |
| Domenico Berardi | Sassuolo | 59.8 | 1.65 | 80.8% | 49.1% | 23.0% | BASSA |
| Vasilije Adzic | Sassuolo | 52.7 | 1.47 | 77.0% | 43.2% | 18.4% | BASSA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gonçalo Ramos | Milan | 84.7 | 1.26 | 71.6% | 35.9% | 1.25 | NO: DUO + pali/traverse + TS |
| Armand Laurienté | Sassuolo | 86.4 | 1.03 | 64.3% | 27.5% | 1.5 | NO: DUO + pali/traverse + TS |
| Domenico Berardi | Sassuolo | 59.8 | 0.86 | 57.7% | 21.3% | 1.33 | NO: DUO + pali/traverse + TS |
| Christian Pulisic | Milan | 48.3 | 0.7 | 50.3% | 15.6% | 1.44 | NO: DUO + pali/traverse + TS |
| Samuel Chukwueze | Milan | 79.9 | 0.64 | 47.3% | 13.5% | 1.8 | NO: DUO + pali/traverse + TS |
| Vasilije Adzic | Sassuolo | 52.7 | 0.63 | 46.7% | 13.2% | 2 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Strahinja Pavlović | Difensore · Difensore centrale sinistro | 88.6 | 64.3% | 22.9% | QUALIFICATO | score tiri 59.3; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Adrien Rabiot | Centrocampista · Centrocampista centrale sinistro | 72.5 | 75.8% | 32.3% | QUALIFICATO | score tiri 50.8; segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Koni De Winter | Difensore · Difensore centrale | 88.7 | 46.2% | 5.8% | WATCH, non qualificato | score tiri 53.4; segnale low; stabilità tiri low; titolarità 60%; rischio sostituzione low; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 11 profili ad alto rischio; più rilevanti Armand Laurienté (86.4'), Samuel Chukwueze (79.9'), Christian Pulisic (48.3'), Domenico Berardi (59.8'), Vasilije Adzic (52.7').
- Fallback/maturity: 0 fallback; segnali low/unknown 6.
- Matchup: 20 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 4; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gonçalo Ramos | Milan | 2+ tiri | 87.3% | N/D | 0.0% | 84.7 | miglior profilo 2+ tiri eleggibile; λ tiri 3.59; matchup x1.05; 84.7 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | ALTA: segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione low; nessun fallback |
| Armand Laurienté | Sassuolo | 1+ SOT | 64.3% | 1.5 | 66.7% | 86.4 | miglior profilo 1+ SOT distinto; λ SOT 1.03; matchup x1.04; 86.4 minuti attesi; segnale medium; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | MEDIA: segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione high; nessun fallback |
| Adrien Rabiot | Milan | 1+ tiri | 75.8% | 1.08 | 92.6% | 72.5 | profilo meno ovvio supportato dal volume V2; λ tiri 1.42; matchup x1.05; 72.5 minuti attesi; segnale medium; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | MEDIA: segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione medium; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 8. Cagliari - Juventus

Kick-off: 2026-10-11T18:45:00.000Z. Probabili aggiornate: Cagliari 09/10/2026 - 13:03; Juventus 09/10/2026 - 13:03.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Cagliari | 4-4-2 → 4-4-2 | Elia Caprile 90%, Zé Pedro 85%, Yerry Mina 90%, Juan Rodríguez 90%, Adam Obert 80%, Michel Adopo 90%, Harry Winks 90%, Alessandro Romano 90%, Jacopo Fazzini 80%, Daniel Maldini 90%, Paul Mendy 90% | nessuno | nessuno |
| Juventus | 4-2-3-1 → 4-2-3-1 | Guglielmo Vicario 90%, Pierre Kalulu 90%, Bremer 90%, Lloyd Kelly 75%, Andrea Cambiaso 60%, Douglas Luiz 90%, Sarr P. 80%, Edon Zhegrova 60%, Weston McKennie 90%, Nicolás González 55%, Randal Kolo Muani 85% | Lloyd Kelly, Andrea Cambiaso, Sarr P., Edon Zhegrova | Jhon Lucumí, Zeki Çelik, Francisco Conceição, Kerim Alajbegović |

- Cagliari: squalificati nessuno; infortunati/assenti Idrissi R. (rottura del legamento crociato, rientro da fine ottobre); Deiola (lesione del menisco laterale del ginocchio sinistro, ipotesi di rientro da fine ottobre); Felici (rottura del legamento crociato anteriore, ipotesi rientro da marzo); Trepy (noie fisiche, rientro da metà ottobre); Kevin Carlos (problema muscolare al quadricipite della coscia sinistra, out contro la Juve); in dubbio Sherri (fastidio agli adduttori della coscia destra, in dubbio convocazione contro la Juventus).
  Variazioni titolarità ≥10 pp: Nzola 30%→60% (+30 pp); Adam Obert 90%→80% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Kevin Carlos [infortunato], Sherri [in dubbio]; rimossi nessuno.
- Juventus: squalificati nessuno; infortunati/assenti Locatelli (rottura del menisco esterno del ginocchio, rientro in campo da febbraio); Thuram K. (sindrome femoro-rotulea, ipotesi rientro da gennaio); Boga (lesione di medio grado del bicipite femorale, rientro da metà novembre); Ekhator (lesione di medio grado del muscolo semitendinoso, rientro da metà novembre); Yildiz (frattura metatarso piede sinistro, rientro da inizio dicembre); Grabara (lesione al crociato anteriore del ginocchio destro, rientro da aprile); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Nicolás González 90%→55% (-35 pp); Zeki Çelik 90%→60% (-30 pp); Lloyd Kelly 50%→75% (+25 pp); Jhon Lucumí 80%→55% (-25 pp); Sarr P. 60%→80% (+20 pp); Randal Kolo Muani 70%→85% (+15 pp); Kerim Alajbegović 75%→60% (-15 pp); Teun Koopmeiners 55%→40% (-15 pp); Andrea Cambiaso 50%→60% (+10 pp); Francisco Conceição 70%→60% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti nessuno; rimossi Cabal [in dubbio].

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 3.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nicolás González | Juventus | 57.7 | 2.8 | 93.9% | 76.9% | 53.0% | BASSA |
| Paul Mendy | Cagliari | 71 | 2.72 | 93.4% | 75.5% | 51.1% | MEDIA |
| Randal Kolo Muani | Juventus | 85 | 2.7 | 93.3% | 75.1% | 50.6% | MEDIA |
| Edon Zhegrova | Juventus | 44.6 | 2.58 | 92.4% | 72.9% | 47.6% | BASSA |
| Daniel Maldini | Cagliari | 71.3 | 2.36 | 90.6% | 68.3% | 42.0% | MEDIA |
| Douglas Luiz | Juventus | 80 | 2.25 | 89.5% | 65.8% | 39.1% | BASSA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edon Zhegrova | Juventus | 44.6 | 1.04 | 64.6% | 27.9% | 1.33 | NO: DUO + pali/traverse + TS |
| Nicolás González | Juventus | 57.7 | 0.89 | 58.9% | 22.4% | 1.33 | NO: DUO + pali/traverse + TS |
| Paul Mendy | Cagliari | 71 | 0.74 | 52.3% | 17.0% | 1.75 | NO: DUO + pali/traverse + TS |
| Douglas Luiz | Juventus | 80 | 0.74 | 52.3% | 17.0% | 2.4 | NO: DUO + pali/traverse + TS |
| Randal Kolo Muani | Juventus | 85 | 0.74 | 52.3% | 17.0% | 1.25 | NO: DUO + pali/traverse + TS |
| Daniel Maldini | Cagliari | 71.3 | 0.73 | 51.8% | 16.6% | 1.57 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Alessandro Romano | Centrocampista · Trequartista | 87.3 | 84.0% | 42.9% | QUALIFICATO | score tiri 52.2; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Bremer | Difensore · Difensore centrale | 88.5 | 74.1% | 42.9% | QUALIFICATO | score tiri 49.1; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Michel Adopo | Centrocampista · Centrocampista centrale destro | 89 | 66.0% | 32.3% | QUALIFICATO | score tiri 38.2; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 11 profili ad alto rischio; più rilevanti Nicolás González (57.7'), Randal Kolo Muani (85'), Edon Zhegrova (44.6'), Daniel Maldini (71.3'), Douglas Luiz (80').
- Fallback/maturity: 0 fallback; segnali low/unknown 5.
- Matchup: 13 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 5; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Paul Mendy | Cagliari | 2+ tiri | 75.5% | N/D | 0.0% | 71 | miglior profilo 2+ tiri eleggibile; λ tiri 2.72; matchup x0.99; 71 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | MEDIA: segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Douglas Luiz | Juventus | 1+ SOT | 52.3% | 2.4 | 41.7% | 80 | miglior profilo 1+ SOT distinto; λ SOT 0.74; matchup x1.02; 80 minuti attesi; segnale low; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | BASSA: segnale low; stabilità tiri low; titolarità 90%; rischio sostituzione high; nessun fallback |
| Alessandro Romano | Cagliari | 1+ tiri | 84.0% | 1.4 | 71.4% | 87.3 | profilo meno ovvio supportato dal volume V2; λ tiri 1.83; matchup x0.99; 87.3 minuti attesi; segnale high; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 9. Atalanta - Venezia

Kick-off: 2026-10-12T16:30:00.000Z. Probabili aggiornate: Atalanta 09/10/2026 - 14:36; Venezia 09/10/2026 - 14:36.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Atalanta | 4-3-3 → 4-3-3 | Marco Carnesecchi 90%, Raoul Bellanova 90%, Thomas Kristensen 85%, Giorgio Scalvini 90%, Lorenzo Bernasconi 55%, Lazar Samardzic 55%, Franck Kessié 70%, Éderson 90%, Charles De Ketelaere 90%, Gianluca Scamacca 60%, Rowe 90% | nessuno | nessuno |
| Venezia | 3-5-2 → 3-5-2 | Filip Stankovic 90%, Matías Moreno 60%, Armel Bella-Kotchap 75%, Juan Jesus 90%, Antoine Hainaut 80%, Enrique Perez 90%, Toma Basic 55%, Simon Sohm 90%, Thierry Correia 60%, John Yeboah 90%, Akor Adams 90% | Armel Bella-Kotchap, Toma Basic | Joel Schingtienne, Thorir Johann Helgason |

- Atalanta: squalificati nessuno; infortunati/assenti Hien (lesione del tendine prossimale del muscolo semimembranoso della coscia sinistra, rientro da metà novembre); Kossounou (lesione muscolare di medio-alto grado del bicipite femorale della coscia sinistra, rientro dalla seconda metà di novembre); Sulemana K. (lesione del collaterale mediale di secondo grado del ginocchio sinistro, da valutare convocazione contro il Venezia); Raspadori (distrazione di basso grado al bicipite femorale, rientro dalla seconda metà di ottobre); Pompei (frattura della falange della mano destra, out contro il Venezia); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Gianluca Scamacca 80%→60% (-20 pp); Lorenzo Bernasconi 70%→55% (-15 pp); Lazar Samardzic 70%→55% (-15 pp).
- Venezia: squalificati nessuno; infortunati/assenti Schingtienne (noie fisiche, da valutare convocazione contro Atalanta); Sverko (problema all'anca, rientro fine ottobre); Franjic (problema alla spalla, rientro dalla metà di dicembre); Haps (noie fisiche, da valutare per Bergamo); Busio (distrazione intratendinea del bicipite femorale destro, rientro dalla seconda metà di ottobre); Dagasso (problema fisico, da valutare convocazione per Bergamo); Adorante (problema alla schiena, rientro da metà ottobre); in dubbio Basic (fascite plantare, in dubbio impiego contro l'Atalanta).
  Variazioni titolarità ≥10 pp: Thorir Johann Helgason 80%→60% (-20 pp); Thierry Correia 75%→60% (-15 pp); Matías Moreno 70%→60% (-10 pp); Redouane Halhal 50%→40% (-10 pp); Kornel Lisman 15%→25% (+10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Schingtienne [infortunato], Haps [infortunato], Basic [in dubbio]; rimossi Bella-Kotchap [infortunato], Basic [infortunato].

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 3.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gianluca Scamacca | Atalanta | 59 | 3.37 | 96.6% | 85.0% | 65.4% | BASSA |
| John Yeboah | Venezia | 79.1 | 3.31 | 96.4% | 84.3% | 64.3% | ALTA |
| Akor Adams | Venezia | 82.5 | 3 | 95.0% | 80.1% | 57.7% | ALTA |
| Charles De Ketelaere | Atalanta | 75.2 | 2.43 | 91.2% | 69.8% | 43.8% | MEDIA |
| Lazar Samardzic | Atalanta | 59.2 | 2.37 | 90.6% | 68.5% | 42.2% | BASSA |
| Rowe | Atalanta | 58 | 2.33 | 90.3% | 67.6% | 41.2% | MEDIA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gianluca Scamacca | Atalanta | 59 | 1.31 | 73.0% | 37.7% | 1.12 | NO: DUO + pali/traverse + TS |
| Akor Adams | Venezia | 82.5 | 1.17 | 69.0% | 32.6% | 1.4 | NO: DUO + pali/traverse + TS |
| John Yeboah | Venezia | 79.1 | 1.14 | 68.0% | 31.6% | 1.5 | NO: DUO + pali/traverse + TS |
| Charles De Ketelaere | Atalanta | 75.2 | 0.78 | 54.2% | 18.4% | 1.57 | NO: DUO + pali/traverse + TS |
| Rowe | Atalanta | 58 | 0.67 | 48.8% | 14.5% | 1.33 | NO: DUO + pali/traverse + TS |
| Franck Kessié | Atalanta | 56.9 | 0.65 | 47.8% | 13.9% | 1.8 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Éderson | Centrocampista · Centrocampista centrale sinistro | 82.4 | 84.3% | 47.8% | QUALIFICATO | score tiri 46.9; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Lazar Samardzic | Centrocampista · Trequartista | 59.2 | 90.6% | 44.0% | WATCH, non qualificato | score tiri 58.7; segnale medium; stabilità tiri medium; titolarità 55%; rischio sostituzione high; nessun fallback |
| Enrique Perez | Centrocampista · Centrocampista centrale destro | 82.8 | 79.0% | 21.3% | WATCH, non qualificato | score tiri 45.7; segnale low; stabilità tiri low; titolarità 90%; rischio sostituzione high; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 15 profili ad alto rischio; più rilevanti Gianluca Scamacca (59'), John Yeboah (79.1'), Lazar Samardzic (59.2'), Rowe (58'), Enrique Perez (82.8').
- Fallback/maturity: 0 fallback; segnali low/unknown 9.
- Matchup: 20 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 3; identità da rivedere 1 (John Yeboah / tiri: SCHINGTIENNE J. U/O 0.5 SOMMA TIRI TOTALI E SUO SOST. INCL. T.S.). Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gianluca Scamacca | Atalanta | 2+ tiri | 85.0% | N/D | 0.0% | 59 | miglior profilo 2+ tiri eleggibile; λ tiri 3.37; matchup x1.06; 59 minuti attesi; segnale medium; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | BASSA: segnale medium; stabilità tiri medium; titolarità 60%; rischio sostituzione high; nessun fallback |
| Akor Adams | Venezia | 1+ SOT | 69.0% | 1.4 | 71.4% | 82.5 | miglior profilo 1+ SOT distinto; λ SOT 1.17; matchup x0.93; 82.5 minuti attesi; segnale medium; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | ALTA: segnale medium; stabilità tiri medium; titolarità 90%; rischio sostituzione low; nessun fallback |
| Rowe | Atalanta | 1+ tiri | 90.3% | N/D | 0.0% | 58 | profilo meno ovvio supportato dal volume V2; λ tiri 2.33; matchup x0.97; 58 minuti attesi; segnale high; quota solo DUO, non usata per graduare | NO_COMPATIBLE_QUOTE | MEDIA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## 10. Torino - Udinese

Kick-off: 2026-10-12T18:45:00.000Z. Probabili aggiornate: Torino 09/10/2026 - 14:00; Udinese 09/10/2026 - 14:00.

### A. Formazioni

| Squadra | Modulo prima → ora | XI aggiornato | Entrati | Usciti |
| --- | --- | --- | --- | --- |
| Torino | 3-4-2-1 → 3-4-2-1 | Lucas Perri 90%, Pietro Comuzzo 85%, Saúl Coco 80%, Eray Cömert 85%, Rafik Belghali 90%, Mandragora 90%, Kian Fitz-Jim 90%, Alessio Cacciamani 80%, Cesare Casadei 55%, Nikola Vlasic 90%, Giovanni Simeone 90% | nessuno | nessuno |
| Udinese | 3-4-2-1 → 3-4-2-1 | Maduka Okoye 90%, James Abankwah 60%, Christian Kabasele 90%, Oumar Solet 85%, Mërgim Vojvoda 60%, Lennon Miller 90%, Jesper Karlström 90%, Hassane Kamara 90%, Unai Gomez 55%, Jurgen Ekkelenkamp 90%, Keinan Davis 80% | nessuno | nessuno |

- Torino: squalificati nessuno; infortunati/assenti Fortini (affaticamento muscolare all'adduttore, da valutare contro l'Udinese); in dubbio nessuno.
  Variazioni titolarità ≥10 pp: Cesare Casadei 70%→55% (-15 pp); Saúl Coco 90%→80% (-10 pp); Adrian Ismajli 50%→40% (-10 pp); Rodriguez R. 40%→30% (-10 pp).
  Stato disponibilità vs 3 ottobre: aggiunti Fortini [infortunato]; rimossi Adams C. [infortunato], Fortini [in dubbio].
- Udinese: squalificati nessuno; infortunati/assenti Piotrowski (lieve aritmia cardiaca benigna, ipotesi rientro da fine ottobre); Zaniolo (lesione muscolare al bicipite femorale destro, rientro dalla seconda metà di ottobre); Gueye (problema alla caviglia, rientro da fine gennaio); in dubbio Arizala (lesione muscolare al bicipite femorale, in dubbio impiego contro Torino).
  Variazioni titolarità ≥10 pp: Mërgim Vojvoda 80%→60% (-20 pp); Matteo Palma 30%→50% (+20 pp); Unai Gomez 70%→55% (-15 pp); James Abankwah 70%→60% (-10 pp); Oumar Solet 75%→85% (+10 pp); Keinan Davis 70%→80% (+10 pp); Jovanovic 20%→30% (+10 pp).

Matching/identità: nessun titolare non collegato. Riserve fuori rosa conservate come diagnostica: 3.

### B. Tiri totali

| Giocatore | Squadra | Min | λ tiri | 1+ | 2+ | 3+ | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Giovanni Simeone | Torino | 73.6 | 2.95 | 94.8% | 79.3% | 56.5% | ALTA |
| Jurgen Ekkelenkamp | Udinese | 84.4 | 2.35 | 90.5% | 68.0% | 41.7% | BASSA |
| Keinan Davis | Udinese | 60.6 | 1.97 | 86.1% | 58.6% | 31.5% | MEDIA |
| Mandragora | Torino | 66.9 | 1.92 | 85.3% | 57.2% | 30.2% | MEDIA |
| Nikola Vlasic | Torino | 84.6 | 1.64 | 80.6% | 48.8% | 22.7% | ALTA |
| Hassane Kamara | Udinese | 84.6 | 1.55 | 78.8% | 45.9% | 20.4% | MEDIA |

### C. Tiri in porta

| Giocatore | Squadra | Min | λ SOT | 1+ | 2+ | Sisal 1+ | Compatibilità |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jurgen Ekkelenkamp | Udinese | 84.4 | 0.85 | 57.3% | 20.9% | 1.65 | NO: DUO + pali/traverse + TS |
| Keinan Davis | Udinese | 60.6 | 0.85 | 57.3% | 20.9% | 1.4 | NO: DUO + pali/traverse + TS |
| Giovanni Simeone | Torino | 73.6 | 0.83 | 56.4% | 20.2% | 1.33 | NO: DUO + pali/traverse + TS |
| Mandragora | Torino | 66.9 | 0.65 | 47.8% | 13.9% | 1.65 | NO: DUO + pali/traverse + TS |
| Hassane Kamara | Udinese | 84.6 | 0.64 | 47.3% | 13.5% | 2.25 | NO: DUO + pali/traverse + TS |
| Nikola Vlasic | Torino | 84.6 | 0.51 | 40.0% | 9.3% | 1.65 | NO: DUO + pali/traverse + TS |

### D. Outsider

| Giocatore | Ruolo | Min | 1+ tiri | 1+ SOT | Gate V2 | Motivo |
| --- | --- | --- | --- | --- | --- | --- |
| Hassane Kamara | Difensore · Esterno sinistro | 84.6 | 78.8% | 47.3% | QUALIFICATO | score tiri 71; segnale low; stabilità tiri low; titolarità 90%; rischio sostituzione medium; nessun fallback |
| Nikola Vlasic | Centrocampista · Trequartista | 84.6 | 80.6% | 40.0% | QUALIFICATO | score tiri 64.3; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione low; nessun fallback |
| Mandragora | Centrocampista · Centrocampista centrale destro | 66.9 | 85.3% | 47.8% | QUALIFICATO | score tiri 54.3; segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |

### E. Rischi

- Minuti/sostituzioni: 12 profili ad alto rischio; più rilevanti Giovanni Simeone (73.6'), Jurgen Ekkelenkamp (84.4'), Keinan Davis (60.6'), Mandragora (66.9'), Kian Fitz-Jim (73.6').
- Fallback/maturity: 0 fallback; segnali low/unknown 9.
- Matchup: 20 giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.
- Sisal: quote mancanti sui due focus 6; identità da rivedere 0. Tutte le quote verificate sono incompatibili con il target individuale V2.
- Dati partita: forma ufficiale 2026/27; indisponibili verificati; designazione arbitrale; meteo attendibile alla data della gara. Cutoff leakage: MD6 esclusa, solo gare concluse.

### F. Selezione

| Giocatore | Squadra | Mercato | P V2 individuale | Quota Sisal | P implicita grezza | Min | Motivazione | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Giovanni Simeone | Torino | 2+ tiri | 79.3% | N/D | 0.0% | 73.6 | miglior profilo 2+ tiri eleggibile; λ tiri 2.95; matchup x1.1; 73.6 minuti attesi; segnale high; soglia 2+ senza quota individuale compatibile | NO_COMPATIBLE_QUOTE | ALTA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |
| Jurgen Ekkelenkamp | Udinese | 1+ SOT | 57.3% | 1.65 | 60.6% | 84.4 | miglior profilo 1+ SOT distinto; λ SOT 0.85; matchup x1.03; 84.4 minuti attesi; segnale low; quota solo DUO, non usata per graduare | INCOMPATIBLE_DUO_TARGET | BASSA: segnale low; stabilità tiri low; titolarità 90%; rischio sostituzione high; nessun fallback |
| Mandragora | Torino | 1+ tiri | 85.3% | N/D | 0.0% | 66.9 | profilo meno ovvio supportato dal volume V2; λ tiri 1.92; matchup x1.04; 66.9 minuti attesi; segnale high; quota solo DUO, non usata per graduare | NO_COMPATIBLE_QUOTE | MEDIA: segnale high; stabilità tiri high; titolarità 90%; rischio sostituzione high; nessun fallback |

Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.

## Variazioni operative più ampie vs 3 ottobre

| Giocatore | Partita | Stato | Δ Min | Δ 1+ tiri | Δ 2+ tiri | Δ 3+ tiri | Δ 1+ SOT | Δ 2+ SOT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nicolás González | Cagliari - Juventus | COMMON | 0 | 5.6 pp | 13.6 pp | 16.7 pp | 10.6 pp | 8.2 pp |
| Randal Kolo Muani | Cagliari - Juventus | COMMON | 0 | 5.2 pp | 12.3 pp | 14.8 pp | 9.4 pp | 6.1 pp |
| Douglas Luiz | Cagliari - Juventus | COMMON | 0 | 6.8 pp | 13.5 pp | 13.5 pp | 10.0 pp | 6.4 pp |
| Marcus Thuram | Inter - Parma | COMMON | 0 | 2.5 pp | 8.2 pp | 13.5 pp | 5.0 pp | 5.8 pp |
| Bremer | Cagliari - Juventus | COMMON | 0 | 8.7 pp | 10.4 pp | 6.3 pp | 9.3 pp | 4.5 pp |
| Weston McKennie | Cagliari - Juventus | COMMON | 0 | 8.1 pp | 10.3 pp | 6.6 pp | 7.7 pp | 3.4 pp |
| Nicolò Barella | Inter - Parma | COMMON | 0 | 5.9 pp | 10.1 pp | 8.7 pp | 4.8 pp | 2.5 pp |
| Hakan Çalhanoglu | Inter - Parma | COMMON | 0 | 6.1 pp | 9.9 pp | 8.0 pp | 4.5 pp | 2.6 pp |
| Federico Dimarco | Inter - Parma | COMMON | 0 | 5.0 pp | 9.7 pp | 9.4 pp | 4.4 pp | 2.6 pp |
| Andy Diouf | Inter - Parma | COMMON | 0 | 6.2 pp | 8.6 pp | 6.0 pp | 3.8 pp | 1.7 pp |
| Manuel Akanji | Inter - Parma | COMMON | 0 | 7.2 pp | 8.0 pp | 4.5 pp | 2.4 pp | 0.5 pp |
| Yann Bisseck | Inter - Parma | COMMON | 0 | 6.8 pp | 8.0 pp | 4.7 pp | 4.3 pp | 2.1 pp |
| Alessandro Bastoni | Inter - Parma | COMMON | 0 | 7.2 pp | 5.7 pp | 2.3 pp | 2.3 pp | 0.6 pp |
| Pierre Kalulu | Cagliari - Juventus | COMMON | 0 | 6.8 pp | 3.3 pp | 0.8 pp | 4.9 pp | 1.0 pp |
| Lassana Coulibaly | Lecce - Bologna | COMMON | 0 | 0.2 pp | 0.3 pp | 0.3 pp | 4.6 pp | 2.6 pp |
| Mattia Zaccagni | Lazio - Monza | COMMON | 0 | -2.0 pp | -4.2 pp | -4.3 pp | -1.9 pp | -1.8 pp |
| Santiago Pierotti | Lecce - Bologna | COMMON | 0 | 0.0 pp | 0.0 pp | 0.0 pp | 4.1 pp | 2.2 pp |
| Donyell Malen | Como - Roma | COMMON | 0 | 0.6 pp | 1.8 pp | 2.9 pp | 2.5 pp | 3.7 pp |
| Davide Frattesi | Lazio - Monza | COMMON | 0 | -2.2 pp | -3.5 pp | -2.9 pp | -1.7 pp | -1.0 pp |
| Tijjani Noslin | Lazio - Monza | COMMON | 0 | -2.0 pp | -3.2 pp | -2.6 pp | -1.4 pp | -1.1 pp |
| Tiago Gabriel | Lecce - Bologna | COMMON | 0 | 0.6 pp | 0.3 pp | 0.1 pp | 3.2 pp | 0.7 pp |
| Paulo Dybala | Como - Roma | COMMON | 0 | 0.8 pp | 2.1 pp | 2.9 pp | 3.1 pp | 2.9 pp |
| Gustav Isaksen | Lazio - Monza | COMMON | 0 | -2.0 pp | -3.0 pp | -2.3 pp | -1.1 pp | -0.7 pp |
| Joël Monteiro | Lecce - Bologna | COMMON | 0 | 0.0 pp | 0.0 pp | 0.0 pp | 2.9 pp | 1.6 pp |
| Kenneth Taylor | Lazio - Monza | COMMON | 0 | -2.5 pp | -2.9 pp | -1.7 pp | -1.4 pp | -0.5 pp |
| Nuno Tavares | Lazio - Monza | COMMON | 0 | -2.5 pp | -2.6 pp | -1.3 pp | -0.8 pp | -0.2 pp |
| Armand Laurienté | Sassuolo - Milan | COMMON | 0 | -0.3 pp | -1.1 pp | -1.8 pp | -2.4 pp | -2.6 pp |
| Domenico Berardi | Sassuolo - Milan | COMMON | 0 | -0.9 pp | -1.6 pp | -1.3 pp | -2.5 pp | -2.2 pp |
| Youssef Maleh | Lecce - Bologna | COMMON | 0 | 0.3 pp | 0.3 pp | 0.2 pp | 2.2 pp | 0.7 pp |
| Sebastiano Esposito | Sassuolo - Milan | COMMON | 0 | -1.5 pp | -2.1 pp | -1.4 pp | -1.9 pp | -0.8 pp |
| Nico Paz | Como - Roma | COMMON | 0 | -0.0 pp | -0.2 pp | -0.4 pp | -1.4 pp | -2.0 pp |
| Wesley | Como - Roma | COMMON | 0 | 2.0 pp | 1.4 pp | 0.5 pp | 1.5 pp | 0.4 pp |
| Reda Belahyane | Lazio - Monza | COMMON | 0 | -1.9 pp | -1.4 pp | -0.5 pp | -0.8 pp | -0.2 pp |
| Oliver Provstgaard | Lazio - Monza | COMMON | 0 | -1.9 pp | -0.8 pp | -0.2 pp | -0.9 pp | -0.1 pp |
| Kristian Thorstvedt | Sassuolo - Milan | COMMON | 0 | -0.8 pp | -1.1 pp | -0.7 pp | -1.9 pp | -0.8 pp |
| Martin Baturina | Como - Roma | COMMON | 0 | -0.3 pp | -0.3 pp | -0.2 pp | -1.9 pp | -0.9 pp |
| Ivan Ilic | Lecce - Bologna | COMMON | 0 | 0.0 pp | 0.0 pp | 0.0 pp | 1.7 pp | 0.3 pp |
| Manu Koné | Como - Roma | COMMON | 0 | 1.7 pp | 1.5 pp | 0.7 pp | 1.5 pp | 0.5 pp |
| Nahuel Molina | Como - Roma | COMMON | 0 | 1.5 pp | 1.0 pp | 0.3 pp | 1.6 pp | 0.3 pp |
| Josh Doig | Sassuolo - Milan | COMMON | 0 | -1.0 pp | -0.7 pp | -0.3 pp | -1.6 pp | -0.3 pp |

## Riepilogo finale selezioni

| Partita | Giocatore | Squadra | Mercato | P V2 | Quota Sisal | Min | Compatibilità | Affidabilità |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genoa - Fiorentina | Franco Mastantuono | Fiorentina | 2+ tiri | 81.5% | N/D | 75 | NO_COMPATIBLE_QUOTE | MEDIA |
| Genoa - Fiorentina | Milutin Osmajić | Genoa | 1+ SOT | 65.7% | 1.44 | 71.2 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Genoa - Fiorentina | Tommaso Baldanzi | Genoa | 1+ tiri | 90.9% | 1.05 | 66.2 | INCOMPATIBLE_DUO_TARGET | MEDIA |
| Inter - Parma | Marcus Thuram | Inter | 2+ tiri | 87.7% | N/D | 60.9 | NO_COMPATIBLE_QUOTE | MEDIA |
| Inter - Parma | El Bilal Touré | Parma | 1+ SOT | 57.3% | 2 | 75.3 | INCOMPATIBLE_DUO_TARGET | MEDIA |
| Inter - Parma | Federico Dimarco | Inter | 1+ tiri | 88.0% | N/D | 71.3 | NO_COMPATIBLE_QUOTE | ALTA |
| Napoli - Frosinone | Rasmus Højlund | Napoli | 2+ tiri | 71.5% | N/D | 74.3 | NO_COMPATIBLE_QUOTE | ALTA |
| Napoli - Frosinone | Giorgi Kvernadze | Frosinone | 1+ SOT | 49.3% | 1.65 | 84.3 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Napoli - Frosinone | Kevin De Bruyne | Napoli | 1+ tiri | 84.0% | N/D | 67.5 | NO_COMPATIBLE_QUOTE | MEDIA |
| Como - Roma | Nico Paz | Como | 2+ tiri | 94.9% | N/D | 83.1 | NO_COMPATIBLE_QUOTE | ALTA |
| Como - Roma | Donyell Malen | Roma | 1+ SOT | 78.6% | 1.16 | 70.9 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Como - Roma | Martin Baturina | Como | 1+ tiri | 74.6% | 1.05 | 59 | INCOMPATIBLE_DUO_TARGET | BASSA |
| Lazio - Monza | Gustavo Varela | Monza | 2+ tiri | 73.1% | N/D | 73.3 | NO_COMPATIBLE_QUOTE | ALTA |
| Lazio - Monza | Mattia Zaccagni | Lazio | 1+ SOT | 61.7% | 1.4 | 87 | INCOMPATIBLE_DUO_TARGET | MEDIA |
| Lazio - Monza | Michael Folorunsho | Monza | 1+ tiri | 80.4% | 1.25 | 72.4 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Lecce - Bologna | Federico Bernardeschi | Bologna | 2+ tiri | 75.0% | N/D | 74.3 | NO_COMPATIBLE_QUOTE | MEDIA |
| Lecce - Bologna | Roberto Piccoli | Bologna | 1+ SOT | 51.8% | 1.33 | 73.2 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Lecce - Bologna | Lassana Coulibaly | Lecce | 1+ tiri | 78.1% | 1.5 | 88.3 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Sassuolo - Milan | Gonçalo Ramos | Milan | 2+ tiri | 87.3% | N/D | 84.7 | NO_COMPATIBLE_QUOTE | ALTA |
| Sassuolo - Milan | Armand Laurienté | Sassuolo | 1+ SOT | 64.3% | 1.5 | 86.4 | INCOMPATIBLE_DUO_TARGET | MEDIA |
| Sassuolo - Milan | Adrien Rabiot | Milan | 1+ tiri | 75.8% | 1.08 | 72.5 | INCOMPATIBLE_DUO_TARGET | MEDIA |
| Cagliari - Juventus | Paul Mendy | Cagliari | 2+ tiri | 75.5% | N/D | 71 | NO_COMPATIBLE_QUOTE | MEDIA |
| Cagliari - Juventus | Douglas Luiz | Juventus | 1+ SOT | 52.3% | 2.4 | 80 | INCOMPATIBLE_DUO_TARGET | BASSA |
| Cagliari - Juventus | Alessandro Romano | Cagliari | 1+ tiri | 84.0% | 1.4 | 87.3 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Atalanta - Venezia | Gianluca Scamacca | Atalanta | 2+ tiri | 85.0% | N/D | 59 | NO_COMPATIBLE_QUOTE | BASSA |
| Atalanta - Venezia | Akor Adams | Venezia | 1+ SOT | 69.0% | 1.4 | 82.5 | INCOMPATIBLE_DUO_TARGET | ALTA |
| Atalanta - Venezia | Rowe | Atalanta | 1+ tiri | 90.3% | N/D | 58 | NO_COMPATIBLE_QUOTE | MEDIA |
| Torino - Udinese | Giovanni Simeone | Torino | 2+ tiri | 79.3% | N/D | 73.6 | NO_COMPATIBLE_QUOTE | ALTA |
| Torino - Udinese | Jurgen Ekkelenkamp | Udinese | 1+ SOT | 57.3% | 1.65 | 84.4 | INCOMPATIBLE_DUO_TARGET | BASSA |
| Torino - Udinese | Mandragora | Torino | 1+ tiri | 85.3% | N/D | 66.9 | NO_COMPATIBLE_QUOTE | MEDIA |

## Verifiche e integrità

| Controllo | Esito | Evidenza |
| --- | --- | --- |
| Matching probabili | PASS | 450/450 collegati; unmatched 0 |
| Expected Minutes | PASS | 200 valori finiti in [0,90] |
| Probabilità | PASS | 1+/2+/3+ tiri e 1+/2+ SOT in [0,1], monotone |
| No leakage | PASS | matchdayExclusive=6, completedOnly=true, output antecedente ai kick-off |
| Configurazione modello | PASS | versioni, pesi, formula Player Market e Team Profile invariati vs HEAD |
| Snapshot Player | PASS | 8220ac19326a66e251784359b3abae290bbdb3d6c7efc6f1ba4b97d7e345bb58 |
| Snapshot exact-score | PASS | ffc2fd59a7dbe7bc99de2af98218891a158f889b3ef2ab95b63d71ef8859a898 |
| Card V2 / Champions | PASS | hash aggregati invariati durante la generazione |

## Stato finale

LATEST LINEUPS: IMPORTED

MD6 OPERATIONAL PREDICTIONS: UPDATED

MATCHES ANALYZED: 10/10

PLAYERS ANALYZED: 200

SISAL MATCHING: PARTIAL

IMMUTABLE PLAYER SNAPSHOTS: UNCHANGED

EXACT-SCORE SNAPSHOTS: UNCHANGED

PRODUCTION INTEGRITY: PASS

READY FOR MATCH ANALYSIS: YES
