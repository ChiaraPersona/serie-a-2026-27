# Correzione delle probabilità gol Champions MD4

## Causa e riproduzione

Il catalogo MD4 passava a `matrixProbability` un predicato `(h, a)` che si aspettava due numeri. Il motore condiviso usa invece `Array.filter` su celle `{home, away, probability}`: il secondo argomento era l'indice della cella, non i gol della squadra ospite. Il confronto della somma produceva falso sia per OVER sia per UNDER, azzerando le probabilità. La matrice Poisson originale era corretta; la lettura della soglia e il renderer non erano la causa.

Riproduzione sul builder reale: `node scripts/test-champions-md04-goal-probabilities.cjs`. Prima della correzione: `Over/Under 2.5 must sum to 100%, got 0%`. Dopo: 232 probabilità e 100 coppie complementari verificate contro la stessa matrice del motore esistente.

Il fix legge `home` e `away` dall'oggetto. Non modifica la formula Poisson, i gol attesi, pesi, quote o criteri di ammissione. La provenienza dei nuovi mercati gol include `MD04_GOALS_SCORE_OBJECT_V1`, distinto dalle versioni originali nella verifica prospettica.

## Aggiornamento circoscritto

`node scripts/repair-champions-md04-goals.cjs` ha corretto 108 righe del catalogo canonico, soltanto per le otto fixture future MD04-10…MD04-17 con statistiche sufficienti. Viking–Sabah resta senza nuove probabilità. Non è stata aggiunta o rimossa alcuna selezione proposta: le 108 righe corrette non erano proposte.

Sono aggiornati probabilità centrale, quota equa, EV informativo già presente e sensibilità dipendente dalla probabilità. Probabilità prudenziale, approvazioni statistiche e selezioni rimangono invariate. Il comando non ricalcola statistiche, formazioni, scenari o mercati individuali; conserva identità provider, quote, soglie e modificatori.

Le gare concluse e le altre famiglie di mercato sono confrontate integralmente prima/dopo e conservate. Nessuna liquidazione certificata o sostituzione retroattiva. Gli originali delle righe corrette e la loro versione successiva sono nell'archivio `data/technical-archive/champions-md04/goal-probability-repairs/`. Il confronto hash `afterHash` nel registro descrive il catalogo corretto prima dell'aggiunta della ricevuta `probabilityCorrections`.

Il comando di riparazione è idempotente: una seconda esecuzione ha restituito zero modifiche. Un build di sola presentazione ha aggiornato le proiezioni necessarie senza rigenerare le previsioni.

## Snapshot e verifica

Gli snapshot prospettici esistenti sono immutati. Le versioni corrette sono state congelate prima del kickoff in revisioni nuove, con un'identità dell'adattatore distinta. Le 94 probabilità originali incoerenti restano in quarantena; non sono state rimosse o sostituite. Il report prospettico ora contiene 239 eventi in attesa di risultato, includendo i 108 eventi della versione corretta come confronto separato; non rappresentano 239 partite indipendenti.

Controlli superati:

- Regressione specifica del builder su 232 probabilità e 100 coppie Over/Under.
- Suite `scripts/test-champions-md04.cjs`: 18 fixture, 272 selezioni proposte e 131 contratti DUO, identità/quote esatte e input estranei invariati.
- Suite prospettica: nuova versione separata, originali in quarantena conservati, nessuna approvazione gol inventata.
- Riparazione idempotente e assenza di aggiornamenti alle gare concluse.

Evidenze browser desktop/mobile: `output/champions-md04/goals-repair-browser/report.json`, con schermate a 1440 e 390 pixel. Edge è stato eseguito fuori dal sandbox dopo che l'avvio nel sandbox aveva fallito per un errore di autorizzazione Windows.

Nessun commit, push o deploy.
