# xGOT: riconciliazione e confronto fuori campione

Verifica del 6 novembre 2026. Esito statistico: **uso operativo non approvato**.
Successiva attivazione sperimentale richiesta esplicitamente dall'utente:
[stato operativo](xgot-operational.md). L'esito del confronto rimane invariato.
Lo storico è ora collegato agli archivi storici di fixture e squadre. La
sperimentazione non dimostra un miglioramento abbastanza solido da attivare
xGOT nelle previsioni. Nessuna formula o peso del motore operativo è modificato.

## Riconciliazione dello storico

Tutte le 1.138 partite sono collegate univocamente: Serie A agli ID già presenti
in `data/normalized/referee-matches/<stagione>/serie-a.json`, Champions agli ID
UEFA in `data/normalized/uefa-europe-history-2023-26.json`. Namespace e stagione
rimangono espliciti. Non si tratta degli ID delle fixture correnti 2026/27.
Gli ID UEFA e i nomi storici esatti sono collegati tramite una crosswalk
esplicita; competizione, data e coppia di squadre devono individuare una sola
partita. Il risultato nei 90 minuti viene confrontato separatamente.

| Competizione | Stagione | Partite riconciliate statisticamente |
|---|---|---:|
| Serie A | 2024/25 | 225 |
| Serie A | 2025/26 | 230 |
| Champions | 2024/25 | 99 |
| Champions | 2025/26 | 111 |
| Totale | | 665 |

Le altre **473** sono in quarantena. Non sono eliminati i referti originali.
Si controllano conteggi tiri/SOT, unicità e range dei valori per tiro, ambito
dei 90 minuti, coerenza del punteggio e somma xGOT rispetto al totale squadra
pubblicato a due decimali, con tolleranza 0.005001. Non si allarga la tolleranza
per recuperare le partite discordanti. Supplementari e totali incompatibili
rimangono esclusi dalla serie riconciliata.

È stato corretto un errore del filtro iniziale: i salvataggi sulla linea sono
SOT, anche quando contrassegnati come blocco dell'ultimo difendente. Riferimento
interno: https://www.statsperform.com/opta-event-definitions/. Questo aggiorna
anche il piccolo archivio 2026/27, ora con 53 partite ammesse su 60 candidate.

Le identità individuali riusano soltanto player ID provider già collegati a ID
canonici nei database esistenti: 832 ID provider censiti, nessun conflitto tra
le mappature esistenti. Nei referti ammessi risultano 6.295 record con identità
canonica nota e 24.041 senza collegamento canonico; sono record di scheda, non
tutti presenze con minuti o xGOT disponibili. Non si inventano nuovi ID per
completare la copertura. Per i giocatori assenti dalle attuali anagrafiche resta
disponibile l'identità esterna FotMob, con stato canonico `unresolved`.

Sono inoltre isolati **44 valori individuali offensivi pubblicati** discordanti rispetto
alla somma degli eventi del giocatore. La relativa xGOT utilizzabile resta null;
questo non comporta una correzione del valore originale. Nessuno zero viene
dedotto per giocatori senza eventi e senza valore esplicito pubblicato.
Il precedente conteggio di 1.327 comprendeva valori di xGOT affrontato dai
portieri, erroneamente trattati dall'estrattore come xGOT offensivo. La correzione
non modifica nessuna delle previsioni del confronto v1, verificate identiche.
Le restanti lacune delle identità individuali restano visibili: il punto 2 non
certifica la completezza di ogni giocatore storico.

## Disegno del confronto

Protocollo in `docs/xgot-validation-protocol.json`, definito prima del calcolo
dei risultati. Il 2024/25 sceglie il peso tra 0, 5%, 10%, 20%, 30%; il 2025/26
è il test finale, senza ritoccare i pesi dopo aver visto il risultato.

Si richiama direttamente `predictScenario` del motore esistente. Il confronto
misura il **nucleo tecnico ricostruibile**, non riproduce i pronostici originali:
formazioni, matchup, obiettivi e H2H storici non coperti rimangono neutrali in
entrambi i modelli. Profili gol, tiri e forma recente sono ricostruiti soltanto
da risultati precedenti. La forma usa decadimento 0.82 e non la correzione per
avversario del contesto operativo completo. La finestra è di 550 giorni.
Serie A usa anche lo storico Understat con il peso del motore invariato: presente
in tutte le 355 previsioni del test. Champions mantiene l'xG pre-tiro disattivato,
come il percorso preliminare condiviso privo di xG comparabili.

La variante sperimentale miscela geometricamente i gol attesi di base con una
proiezione derivata dallo storico xGOT di attacco e difesa. Quest'ultima regredisce
i tassi verso la media della competizione con 8 partite di prior. Entrambe le
squadre devono avere almeno 6 gare di storico xGOT e almeno 2 per ciascuna sede.
Le competizioni sono separate: non si importano dati domestici parziali di alcune
sole squadre nella stima Champions.

Ogni previsione esclude la partita da prevedere, quelle successive e tutte le
partite dello stesso giorno UTC. La valutazione usa tutte le fixture dei 90
minuti con identità risolta e storico sufficiente, anche quando l'xGOT della
partita bersaglio è in quarantena. Questo evita di scegliere le partite del
test in base alla qualità dell'xGOT osservato dopo la gara. La selezione dei
precedenti affidabili può comunque rendere il campione non rappresentativo.

## Risultati sul test 2025/26

Valori più bassi sono migliori. Brier multiclass è la somma sui tre esiti;
ECE è la media delle discrepanze in 10 intervalli sulle probabilità 1X2.

| Misura | Serie A | Champions |
|---|---:|---:|
| Gare di sviluppo utilizzabili | 318 | 8 |
| Gare del test utilizzabili | 355 | 63 |
| Peso sperimentale scelto sullo sviluppo | 10% | 30% |
| Log loss 1X2 base | 1.005777 | 1.016741 |
| Log loss 1X2 con xGOT | 1.004498 | 1.016319 |
| Delta log loss | -0.001280 | -0.000421 |
| IC 95% del delta | [-0.003080, +0.000652] | [-0.020121, +0.018866] |
| Brier base / xGOT | 0.600519 / 0.599822 | 0.611767 / 0.610389 |
| ECE base / xGOT | 0.032048 / 0.033636 | 0.024255 / 0.034708 |

L'incertezza è stimata con 2.000 bootstrap appaiati su blocchi settimanali UTC:
36 blocchi in Serie A, 16 in Champions. Non è una garanzia di indipendenza tra
blocchi o di generalizzazione a nuove stagioni.

**Serie A:** il piccolo miglioramento medio, circa 0.13% della log loss di base,
non è separabile da zero con questo intervallo. **Champions:** intervallo molto
ampio, campioni inferiori alle soglie del protocollo (50 sviluppo, 100 test),
calibrazione peggiorata oltre il margine previsto. Il peso del 30% non è un peso
approvato: è soltanto il minimo osservato su 8 gare di sviluppo.

Sono riportate anche log loss di Over 2.5 e Gol/Gol come diagnostica secondaria
nel JSON. Non certificano quei mercati. Il confronto non valuta tiri/SOT futuri,
marcatori, cartellini, DUO, fair odds, EV, liquidazioni o rendimento delle selezioni.

## Limiti e decisione

Nessuna competizione supera tutti i criteri esplorativi del protocollo. Non si
promuove xGOT nel motore, neppure con un piccolo peso scelto arbitrariamente.
Le soglie esplorative non sostituiscono criteri di approvazione operativi già
esistenti. `predictiveUseApproved` rimane false.

I referti sono stati acquisiti dopo le gare: il controllo cronologico impedisce
di usare risultati futuri, ma non può escludere revisioni retroattive del provider
o ricostruire l'esatta disponibilità storica dei valori. La versione del modello
provider è sconosciuta. Mancano inoltre il replay del contesto produttivo completo
e una validazione prospettica con input/previsioni congelati prima del calcio
d'inizio. Questi limiti impedirebbero comunque un'approvazione operativa automatica.

## Riproducibilità

- `node scripts/xgot-validation.cjs`: ricrea storico riconciliato e registri; sola
  lettura dei dati di origine, scrive i due file indicati sotto.
- `node scripts/research/xgot/run.cjs`: ricrea report e previsioni di test;
  non accede alla rete e non esegue builder operativi.
- `node scripts/test-xgot-validation.cjs`: controlli in sola lettura su hash,
  identità, quarantena, campi null, test separato e mutazione dei dati futuri.

Evidenze: `data/normalized/xgot-reconciled-history.json`,
`data/analysis/xgot/reconciliation.json`,
`data/analysis/xgot/validation/report.json`,
`data/analysis/xgot/validation/held-out-predictions.json`.

Sviluppi successivi, nuova diagnosi, storico esteso e catture prospettiche sono
documentati in [xgot-v2-progress.md](xgot-v2-progress.md). Il confronto v1 rimane
separato e non viene presentato come una nuova verifica indipendente.
