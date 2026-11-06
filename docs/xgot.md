# xG sui Tiri in porta (xGOT)

Supporto iniziale: calcoli descrittivi disponibili in `scripts/predictions/xgot.cjs`.
Nessun collegamento ai motori previsionali, alle selezioni o alle quote.

xGOT è una metrica post-tiro: valuta la probabilità di gol di un tiro nello specchio
considerando la qualità dell'occasione e dell'esecuzione. Non è la somma degli xG
dei soli tiri in porta e non è ricostruibile da xG e conteggio SOT.

Riferimenti interni:
- https://www.statsperform.com/insights/introducing-expected-goals-on-target-xgot/
- https://theanalyst.com/articles/what-are-expected-goals-on-target-xgot

## Contratto dei calcoli

`describeXgot({ xgot, shotsOnTarget, minutes })` accetta numeri osservati o `null`.
Restituisce xGOT, xGOT per 90 minuti e xGOT per tiro in porta. Il totale è un
valore non negativo; il rapporto per tiro è una qualità media, non una previsione
del numero di tiri. Numeratore, denominatore e minuti devono riferirsi allo stesso
giocatore o squadra e allo stesso insieme di gare. Per squadre usare minuti di
partita, senza sommare i minuti dei giocatori. Non arrotondare prima dei calcoli.

Dato assente: `null`, visualizzabile come N/D; mai zero presunto. Un denominatore
nullo o zero produce un rapporto `null`. Lo zero osservato resta zero. Dati
incoerenti generano un errore; riconciliare gli arrotondamenti del provider prima
dell'invocazione, senza correggere automaticamente i valori.

## Storico locale importato

Comando: `node scripts/import-xgot-history.cjs`. Legge soltanto gli archivi locali
FotMob di `data/raw/champions-season-shots/2026-10-20/fotmob/matches/` e scrive:

- `data/normalized/xgot-history.json`: partite riconciliate, squadre, soli giocatori
  con eventi di tiro osservati, xGOT e rapporti descrittivi.
- `data/analysis/xgot/history-audit.json`: evidenze di acquisizione, hash SHA-256
  degli archivi e degli input identità, incongruenze e partite in quarantena.

Importazione verificata il 6 novembre 2026: 502 archivi ispezionati, 60 partite
concluse candidate nelle due competizioni, 42 approvate (17 Serie A, 25 Champions)
e 18 in quarantena. Sono disponibili 629 osservazioni individuali di tiratori,
492 con player ID canonico; 29 partite hanno fixture ID canonico. Le altre
identità restano esplicitamente irrisolte: non utilizzarle in join operativi.
La copertura è parziale e non certifica un'intera stagione né uno storico
verificato da un secondo fornitore indipendente.

I controlli richiedono ID evento univoci, valori numerici per tiro tra 0 e 1,
conteggi squadra coerenti con la shotmap, zero xGOT sugli eventi fuori dallo
scope SOT e somma xGOT coerente con il totale pubblicato a due decimali
(tolleranza 0.005001). Tiri bloccati, salvataggi sulla linea e autogol non sono
conteggiati come SOT. Periodi diversi dai due tempi regolamentari sono esclusi.
In caso di una discrepanza si esclude l'intera partita, mantenendo l'evidenza.
Il primo controllo esplorativo aveva usato una tolleranza 0.011 e confrontato
soltanto i totali: le 54 partite inizialmente indicate non erano ancora approvate.

I collegamenti canonici riusano esclusivamente le mappature provider esistenti;
le fixture richiedono entrambi gli ID squadra, competizione e data coincidenti
in una sola fixture canonica. Nessuna corrispondenza approssimativa per nome.
Non si imputano zeri ai non tiratori. I rapporti per 90 usano i minuti osservati
del giocatore; in loro assenza restano null. Non sono prodotti aggregati di
stagione da questi campioni parziali. `availableAt` conserva la data di acquisizione
per impedire di trattare uno scaricamento successivo come evidenza prepartita.

Test: `node scripts/test-xgot-history.cjs`. È di sola lettura e verifica anche gli
hash degli input, la conservazione giocatori/squadra e casi sintetici di rifiuto.
Il builder non modifica sito, selezioni, quote o motori e non accede alla rete.

## Estensione e attivazione da completare

Prima dell'integrazione operativa acquisire uno storico verificato per Serie A e
Champions, con fixture ID e player/team ID canonici, competizione, stagione,
periodo di gioco, minuti, SOT e xGOT. Conservare provider, versione del modello,
URL e data di acquisizione internamente. Non mescolare provider o definizioni
post-shot differenti senza riconciliazione. Registrare la copertura effettiva;
non sommare campioni parziali come totali completi.

Per una previsione prepartita usare solo osservazioni storiche disponibili al
momento della previsione, mai l'xGOT della gara da prevedere. Confrontare fuori
campione il modello attuale e quello candidato, controllando copertura,
calibrazione e miglioramento prima di proporre pesi o approvazione. L'xGOT non
valida probabilità DUO, fair odds o EV e non sostituisce la quota verificata.

Verifica del modulo: `node scripts/test-xgot.cjs`.
