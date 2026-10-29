# Coordinate territoriali nei calcoli individuali — 29 ottobre 2026

Componente implementata: distribuzione dei tiri di ciascun giocatore rispetto alle zone concesse dall'avversaria. Funziona come livello sperimentale dopo le proiezioni esistenti, conservando minuti, ruolo, totale tiri e SOT della squadra. Non è una modifica dei criteri delle selezioni pubblicate.

## Metodo

Storico rigorosamente precedente al cutoff della previsione e alla giornata bersaglio; solo identità canoniche. Si usano il ciclo tecnico osservato e pesi con emivita tre gare, con almeno cinque gare valide per entrambe le squadre. Per il giocatore servono almeno tre presenze, dieci tiri localizzati senza rigori/autogol e almeno l'80% di copertura rispetto ai suoi tentativi verificati. I mancanti restano N/D.

Il profilo individuale viene regolarizzato verso quello della propria squadra con dieci tiri equivalenti. La distribuzione delle concessioni avversarie è regolarizzata verso la lega con venti tiri equivalenti. L'esposizione delle zone del singolo viene confrontata con quella della sua squadra: il segnale misura un'opportunità relativa, senza aggiungere una seconda volta il volume generale già incorporato nel modello. Il solo modulo nominale non determina un nuovo ruolo; i ruoli effettivi in possesso/non possesso restano non ricostruiti.

Si stima un solo coefficiente beta sullo sviluppo MD6–7, su una griglia fissa [-1,1] di 81 valori con penalità ridge 0,05, senza ottimizzazioni sul test. La ripartizione mantiene la somma dei tiri dei giocatori pubblicati e limita la variazione del singolo al 10%. I giocatori senza dati sufficienti rimangono invariati; la riallocazione richiede almeno due giocatori eleggibili della stessa squadra.

I SOT cambiano soltanto attraverso le opportunità di tiro, mantenendo la precisione del modello preesistente prima della riconciliazione. Il totale SOT della squadra è conservato e i SOT individuali non possono superare i tiri. Non si assume che ogni evento shotSaved sia un tiro nello specchio: il campione contiene anche blocchi. Nessuna nuova previsione di precisione, falli o cartellini viene dedotta da questi eventi.

## Verifica cronologica

Sviluppo: 6 gare; beta stimato 0.000000. Test: 6 gare, 120 osservazioni individuali con partecipazione verificata. Il numero indipendente è quello delle gare/giornate, non quello dei giocatori. Le presenze e le assenze esplicite sono valutate statisticamente; i non titolari non diventano selezioni operative. È riportato anche il sottoinsieme dei titolari effettivi.

| Modello | Log loss tiri ↓ | Log loss SOT ↓ | MAE tiri ↓ | MAE SOT ↓ |
|---|---:|---:|---:|---:|
| baseline | 1.401013 | 0.859395 | 0.904167 | 0.501417 |
| candidate | 1.401013 | 0.859395 | 0.904167 | 0.501417 |

Intervallo per giornata: INSUFFICIENT; giornate disponibili 2. MD8–9 è un test storico riutilizzato; la prova non certifica un beneficio operativo. Nessuna promozione automatica.

## Contratti e riproduzione

Le stime sono conteggi del singolo giocatore, non probabilità dei contratti DUO. Non vengono creati contratti individuali quotati, quote eque o EV. Le quote verificate di stesso contratto, soglia e ID restano nella pipeline operativa esistente.

Eseguire node scripts/research/player-spatial/run.cjs. Gli input e i loro hash, il campione, i vettori territoriali, le esclusioni e le proiezioni prima/dopo sono conservati in data/analysis/player-spatial-2026-10-29/. Il runner verifica l'integrità dei file operativi e non esegue builder o pubblicazioni.

## Congelamento e integrazione nella pipeline

Il build delle proiezioni Lettura richiama anche il congelamento individuale, se il suo protocollo è già attivo. Non attiva protocolli implicitamente. Ogni previsione conserva input compressi verificabili, baseline, variante calibrata e ipotesi teorica beta=1; la prima cattura resta primaria e gli aggiornamenti sono revisioni. La valutazione usa soltanto queste proiezioni congelate. I risultati vengono aggiornati in `output/player-spatial-prematch/latest.json`; non modificano selezioni, quote o dati pubblici.

La prima cattura Fiorentina–Atalanta è avvenuta il 29 ottobre alle 19:20:02 UTC (20:20 italiane), prima del calcio d'inizio delle 20:45. È un pilota successivo all'esplorazione storica; la coorte prospettica dichiarata inizia dalla giornata 10. L'ipotesi beta=1 è una prova teorica distinta, non il coefficiente scelto dalla calibrazione e non una variante promossa dopo il test.

Esempio del pilota, tiri attesi individuali: Krstovic 4,48 → 4,63; De Ketelaere 2,11 → 2,04; Ederson 1,58 → 1,49; Njie 1,77 → 1,79; Mastantuono 3,84 → 3,82. Sono numeri sperimentali beta=1. La variante calibrata beta=0 conserva i conteggi originari. Gli altri giocatori non hanno copertura individuale sufficiente e non ricevono correzioni territoriali. Nessun nuovo mercato operativo viene approvato da questi esempi.

Verifiche: `npm run test:player-spatial` controlla conservazione dei volumi, limiti individuali, mancanti, identità, esclusione della gara bersaglio e dello storico futuro, separazione DUO, integrità dei congelamenti e rifiuto delle catture dopo il calcio d'inizio. Non è una liquidazione delle scommesse.
