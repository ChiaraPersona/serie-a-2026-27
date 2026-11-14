# Lettura Champions collegata al rating europeo

Attivazione sperimentale autorizzata il 14 novembre 2026: «il rating europeo elo
voglio che stimi l'intera lettura e non solo 1x2. deve essere tutto collegato».
Questa policy sostituisce per le sole gare future la precedente separazione
fra esito europeo e scenario quantitativo. Non è una validazione statistica.

## Catena delle previsioni

1. Il motore esistente costruisce una distribuzione tecnica dei punteggi usando
   attacco, difesa, forma, matchup, XI specifiche disponibili e xGOT al peso
   preesistente del 10%. Parametri Elo e soglie di campione non cambiano.
2. Il rating Elo europeo determina le probabilità 1/X/2, con la correzione xGOT
   già autorizzata. Per ciascuno dei tre esiti si conserva la forma condizionata
   della distribuzione tecnica e si sostituisce la sua massa con quella europea:
   `P_collegata(punteggio) = P_tecnica(punteggio) * P_Elo(esito) / P_tecnica(esito)`.
   È una nuova distribuzione congiunta sperimentale, non una Poisson ricostruita
   dai suoi valori medi. Il rating da solo non contiene una previsione di gol.
3. Gol attesi e risultati esatti derivano dalla stessa distribuzione. Il risultato
   centrale è il punteggio più probabile entro l'esito prevalente; le alternative
   mantengono probabilità assolute, senza forzare tutte le righe sul medesimo esito.
4. Il game-state del motore dei volumi usa le stesse probabilità europee, facendo
   passare il collegamento a tiri, SOT e corner attraverso i correttivi esistenti.
   xGOT previsto usa i SOT così aggiornati. Forza e conteggi non sono sinonimi:
   non si moltiplica ogni statistica per lo stesso fattore Elo.
5. Falli e gialli usano le medie della squadra condizionate a vittoria, pareggio e
   sconfitta osservati prima del cutoff, regredite alla media complessiva con
   esposizione a priori pari alla soglia già configurata di sei gare. Il rapporto
   fra miscela con pesi europei e miscela con pesi tecnici corregge la proiezione
   esistente. Servono almeno sei osservazioni e tutti i tre esiti osservati;
   altrimenti l'effetto resta neutro e registrato, senza creare dati mancanti.
6. Quando sono disponibili XI canoniche della fixture, l'allocazione individuale
   esistente riceve i volumi squadra aggiornati. Non si trasformano riferimenti
   di formazione di altre gare in XI previsionali e non si creano probabilità DUO.

## Isolamento e limiti

L'aggancio al motore Serie A è una funzione opzionale in `predictScenario`:
senza aggancio il percorso esistente resta identico. Il modulo Champions
`scripts/champions/european-reading.cjs` possiede condizionamento e disciplina.
Il catalogo MD4, per eventuali future esecuzioni autorizzate, legge la matrice
condivisa anziché ricostruire una Poisson dalle nuove medie.

Le righe concluse e i contratti già pubblicati non vengono rigenerati. Nessuna
nuova selezione, quota, probabilità DUO, approvazione statistica o liquidazione.
Gli hash delle quote, Schedine MD3/MD4 e registro titolari sono verificati contro
`data/analysis/champions/elo-reading-2026-11-14/before.json`.

Lo storico Elo conserva il requisito di sei precedenti nel proprio registro.
Como, Viking e Sabah hanno quattro precedenti: le loro dodici gare future
mantengono il fallback statistico dichiarato e l'1X2 N/D. I preliminari recuperati
per i volumi Sabah non vengono aggiunti soltanto per quel club a un registro Elo
che esclude i preliminari per tutti. Servirebbe un ampliamento coerente dell'intero
registro e una verifica distinta della sua copertura.

L'attivazione conserva formule e pesi dei motori precedenti ma aggiunge un nuovo
collegamento di modello, esplicitamente non validato. I controlli di coerenza e
regressione non dimostrano un aumento di precisione; serve valutazione prospettica.

Test: `scripts/test-champions-european-reading.cjs`,
`scripts/test-champions-shared-scenarios.cjs`,
`scripts/test-champions-xgot-forecast.cjs`.
