# Integrazione Fase 12 — UEFA MD2 + quote Sisal

Generato: 2026-10-13T10:32:09.596Z

## Esito

- Copertura partite: **18/18**; probabili XI complete: **18/18**.
- Probabili titolari: **382/396** associati a ID canonico; **14** non risolti.
- Dei 14 titolari senza ID canonico interno, **12** hanno evidenza identificativa esterna UEFA ma restano null finché il registro canonico non viene aggiornato.
- Pronostici squadra: **17/18** con volumi dettagliati; risultato/goal e relative quote disponibili **18/18**.
- Disponibilità UEFA: **75 indisponibili**, **4 squalificati**, **30 in dubbio**; 105/109 associati.
- Quote: snapshot Sisal **18/18** eventi; **28109** mercati giocatore e **92818** selezioni indicizzate.
- Selezioni aperte con quota > 1: **50399**; anche con identità giocatore risolta: **46462**.
- Selezioni giocatore utilizzabili per probabilità/EV: **0**. Sono mantenute come riferimento provider, senza inventare probabilità.

## Copertura per partita

| Partita | Titolari ID | Disponibilità | Mercati giocatore | Quote aperte collegate | Stato |
|---|---:|---:|---:|---:|---|
| Lens–Sporting CP | 22/22 | 6 | 1141 | 1620 | OK |
| Sabah–Slavia Praha | 22/22 | 9 | 1388 | 2530 | OK |
| Arsenal–Lille | 22/22 | 8 | 1255 | 1871 | OK |
| Atlético de Madrid–Manchester United | 21/22 | 8 | 1315 | 1999 | PARZIALE (1 ID) |
| Inter–Club Brugge | 19/22 | 4 | 2237 | 3310 | PARZIALE (3 ID) |
| Galatasaray–Barcelona | 22/22 | 4 | 1643 | 2659 | OK |
| Leipzig–PSV Eindhoven | 20/22 | 8 | 1011 | 1600 | PARZIALE (2 ID) |
| Viking–Bayern München | 19/22 | 7 | 1858 | 3058 | PARZIALE (3 ID) |
| Villarreal–Napoli | 22/22 | 4 | 1665 | 2692 | OK |
| Feyenoord–Como | 22/22 | 9 | 2075 | 3572 | OK |
| LASK–Liverpool | 19/22 | 8 | 1118 | 1650 | PARZIALE (3 ID) |
| Roma–Real Madrid | 22/22 | 6 | 2238 | 3995 | OK |
| Aston Villa–Fenerbahçe | 22/22 | 5 | 1156 | 1758 | OK |
| Shakhtar Donetsk–AEK Athens | 22/22 | 5 | 1484 | 2765 | OK |
| Bodø/Glimt–Borussia Dortmund | 20/22 | 6 | 1752 | 2662 | PARZIALE (2 ID) |
| Manchester City–Paris Saint-Germain | 22/22 | 1 | 1483 | 2293 | OK |
| Real Betis–Porto | 22/22 | 5 | 1919 | 3417 | OK |
| Slovan Bratislava–Stuttgart | 22/22 | 6 | 1371 | 3011 | OK |

## Minuti e modello

L'esposizione esistente del modello è applicata ai probabili titolari UEFA: 84,6 minuti ai giocatori di movimento (0,94 × 90) e 90 ai portieri. Nessuna riduzione arbitraria è applicata ai giocatori in dubbio. I volumi squadra e la riconciliazione matematica restano invariati.

## Compatibilità mercati Sisal

- BLOCKED_BOTH_HALVES_CONTRACT_NOT_MODELLED: 1151 mercati, 2302 selezioni.
- BLOCKED_FIRST_HALF_SPLIT_NOT_MODELLED: 2854 mercati, 5708 selezioni.
- NOT_MODELLED: 7051 mercati, 14102 selezioni.
- REFERENCE_ONLY_DUO_REPLACEMENT_AND_WOODWORK_NOT_MODELLED: 1796 mercati, 3592 selezioni.
- REFERENCE_ONLY_DUO_REPLACEMENT_NOT_MODELLED: 2926 mercati, 5852 selezioni.
- REFERENCE_ONLY_MULTI_PLAYER_DUO_NOT_MODELLED: 498 mercati, 996 selezioni.
- REFERENCE_ONLY_REPLACEMENT_NOT_MODELLED: 11833 mercati, 60266 selezioni.

I mercati 28507 includono il sostituto; i 28506 includono sia il sostituto sia pali/traverse. I mercati del primo tempo e quelli che richiedono esito in entrambi i tempi non sono confrontabili con il modello individuale full-match. Quote, quoteRaw, soglie, ID, stato e modificatori originali restano invariati nell'artefatto e nello snapshot autorevole.

## Blocchi

- Titolare non risolto: Manchester United — Yoro.
- Titolare non risolto: Club Brugge — Sabbe.
- Titolare non risolto: Club Brugge — Spileers.
- Titolare non risolto: Club Brugge — Seys.
- Titolare non risolto: Leipzig — Nusa.
- Titolare non risolto: PSV Eindhoven — Fernandez.
- Titolare non risolto: Viking — Haugen.
- Titolare non risolto: Viking — Bjørdal.
- Titolare non risolto: Viking — Botheim.
- Titolare non risolto: Liverpool — Ngumoha.
- Titolare non risolto: Liverpool — Chiesa.
- Titolare non risolto: Liverpool — Koumas.
- Titolare non risolto: Borussia Dortmund — Gadou.
- Titolare non risolto: Borussia Dortmund — Veerman.
- Disponibilità non risolta: Manchester United — Mainoo (unavailable).
- Disponibilità non risolta: Leipzig — Ouédraogo (unavailable).
- Disponibilità non risolta: Aston Villa — Hemmings (doubt).
- Disponibilità non risolta: Shakhtar Donetsk — Eguinaldo (unavailable).
- Le probabilità evento e gli EV dei mercati giocatore restano N/D/null per incompatibilità contrattuale.

## Sincronizzazione e integrità

Lettura e schedina condividono `fixtureId` per tutte le 18 gare. La schedina è predisposta con gate fail-closed: può consumare soltanto mercati con contratto compatibile. Nessuno snapshot congelato è stato creato o sovrascritto; il builder non legge né scrive dati Serie A.

- Probabili UEFA SHA-256: `83AEE4C3049B20BAA900E67E54A16FA25FEE3960906EB178085B11782D56F289`
- Quote Sisal normalizzate SHA-256: `2969A579C55F3748FA8712BD83374E86239163518204ED7FAFCBDAC7C03FA4FB`
- Quote Sisal raw SHA-256: `4F4D59E24F0CA81D224344C8D5533668D63FD2F5C13CDD82C1E7F3B96E472BF0`
- Timestamp quote: `2026-10-13T09:55:14.800Z`
