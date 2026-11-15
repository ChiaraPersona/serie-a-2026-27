# Elo iniziale stimato per squadre con poco storico europeo

Attivazione sperimentale richiesta il 14 novembre 2026. Regola uniforme per
qualsiasi squadra con meno di sei precedenti nel registro europeo, non una
correzione nominativa per Como, Viking o Sabah. Quote, contratti, soglie di
approvazione, liquidazioni e probabilità DUO non cambiano.

## Componenti e collegamento

Il rendimento domestico è ricostruito dai risultati dei calendari acquisiti:
punti per gara e differenza reti per gara, standardizzati rispetto alle squadre
dello stesso campionato e limitati a due deviazioni standard in valore assoluto.
Servono almeno quattro gare della squadra e almeno quattro club confrontabili.
La posizione registrata è l'ordine per punti/gara, non la classifica ufficiale
con tutti gli spareggi, recuperi o eventuali penalizzazioni. Non corregge ancora
la forza dei singoli avversari domestici. Le stagioni ad anno solare rimangono
distinte da quelle europee; i dati non vengono sommati attraverso le stagioni.

La forza relativa del campionato usa la media Elo degli altri club della stessa
associazione con almeno sei gare europee. È un ranking dei rappresentanti
europei osservati, non il coefficiente UEFA ufficiale né una misura completa
del campionato. Si esclude il club da stimare. Sono presenti nove rappresentanti
per l'Italia, tre per la Norvegia e uno per l'Azerbaigian: il limite di copertura
azero resta esplicito e non viene nascosto dietro un dato stimato.

Il confronto storico ha selezionato:

`Elo iniziale = 1500 + delta medio campionato + 50 × z(PPG) + 100 × z(DR/gara)`

Per n < 6 precedenti europei:

`Elo stimato = Elo europeo grezzo + (Elo iniziale − 1500) × (6 − n) / 6`

A sei gare il correttivo si annulla e si usa l'Elo europeo ordinario. I risultati
Champions entrano una volta sola nel normale aggiornamento Elo: la posizione
Champions non viene aggiunta come ulteriore componente. I risultati passati
e i rating degli avversari non vengono ricalcolati con informazioni future.

Il nuovo criterio di disponibilità richiede ID canonici esatti, rendimento
domestico sufficiente, confronto di campionato e almeno un altro club europeo
osservato nell'associazione. Dove manca una componente, l'1X2 resta N/D. Non
viene semplicemente abbassata la vecchia soglia delle sei gare.

Il rating stimato alimenta lo stesso collegamento della Lettura europea: 1X2,
distribuzione dei punteggi, gol attesi, volumi offensivi, xGOT e allocazione
individuale quando esistono XI specifiche. L'interfaccia mostra il rating e
«Elo iniziale stimato · incertezza alta». La confidenza numerica resta N/D per
queste gare: non esiste una calibrazione della sua incertezza.

## Confronto storico e limiti

Griglia deterministica di 27 combinazioni, con pesi paese 0/0,5/1 e scale
domestiche 0/50/100. La selezione usa soltanto 47 gare del 2024/25 con uno o
entrambi i club sotto le sei presenze, identità esatte e dati sufficienti.
Log loss sul campione di scelta: 1,000210 → 0,937016; Brier 0,594821 → 0,546888.
Questo miglioramento è sul campione usato per scegliere i pesi.

Nella copertura disponibile non risultano casi reali sufficientemente documentati
di nuovi ingressi nel 2025/26 per un confronto separato. Sono quindi riportate
separatamente 207 simulazioni di azzeramento dello storico di club già affermati,
relative a 132 fixture uniche: log loss 0,982885 → 0,975233 e Brier
0,589105 → 0,582354. Le simulazioni sono dipendenti e non sono 207 gare indipendenti
né esordienti reali. Non hanno selezionato i pesi.

Gli archivi sono stati acquisiti retrospettivamente: i risultati usati precedono
la partita simulata, ma non si dimostra che fossero acquisiti a quella data.
Il 2025/26 è inoltre già stato esaminato in precedenti ricerche. Nessun PASS
statistico, nessuna validazione indipendente dichiarata: serve osservazione
prospettica. La stima operativa corrente rispetta anche i timestamp di acquisizione.

## File e verifiche

- Acquisizioni aggiuntive: `data/raw/champions-elo-prior/2026-11-14/`.
- Proiezione risultati e identità: `data/normalized/champions-elo-prior-domestic.json`.
- Modello congelato: `data/normalized/champions-elo-initial-prior-model.json`.
- Protocollo, selezione, coorti e report: `data/analysis/champions/elo-initial-prior-2026-11-14/`.
- Builder: `scripts/build-champions-elo-prior-data.cjs`; selezione esplicita:
  `scripts/research/fit-champions-elo-prior.cjs`. Il normale build del sito non
  acquisisce calendari e non seleziona nuovamente i pesi.
- Test: `scripts/test-champions-elo-initial-prior.cjs` e suite Lettura europea.

Gare concluse, cataloghi operativi e contratti sono verificati contro lo snapshot
prima dell'attivazione. Gli altri sessanta scenari, già coperti da Elo ordinario,
mantengono gli stessi valori previsionali.
