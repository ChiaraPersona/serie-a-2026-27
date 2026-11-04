# Avvio della verifica prospettica Champions

Il 4 novembre 2026 sono stati congelati i cataloghi delle nove gare programmate della giornata, prima del calcio d'inizio. La prima acquisizione è delle 15:15:05 UTC, cioè 16:15:05 in Europe/Rome. Le gare già concluse non sono state ricostruite retroattivamente.

L'ampliamento delle identità porta le osservazioni domestiche con entrambi i rating necessari alla correzione da **42 a 83 su 264**. Contando soltanto il rating dell'avversario, il progresso è da **45 a 88 su 264**. Cinque osservazioni non permettono la correzione perché manca il rating della squadra valutata. I due conteggi non sono intercambiabili.

Il mapping contiene 79 nuovi collegamenti ESPN, verificati mediante fixture europee storiche condivise con identità ancorate e senza matching dei nomi. La variante del confronto è in `data/analysis/champions/strength-comparison-2026-11-04-opponent-map.json`; il confronto originale è conservato. Questo migliora la copertura, senza dimostrare ancora un miglioramento predittivo.

## Stato della cattura

- Nove fixture registrate, di cui otto con probabilità disponibili e una astensione senza eventi.
- 131 eventi esatti in attesa di risultato, separati per modello, soglia, soggetto e periodo: esiti, doppie chance, gol e volumi di tiri/SOT/corner.
- 94 probabilità del catalogo relative ai gol isolate per incoerenza fra Over e Under complementari. Nella prima cattura nessuna di queste righe era una selezione proposta. Gli originali sono conservati; non è stata applicata alcuna correzione automatica al catalogo.
- I DUO restano esclusi dalla valutazione in assenza di probabilità e riscontri specifici del contratto completo.
- Nessuna osservazione prospettica già conclusa e nessuna nuova approvazione operativa.

Gli snapshot iniziali e le revisioni sono in `data/predictions/champions-market-prospective/`. Una revisione non sostituisce un evento già congelato; può introdurre un evento prima assente soltanto se ancora prepartita. Il report aggiornabile è `data/analysis/champions/market-prospective/latest.json`.

Il comando CLI del builder MD4 acquisisce automaticamente nuove evidenze dopo il proprio lavoro. Per valutare gli esiti dopo il loro normale aggiornamento canonico: `node scripts/champions-market-prospective.cjs --matchday 4`. Il programma conserva le soglie statistiche già approvate e non scrive il registro operativo.

Protocollo, limiti e comandi completi: [verifica prospettica](../champions-market-prospective.md). Audit delle identità: [avversari Champions](champions-opponent-identity-2026-11-04.md).

Nessuna modifica di formule, selezioni, quote, pagine pubbliche o rendimento. Nessuna liquidazione certificata, commit, push o deploy.
