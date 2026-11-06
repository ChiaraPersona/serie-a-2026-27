# xGOT v2: dati, ricerca e confronto prospettico

Aggiornamento del 6 novembre 2026. Nessuna attivazione nel motore operativo.

## Diagnosi delle 473 partite escluse

In 453 casi il totale xGOT squadra è corroborato dall'xGOT affrontato dal singolo
portiere avversario effettivamente sceso in campo. Il confronto mantiene la
tolleranza 0.005001; i portieri non utilizzati non entrano nella verifica.
La somma dei tiri resta discordante o non completamente riconciliata: queste
partite **non diventano verificate tiro per tiro**. Le altre 20 rimangono escluse.

Sono distinti due livelli di evidenza: `shot-reconciled` e
`aggregate-keeper-corroborated`. Il secondo corrobora soltanto il dato aggregato
all'interno dello stesso provider. Non è una conferma indipendente: i due campi
possono derivare dallo stesso backend. Non dimostra che la discordanza della
shotmap dipenda da revisioni o versioni diverse del modello; la causa precisa
rimane irrisolta. Nessuna soglia viene allargata e i referti non sono corretti.
Questi dati non possono alimentare previsioni giocatore o DUO.

È stato corretto anche l'estrattore individuale: le chiavi esatte dell'xGOT
offensivo sono separate da `expected_goals_on_target_faced`. Nelle due stagioni
originarie risultano 7.519 valori offensivi, anziché 9.750; i 2.231 valori dei
portieri sono conservati separatamente. Le discordanze individuali offensive
nel campione stretto scendono da 1.327 a 44. Nessuna previsione v1 cambia: le
previsioni precedenti sono conservate in `validation-v1-frozen` e confrontate
esattamente con quelle rigenerate.

## Storico esteso

Acquisiti **5.103 referti aggiuntivi**, con zero errori di download:

- Serie A 2023/24: 380 gare; xGOT squadra presente in 364.
- Champions 2023/24, qualificazioni escluse: 125 gare; xGOT squadra presente in 124.
- Due stagioni, 2024/25 e 2025/26, di Premier League, Liga, Bundesliga, Ligue 1,
  campionato portoghese, Eredivisie e campionato belga.

Copertura controllata rispetto alle fixture concluse restituite dal calendario;
le gare annullate o assegnate a tavolino sono escluse. I calendari olandesi e
belgi comprendono anche gli spareggi presenti nel calendario provider. La
copertura dei sette campionati non equivale a quella di tutti i paesi delle
partecipanti Champions; le nazioni mancanti restano scoperte.

Sono riutilizzati anche 214 referti 2026/27 già presenti localmente per le
competizioni coperte. Il totale ispezionato è quindi 6.455, senza duplicati.
Il dataset di ricerca contiene **6.335 gare**: 4.296 riconciliate tiro per tiro e
2.039 soltanto corroborate a livello aggregato. Restano escluse 120 gare.
Nessuno di questi conteggi è una certificazione operativa del modello.

File: `data/normalized/xgot-extended-seasons/`,
`data/analysis/xgot/extended-seasons/coverage.json`,
`data/analysis/xgot/diagnosis-v2.json`, `data/normalized/xgot-team-research-v2.json`.

## Nuove ipotesi, esclusivamente esplorative

Protocollo in `docs/xgot-protocol-v2.json`, definito prima del nuovo calcolo.
Si confrontano qualità dei tiri (xGOT/SOT) ed esecuzione rispetto all'xG
(xGOT/xG), usando tassi relativi alla competizione di ciascun precedente e
regressione verso la media. Le esposizioni di prior sono 30 SOT per la qualità,
8 unità xG per l'esecuzione. Il peso sperimentale resta fisso al 10%: non si
cerca un nuovo peso sul risultato 2025/26.

Le feature combinano storico di attacco e difesa dell'avversario, con almeno
6 gare e al massimo 20 precedenti nei 550 giorni antecedenti. Possono utilizzare
gare domestiche e Champions dello stesso club dopo normalizzazione per lega.
Non è una normalizzazione completa della forza dei campionati o degli avversari:
questo limite resta esplicito. Il riferimento retrospettivo resta il nucleo
tecnico del motore, con contesti storici mancanti neutrali.

| Competizione / stagione | Gare comuni | Log loss base | Esecuzione | Qualità |
|---|---:|---:|---:|---:|
| Serie A 2024/25 | 362 | 0.984105 | 0.983778 | 0.983520 |
| Serie A 2025/26 | 368 | 1.009869 | 1.009734 | 1.009741 |
| Champions 2024/25 | 105 | 0.938749 | 0.939322 | 0.938165 |
| Champions 2025/26 | 105 | 0.966927 | 0.967384 | 0.967849 |

In 102/105 e 104/105 casi Champions le feature usano anche evidenza domestica.
Le rimanenti gare non hanno contesto sufficiente per il riferimento o per le
feature. Il maggior numero di referti non risolve ogni limite del replay storico.

I risultati sono misti e i miglioramenti Serie A piccoli; entrambe le varianti
peggiorano in Champions 2025/26. Queste stagioni sono già state esaminate:
**nessuna tabella v2 costituisce un nuovo test indipendente**. La diversa
copertura e il diverso riferimento impediscono confronti diretti dei valori
assoluti con il campione v1. Report in `data/analysis/xgot/exploration-v2/`.

## Confronto prospettico avviato

Protocollo locale immutabile: `data/predictions/xgot-prospective/protocol.json`.
Modello primario: esecuzione, peso 10%, stabilito prima dei risultati v2;
qualità è una variante secondaria. Nessuna scelta retroattiva del vincitore.

Alle 11:49 UTC del 6 novembre sono state congelate **7 coppie di previsioni**
per Serie A MD11: Fiorentina-Juventus, Genoa-Milan, Inter-Como, Napoli-Lazio,
Parma-Bologna, Roma-Sassuolo e Torino-Lecce. Il riferimento è la previsione
operativa effettivamente salvata, con il suo contesto corrente. Probabilità
pubblicate e predizione originale sono incluse nel congelamento. Le probabilità
delle varianti sono arrotondate alla stessa precisione del riferimento.

Astensione per Cagliari-Frosinone, Monza-Atalanta e Venezia-Udinese: storico
acquisito insufficiente. Non si forza una previsione. Non ci sono catture
Champions future in questa inizializzazione: serve una previsione di riferimento
aggiornata per fixture non ancora iniziate.

Ogni prima cattura valida è immutabile; la ripetizione del comando non la
sostituisce. Sono congelati metodo, configurazione, identità, dati di input,
data reale di acquisizione e previsione. Il registro delle identità è conservato
separatamente come `identity-registry.json`, congelato prima del calcio d'inizio.
Il test riproduce esattamente feature e gol attesi da questi archivi.
Le ore sono del sistema locale UTC, senza autorità esterna di timestamp.

Si rifiutano gare iniziate, riferimenti con data futura o più vecchi di 72 ore,
valori mancanti e dati storici acquisiti dopo la cattura. La finestra storica
esclude la data della partita da prevedere. Non sono supportati backdating e
sostituzione delle prime catture. Un cambiamento dei file metodologici blocca
la stessa versione del protocollo e richiede un nuovo studio esplicito.

L'evaluatore è predisposto e al momento riporta **0 gare valutate, 7 in attesa**.
Le soglie minime sono 100 gare e 6 settimane: raggiungerle non garantisce che
emerga un vantaggio. Il confronto resta di ricerca e non autorizza promozioni
automatiche, EV, rendimento o liquidazioni certificate. Non è installato un
servizio periodico: i comandi seguenti vanno eseguiti con i successivi aggiornamenti.

## Comandi ed effetti

- `node scripts/research/xgot/acquire-extension.cjs`: acquisizione via rete;
  `--offline` rigenera le sole estrazioni usando la cache.
- `node scripts/research/xgot/diagnose.cjs`: aggiorna diagnosi e dataset di
  ricerca, senza cambiare il dataset stretto v1.
- `node scripts/research/xgot/explore-v2.cjs`: aggiorna soltanto i report esplorativi.
- `node scripts/research/xgot/prospective.cjs capture`: congela nuove fixture
  eleggibili; lascia intatte quelle esistenti e registra le astensioni.
- `node scripts/research/xgot/evaluate-prospective.cjs`: aggiorna il rapporto
  sulle catture con risultati canonici conclusi disponibili. Valuta separatamente
  Serie A e Champions, con almeno 100 gare e 6 settimane per competizione,
  intervallo del delta log loss sotto zero, Brier non peggiorato e margine ECE
  massimo 0.01. Il metodo di valutazione è congelato in `evaluation-method.json`;
  un eventuale superamento richiede comunque revisione e non attiva il motore.
- `node scripts/test-xgot-v2.cjs` e `node scripts/test-xgot-prospective.cjs`:
  verifiche in sola lettura.

Nessun builder di previsioni, quote, selezioni o interfaccia pubblica viene
modificato; nessun commit, push o deploy.
