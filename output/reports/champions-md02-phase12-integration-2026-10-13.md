# Integrazione Fase 12 — UEFA MD2 + quote Sisal

Generato: 2026-10-13T18:11:50.498Z

## Esito

- Copertura partite: **18/18**; XI complete: **18/18**; formazioni ufficiali applicate: **9/18**.
- Titolari correnti: **381/396** associati a ID canonico; **15** non risolti.
- Overlay identità MD2: **17** record additivi verificati; nessuna rosa UEFA congelata è stata riscritta.
- Pronostici squadra: **17/18** con volumi dettagliati; risultato/goal e relative quote disponibili **18/18**.
- Disponibilità UEFA: **99 indisponibili**, **3 squalificati**, **22 in dubbio**; 70/124 associati.
- Quote: snapshot Sisal **18/18** eventi; **28109** mercati giocatore e **92818** selezioni indicizzate.
- Selezioni aperte con quota > 1 e selezionabili nell'interfaccia: **50399**; anche con identità canonica giocatore completa: **47300**.
- Selezioni giocatore matematicamente valutabili: **0**. Probabilità ed EV restano N/D senza impedire l'uso della quota provider valida.

## Identità recuperate

- Manchester United: **Leny Yoro** → `manchester-united:leny-yoro` · UEFA 250165232 · Sisal 624495.
- Manchester United: **Kobbie Mainoo** → `manchester-united:kobbie-mainoo` · UEFA 250165175 · Sisal 657475.
- Club Brugge: **Kyriani Sabbe** → `club-brugge:kyriani-sabbe` · UEFA 250138985 · Sisal 655509.
- Club Brugge: **Jorne Spileers** → `club-brugge:jorne-spileers` · UEFA 250153677 · Sisal 654688.
- Club Brugge: **Joaquin Seys** → `club-brugge:joaquin-seys` · UEFA 250163786 · Sisal 763543.
- Leipzig: **Antonio Nusa** → `leipzig:antonio-nusa` · UEFA 250163400 · Sisal 568229.
- Leipzig: **Assan Ouédraogo** → `leipzig:assan-ouedraogo` · UEFA 250170137.
- PSV Eindhoven: **Noah Fernandez** → `psv-eindhoven:noah-fernandez` · UEFA 250192037 · Sisal 922336.
- Viking: **Henrik Rorvik Bjordal** → `viking:henrik-rorvik-bjordal` · UEFA 250065289 · Sisal 1042204.
- Viking: **Erik Botheim** → `viking:erik-botheim` · UEFA 250102068 · Sisal 169942.
- Liverpool: **Rio Ngumoha** → `liverpool:rio-ngumoha` · UEFA 250195782 · Sisal 1052828.
- Liverpool: **Federico Chiesa** → `liverpool:federico-chiesa` · UEFA ID N/D.
- Liverpool: **Lewis Koumas** → `liverpool:lewis-koumas` · UEFA 250164834 · Sisal 806682.
- Borussia Dortmund: **Kouakou Gadou** → `borussia-dortmund:kouakou-gadou` · UEFA ID N/D · Sisal 1078294.
- Borussia Dortmund: **Joey Veerman** → `borussia-dortmund:joey-veerman` · UEFA 250105890 · Sisal 245502.
- Aston Villa: **George Hemmings** → `aston-villa:george-hemmings` · UEFA 250199792 · Sisal 1022470.
- Shakhtar Donetsk: **Eguinaldo** → `shakhtar-donetsk:eguinaldo` · UEFA ID N/D.
- Viking: **Haugen** resta nullo perché la fonte UEFA non indica l'iniziale e nello stesso evento esistono Herman Haugen e Kristoffer Haugen con ID Sisal distinti.

## Copertura per partita

| Partita | Titolari ID | Disponibilità | Mercati giocatore | Quote selezionabili | Stato |
|---|---:|---:|---:|---:|---|
| Lens–Sporting CP | 21/22 | 6 | 1141 | 1689 | PARZIALE (1 ID) |
| Sabah–Slavia Praha | 22/22 | 9 | 1388 | 3110 | OK |
| Arsenal–Lille | 21/22 | 7 | 1255 | 1960 | PARZIALE (1 ID) |
| Atlético de Madrid–Manchester United | 21/22 | 8 | 1315 | 1999 | PARZIALE (1 ID) |
| Inter–Club Brugge | 20/22 | 3 | 2237 | 4034 | PARZIALE (2 ID) |
| Galatasaray–Barcelona | 16/22 | 11 | 1643 | 2921 | PARZIALE (6 ID) |
| Leipzig–PSV Eindhoven | 22/22 | 12 | 1011 | 1823 | OK |
| Viking–Bayern München | 19/22 | 8 | 1858 | 3412 | PARZIALE (3 ID) |
| Villarreal–Napoli | 21/22 | 9 | 1665 | 2777 | PARZIALE (1 ID) |
| Feyenoord–Como | 22/22 | 9 | 2075 | 3750 | OK |
| LASK–Liverpool | 22/22 | 8 | 1118 | 1820 | OK |
| Roma–Real Madrid | 22/22 | 6 | 2238 | 3999 | OK |
| Aston Villa–Fenerbahçe | 22/22 | 5 | 1156 | 1758 | OK |
| Shakhtar Donetsk–AEK Athens | 22/22 | 5 | 1484 | 3206 | OK |
| Bodø/Glimt–Borussia Dortmund | 22/22 | 6 | 1752 | 3269 | OK |
| Manchester City–Paris Saint-Germain | 22/22 | 1 | 1483 | 2302 | OK |
| Real Betis–Porto | 22/22 | 5 | 1919 | 3559 | OK |
| Slovan Bratislava–Stuttgart | 22/22 | 6 | 1371 | 3011 | OK |

## Minuti e modello

L'esposizione esistente del modello è applicata ai probabili titolari UEFA: 84,6 minuti ai giocatori di movimento (0,94 × 90) e 90 ai portieri. Nessuna riduzione arbitraria è applicata ai giocatori in dubbio. I volumi squadra e la riconciliazione matematica restano invariati.

## Partita senza volumi dettagliati

- **Sabah–Slavia Praha** (ucl-2026-27-md02-02): solo pronostico risultato/gol. Sabah dispone di un solo incontro completo nel fallback UEFA, nessuna gara interna e un solo campione esterno; non supera la soglia esistente di 6 gare complessive e almeno 2 casa/2 trasferta. Slavia Praha è coperta, ma il gate richiede entrambi i profili.

## Compatibilità mercati Sisal

- BLOCKED_BOTH_HALVES_CONTRACT_NOT_MODELLED: 1151 mercati, 2302 selezioni.
- BLOCKED_FIRST_HALF_SPLIT_NOT_MODELLED: 2854 mercati, 5708 selezioni.
- NOT_MODELLED: 7051 mercati, 14102 selezioni.
- REFERENCE_ONLY_DUO_REPLACEMENT_AND_WOODWORK_NOT_MODELLED: 1796 mercati, 3592 selezioni.
- REFERENCE_ONLY_DUO_REPLACEMENT_NOT_MODELLED: 2926 mercati, 5852 selezioni.
- REFERENCE_ONLY_MULTI_PLAYER_DUO_NOT_MODELLED: 498 mercati, 996 selezioni.
- REFERENCE_ONLY_REPLACEMENT_AND_WOODWORK_NOT_MODELLED: 810 mercati, 1620 selezioni.
- REFERENCE_ONLY_REPLACEMENT_NOT_MODELLED: 11023 mercati, 58646 selezioni.

I mercati 28507 includono il sostituto; i 28506 e gli altri contratti che lo dichiarano (per esempio 28090) includono anche pali/traverse. I mercati del primo tempo e quelli che richiedono esito in entrambi i tempi non sono confrontabili con il modello individuale full-match. Quote, quoteRaw, soglie, ID, stato e modificatori originali restano invariati nell'artefatto e nello snapshot autorevole.

## Blocchi

- Titolare non risolto: Sporting CP — Joao Simoes.
- Titolare non risolto: Arsenal — Lewis-Skelly.
- Titolare non risolto: Manchester United — Martinez Li..
- Titolare non risolto: Inter — Martinez J..
- Titolare non risolto: Inter — Martinez L..
- Titolare non risolto: Galatasaray — Cakir.
- Titolare non risolto: Galatasaray — Yilmaz.
- Titolare non risolto: Galatasaray — Elmali.
- Titolare non risolto: Galatasaray — Akgun.
- Titolare non risolto: Barcelona — Garcia J..
- Titolare non risolto: Barcelona — Garcia E..
- Titolare non risolto: Viking — Haugen.
- Titolare non risolto: Bayern München — Kim Min-Jae.
- Titolare non risolto: Bayern München — Karl.
- Titolare non risolto: Napoli — Giovane.
- Disponibilità non risolta: Arsenal — Hincapie P. (unavailable).
- Disponibilità non risolta: Arsenal — Saliba W. (unavailable).
- Disponibilità non risolta: Arsenal — Tzolis C. (unavailable).
- Disponibilità non risolta: Arsenal — Zubimendi M. (unavailable).
- Disponibilità non risolta: Lille — Igamane H. (unavailable).
- Disponibilità non risolta: Lille — Mbappe E. (unavailable).
- Disponibilità non risolta: Lille — Santos T. (unavailable).
- Disponibilità non risolta: Manchester United — Dorgu P. (unavailable).
- Disponibilità non risolta: Manchester United — Heaton T. (unavailable).
- Disponibilità non risolta: Manchester United — Mazraoui N. (unavailable).
- Disponibilità non risolta: Manchester United — Sesko B. (unavailable).
- Disponibilità non risolta: Manchester United — Shaw L. (unavailable).
- Disponibilità non risolta: Manchester United — Ugarte M. (unavailable).
- Disponibilità non risolta: Inter — Jones C. (unavailable).
- Disponibilità non risolta: Inter — Stones J. (unavailable).
- Disponibilità non risolta: Club Brugge — Ordonez J. (unavailable).
- Disponibilità non risolta: Galatasaray — Aydin E. (unavailable).
- Disponibilità non risolta: Galatasaray — Ayhan K. (unavailable).
- Disponibilità non risolta: Galatasaray — Guner A. (unavailable).
- Disponibilità non risolta: Galatasaray — Karatas K. (unavailable).
- Disponibilità non risolta: Galatasaray — Singo W. (unavailable).
- Disponibilità non risolta: Galatasaray — Unyay A. (unavailable).
- Disponibilità non risolta: Galatasaray — Yilmaz A. (unavailable).
- Disponibilità non risolta: Barcelona — Bardghji R. (unavailable).
- Disponibilità non risolta: Barcelona — Christensen A. (unavailable).
- Disponibilità non risolta: Barcelona — de Jong F. (unavailable).
- Disponibilità non risolta: Leipzig — Baumgartner C. (unavailable).
- Disponibilità non risolta: Leipzig — Guiu M. (unavailable).
- Disponibilità non risolta: Leipzig — Ouedraogo A. (unavailable).
- Disponibilità non risolta: Leipzig — Zingerle L. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Lammers S. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Nagalo A. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Ouaissa S. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Pepi R. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Plea A. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Schouten J. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Sildillia K. (unavailable).
- Disponibilità non risolta: PSV Eindhoven — Wanner P. (unavailable).
- Disponibilità non risolta: Viking — Baertelsen A. (unavailable).
- Disponibilità non risolta: Viking — Berisha V. (unavailable).
- Disponibilità non risolta: Viking — Bjorshol S. (unavailable).
- Disponibilità non risolta: Viking — D'Agostino N. (unavailable).
- Disponibilità non risolta: Viking — Frimpong K. (unavailable).
- Disponibilità non risolta: Viking — Roseth M. (unavailable).
- Disponibilità non risolta: Bayern München — Buchmann T. (unavailable).
- Disponibilità non risolta: Bayern München — Musiala J. (unavailable).
- Disponibilità non risolta: Villarreal — Buchanan T. (unavailable).
- Disponibilità non risolta: Villarreal — Pepe N. (unavailable).
- Disponibilità non risolta: Napoli — Anguissa F. (unavailable).
- Disponibilità non risolta: Napoli — Buongiorno A. (unavailable).
- Disponibilità non risolta: Napoli — Favasuli C. (unavailable).
- Disponibilità non risolta: Napoli — Marianucci L. (unavailable).
- Disponibilità non risolta: Napoli — Olivera M. (unavailable).
- Disponibilità non risolta: Napoli — Vergara A. (unavailable).
- Le probabilità evento e gli EV dei mercati giocatore restano N/D/null per incompatibilità contrattuale.

## Sincronizzazione e integrità

Lettura e schedina condividono `fixtureId`, `providerEventId`, `providerMarketId`, `providerSelectionId` e `selectionId` per tutte le 18 gare. Una quota valida è selezionabile anche con probabilità/EV N/D; la compatibilità matematica resta un campo separato e non viene aggirata. Nessuno snapshot congelato è stato creato o sovrascritto; il builder non legge né scrive dati Serie A.

- Probabili UEFA SHA-256: `83AEE4C3049B20BAA900E67E54A16FA25FEE3960906EB178085B11782D56F289`
- Quote Sisal normalizzate SHA-256: `2969A579C55F3748FA8712BD83374E86239163518204ED7FAFCBDAC7C03FA4FB`
- Quote Sisal raw SHA-256: `4F4D59E24F0CA81D224344C8D5533668D63FD2F5C13CDD82C1E7F3B96E472BF0`
- Timestamp quote: `2026-10-13T09:55:14.800Z`
