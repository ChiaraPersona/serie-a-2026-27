# Integrazione Fase 12 — UEFA MD2 + quote Sisal

Generato: 2026-10-13T10:57:01.835Z

## Esito

- Copertura partite: **18/18**; probabili XI complete: **18/18**.
- Probabili titolari: **395/396** associati a ID canonico; **1** non risolti.
- Overlay identità MD2: **17** record additivi verificati; nessuna rosa UEFA congelata è stata riscritta.
- Pronostici squadra: **17/18** con volumi dettagliati; risultato/goal e relative quote disponibili **18/18**.
- Disponibilità UEFA: **75 indisponibili**, **4 squalificati**, **30 in dubbio**; 109/109 associati.
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
| Lens–Sporting CP | 22/22 | 6 | 1141 | 1689 | OK |
| Sabah–Slavia Praha | 22/22 | 9 | 1388 | 3110 | OK |
| Arsenal–Lille | 22/22 | 8 | 1255 | 1960 | OK |
| Atlético de Madrid–Manchester United | 22/22 | 8 | 1315 | 1999 | OK |
| Inter–Club Brugge | 22/22 | 4 | 2237 | 4034 | OK |
| Galatasaray–Barcelona | 22/22 | 4 | 1643 | 2921 | OK |
| Leipzig–PSV Eindhoven | 22/22 | 8 | 1011 | 1823 | OK |
| Viking–Bayern München | 21/22 | 7 | 1858 | 3412 | PARZIALE (1 ID) |
| Villarreal–Napoli | 22/22 | 4 | 1665 | 2777 | OK |
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

- Titolare non risolto: Viking — Haugen.
- Nessun blocco di identità nelle liste disponibilità.
- Le probabilità evento e gli EV dei mercati giocatore restano N/D/null per incompatibilità contrattuale.

## Sincronizzazione e integrità

Lettura e schedina condividono `fixtureId`, `providerEventId`, `providerMarketId`, `providerSelectionId` e `selectionId` per tutte le 18 gare. Una quota valida è selezionabile anche con probabilità/EV N/D; la compatibilità matematica resta un campo separato e non viene aggirata. Nessuno snapshot congelato è stato creato o sovrascritto; il builder non legge né scrive dati Serie A.

- Probabili UEFA SHA-256: `83AEE4C3049B20BAA900E67E54A16FA25FEE3960906EB178085B11782D56F289`
- Quote Sisal normalizzate SHA-256: `2969A579C55F3748FA8712BD83374E86239163518204ED7FAFCBDAC7C03FA4FB`
- Quote Sisal raw SHA-256: `4F4D59E24F0CA81D224344C8D5533668D63FD2F5C13CDD82C1E7F3B96E472BF0`
- Timestamp quote: `2026-10-13T09:55:14.800Z`

## Fase 12B — card Schedina seconda giornata

### Stato della card

- Card Champions MD2 presente una sola volta nell'archivio Schedine, accanto alla card Champions MD1 e prima delle card Serie A.
- Fronte coerente con MD1 (`CL2`, UEFA, palette Champions); retro predisposto per 18 partite, 18 pronostici, stato degli esiti e rendimento su puntata simulata di 1 € per selezione.
- Pagina di giornata: 18 pannelli partita in ordine cronologico, con collegamento diretto alla lettura tramite `fixtureId`.
- Desktop 1280 px e mobile 390 px verificati senza overflow orizzontale.

### Pronostici effettivamente pubblicati

- **18** pronostici squadra già presenti nelle letture MD2, uno per partita.
- **9** esiti finali 1X2 e **9** doppie chance a tempo pieno.
- **18/18** corrispondenze esatte con una selezione Sisal aperta e quotata; **18** selezioni cliccabili.
- Nessun mercato è stato trasformato in pronostico per la sola presenza della quota. Il catalogo completo dei mercati giocatore resta consultabile nelle letture e selezionabile con probabilità/EV N/D secondo la Fase 12.

La fonte autorevole della card è `champions-md02-integration-2026-27.json`: per ogni fixture il builder riusa senza ricalcolo `teamPrediction.verdict.outcome`, `teamPrediction.verdict.label` e `teamPrediction.verdict.probabilityPct`, quindi collega la selezione corrispondente nello snapshot Sisal normalizzato. La quota, `oddsRaw`, gli ID evento/mercato/selezione, lo stato e i modificatori provengono dal record provider originale.

### Sincronizzazione e MyCombo

- Lettura e card condividono `fixtureId` e lo stesso verdetto squadra; la card conserva inoltre `providerEventId`, `providerMarketId`, `providerSelectionId` e `selectionId` Sisal.
- Aggiunta, rimozione e persistenza dopo reload sono verificate sullo store condiviso `champions:2026-27:md02`.
- I modificatori del contratto bookmaker restano nel record persistito. I mercati giocatore con sostituto, DUO, pali/traverse o primo tempo non sono stati rimossi né alterati.

### Report sul retro

Alla data dello snapshot le 18 gare non hanno ancora un esito ufficiale: **0 vinte, 0 perse, 18 da verificare**. Puntato, ritorno, ROI e profitto/perdita restano N/D. Il builder applica verde/rosso e il calcolo economico soltanto agli esiti ufficialmente definiti; selezioni pending, void o non verificabili non vengono contate come perse.

### Casi incompleti preservati

- Viking — **Haugen** resta privo di identità canonica: nessuna associazione tra Herman Haugen e Kristoffer Haugen.
- Sabah–Slavia Praha mantiene `matchProjection: null` e volumi squadra dettagliati null; la card usa soltanto il verdetto risultato già generato e non modifica il motore.
- La card MD1, gli snapshot congelati e i dati/formule Serie A non sono stati modificati.

### Verifiche Fase 12B

- `scripts/test-champions-md02-schedina.mjs`: 18 fixture uniche, 18 pronostici unici, corrispondenza lettura/quote, integrità quote e ID, casi Haugen e Sabah–Slavia, aggiunta/rimozione/reload e modificatori.
- `scripts/test-champions-md02-integration.js`: 18/18, 395/396 titolari, 109/109 disponibilità, 28.109 mercati e 92.818 selezioni integre.
- `scripts/test-champions-md02-market-ui.mjs`: contratti Sisal con sostituto, DUO, pali/traverse, primo tempo e persistenza invariati.
- `scripts/test-champions-schedina-page.mjs`: card/pagina MD1 e 52 esiti storici invariati.
- `scripts/test-app-modules.mjs`: 9 pagine e 4 componenti condivisi; regressioni strutturali e palette Champions superate.
- `scripts/check-champions-md02-schedina-browser.cjs`: archivio, unicità card, 18 partite/pronostici, navigazione, MyCombo, reload, desktop/mobile, MD1 e Serie A MD6 superati.
