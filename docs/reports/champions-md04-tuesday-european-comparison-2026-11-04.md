# Champions 3 novembre: confronto retrospettivo fra Scenario e rating europeo

Confronto eseguito il 4 novembre 2026 sulle nove partite MD4 concluse il 3 novembre. Le probabilità del rating sono ricostruite oggi con la configurazione di ricerca congelata: non sono previsioni nuove effettivamente pubblicate prima delle partite. Nessuna modifica ai cataloghi, agli archivi operativi, alle quote o alle liquidazioni.

## Risultato principale

Due esiti prevalenti errati passano dalla parte corretta: LASK–Slovan e Manchester United–Roma. Il conteggio delle vittorie dell'esito con probabilità maggiore passa da 5/9 a 7/9, senza nuovi errori di esito prevalente su queste nove fixture. Questo conteggio non misura il rendimento di una schedina o la bontà della quota.

| Partita e risultato | Scenario pubblicato: probabilità della vittoria poi avvenuta | Rating europeo: stessa probabilità | Effetto |
| --- | ---: | ---: | --- |
| LASK–Slovan 4–0 | LASK 31,7%; Slovan favorito al 44,7% | LASK 60,2%; Slovan 23,1% | Esito prevalente corretto da 2 a 1 |
| Manchester United–Roma 3–2 | United 32,6%; Roma favorita al 44,1% | United 47,6%; Roma 32,7% | Esito prevalente corretto da 2 a 1, con probabilità sotto il 50% |
| Villarreal–PSG 0–6 | PSG 45,2% | PSG 72,2% | Favorito già corretto, maggiore sostegno alla sua vittoria |
| Feyenoord–Inter 0–3 | Inter 42,4% | Inter 47,9% | Favorito già corretto, incremento più contenuto |

Il rating 1X2 non prevede il 4–0 o lo 0–6: queste righe riguardano soltanto la vittoria nei tempi regolamentari.

## Errori e peggioramenti rimasti

- Shakhtar–Sporting 0–1: lo Scenario assegnava 40,2% allo Shakhtar e 33,2% allo Sporting; il rating dà 39,8% e 38,4%. Avvicina le squadre ma mantiene dalla parte sbagliata l'esito più probabile.
- Bodø/Glimt–Lille 0–0: il Bodø resta favorito, da 61,7% a 59,2%. Il pareggio scende dal 20,9% al 16,9%: il nuovo modello non corregge questo errore e assegna meno probabilità all'esito poi verificatosi.
- Barcelona–Aston Villa 3–0: il Barcellona resta di poco l'esito più probabile, ma scende dal 74,2% al 39,9%, con Villa al 38,4%. È un limite evidente del rating attuale. Il modello usa aggiornamenti identici fra Champions, Europa e Conference e i risultati europei senza uno strato nazionale validato; la possibile sopravvalutazione dello storico di altre competizioni è un'ipotesi da testare, non una causa già dimostrata.
- Galatasaray–Stuttgart 2–0: vittoria Galatasaray corretta con entrambi, ma probabilità ridotta dal 53,4% al 47,6%.
- Atlético–Bayern 0–2: vittoria Bayern corretta con entrambi, ma probabilità ridotta dal 46,5% al 44,3%.

## Metriche sulle stesse nove partite

| Metrica | Scenario pubblicato | Rating ricostruito |
| --- | ---: | ---: |
| Esito prevalente corretto | 5/9 | 7/9 |
| Brier multiclass | 0,551906 | 0,480725 |
| Log loss | 0,920409 | 0,835685 |
| ECE sulle nove gare | 0,157608 | 0,207550 |

Il rating migliora Brier e log loss e peggiora ECE in questo piccolo campione. La calibrazione su nove gare è molto instabile; nessuna metrica qui consente di dichiarare validato il modello. Una previsione probabilistica non diventa automaticamente errata quando si verifica l'esito meno probabile: si misura l'errore delle probabilità su un campione adeguato.

## Ricostruzione e provenienza interna

Lo stato del rating usa 1.469 risultati europei storici più 54 risultati Champions correnti, tutti con data strettamente precedente al 3 novembre; ultima data utilizzata 21 ottobre. Non sono usate né le nove partite valutate né le gare delle 18:45 per le successive delle 21:00. I parametri sono quelli già selezionati dalla ricerca su training/validazione storici e sono stati scelti oggi: il confronto rimane retrospettivo.

Le probabilità pubblicate sono recuperate dal file Scenario in Git scegliendo, per ciascuna fixture, una versione committata prima del suo kickoff e con timestamp dello Scenario anch'esso antecedente. I commit di riferimento del file sono `759f794c2b765b64eeeaea27b78186d1f1a0343e` per i primi incontri e `47ba475d66e7409ce48a4d35bbb31886a2019bef` per i successivi. Timestamp, fixture, kickoff, distribuzioni originali e dettagli del rating sono registrati in `output/champions-european-rating-research/yesterday-2026-11-03.json`. Le date Git sono evidenza locale della storia del progetto, non un'attestazione esterna.

Comando ripetibile: `node scripts/research/compare-european-rating-yesterday.cjs`. Verifica il codice del modello rispetto all'hash congelato, le distribuzioni originali, il cutoff degli input e la conservazione degli input operativi. Non rigenera previsioni o selezioni storiche e non calcola ROI.
