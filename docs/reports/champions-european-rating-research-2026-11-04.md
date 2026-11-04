# Confronto sperimentale del rating europeo

Esecuzione di riferimento: `output/champions-european-rating-research/2026-11-04T16-19-15-286Z/`. Ricerca interna, nessuna attivazione sul sito.

## Risultato

La selezione fra 27 configurazioni mantiene il vecchio Elo semplice: peso paese 0, attenuazione del piccolo campione 0, decadimento per inattività disattivato. Le estensioni non migliorano la log loss della validazione 2024–25. La migliore estensione non equivalente usa peso paese 1 e attenuazione 6: log loss 0,998728 contro 0,995029 del riferimento; Brier 0,597048 contro 0,594613. Non viene promossa.

Il confronto diagnostico 2025–26 riproduce il vecchio report Elo entro la precisione di arrotondamento. Non è stato modificato alcun coefficiente del modello operativo per ottenere un esito desiderato sulla singola gara.

| Metrica sulle 189 Champions 2025–26 | Elo selezionato | Frequenze storiche |
| --- | ---: | ---: |
| Brier multiclass, minore è meglio | 0,561563 | 0,616825 |
| Log loss, minore è meglio | 0,949180 | 1,022513 |
| ECE, minore è meglio | 0,046865 | 0,013688 |

Il rating migliora Brier e log loss ma ha una calibrazione aggregata peggiore della baseline costante. Nessuna di queste metriche da sola prova affidabilità operativa. Gli intervalli bootstrap appaiati per fixture del miglioramento sono 0,026532–0,083301 per Brier e 0,034899–0,110199 per log loss; sono descrittivi e assumono ricampionamento delle fixture, senza modellare tutte le dipendenze fra squadre.

Con almeno sei precedenti europei per entrambe le squadre, la copertura del test Champions è 183 gare su 189. Le metriche dell'intero test rimangono riportate per evitare di selezionare soltanto i casi facili.

## Metodo e limiti

- Training 2023–24, scelta dei parametri su tutte le competizioni europee 2024–25, successivo confronto diagnostico 2025–26. Il periodo 2025–26 è già stato esaminato in precedenza: non è presentato come nuovo holdout indipendente.
- Le probabilità di tutte le gare di una data sono calcolate prima di aggiornare i rating con i risultati di quella data. Il risultato della partita stessa o di una partita successiva non entra nelle sue caratteristiche.
- Le varianti confrontano peso paese 0/0,5/1, attenuazione 0/6/12 e dimezzamento del rating per inattività assente/180/365 giorni. Il prior di paese richiede almeno tre altri club già osservati; rappresenta soltanto i club europei osservati, non l'intero campionato domestico.
- Il protocollo e la griglia sono scritti prima della selezione; la configurazione selezionata è salvata prima della valutazione sul test. In caso di parità viene mantenuto l'ordine deterministico della griglia. Alcune configurazioni sono numericamente equivalenti quando l'attenuazione è zero.
- Il runner usa unicamente ID UEFA canonici e la mappa corrente esatta, senza corrispondenze approssimative. Le associazioni dei nuovi club provengono dal dataset canonico delle squadre correnti. Per i club nuovi, il rating iniziale neutro è un prior di ricerca esplicito; con meno di sei partite la probabilità pubblicabile di ricerca resta N/D.
- Nessun confronto storico con il modello domestico o con quote provider è fabbricato: i limiti rilevati nell'audit precedente restano validi. Nessuna conversione del rating in gol, tiri, doppie chance operative o DUO.

## Aggiornamento corrente e acquisizione prospettica

Il rating è aggiornato con tutti i 63 risultati Champions correnti conclusi disponibili nel calendario canonico; nessuna gara è stata scartata per identità o punteggio mancanti. Le gare della stessa data della cattura non vengono usate per aggiornare lo stato: politica temporale conservativa.

Nel solo confronto di ricerca AEK–Real diventa 26,489746% / 17,733565% / 55,776689%. Non è una selezione operativa, non ha EV approvato e non sostituisce le probabilità del sito. È ancora distante dalla distribuzione implicita delle quote osservata nell'audit.

Per le nove fixture future MD4 sono state congelate sette previsioni 1X2, con 21 eventi elementari. Lens–Como e Viking–Sabah restano N/D per storico europeo insufficiente. Le catture avvengono prima del kickoff canonico, includono hash degli input, identità della versione, baseline di frequenza Champions congelata, criteri invariati e hash del contenuto. I file sono scritti in creazione esclusiva; le esecuzioni precedenti restano archiviate e non sono sostituite.

Il protocollo prospettico è distinto dal confronto retrospettivo. Gli snapshot sono acquisizioni locali, non attestazioni temporali di un'autorità esterna. Il valutatore considera esclusivamente risultati regolamentari conclusi e verifica hash, versione, protocollo, orario canonico e cronologia. Le acquisizioni della stessa partita non devono essere sommate come nuove fixture indipendenti. Il registro operativo non viene aggiornato dal valutatore di ricerca.

Prima valutazione: 21 eventi in attesa, zero osservazioni ammissibili concluse, zero approvazioni. Non è attivo un monitor automatico. Quando i risultati canonici vengono aggiornati, il valutatore può misurare le previsioni originali preservate; il campione di sette partite non può comunque soddisfare il minimo di 180.

## Comandi e verifiche

```powershell
node scripts/test-european-rating-research.cjs
node scripts/research/run-european-rating.cjs
node scripts/research/evaluate-european-rating.cjs --run output/champions-european-rating-research/2026-11-04T16-19-15-286Z
```

Il runner produce una directory nuova per ogni esecuzione. Gli artefatti includono `protocol.json`, `selected-before-test.json`, `diagnostic-predictions.json`, `report.json`, `frozen-research-model.json`, `research-fixtures.json`, protocollo e snapshot prospettici.

I test passano per isolamento dal futuro e dalla partita stessa, separazione degli aggiornamenti nella stessa data anche attraverso i prior di paese, conservazione dello stato iniziale, attenuazione, inattività, dati insufficienti, coerenza delle probabilità, hash alterati, acquisizione al kickoff, discrepanza dall'orario canonico, esiti prematuri e calcolo delle metriche. Il riferimento storico è riprodotto numericamente. Il runner verifica inoltre che dati operativi e input non siano modificati.

Nessuna modifica al sito pubblico, alle quote, alle formazioni, ai criteri di approvazione o alle selezioni operative. Nessun commit, push o deploy.
